import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

// Augment express-session with our admin field
declare module "express-session" {
  interface SessionData {
    adminUsername: string;
  }
}

const PgStore = connectPgSimple(session);

const app: Express = express();

// Security headers
app.use(helmet());

// Logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// CORS — reflect the request origin with credentials (works for Replit + Vercel)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware — uses PostgreSQL-backed store when DATABASE_URL is set
// (required for Vercel serverless where in-memory state is not shared between invocations)
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  logger.warn(
    "SESSION_SECRET is not set — using insecure fallback. Set it in environment variables."
  );
}

const sessionStore = process.env.DATABASE_URL
  ? new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: 24 * 60 * 60, // 24 hours
    })
  : undefined;

app.use(
  session({
    store: sessionStore,
    secret: sessionSecret ?? "dev-secret-please-set-SESSION_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

app.use("/api", router);

export default app;
