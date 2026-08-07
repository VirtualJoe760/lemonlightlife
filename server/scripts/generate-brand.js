// Generates the Kristel Match brand marks — logo + favicon — via
// gemini-3.1-flash-image. The design cue is the butterfly roof (V-shape
// inverted, wings-out) that William Krisel popularized across the
// Coachella Valley in the 1950s-60s. Writes to client/public/.
//
// One-time script. Re-run to iterate on the design.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../client/public");
const MODEL = "gemini-3.1-flash-image";

const MARKS = [
  {
    name: "logo.png",
    prompt:
      "Minimalist geometric app logo icon: a stylized butterfly roof — the mid-century modern architectural silhouette of two roof planes meeting in a low V-shape at the middle, wings angled up and outward like a shallow bird in flight. Palm Springs desert modernism aesthetic. " +
      "Solid warm construction orange color (Pantone 165). " +
      "TRANSPARENT BACKGROUND — output must be a PNG with an alpha channel, background pixels fully transparent (alpha=0). No solid background of any color. No colored fill outside the mark itself. No frame, no border, no circle, no rounded rectangle behind the mark. " +
      "Flat vector style, single color mark, no gradient, no shadow, no text, no letters. " +
      "Centered composition, square canvas, symmetric.",
  },
  {
    name: "favicon.png",
    prompt:
      "Simple bold favicon: a stylized butterfly roof — an inverted V-shape with slight downward slope at the center — rendered as a solid warm orange silhouette. " +
      "TRANSPARENT BACKGROUND — output must be a PNG with an alpha channel, background pixels fully transparent (alpha=0). No solid background, no frame, no circle. " +
      "Absolute minimum detail. Reads clearly at 32x32 pixels. Flat, no gradient, no shadow, no text. " +
      "Square canvas, thick lines, high contrast, centered.",
  },
];

async function generateOne(ai, prompt) {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseModalities: ["Image", "Text"] },
  });
  const parts = res?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart) throw new Error("no inline image returned");
  return Buffer.from(imagePart.inlineData.data, "base64");
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not set");
    process.exit(1);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  for (const { name, prompt } of MARKS) {
    const outPath = path.join(OUT_DIR, name);
    console.log(`→ generating ${name}...`);
    const t0 = Date.now();
    try {
      const bytes = await generateOne(ai, prompt);
      await fs.writeFile(outPath, bytes);
      console.log(`  ✓ ${name} (${Date.now() - t0}ms, ${bytes.length} bytes)`);
    } catch (err) {
      console.error(`  ✘ ${name} failed: ${err.message}`);
    }
  }
  console.log(`\nOutput: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("brand generation failed:", err);
  process.exit(1);
});
