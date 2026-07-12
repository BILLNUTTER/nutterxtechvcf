import { type RequestHandler } from "express";

/**
 * Middleware that requires an active admin session.
 * Returns 401 if the user is not authenticated.
 */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.session?.adminUsername) {
    res.status(401).json({ error: "Unauthorized", message: "Not authenticated." });
    return;
  }
  next();
};
