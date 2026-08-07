// Southern California cities across LA, Orange, Riverside, San Bernardino,
// San Diego, and Imperial counties. `weight` biases the seeder toward real
// population density so LA and San Diego dominate, Coachella Valley cities
// get realistic coverage, and small desert/mountain towns still show up.
// Lat/lng are city-center approximations — seeder jitters ±0.15° per crew
// so map markers don't stack on centroids.

export const CITIES = [
  // Los Angeles County
  { city: "Los Angeles",     state: "CA", county: "Los Angeles",     lat: 34.0522, lng: -118.2437, weight: 100 },
  { city: "Long Beach",      state: "CA", county: "Los Angeles",     lat: 33.7701, lng: -118.1937, weight: 55 },
  { city: "Glendale",        state: "CA", county: "Los Angeles",     lat: 34.1425, lng: -118.2551, weight: 40 },
  { city: "Pasadena",        state: "CA", county: "Los Angeles",     lat: 34.1478, lng: -118.1445, weight: 35 },
  { city: "Burbank",         state: "CA", county: "Los Angeles",     lat: 34.1808, lng: -118.3090, weight: 30 },
  { city: "Torrance",        state: "CA", county: "Los Angeles",     lat: 33.8358, lng: -118.3406, weight: 35 },
  { city: "Santa Monica",    state: "CA", county: "Los Angeles",     lat: 34.0195, lng: -118.4912, weight: 30 },
  { city: "Downey",          state: "CA", county: "Los Angeles",     lat: 33.9401, lng: -118.1332, weight: 25 },
  { city: "Inglewood",       state: "CA", county: "Los Angeles",     lat: 33.9617, lng: -118.3531, weight: 25 },
  { city: "West Hollywood",  state: "CA", county: "Los Angeles",     lat: 34.0900, lng: -118.3617, weight: 15 },
  { city: "Beverly Hills",   state: "CA", county: "Los Angeles",     lat: 34.0736, lng: -118.4004, weight: 15 },
  { city: "Culver City",     state: "CA", county: "Los Angeles",     lat: 34.0211, lng: -118.3965, weight: 15 },
  { city: "Manhattan Beach", state: "CA", county: "Los Angeles",     lat: 33.8847, lng: -118.4109, weight: 12 },
  { city: "Redondo Beach",   state: "CA", county: "Los Angeles",     lat: 33.8492, lng: -118.3884, weight: 15 },
  { city: "El Segundo",      state: "CA", county: "Los Angeles",     lat: 33.9192, lng: -118.4165, weight: 10 },
  { city: "Whittier",        state: "CA", county: "Los Angeles",     lat: 33.9792, lng: -118.0328, weight: 20 },
  { city: "Pomona",          state: "CA", county: "Los Angeles",     lat: 34.0551, lng: -117.7500, weight: 30 },
  { city: "Compton",         state: "CA", county: "Los Angeles",     lat: 33.8958, lng: -118.2201, weight: 20 },
  { city: "Norwalk",         state: "CA", county: "Los Angeles",     lat: 33.9022, lng: -118.0817, weight: 20 },
  { city: "Santa Clarita",   state: "CA", county: "Los Angeles",     lat: 34.3917, lng: -118.5426, weight: 35 },
  { city: "Palmdale",        state: "CA", county: "Los Angeles",     lat: 34.5794, lng: -118.1165, weight: 25 },
  { city: "Lancaster",       state: "CA", county: "Los Angeles",     lat: 34.6868, lng: -118.1542, weight: 25 },
  { city: "Malibu",          state: "CA", county: "Los Angeles",     lat: 34.0259, lng: -118.7798, weight: 8 },

  // Orange County
  { city: "Anaheim",         state: "CA", county: "Orange",          lat: 33.8366, lng: -117.9143, weight: 60 },
  { city: "Santa Ana",       state: "CA", county: "Orange",          lat: 33.7455, lng: -117.8677, weight: 55 },
  { city: "Irvine",          state: "CA", county: "Orange",          lat: 33.6846, lng: -117.8265, weight: 55 },
  { city: "Huntington Beach",state: "CA", county: "Orange",          lat: 33.6595, lng: -117.9988, weight: 40 },
  { city: "Newport Beach",   state: "CA", county: "Orange",          lat: 33.6189, lng: -117.9298, weight: 20 },
  { city: "Costa Mesa",      state: "CA", county: "Orange",          lat: 33.6411, lng: -117.9187, weight: 25 },
  { city: "Fullerton",       state: "CA", county: "Orange",          lat: 33.8704, lng: -117.9243, weight: 30 },
  { city: "Orange",          state: "CA", county: "Orange",          lat: 33.7879, lng: -117.8531, weight: 25 },
  { city: "Garden Grove",    state: "CA", county: "Orange",          lat: 33.7739, lng: -117.9414, weight: 30 },
  { city: "Yorba Linda",     state: "CA", county: "Orange",          lat: 33.8886, lng: -117.8131, weight: 15 },
  { city: "Laguna Beach",    state: "CA", county: "Orange",          lat: 33.5427, lng: -117.7854, weight: 10 },
  { city: "Mission Viejo",   state: "CA", county: "Orange",          lat: 33.6000, lng: -117.6720, weight: 20 },
  { city: "San Clemente",    state: "CA", county: "Orange",          lat: 33.4269, lng: -117.6120, weight: 15 },
  { city: "Tustin",          state: "CA", county: "Orange",          lat: 33.7458, lng: -117.8261, weight: 18 },
  { city: "Westminster",     state: "CA", county: "Orange",          lat: 33.7514, lng: -117.9939, weight: 18 },
  { city: "Fountain Valley", state: "CA", county: "Orange",          lat: 33.7092, lng: -117.9536, weight: 15 },
  { city: "Buena Park",      state: "CA", county: "Orange",          lat: 33.8675, lng: -117.9981, weight: 18 },
  { city: "Cypress",         state: "CA", county: "Orange",          lat: 33.8169, lng: -118.0375, weight: 12 },

  // Riverside County (includes Coachella Valley)
  { city: "Riverside",       state: "CA", county: "Riverside",       lat: 33.9533, lng: -117.3962, weight: 50 },
  { city: "Corona",          state: "CA", county: "Riverside",       lat: 33.8753, lng: -117.5664, weight: 35 },
  { city: "Moreno Valley",   state: "CA", county: "Riverside",       lat: 33.9425, lng: -117.2297, weight: 35 },
  { city: "Murrieta",        state: "CA", county: "Riverside",       lat: 33.5539, lng: -117.2140, weight: 25 },
  { city: "Temecula",        state: "CA", county: "Riverside",       lat: 33.4936, lng: -117.1484, weight: 25 },
  { city: "Palm Springs",    state: "CA", county: "Riverside",       lat: 33.8303, lng: -116.5453, weight: 22 },
  { city: "Palm Desert",     state: "CA", county: "Riverside",       lat: 33.7222, lng: -116.3745, weight: 20 },
  { city: "Indio",           state: "CA", county: "Riverside",       lat: 33.7206, lng: -116.2156, weight: 22 },
  { city: "La Quinta",       state: "CA", county: "Riverside",       lat: 33.6634, lng: -116.3100, weight: 15 },
  { city: "Cathedral City",  state: "CA", county: "Riverside",       lat: 33.7797, lng: -116.4664, weight: 15 },
  { city: "Rancho Mirage",   state: "CA", county: "Riverside",       lat: 33.7397, lng: -116.4127, weight: 10 },
  { city: "Coachella",       state: "CA", county: "Riverside",       lat: 33.6803, lng: -116.1739, weight: 15 },
  { city: "Desert Hot Springs", state: "CA", county: "Riverside",    lat: 33.9611, lng: -116.5017, weight: 12 },
  { city: "Hemet",           state: "CA", county: "Riverside",       lat: 33.7475, lng: -116.9720, weight: 22 },
  { city: "Perris",          state: "CA", county: "Riverside",       lat: 33.7825, lng: -117.2286, weight: 18 },
  { city: "Menifee",         state: "CA", county: "Riverside",       lat: 33.6971, lng: -117.1858, weight: 15 },
  { city: "Beaumont",        state: "CA", county: "Riverside",       lat: 33.9295, lng: -116.9770, weight: 10 },
  { city: "Banning",         state: "CA", county: "Riverside",       lat: 33.9256, lng: -116.8763, weight: 8 },

  // San Bernardino County
  { city: "San Bernardino",  state: "CA", county: "San Bernardino",  lat: 34.1083, lng: -117.2898, weight: 40 },
  { city: "Ontario",         state: "CA", county: "San Bernardino",  lat: 34.0633, lng: -117.6509, weight: 35 },
  { city: "Rancho Cucamonga",state: "CA", county: "San Bernardino",  lat: 34.1064, lng: -117.5931, weight: 32 },
  { city: "Fontana",         state: "CA", county: "San Bernardino",  lat: 34.0922, lng: -117.4350, weight: 35 },
  { city: "Chino",           state: "CA", county: "San Bernardino",  lat: 34.0122, lng: -117.6889, weight: 20 },
  { city: "Chino Hills",     state: "CA", county: "San Bernardino",  lat: 33.9898, lng: -117.7326, weight: 15 },
  { city: "Redlands",        state: "CA", county: "San Bernardino",  lat: 34.0556, lng: -117.1825, weight: 20 },
  { city: "Yucaipa",         state: "CA", county: "San Bernardino",  lat: 34.0336, lng: -117.0431, weight: 12 },
  { city: "Colton",          state: "CA", county: "San Bernardino",  lat: 34.0739, lng: -117.3136, weight: 15 },
  { city: "Rialto",          state: "CA", county: "San Bernardino",  lat: 34.1064, lng: -117.3703, weight: 18 },
  { city: "Upland",          state: "CA", county: "San Bernardino",  lat: 34.0975, lng: -117.6484, weight: 18 },
  { city: "Highland",        state: "CA", county: "San Bernardino",  lat: 34.1283, lng: -117.2087, weight: 12 },
  { city: "Big Bear Lake",   state: "CA", county: "San Bernardino",  lat: 34.2439, lng: -116.9114, weight: 6 },

  // San Diego County
  { city: "San Diego",       state: "CA", county: "San Diego",       lat: 32.7157, lng: -117.1611, weight: 85 },
  { city: "Chula Vista",     state: "CA", county: "San Diego",       lat: 32.6401, lng: -117.0842, weight: 40 },
  { city: "Oceanside",       state: "CA", county: "San Diego",       lat: 33.1959, lng: -117.3795, weight: 30 },
  { city: "Escondido",       state: "CA", county: "San Diego",       lat: 33.1192, lng: -117.0864, weight: 25 },
  { city: "Carlsbad",        state: "CA", county: "San Diego",       lat: 33.1581, lng: -117.3506, weight: 22 },
  { city: "El Cajon",        state: "CA", county: "San Diego",       lat: 32.7948, lng: -116.9625, weight: 22 },
  { city: "Vista",           state: "CA", county: "San Diego",       lat: 33.2000, lng: -117.2425, weight: 20 },
  { city: "San Marcos",      state: "CA", county: "San Diego",       lat: 33.1434, lng: -117.1661, weight: 20 },
  { city: "Encinitas",       state: "CA", county: "San Diego",       lat: 33.0370, lng: -117.2920, weight: 15 },
  { city: "National City",   state: "CA", county: "San Diego",       lat: 32.6781, lng: -117.0992, weight: 15 },
  { city: "La Mesa",         state: "CA", county: "San Diego",       lat: 32.7678, lng: -117.0231, weight: 12 },
  { city: "Santee",          state: "CA", county: "San Diego",       lat: 32.8384, lng: -116.9739, weight: 12 },
  { city: "Poway",           state: "CA", county: "San Diego",       lat: 32.9628, lng: -117.0359, weight: 12 },
  { city: "Coronado",        state: "CA", county: "San Diego",       lat: 32.6859, lng: -117.1831, weight: 8 },
  { city: "Del Mar",         state: "CA", county: "San Diego",       lat: 32.9595, lng: -117.2653, weight: 6 },

  // Imperial County
  { city: "El Centro",       state: "CA", county: "Imperial",        lat: 32.7920, lng: -115.5631, weight: 12 },
  { city: "Calexico",        state: "CA", county: "Imperial",        lat: 32.6789, lng: -115.4989, weight: 10 },
  { city: "Brawley",         state: "CA", county: "Imperial",        lat: 32.9787, lng: -115.5303, weight: 6 },
];

export function pickWeightedCity(rng = Math.random) {
  const total = CITIES.reduce((s, c) => s + c.weight, 0);
  let r = rng() * total;
  for (const c of CITIES) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return CITIES[CITIES.length - 1];
}

// Bounding box for map centering + sanity-check on coord jitter.
export const REGION_BOUNDS = {
  minLat: 32.5,   // south of Imperial county
  maxLat: 34.85,  // north of Antelope Valley
  minLng: -118.85, // west of Malibu
  maxLng: -115.35, // east of Calexico
};
