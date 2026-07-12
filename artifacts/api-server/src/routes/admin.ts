import { Router } from "express";
import { eq, ilike, or, desc, count } from "drizzle-orm";
import { db, registrationsTable, settingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import {
  UpdateSettingsBody,
  DeleteRegistrationParams,
  GetRegistrationsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────

/** POST /admin/login */
router.post("/admin/login", (req, res) => {
  const { username, password } = req.body ?? {};
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    res
      .status(500)
      .json({ error: "Server error", message: "Admin credentials not configured." });
    return;
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials." });
    return;
  }

  req.session.adminUsername = username as string;
  req.session.save((err) => {
    if (err) {
      req.log.error({ err }, "Session save failed");
      res.status(500).json({ error: "Server error", message: "Login failed." });
      return;
    }
    res.json({ username });
  });
});

/** POST /admin/logout */
router.post("/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) req.log.error({ err }, "Session destroy failed");
    res.json({ message: "Logged out." });
  });
});

/** GET /admin/me — returns current admin or 401 */
router.get("/admin/me", requireAdmin, (req, res) => {
  res.json({ username: req.session.adminUsername });
});

// ── Registrations ─────────────────────────────────────────────────────────────

/** GET /admin/registrations — paginated list with optional search */
router.get("/admin/registrations", requireAdmin, async (req, res) => {
  const queryResult = GetRegistrationsQueryParams.safeParse(req.query);
  const { search, page = 1, limit = 20 } = queryResult.success
    ? queryResult.data
    : { search: undefined, page: 1, limit: 20 };

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = search
    ? or(
        ilike(registrationsTable.name, `%${search}%`),
        ilike(registrationsTable.phone, `%${search}%`)
      )
    : undefined;

  const [[totals], data] = await Promise.all([
    db.select({ total: count() }).from(registrationsTable).where(whereClause),
    db
      .select()
      .from(registrationsTable)
      .where(whereClause)
      .orderBy(desc(registrationsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
  ]);

  res.json({
    data: data.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total: Number(totals?.total ?? 0),
    page: pageNum,
    limit: limitNum,
  });
});

/**
 * GET /admin/registrations/export — CSV download.
 * IMPORTANT: must be registered BEFORE /:id to avoid "export" being treated as a param.
 */
router.get("/admin/registrations/export", requireAdmin, async (req, res) => {
  const data = await db
    .select()
    .from(registrationsTable)
    .orderBy(desc(registrationsTable.createdAt));

  const csvRows = [
    "id,name,phone,created_at",
    ...data.map(
      (r) =>
        `${r.id},"${r.name.replace(/"/g, '""')}","${r.phone}","${r.createdAt.toISOString()}"`
    ),
  ];

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="registrations.csv"'
  );
  res.send(csvRows.join("\n"));
});

/** DELETE /admin/registrations/:id */
router.delete("/admin/registrations/:id", requireAdmin, async (req, res) => {
  const parsed = DeleteRegistrationParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(422).json({ error: "Validation error", message: "Invalid ID." });
    return;
  }

  const [deleted] = await db
    .delete(registrationsTable)
    .where(eq(registrationsTable.id, parsed.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found", message: "Registration not found." });
    return;
  }

  res.json({ message: "Registration deleted." });
});

// ── Settings ─────────────────────────────────────────────────────────────────

/** Ensure default settings row exists and return it */
async function getOrCreateSettings() {
  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    [settings] = await db
      .insert(settingsTable)
      .values({
        companyName: "Nutterx Technologies",
        title: "Technology Solutions Company",
        phone: "",
        email: "",
        website: "",
        address: "",
      })
      .returning();
  }
  return settings;
}

/** GET /admin/settings */
router.get("/admin/settings", requireAdmin, async (req, res) => {
  const settings = await getOrCreateSettings();
  if (!settings) {
    res
      .status(500)
      .json({ error: "Server error", message: "Could not fetch settings." });
    return;
  }
  res.json({ ...settings, updatedAt: settings.updatedAt.toISOString() });
});

/** PUT /admin/settings */
router.put("/admin/settings", requireAdmin, async (req, res) => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: "Validation error",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
    return;
  }

  const existing = await getOrCreateSettings();
  let settings;

  if (!existing) {
    [settings] = await db.insert(settingsTable).values(parsed.data).returning();
  } else {
    [settings] = await db
      .update(settingsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(settingsTable.id, existing.id))
      .returning();
  }

  if (!settings) {
    res
      .status(500)
      .json({ error: "Server error", message: "Could not update settings." });
    return;
  }

  res.json({ ...settings, updatedAt: settings.updatedAt.toISOString() });
});

export default router;
