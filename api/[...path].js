// Vercel serverless catch-all. Every /api/* request lands here and gets
// handed to the Express app. Express handles routing internally.
//
// Uses the single-bracket [...path] pattern (not [[...path]]) because the
// optional variant intermittently 404s on nested URLs like /api/projects/:id
// on the current Vercel runtime.
import app from "../server/src/app.js";

export default function handler(req, res) {
  return app(req, res);
}
