// Wipes and reseeds the subcontractors collection with 10,000 records.
// Deterministic via a fixed Faker seed — same run produces the same roster
// (modulo Mongo _ids). Distribution details are documented in
// docs/architecture/seeding.md.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { connectDB } from "../src/db.js";
import { Subcontractor } from "../src/models/Subcontractor.js";
import { ROLES, ROLE_KEYS, SKILL_POOL_BY_ROLE, CERTIFICATIONS } from "../../shared/roles.js";
import { CITIES, pickWeightedCity } from "../../shared/cities.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEADSHOT_MANIFEST = path.resolve(__dirname, "../../client/public/headshots/manifest.json");

const TARGET_COUNT = 10_000;
const BATCH_SIZE = 1_000;
const FAKER_SEED = 42;

const LEVEL_DIST = [       // cumulative — 5%,25%,60%,85%,100%
  { level: 1, cum: 0.05 },
  { level: 2, cum: 0.25 },
  { level: 3, cum: 0.60 },
  { level: 4, cum: 0.85 },
  { level: 5, cum: 1.00 },
];

const AVAILABILITY = [
  { status: "available",   cum: 0.70 },
  { status: "booked",      cum: 0.90 },
  { status: "unavailable", cum: 1.00 },
];

// Hourly-rate range by role bucket (USD). Broad and realistic.
const RATE_BY_ROLE = {
  electrician:  [65, 125], plumber:      [65, 125], hvac:        [55, 105],
  supervisor:   [60, 110], glazier:      [55, 100], welder:       [55, 100],
  carpenter:    [50, 95],  cabinet:      [50, 95],  solar:        [55, 100],
  roofer:       [45, 90],  mason:        [45, 85],  concrete:     [45, 85],
  tile:         [45, 85],  flooring:     [45, 85],  excavator:    [50, 90],
  painter:      [40, 75],  drywall:      [40, 75],  siding:       [40, 75],
  insulation:   [40, 75],  foundation:   [45, 85],  waterproofing:[45, 85],
  demolition:   [30, 60],  landscaper:   [30, 60],  gutter:       [30, 55],
  laborer:      [22, 45],
};

function pickWeighted(items, rng) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) { r -= item.weight; if (r <= 0) return item; }
  return items[items.length - 1];
}

function pickByCum(dist, rng) {
  const r = rng();
  for (const entry of dist) if (r <= entry.cum) return entry;
  return dist[dist.length - 1];
}

function bellSampledInt(min, max, mode, rng) {
  // Simple triangular-ish distribution: two uniform draws averaged, biased toward `mode`.
  const t = (rng() + rng()) / 2;             // 0..1, bell around 0.5
  const shift = (mode - (min + max) / 2) / (max - min); // shift bell toward mode
  const biased = Math.max(0, Math.min(1, t + shift * 0.5));
  return Math.round(min + biased * (max - min));
}

function bellSampledFloat(min, max, mode, rng) {
  const t = (rng() + rng()) / 2;
  const shift = (mode - (min + max) / 2) / (max - min);
  const biased = Math.max(0, Math.min(1, t + shift * 0.5));
  return min + biased * (max - min);
}

function hash32(str) {
  const h = crypto.createHash("sha256").update(str).digest();
  return h.readUInt32BE(0);
}

async function loadHeadshotManifest() {
  try {
    const raw = await fs.readFile(HEADSHOT_MANIFEST, "utf8");
    const list = JSON.parse(raw);
    // Group by role and (role, gender) for fast fallback lookup.
    const byRoleGender = new Map();
    const byGender = new Map();
    const all = [];
    for (const item of list) {
      const rg = `${item.role}::${item.gender}`;
      if (!byRoleGender.has(rg)) byRoleGender.set(rg, []);
      byRoleGender.get(rg).push(item.file);
      if (!byGender.has(item.gender)) byGender.set(item.gender, []);
      byGender.get(item.gender).push(item.file);
      all.push(item.file);
    }
    console.log(`  loaded ${list.length} headshots from manifest`);
    return { byRoleGender, byGender, all, count: list.length };
  } catch {
    console.log("  no headshot manifest found — subcontractors will have null headshotUrl");
    return { byRoleGender: new Map(), byGender: new Map(), all: [], count: 0 };
  }
}

function pickHeadshot(manifest, primaryRole, gender, keyForHash) {
  if (manifest.count === 0) return null;
  const rg = `${primaryRole}::${gender}`;
  const roleGenderPool = manifest.byRoleGender.get(rg);
  const genderPool = manifest.byGender.get(gender);
  const pool = roleGenderPool?.length ? roleGenderPool
    : genderPool?.length ? genderPool
    : manifest.all;
  const idx = hash32(keyForHash) % pool.length;
  return `/headshots/${pool[idx]}`;
}

function generateBio(name, city, primaryRole, topSpecs, years, certs) {
  const [first] = name.split(" ");
  const roleLabel = primaryRole === "hvac" ? "HVAC tech"
    : primaryRole === "supervisor" ? "site supervisor"
    : primaryRole === "laborer" ? "day laborer"
    : primaryRole;
  const topSkillPhrase = topSpecs.length > 0
    ? `Specializes in ${topSpecs.slice(0, 2).map(s => s.skill).join(" and ")}.`
    : "";
  const level5 = topSpecs.find(s => s.level === 5);
  const goToPhrase = level5 ? ` Go-to for ${level5.skill}.` : "";
  const certPhrase = certs.length > 0 ? ` ${certs[0]} certified.` : "";
  const flavor = faker.helpers.arrayElement([
    "Reliable and communicates well.",
    "Known for showing up on time.",
    "Detail-oriented and clean on site.",
    "Strong references from prior GCs.",
    "Straightforward pricing.",
    "Takes pride in the finish.",
  ]);
  return `${first} is a ${city}-based ${roleLabel} with ${years} years on the tools. ${topSkillPhrase}${goToPhrase}${certPhrase} ${flavor}`.trim();
}

function generateSpecializations(roles, yearsExperience, rng) {
  const count = Math.floor(3 + rng() * 4); // 3..6
  const pool = [];
  for (const role of roles) {
    for (const skill of SKILL_POOL_BY_ROLE[role] || []) pool.push({ role, skill });
  }
  if (pool.length === 0) return [];
  faker.helpers.shuffle(pool);
  const picked = pool.slice(0, Math.min(count, pool.length));
  return picked.map(({ skill }) => {
    const level = pickByCum(LEVEL_DIST, rng).level;
    // Years in specialty correlated with level; never exceed overall experience.
    const specYearsFloor = Math.min(yearsExperience, Math.max(0, level - 1));
    const specYearsCeil = Math.min(yearsExperience, level * 3 + 2);
    const yearsInSpecialty = Math.floor(specYearsFloor + rng() * (specYearsCeil - specYearsFloor + 1));
    return { skill, level, yearsInSpecialty };
  });
}

function generateOne(i, manifest) {
  const rng = Math.random; // faker's PRNG has been seeded so Math.random is deterministic via faker.seed
  const gender = faker.person.sex();
  const firstName = faker.person.firstName(gender);
  const lastName = faker.person.lastName();
  const name = `${firstName} ${lastName}`;

  const primary = pickWeighted(ROLES, rng);
  const roles = [primary.key];
  if (rng() < 0.20) {
    const second = pickWeighted(ROLES, rng);
    if (second.key !== primary.key) roles.push(second.key);
  }

  const yearsExperience = bellSampledInt(1, 35, 10, rng);
  const rating = Math.round(bellSampledFloat(1.0, 5.0, 4.3, rng) * 10) / 10;

  const [rateMin, rateMax] = RATE_BY_ROLE[primary.key] || [40, 80];
  const hourlyRate = Math.round(bellSampledInt(rateMin, rateMax, (rateMin + rateMax) / 2, rng));

  const city = pickWeightedCity(rng);
  const jitterLng = (rng() - 0.5) * 0.30;
  const jitterLat = (rng() - 0.5) * 0.30;

  const specializations = generateSpecializations(roles, yearsExperience, rng);
  const topSpecs = [...specializations].sort((a, b) => b.level - a.level);

  const certifications = [];
  if (rng() < 0.40) {
    certifications.push(faker.helpers.arrayElement(CERTIFICATIONS));
    if (rng() < 0.30) {
      const another = faker.helpers.arrayElement(CERTIFICATIONS);
      if (another !== certifications[0]) certifications.push(another);
    }
  }

  const bookingStatus = pickByCum(AVAILABILITY, rng).status;
  const bio = generateBio(name, city.city, primary.key, topSpecs, yearsExperience, certifications);
  const headshotUrl = pickHeadshot(manifest, primary.key, gender, `${name}-${i}`);

  return {
    name, gender, headshotUrl, roles, specializations, yearsExperience,
    city: city.city, county: city.county, state: city.state,
    location: { type: "Point", coordinates: [city.lng + jitterLng, city.lat + jitterLat] },
    hourlyRate, rating, certifications, bookingStatus, bio,
  };
}

async function main() {
  faker.seed(FAKER_SEED);
  console.log("→ connecting to Mongo...");
  await connectDB();

  console.log("→ loading headshot manifest...");
  const manifest = await loadHeadshotManifest();

  console.log("→ dropping existing subcontractors...");
  await Subcontractor.deleteMany({});

  console.log(`→ generating ${TARGET_COUNT.toLocaleString()} subcontractors...`);
  const t0 = Date.now();
  let total = 0;
  for (let batchStart = 0; batchStart < TARGET_COUNT; batchStart += BATCH_SIZE) {
    const batch = [];
    for (let i = 0; i < BATCH_SIZE && batchStart + i < TARGET_COUNT; i++) {
      batch.push(generateOne(batchStart + i, manifest));
    }
    await Subcontractor.insertMany(batch, { ordered: false });
    total += batch.length;
    process.stdout.write(`  ${total.toLocaleString()} / ${TARGET_COUNT.toLocaleString()}\r`);
  }
  console.log(`  ${total.toLocaleString()} / ${TARGET_COUNT.toLocaleString()}`);
  console.log(`  seed insert took ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  console.log("→ ensuring indexes...");
  await Subcontractor.createIndexes();

  // Quick sanity check
  const sample = await Subcontractor.findOne({ bookingStatus: "available" }).lean();
  console.log("\nSample record:");
  console.log(`  ${sample.name} (${sample.gender}) — ${sample.roles.join(", ")} — ${sample.city}, ${sample.county}, ${sample.state}`);
  console.log(`  ${sample.specializations.length} specializations, top: ${sample.specializations.sort((a,b)=>b.level-a.level).slice(0,3).map(s => `${s.skill} L${s.level}`).join(", ")}`);
  console.log(`  ${sample.yearsExperience}yrs · ⭐${sample.rating} · $${sample.hourlyRate}/hr · ${sample.bookingStatus}`);
  console.log(`  headshot: ${sample.headshotUrl || "(none)"}`);

  const counts = await Promise.all([
    Subcontractor.countDocuments({ bookingStatus: "available" }),
    Subcontractor.countDocuments({ bookingStatus: "booked" }),
    Subcontractor.countDocuments({ bookingStatus: "unavailable" }),
  ]);
  console.log(`\nBooking status counts: available=${counts[0]}, booked=${counts[1]}, unavailable=${counts[2]}`);

  await mongoose.disconnect();
  console.log("\n✔ seeded 10000 crew records");
}

main().catch((err) => {
  console.error("✘ seed failed:", err);
  process.exit(1);
});
