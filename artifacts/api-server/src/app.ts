import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

// Augment express-session with our admin field
declare module "express-session" {
  interface SessionData {
    adminUsername: string;
  }
}

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

// CORS — allow same-origin requests with credentials (frontend is same Replit domain)
app.use(
  cors({
    origin: true, // reflect the request origin
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware — admin auth uses cookie-based sessions
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  logger.warn(
    "SESSION_SECRET is not set — using insecure fallback. Set it in environment variables."
  );
}
app.use(
  session({
    secret: sessionSecret ?? "dev-secret-please-set-SESSION_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  })
);

app.use("/api", router);

export default app;
