import { Router } from "express";
import { count } from "drizzle-orm";
import { db, registrationsTable, settingsTable } from "@workspace/db";

const router = Router();

/** GET /count — public, returns total registration count and current target */
router.get("/count", async (req, res) => {
  const [[countResult], settings] = await Promise.all([
    db.select({ count: count() }).from(registrationsTable),
    db
      .select({ registrationTarget: settingsTable.registrationTarget })
      .from(settingsTable)
      .limit(1),
  ]);

  const target = settings[0]?.registrationTarget ?? 500;
  res.json({ count: Number(countResult?.count ?? 0), target });
});

export default router;
