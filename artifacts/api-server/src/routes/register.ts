import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { db, registrationsTable } from "@workspace/db";
import { SubmitRegistrationBody } from "@workspace/api-zod";

const router = Router();

// Rate-limit: max 10 registration attempts per IP per 15 minutes
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests",
    message: "Too many registration attempts. Please wait and try again.",
  },
});

router.post("/register", registrationLimiter, async (req, res) => {
  const parsed = SubmitRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: "Validation error",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
    return;
  }

  const { name, phone } = parsed.data;
  // Strip all whitespace and store in E.164 format
  const cleanPhone = phone.replace(/\s+/g, "");

  try {
    const [registration] = await db
      .insert(registrationsTable)
      .values({ name: name.trim(), phone: cleanPhone })
      .returning();

    if (!registration) {
      throw new Error("Insert returned no rows");
    }

    res.status(201).json({
      id: registration.id,
      name: registration.name,
      phone: registration.phone,
      createdAt: registration.createdAt.toISOString(),
    });
  } catch (err: any) {
    // PostgreSQL unique constraint violation code
    if (err.code === "23505") {
      res.status(409).json({
        error: "Conflict",
        message: "This phone number is already registered.",
      });
      return;
    }
    req.log.error({ err }, "Registration insert failed");
    res.status(500).json({
      error: "Internal server error",
      message: "Registration failed. Please try again.",
    });
  }
});

export default router;
