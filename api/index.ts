/**
 * Vercel serverless entry point.
 * Routes /api/* are rewritten here by vercel.json.
 * The Express app already mounts all routes under /api, so no URL
 * manipulation is needed — the full path is passed through as-is.
 */
import app from "../artifacts/api-server/src/app";

export default app;
