// Shared ranker used by /api/search and the search_subcontractors tool
// inside /api/chat.
//
// Implementation note: we score in JS on top of a Mongo pre-filter rather
// than using Atlas Search $search. At 10k records this stays well under
// 100ms, requires zero Atlas Search index setup, and keeps the scoring
// logic trivially inspectable. When the roster grows past ~200k, migrate
// to the aggregation pipeline documented in docs/architecture/search-flow.md.

import { Subcontractor } from "./models/Subcontractor.js";
import { CITIES } from "../../shared/cities.js";

const CANDIDATE_LIMIT = 500;
const RESULT_LIMIT = 10;
const DEFAULT_RADIUS_MI = 30;

const WEIGHTS = {
  role: 0.30,
  specialization: 0.30,
  geo: 0.25,
  rating: 0.15,
};

function resolveLocation(location) {
  if (!location?.city) return null;
  const wantCity = location.city.trim().toLowerCase();
  const wantState = (location.state || "CA").trim().toUpperCase();
  const match = CITIES.find(
    (c) => c.city.toLowerCase() === wantCity && c.state === wantState
  );
  if (!match) return null;
  return { lng: match.lng, lat: match.lat, city: match.city, state: match.state };
}

function haversineMi(lng1, lat1, lng2, lat2) {
  const R = 3958.8; // earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function specializationMatch(specs, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { matched: [], score: 0.5 };
  }
  const wants = requiredSkills.map((s) => s.toLowerCase());
  const matched = specs.filter((s) => {
    const skill = s.skill.toLowerCase();
    return wants.some((w) => skill.includes(w) || w.includes(skill));
  });
  if (matched.length === 0) return { matched: [], score: 0 };
  // Sum of matched levels, normalized to (5 * number of requested skills).
  // Capped at 1.0 in case one crew matches multiple ways for one skill.
  const total = matched.reduce((s, m) => s + m.level, 0);
  const denom = 5 * requiredSkills.length;
  return { matched, score: Math.min(1, total / denom) };
}

function roleOverlap(crewRoles, wantedRoles) {
  if (!wantedRoles || wantedRoles.length === 0) return 0.5;
  const set = new Set(wantedRoles);
  const hits = crewRoles.filter((r) => set.has(r)).length;
  return hits / wantedRoles.length;
}

/**
 * Rank subcontractors for a set of parsed filters.
 * @param {Object} filters
 * @param {string[]} [filters.roles]
 * @param {string[]} [filters.requiredSkills]
 * @param {{ city: string, state?: string }} [filters.location]
 * @param {number} [filters.radiusMi]
 * @returns {Promise<{ results: Array, resolvedLocation: object|null }>}
 */
export async function rank(filters = {}) {
  const roles = Array.isArray(filters.roles) ? filters.roles : [];
  const requiredSkills = Array.isArray(filters.requiredSkills) ? filters.requiredSkills : [];
  const radiusMi = Number.isFinite(filters.radiusMi) ? filters.radiusMi : DEFAULT_RADIUS_MI;
  const resolvedLocation = resolveLocation(filters.location);

  const mongoFilter = { bookingStatus: "available" };
  if (roles.length > 0) mongoFilter.roles = { $in: roles };

  // Pre-filter to a reasonable candidate pool. If a location is given, use
  // $geoNear-style filtering via $geoWithin to reduce candidate count.
  let candidateQuery;
  if (resolvedLocation) {
    candidateQuery = Subcontractor.find({
      ...mongoFilter,
      location: {
        $geoWithin: {
          $centerSphere: [
            [resolvedLocation.lng, resolvedLocation.lat],
            radiusMi / 3958.8, // radians
          ],
        },
      },
    });
  } else {
    candidateQuery = Subcontractor.find(mongoFilter);
  }

  const candidates = await candidateQuery.limit(CANDIDATE_LIMIT).lean();

  const scored = candidates.map((c) => {
    const roleScore = roleOverlap(c.roles, roles);
    const { matched: matchedSpecs, score: specScore } = specializationMatch(
      c.specializations || [],
      requiredSkills
    );

    let distanceMi = null;
    let geoScore = 0.5;
    if (resolvedLocation) {
      const [lng, lat] = c.location.coordinates;
      distanceMi = haversineMi(resolvedLocation.lng, resolvedLocation.lat, lng, lat);
      geoScore = Math.max(0, 1 - distanceMi / radiusMi);
    }

    const ratingScore = (c.rating || 3) / 5;

    const matchScore =
      WEIGHTS.role * roleScore +
      WEIGHTS.specialization * specScore +
      WEIGHTS.geo * geoScore +
      WEIGHTS.rating * ratingScore;

    return {
      ...c,
      distanceMi: distanceMi === null ? null : Number(distanceMi.toFixed(1)),
      matchedSpecs,
      roleScore: Number(roleScore.toFixed(3)),
      specializationScore: Number(specScore.toFixed(3)),
      geoScore: Number(geoScore.toFixed(3)),
      matchScore: Number(matchScore.toFixed(3)),
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const results = scored.slice(0, RESULT_LIMIT);

  return { results, resolvedLocation };
}
