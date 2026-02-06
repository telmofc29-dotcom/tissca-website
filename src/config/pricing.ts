/**
 * Pricing Configuration
 * ====================
 * Single source of truth for pricing modes and professional benchmark rates.
 * 
 * Positioning: All pricing reflects PROFESSIONAL-QUALITY WORKMANSHIP.
 * These are EDUCATIONAL benchmarks, not market averages.
 * 
 * Modes:
 * - Budget: Cost-conscious approach, basic quality, shorter timelines
 * - Standard: Professional standard, typical market quality, standard pace
 * - Premium: TISSCA Pro Benchmark, high-quality, meticulous finishes, longer timelines
 */

export type PricingMode = 'budget' | 'standard' | 'premium';

export interface TradeRate {
  budget: number;     // £/day budget rate
  standard: number;   // £/day standard rate
  premium: number;    // £/day premium benchmark rate
}

export interface TradeProductivity {
  budget: number;      // m²/day or units/day (budget mode)
  standard: number;    // m²/day or units/day (standard mode)
  premium: number;     // m²/day or units/day (premium mode - slower for quality)
}

export interface TradeConfig {
  name: string;
  unit: 'sqm' | 'units' | 'linear-m' | 'item';
  baseProductivity: TradeProductivity;
  dailyRate: TradeRate;
  difficultyMultipliers: {
    easy: number;
    standard: number;
    hard: number;
  };
  notes: string;
}

// =============================================================================
// PRICING MODE MULTIPLIERS
// =============================================================================
export const pricingModeMultipliers = {
  budget: 0.75,      // 25% cheaper than standard
  standard: 1.0,     // baseline
  premium: 1.5,      // 50% more than standard
};

// =============================================================================
// TRADE CONFIGURATIONS
// =============================================================================
export const tradeConfigs: Record<string, TradeConfig> = {
  // EXISTING TRADES
  painting: {
    name: 'Painting (General)',
    unit: 'sqm',
    baseProductivity: {
      budget: 50,      // m²/day
      standard: 35,    // m²/day (standard market pace)
      premium: 25,     // m²/day (meticulous prep, multiple coats, premium finish)
    },
    dailyRate: {
      budget: 80,      // £/day
      standard: 120,   // £/day
      premium: 180,    // £/day (professional benchmark)
    },
    difficultyMultipliers: {
      easy: 0.9,       // Simple walls
      standard: 1.0,   // Normal work
      hard: 1.25,      // Complex surfaces, many obstacles
    },
    notes: 'Includes surface prep, priming (if needed), finishing coats.',
  },

  tiling: {
    name: 'Tiling',
    unit: 'sqm',
    baseProductivity: {
      budget: 18,
      standard: 12,
      premium: 8,      // Premium: slower, meticulous layout, perfect grout lines
    },
    dailyRate: {
      budget: 100,
      standard: 150,
      premium: 220,    // Professional benchmark
    },
    difficultyMultipliers: {
      easy: 0.85,
      standard: 1.0,
      hard: 1.4,       // Complex patterns, mosaics, difficult cuts
    },
    notes: 'Professional tiling includes substrate prep, adhesive, grout, finishing.',
  },

  plastering: {
    name: 'Plastering / Skimming',
    unit: 'sqm',
    baseProductivity: {
      budget: 35,
      standard: 25,
      premium: 15,     // Premium: multiple coats, perfect finish
    },
    dailyRate: {
      budget: 90,
      standard: 130,
      premium: 200,
    },
    difficultyMultipliers: {
      easy: 0.9,
      standard: 1.0,
      hard: 1.3,       // Difficult substrate, repairs needed
    },
    notes: 'Includes substrate prep, base coat (if needed), finish coat.',
  },

  flooring: {
    name: 'Flooring Installation',
    unit: 'sqm',
    baseProductivity: {
      budget: 25,
      standard: 15,
      premium: 10,     // Premium: slow, perfect layout, premium finishes
    },
    dailyRate: {
      budget: 85,
      standard: 140,
      premium: 210,
    },
    difficultyMultipliers: {
      easy: 0.85,
      standard: 1.0,
      hard: 1.35,      // Complex layouts, difficult subfloors
    },
    notes: 'Professional installation: substrate prep, underlays, adhesive, finishing.',
  },

  // NEW SPECIALIST TRADES
  kitchenFitting: {
    name: 'Kitchen Fitting',
    unit: 'item',      // Unit = full kitchen job
    baseProductivity: {
      budget: 0.5,     // 0.5 kitchens/day (2 days)
      standard: 0.4,   // 0.4 kitchens/day (2.5 days)
      premium: 0.25,   // 0.25 kitchens/day (4 days) - meticulous installation
    },
    dailyRate: {
      budget: 100,
      standard: 160,
      premium: 240,
    },
    difficultyMultipliers: {
      easy: 0.9,       // Standard layout, no adaptations
      standard: 1.0,   // Normal kitchen
      hard: 1.4,       // Complex layouts, bespoke work, difficult access
    },
    notes: 'Kitchen fitting: cabinet installation, worktop fitting, appliances, splash backs.',
  },

  bathroomRenovation: {
    name: 'Bathroom Renovation',
    unit: 'item',      // Full bathroom job
    baseProductivity: {
      budget: 0.4,     // 0.4 bathrooms/day (2.5 days)
      standard: 0.3,   // 0.3 bathrooms/day (3+ days)
      premium: 0.2,    // 0.2 bathrooms/day (5 days) - premium finishes
    },
    dailyRate: {
      budget: 110,
      standard: 170,
      premium: 260,
    },
    difficultyMultipliers: {
      easy: 0.85,      // Straightforward layout
      standard: 1.0,   // Standard bathroom
      hard: 1.5,       // Wet rooms, complex plumbing, structural changes
    },
    notes: 'Professional bathroom reno: demolition, plumbing, electrics, tiling, fixtures.',
  },

  wardrobeJoinery: {
    name: 'Wardrobe / Joinery Installation',
    unit: 'linear-m',  // Linear metres
    baseProductivity: {
      budget: 3.0,     // 3 linear metres/day
      standard: 2.0,   // 2 linear metres/day
      premium: 1.2,    // 1.2 linear metres/day (meticulous fitment)
    },
    dailyRate: {
      budget: 95,
      standard: 155,
      premium: 235,
    },
    difficultyMultipliers: {
      easy: 0.85,      // Straight walls
      standard: 1.0,   // Standard room
      hard: 1.4,       // Angles, sloped ceilings, bespoke doors
    },
    notes: 'Professional wardrobe installation: base units, doors, drawers, finishing.',
  },

  carpentry: {
    name: 'Carpentry (General)',
    unit: 'sqm',
    baseProductivity: {
      budget: 20,
      standard: 12,
      premium: 7,      // Premium: bespoke work, fine finishes
    },
    dailyRate: {
      budget: 100,
      standard: 165,
      premium: 250,
    },
    difficultyMultipliers: {
      easy: 0.85,
      standard: 1.0,
      hard: 1.45,      // Bespoke, complex joinery, difficult materials
    },
    notes: 'Carpentry: timber work, fixings, fine carpentry, finishing.',
  },

  electricalFirstFix: {
    name: 'Electrical (First Fix)',
    unit: 'item',      // Per circuit/room
    baseProductivity: {
      budget: 2.0,
      standard: 1.5,
      premium: 1.0,    // Premium: test as you go, premium-quality fixings
    },
    dailyRate: {
      budget: 120,
      standard: 180,
      premium: 270,
    },
    difficultyMultipliers: {
      easy: 0.85,
      standard: 1.0,
      hard: 1.4,       // Complex chasing, difficult access, specialist circuits
    },
    notes: 'First fix electrical: cable runs, testing, Part P compliance checks.',
  },

  electricalSecondFix: {
    name: 'Electrical (Second Fix)',
    unit: 'item',      // Per outlet/switch/fixture
    baseProductivity: {
      budget: 30,      // outlets/day
      standard: 20,
      premium: 12,     // Premium: perfect terminations, aesthetic detailing
    },
    dailyRate: {
      budget: 115,
      standard: 170,
      premium: 255,
    },
    difficultyMultipliers: {
      easy: 0.85,
      standard: 1.0,
      hard: 1.3,       // Difficult wiring, bespoke installations
    },
    notes: 'Second fix: installing outlets, switches, testing, final certification.',
  },

  plumbingFirstFix: {
    name: 'Plumbing (First Fix)',
    unit: 'item',      // Per bathroom / zone
    baseProductivity: {
      budget: 1.0,
      standard: 0.75,
      premium: 0.5,    // Premium: slow, meticulous layout
    },
    dailyRate: {
      budget: 130,
      standard: 190,
      premium: 290,
    },
    difficultyMultipliers: {
      easy: 0.85,
      standard: 1.0,
      hard: 1.45,      // Difficult access, complex routing, specialist work
    },
    notes: 'First fix plumbing: pipe runs, testing, Boxing, insulation.',
  },

  plumbingSecondFix: {
    name: 'Plumbing (Second Fix)',
    unit: 'item',      // Per bathroom / zone
    baseProductivity: {
      budget: 1.5,
      standard: 1.0,
      premium: 0.6,    // Premium: careful installation, perfect positioning
    },
    dailyRate: {
      budget: 125,
      standard: 180,
      premium: 270,
    },
    difficultyMultipliers: {
      easy: 0.85,
      standard: 1.0,
      hard: 1.35,
    },
    notes: 'Second fix: fixture installation, final testing, commissioning.',
  },
};

// =============================================================================
// REGION MULTIPLIERS (UK)
// =============================================================================
export const regionMultipliers: Record<string, number> = {
  london: 1.35,        // 35% premium for London
  'south-east': 1.2,   // 20% premium for South East
  midlands: 1.0,       // Baseline
  north: 0.95,         // 5% cheaper in North
  scotland: 0.98,      // Slight discount
};

// =============================================================================
// PRICING MODE DESCRIPTIONS
// =============================================================================
export const pricingModeDescriptions: Record<PricingMode, string> = {
  budget:
    'Cost-conscious approach. Basic quality, standard materials, quicker timeline. Not suitable for high-end finishes.',
  standard:
    'Professional standard. Typical market quality, conventional materials, standard timeline. Suitable for most residential work.',
  premium:
    'TISSCA Pro Benchmark. Premium finishes, high-quality materials, meticulous workmanship, longer timelines. Suitable for high-end properties and exacting clients.',
};

// =============================================================================
// DISCLAIMER
// =============================================================================
export const pricingDisclaimer =
  'Pricing shown reflects professional-quality benchmark work. Actual costs vary by region, access, design complexity, existing conditions, and material specification. Always obtain multiple quotes from qualified professionals. These figures are for educational and planning purposes only.';

// =============================================================================
// HELPER FUNCTION: GET RATE FOR MODE
// =============================================================================
export function getRateForMode(tradeKey: string, mode: PricingMode): number {
  const trade = tradeConfigs[tradeKey];
  if (!trade) return 0;
  return trade.dailyRate[mode];
}

// =============================================================================
// HELPER FUNCTION: GET PRODUCTIVITY FOR MODE
// =============================================================================
export function getProductivityForMode(
  tradeKey: string,
  mode: PricingMode
): number {
  const trade = tradeConfigs[tradeKey];
  if (!trade) return 1;
  return trade.baseProductivity[mode];
}

// =============================================================================
// HELPER FUNCTION: APPLY REGION MODIFIER
// =============================================================================
export function applyRegionMultiplier(
  amount: number,
  region?: string
): number {
  if (!region) return amount;
  const multiplier = regionMultipliers[region] || 1.0;
  return amount * multiplier;
}
