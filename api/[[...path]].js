// Vercel serverless catchall. Every /api/* request lands here and gets
// handed to the Express app. Express handles routing internally.
import app from "../server/src/app.js";

export default function handler(req, res) {
  return app(req, res);
}
