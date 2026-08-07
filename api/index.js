// Vercel serverless entry. All /api/* requests are rewritten to here by
// vercel.json, then Express handles internal routing.
import app from "../server/src/app.js";

export default function handler(req, res) {
  return app(req, res);
}
