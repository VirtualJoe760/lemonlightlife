// Generates a small pool of construction-worker headshots via Google's
// Imagen 3 (Gemini API). Cheap and fast because we make ~40 total, then
// the seeder assigns them deterministically across all 10k crew.
//
// Usage: `npm run generate-headshots` from repo root.
//
// Output: client/public/headshots/{role}-{gender}-{n}.png
//
// If Imagen 3 is unavailable on your Gemini tier, this script falls back to
// gemini-2.5-flash-image via generateContent with responseModalities=[Image].
// If BOTH fail, it prints the error and exits non-zero.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../client/public/headshots");

const IMAGEN_MODEL = "imagen-3.0-generate-002";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

// (role, gender, ethnicity/age descriptors) — 40 total.
// Broad demographic mix so the demo doesn't look generic.
const PLAN = [
  ["carpenter",   "male",   "hispanic, 40s, beard, weathered face"],
  ["carpenter",   "female", "black, 30s, hair pulled back, calm expression"],
  ["carpenter",   "male",   "white, 50s, gray beard, kind eyes"],
  ["carpenter",   "male",   "asian, 30s, clean-shaven, focused"],
  ["electrician", "male",   "black, 40s, short hair, confident"],
  ["electrician", "female", "white, 30s, ponytail, professional"],
  ["electrician", "male",   "hispanic, 30s, mustache, direct gaze"],
  ["electrician", "male",   "white, 60s, gray hair, experienced look"],
  ["plumber",     "male",   "white, 40s, ball cap, friendly"],
  ["plumber",     "female", "hispanic, 40s, no-nonsense expression"],
  ["plumber",     "male",   "black, 30s, warm smile"],
  ["roofer",      "male",   "white, 30s, sun-tanned, squinting slightly"],
  ["roofer",      "male",   "hispanic, 20s, athletic build"],
  ["roofer",      "male",   "black, 40s, hard hat under arm"],
  ["hvac",        "female", "asian, 30s, tool bag over shoulder"],
  ["hvac",        "male",   "white, 50s, glasses, seasoned technician"],
  ["hvac",        "male",   "hispanic, 30s, backwards cap"],
  ["mason",       "male",   "hispanic, 50s, weathered hands visible"],
  ["mason",       "male",   "white, 40s, dusty work jacket"],
  ["mason",       "male",   "black, 60s, distinguished, gray beard"],
  ["painter",     "female", "white, 30s, paint-flecked overalls"],
  ["painter",     "male",   "black, 40s, brush in hand"],
  ["painter",     "female", "hispanic, 20s, warm smile"],
  ["drywall",     "male",   "white, 30s, ball cap, dust on shoulders"],
  ["drywall",     "male",   "hispanic, 40s, steady expression"],
  ["flooring",    "male",   "asian, 30s, patient look"],
  ["flooring",    "female", "black, 40s, professional posture"],
  ["tile",        "male",   "hispanic, 30s, precise, focused"],
  ["tile",        "female", "white, 40s, glasses, detail-oriented"],
  ["welder",      "male",   "white, 30s, welding hood pushed up"],
  ["welder",      "male",   "black, 40s, arms crossed, strong build"],
  ["cabinet",     "male",   "asian, 50s, thoughtful, craftsman look"],
  ["cabinet",     "female", "white, 30s, sawdust on apron"],
  ["supervisor",  "male",   "white, 50s, clipboard, hard hat, authoritative"],
  ["supervisor",  "female", "black, 40s, hard hat, radio on belt, sharp"],
  ["supervisor",  "male",   "hispanic, 40s, high-vis vest, confident"],
  ["laborer",     "male",   "hispanic, 20s, young, energetic"],
  ["laborer",     "male",   "black, 30s, gloves in hand, ready to work"],
  ["laborer",     "male",   "white, 20s, ball cap backwards"],
  ["landscaper",  "male",   "white, 40s, sun-tanned, garden gloves"],
];

function promptFor(role, gender, descriptors) {
  return (
    `Professional studio headshot photograph of a ${gender} construction ${role} in the United States. ` +
    `Subject: ${descriptors}. ` +
    `Wearing appropriate work attire (hard hat, safety vest, or trade-specific clothing as fitting). ` +
    `Neutral seamless gray or beige studio background, soft natural lighting, direct eye contact with camera, ` +
    `friendly and confident professional expression, high quality photorealistic, ` +
    `sharp focus on the face, 85mm portrait lens, subtle depth of field.`
  );
}

async function generateImagen3(ai, prompt) {
  const res = await ai.models.generateImages({
    model: IMAGEN_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "1:1",
      personGeneration: "allow_adult",
    },
  });
  const img = res?.generatedImages?.[0]?.image;
  if (!img?.imageBytes) throw new Error("Imagen 3 returned no image bytes");
  return Buffer.from(img.imageBytes, "base64");
}

async function generateGeminiImage(ai, prompt) {
  const res = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
    config: { responseModalities: ["Image", "Text"] },
  });
  const parts = res?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart) throw new Error("Gemini image model returned no inline image");
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

  // Probe which image model this key has access to. Try Imagen 3 first.
  let generator = null;
  let generatorName = null;
  try {
    console.log(`→ probing ${IMAGEN_MODEL}...`);
    await generateImagen3(ai, "test prompt");
    generator = (p) => generateImagen3(ai, p);
    generatorName = IMAGEN_MODEL;
  } catch (err) {
    console.log(`  ${IMAGEN_MODEL} unavailable: ${err.message}`);
    console.log(`→ probing ${GEMINI_IMAGE_MODEL}...`);
    try {
      await generateGeminiImage(ai, "test prompt");
      generator = (p) => generateGeminiImage(ai, p);
      generatorName = GEMINI_IMAGE_MODEL;
    } catch (err2) {
      console.error(`  ${GEMINI_IMAGE_MODEL} also failed: ${err2.message}`);
      process.exit(2);
    }
  }
  console.log(`✓ using ${generatorName}\n`);

  let ok = 0;
  let failed = 0;
  const perRole = {};
  for (let i = 0; i < PLAN.length; i++) {
    const [role, gender, descriptors] = PLAN[i];
    perRole[role] = (perRole[role] || 0) + 1;
    const n = perRole[role];
    const filename = `${role}-${gender}-${String(n).padStart(2, "0")}.png`;
    const outPath = path.join(OUT_DIR, filename);
    try {
      await fs.access(outPath);
      console.log(`[${i + 1}/${PLAN.length}] skip (exists): ${filename}`);
      ok++;
      continue;
    } catch { /* not present, generate */ }

    try {
      const t0 = Date.now();
      const bytes = await generator(promptFor(role, gender, descriptors));
      await fs.writeFile(outPath, bytes);
      console.log(`[${i + 1}/${PLAN.length}] ${filename} (${Date.now() - t0}ms, ${bytes.length} bytes)`);
      ok++;
    } catch (err) {
      console.error(`[${i + 1}/${PLAN.length}] FAILED ${filename}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✔ ${ok} headshots generated, ${failed} failed.`);
  console.log(`  Location: ${OUT_DIR}`);
  console.log(`  Manifest written to: ${path.join(OUT_DIR, "manifest.json")}`);

  // Write manifest so the seeder can enumerate the pool without a dir scan.
  const files = (await fs.readdir(OUT_DIR)).filter((f) => f.endsWith(".png"));
  const manifest = files.map((f) => {
    const m = f.match(/^([a-z]+)-(male|female)-\d+\.png$/);
    return m ? { file: f, role: m[1], gender: m[2] } : { file: f, role: "unknown", gender: "unknown" };
  });
  await fs.writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error("headshot generation failed:", err);
  process.exit(1);
});
