// Canonical role vocabulary for the matchmaker.
//
// - `key` is the canonical name stored on Crew.roles and returned by the LLM parser.
// - `aliases` are the surface forms the regex fallback parser (and the seeder's
//   bio generator) scan for in natural-language descriptions.
// - `weight` biases the seed distribution toward realistic workforce composition.

export const ROLES = [
  { key: "carpenter",     weight: 15, aliases: ["carpenter", "framer", "trim carpenter", "finish carpenter"] },
  { key: "electrician",   weight: 12, aliases: ["electrician", "electrical", "sparky", "rewire"] },
  { key: "plumber",       weight: 10, aliases: ["plumber", "plumbing", "pipe fitter"] },
  { key: "laborer",       weight: 10, aliases: ["general laborer", "day laborer", "helper", "labor"] },
  { key: "painter",       weight: 8,  aliases: ["painter", "painting"] },
  { key: "drywall",       weight: 7,  aliases: ["drywall", "drywaller", "sheetrock"] },
  { key: "hvac",          weight: 7,  aliases: ["hvac", "hvac tech", "heating", "cooling", "ac tech", "furnace"] },
  { key: "roofer",        weight: 6,  aliases: ["roofer", "roofing", "reshingle", "shingle"] },
  { key: "flooring",      weight: 5,  aliases: ["flooring", "hardwood", "laminate", "vinyl", "carpet installer"] },
  { key: "mason",         weight: 4,  aliases: ["mason", "stone mason", "brick mason", "masonry"] },
  { key: "concrete",      weight: 4,  aliases: ["concrete finisher", "concrete", "slab"] },
  { key: "tile",          weight: 4,  aliases: ["tile setter", "tile installer", "tile"] },
  { key: "supervisor",    weight: 4,  aliases: ["project supervisor", "site supervisor", "foreman", "superintendent"] },
  { key: "welder",        weight: 3,  aliases: ["welder", "welding", "iron worker"] },
  { key: "cabinet",       weight: 3,  aliases: ["cabinet maker", "cabinetry", "millwork"] },
  { key: "landscaper",    weight: 3,  aliases: ["landscaper", "landscaping", "hardscape"] },
  { key: "excavator",     weight: 2,  aliases: ["excavator operator", "excavator", "grader operator"] },
  { key: "siding",        weight: 2,  aliases: ["siding installer", "siding"] },
  { key: "insulation",    weight: 2,  aliases: ["insulation installer", "insulation", "spray foam"] },
  { key: "foundation",    weight: 2,  aliases: ["foundation specialist", "foundation", "underpinning"] },
  { key: "glazier",       weight: 2,  aliases: ["glazier", "glass installer", "window installer"] },
  { key: "demolition",    weight: 2,  aliases: ["demolition", "demo crew", "teardown"] },
  { key: "waterproofing", weight: 1,  aliases: ["waterproofing", "basement sealing"] },
  { key: "solar",         weight: 1,  aliases: ["solar installer", "solar panel installer", "pv installer"] },
  { key: "gutter",        weight: 1,  aliases: ["gutter installer", "gutter", "seamless gutter"] },
];

export const ROLE_KEYS = ROLES.map((r) => r.key);

export const SKILL_POOL_BY_ROLE = {
  carpenter:     ["framing", "trim work", "finish carpentry", "door hanging", "deck building", "stair building", "custom built-ins"],
  electrician:   ["residential wiring", "commercial wiring", "panel upgrades", "EV charger install", "smart home wiring", "generator install", "kitchen rewire", "knob-and-tube replacement"],
  plumber:       ["pipe repair", "water heater install", "tankless install", "gas line", "sewer line", "bathroom remodel plumbing", "leak detection", "PEX install"],
  laborer:       ["site cleanup", "material hauling", "framing helper", "general labor", "punch list"],
  painter:       ["interior painting", "exterior painting", "cabinet refinishing", "spray finishing", "epoxy floors"],
  drywall:       ["hanging", "taping", "mudding", "knockdown texture", "orange peel texture", "patch repair"],
  hvac:          ["AC install", "furnace install", "ductwork", "mini-split", "heat pump", "system diagnostic", "commercial rooftop units"],
  roofer:        ["shingle roofing", "metal roofing", "flat roof (TPO/EPDM)", "tile roofing", "leak repair", "gutter install"],
  flooring:      ["hardwood install", "hardwood refinishing", "laminate install", "vinyl plank", "carpet install", "tile transition"],
  mason:         ["brick work", "stone veneer", "chimney restoration", "retaining walls", "outdoor kitchen", "historic restoration"],
  concrete:      ["slab pouring", "stamped concrete", "driveways", "sidewalks", "foundations", "footings"],
  tile:          ["ceramic tile", "porcelain tile", "backsplash", "shower tile", "large format tile", "heated floor prep"],
  supervisor:    ["scheduling", "subcontractor management", "OSHA compliance", "budget tracking", "permit coordination"],
  welder:        ["MIG", "TIG", "stick", "structural steel", "railings", "gates", "custom metal fab"],
  cabinet:       ["custom cabinets", "kitchen install", "vanity install", "closet build-outs", "face frame", "frameless"],
  landscaper:    ["sod install", "paver patios", "retaining walls", "irrigation", "planting design"],
  excavator:     ["site grading", "trenching", "demolition prep", "utility trenches", "pond digging"],
  siding:        ["vinyl siding", "fiber cement", "wood siding", "board and batten", "repair"],
  insulation:    ["blown-in", "batt install", "spray foam", "attic insulation", "rim joist"],
  foundation:    ["slab foundation", "crawl space repair", "basement", "underpinning", "helical piers"],
  glazier:       ["window install", "shower doors", "storefront glass", "mirror install", "curtain wall"],
  demolition:    ["interior demo", "exterior demo", "safe removal (asbestos-aware)", "debris hauling", "selective demo"],
  waterproofing: ["basement waterproofing", "foundation sealing", "sump pump install", "french drains"],
  solar:         ["panel install", "battery install", "system commissioning", "microinverters", "roof mount", "ground mount"],
  gutter:        ["seamless gutter install", "gutter cleaning", "leaf guard install", "downspout repair"],
};

export const CERTIFICATIONS = [
  "OSHA 10",
  "OSHA 30",
  "EPA Lead-Safe (RRP)",
  "EPA 608 (HVAC)",
  "CDL Class B",
  "First Aid / CPR",
  "Journeyman License",
  "Master License",
  "General Contractor License",
  "NABCEP (Solar)",
  "LEED Green Associate",
  "Backflow Certified",
  "Confined Space Certified",
  "Fall Protection Certified",
];
