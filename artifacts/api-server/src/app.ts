import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { ensureSchema } from "@workspace/db";

// Augment express-session with our admin field
declare module "express-session" {
  interface SessionData {
    adminUsername: string;
  }
}

const app = express();

// Trust Vercel's proxy layer so express-rate-limit can read the real
// client IP from X-Forwarded-For without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: { id: unknown; method: string; url?: string }) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res: { statusCode: number }) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// CORS — reflect the request origin with credentials (works for Replit + Vercel)
app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
// - Production (Vercel + Supabase): uses connect-pg-simple so sessions survive
//   across serverless invocations. DATABASE_URL must be set in Vercel env vars.
// - Local dev (Replit): falls back to in-memory (fine for a long-running process).
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  logger.warn("SESSION_SECRET not set — using insecure fallback.");
}

const databaseUrl = process.env.DATABASE_URL;

let sessionStore: session.Store | undefined;
if (databaseUrl) {
  const PgStore = connectPgSimple(session);
  sessionStore = new PgStore({
    conString: databaseUrl,
    createTableIfMissing: true,
    // Keep session rows tidy — prune expired sessions daily
    pruneSessionInterval: 60 * 60 * 24,
  });
  logger.info("Session store: PostgreSQL (connect-pg-simple)");
} else {
  logger.warn("DATABASE_URL not set — using in-memory session store (not suitable for production).");
}

app.use(
  session({
    store: sessionStore,
    secret: sessionSecret ?? "dev-secret-please-set-SESSION_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 h
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

app.use("/api", router);

// Top-level await: block module load until tables exist.
// Because the bundle is ESM, Vercel won't serve any request until this
// resolves — eliminates the race between cold-start and first request.
if (databaseUrl) {
  try {
    await ensureSchema(databaseUrl);
    logger.info("Schema bootstrap complete");
  } catch (err) {
    logger.error({ err }, "Schema bootstrap failed — check DATABASE_URL and SSL settings");
  }
}

export default app;
