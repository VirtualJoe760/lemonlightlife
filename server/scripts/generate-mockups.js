// Generates ~6 UI mockup + vibe reference images via Google's Imagen 3.
// Purely for visual direction — these are references saved to
// docs/architecture/ui-references/mockups/, NOT used at runtime.
//
// Usage: `node --env-file=../.env scripts/generate-mockups.js` from /server,
// or `npm run generate-mockups` from repo root.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../docs/architecture/ui-references/mockups");

const IMAGEN_MODEL = "imagen-3.0-generate-002";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

const MOCKUPS = [
  {
    name: "01-hero-homepage.png",
    aspect: "16:9",
    prompt:
      "A modern SaaS landing page hero for a construction crew matching app called 'Construction Matchmaker'. " +
      "Clean minimal design with a soft gradient background (subtle pink to purple blur blobs like the Tailwind UI hero style). " +
      "Left side has a slim dark navigation sidebar with icon menu (Home, Chat, Team, Projects, Account). " +
      "Center headline reads 'Find the right crew for every job.' with a smaller subheadline underneath. " +
      "Prominent orange 'Get Started' call-to-action button. " +
      "Style: modern web app screenshot, clean typography, generous whitespace, professional B2B tone.",
  },
  {
    name: "02-chat-mobile.png",
    aspect: "9:16",
    prompt:
      "A modern mobile chat interface screenshot for a construction crew matching app. " +
      "Full-screen chat like Claude or ChatGPT on iPhone. " +
      "Message bubbles show a general contractor asking 'I need a licensed electrician in Palm Desert tomorrow for a kitchen rewire' " +
      "and an assistant reply below showing rich cards of construction workers with photos, names, roles, and orange 'Select' buttons. " +
      "Sticky text input at the bottom. Clean, minimal, mobile-first, professional. " +
      "Style: high-fidelity mobile UI mockup, iPhone frame, natural iOS status bar at top.",
  },
  {
    name: "03-team-grid-results.png",
    aspect: "16:9",
    prompt:
      "A team section on a modern construction contractor web app showing a grid of subcontractor cards. " +
      "Three columns of cards, each with a large square photograph of a diverse construction worker (electrician, plumber, carpenter, etc.) " +
      "wearing hard hats and work clothing, name below the photo, role (e.g. 'Electrician · Palm Desert · 3 mi'), " +
      "small colored badges showing specializations (Expert, Strong, Proficient), " +
      "green 'Available' status chip, and an orange 'Select' button. " +
      "Left sidebar navigation visible. Clean, professional, generous whitespace. " +
      "Style: high-fidelity web app UI mockup screenshot.",
  },
  {
    name: "04-vibe-foreman-tablet.png",
    aspect: "3:2",
    prompt:
      "Photorealistic candid photograph of a general contractor foreman in his 40s on a residential " +
      "construction job site in Southern California, holding a tablet showing a matchmaking app. " +
      "He's wearing a hard hat and safety vest, framing lumber and desert sun visible in background. " +
      "Late afternoon golden-hour lighting, shallow depth of field, 50mm lens, documentary photography style. " +
      "Realistic, natural, unposed feeling.",
  },
  {
    name: "05-vibe-diverse-crew.png",
    aspect: "3:2",
    prompt:
      "Photorealistic candid photograph of a diverse construction crew of 5 subcontractors (mix of ages, " +
      "genders, ethnicities — electrician, plumber, carpenter, painter, and a female foreman with clipboard) " +
      "standing together on a residential job site in Southern California. " +
      "Palm trees and stucco walls visible in the background. " +
      "Bright natural lighting, wide-angle group shot, documentary photography, warm and professional. " +
      "Everyone in work clothing appropriate to their trade.",
  },
  {
    name: "06-vibe-desert-jobsite.png",
    aspect: "3:2",
    prompt:
      "Photorealistic photograph of a residential construction site in the Coachella Valley — a modern " +
      "mid-century-style home being built with mountains and desert landscape in the background. " +
      "Construction workers visible in the foreground working on framing, sunny day with dramatic desert sky. " +
      "Wide-angle architectural photography, golden hour, professional real estate / architectural photography style.",
  },
];

async function tryImagen3(ai, prompt, aspect) {
  const res = await ai.models.generateImages({
    model: IMAGEN_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: aspect,
      personGeneration: "allow_adult",
    },
  });
  const img = res?.generatedImages?.[0]?.image;
  if (!img?.imageBytes) throw new Error("Imagen 3 returned no image bytes");
  return Buffer.from(img.imageBytes, "base64");
}

async function tryGeminiImage(ai, prompt) {
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
    console.error("✘ GEMINI_API_KEY not set (checked .env + system env).");
    console.error("  Add it to F:\\web-clients\\lemonlight\\.env or your shell.");
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });

  // Probe which image model this key has access to.
  let generator = null;
  let generatorName = null;
  try {
    console.log(`→ probing ${IMAGEN_MODEL}...`);
    await tryImagen3(ai, "test prompt", "1:1");
    generator = (p, a) => tryImagen3(ai, p, a);
    generatorName = IMAGEN_MODEL;
  } catch (err) {
    console.log(`  ${IMAGEN_MODEL} unavailable: ${err.message}`);
    console.log(`→ probing ${GEMINI_IMAGE_MODEL}...`);
    try {
      await tryGeminiImage(ai, "test prompt");
      // gemini-2.5-flash-image doesn't accept aspect ratio the same way; caller ignores it
      generator = (p) => tryGeminiImage(ai, p);
      generatorName = GEMINI_IMAGE_MODEL;
    } catch (err2) {
      console.error(`✘ ${GEMINI_IMAGE_MODEL} also failed: ${err2.message}`);
      process.exit(2);
    }
  }
  console.log(`✓ using ${generatorName}\n`);

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < MOCKUPS.length; i++) {
    const { name, prompt, aspect } = MOCKUPS[i];
    const outPath = path.join(OUT_DIR, name);
    try {
      await fs.access(outPath);
      console.log(`[${i + 1}/${MOCKUPS.length}] skip (exists): ${name}`);
      ok++;
      continue;
    } catch { /* not present, generate */ }

    try {
      const t0 = Date.now();
      const bytes = await generator(prompt, aspect);
      await fs.writeFile(outPath, bytes);
      console.log(`[${i + 1}/${MOCKUPS.length}] ${name} (${Date.now() - t0}ms, ${bytes.length} bytes)`);
      ok++;
    } catch (err) {
      console.error(`[${i + 1}/${MOCKUPS.length}] FAILED ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✔ ${ok} mockups generated, ${failed} failed.`);
  console.log(`  Location: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("mockup generation failed:", err);
  process.exit(1);
});
