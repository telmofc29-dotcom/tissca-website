/**
 * Shared Calculation Services
 * =============================
 * Pure business logic for all calculations
 * Used by: Web UI, Admin Dashboard, Mobile Apps (iOS/Android)
 *
 * These services contain NO UI logic - just calculations
 * Can be imported by any platform (web, mobile, CLI, API)
 */

import { tradeConfigs, regionMultipliers, type PricingMode, type TradeConfig } from '@/config/pricing';

export interface CalculationInput {
  area?: number;
  trade?: keyof typeof tradeConfigs;
  pricingMode?: PricingMode;
  difficulty?: 'easy' | 'standard' | 'hard';
  region?: string;
  cabinetCount?: number;
  worktopLength?: number;
  appliances?: number;
  floorArea?: number;
  wallTilingArea?: number;
  fixtureCount?: number;
  linearMetres?: number;
  doorCount?: number;
  drawerCount?: number;
  hasLighting?: boolean;
}

export interface CalculationResult {
  estimatedDays: number;
  labourCost: number;
  breakdown?: {
    baseRate: number;
    dailyRate: number;
    difficulty: number;
    region: number;
  };
}

/**
 * Get daily rate for a trade based on pricing mode
 */
export function getDailyRate(trade: TradeConfig, mode: PricingMode): number {
  return trade.dailyRate[mode];
}

/**
 * Get productivity (items/day or sqm/day) based on mode
 */
export function getProductivity(trade: TradeConfig, mode: PricingMode): number {
  return trade.baseProductivity[mode];
}

/**
 * Apply difficulty multiplier to rate
 */
export function applyDifficultyMultiplier(
  rate: number,
  trade: TradeConfig,
  difficulty: 'easy' | 'standard' | 'hard'
): number {
  const multiplier = trade.difficultyMultipliers[difficulty] || 1;
  return rate * multiplier;
}

/**
 * Apply region multiplier to rate
 */
export function applyRegionMultiplier(rate: number, region?: string): number {
  if (!region) return rate;
  const multiplier = regionMultipliers[region as keyof typeof regionMultipliers] || 1;
  return rate * multiplier;
}

/**
 * Core calculation: labour estimate for area-based work
 */
export function calculateAreaBased(input: CalculationInput): CalculationResult {
  if (!input.area || !input.trade || !input.pricingMode) {
    throw new Error('area, trade, and pricingMode are required');
  }

  const trade = tradeConfigs[input.trade];
  if (!trade) throw new Error(`Unknown trade: ${input.trade}`);

  const productivity = getProductivity(trade, input.pricingMode);
  let estimatedDays = input.area / productivity;

  // Apply difficulty
  if (input.difficulty) {
    estimatedDays *= trade.difficultyMultipliers[input.difficulty] || 1;
  }

  // Get daily rate
  let dailyRate = getDailyRate(trade, input.pricingMode);

  // Apply difficulty multiplier to rate
  if (input.difficulty) {
    dailyRate = applyDifficultyMultiplier(dailyRate, trade, input.difficulty);
  }

  // Apply region multiplier
  if (input.region) {
    dailyRate = applyRegionMultiplier(dailyRate, input.region);
  }

  const labourCost = Math.round(estimatedDays * dailyRate);

  return {
    estimatedDays: Math.round(estimatedDays * 10) / 10,
    labourCost,
    breakdown: {
      baseRate: getDailyRate(trade, input.pricingMode),
      dailyRate: Math.round(dailyRate),
      difficulty: input.difficulty
        ? trade.difficultyMultipliers[input.difficulty] || 1
        : 1,
      region: input.region
        ? regionMultipliers[input.region as keyof typeof regionMultipliers] || 1
        : 1,
    },
  };
}

/**
 * Kitchen fitting calculation
 */
export function calculateKitchen(input: CalculationInput): CalculationResult {
  const { cabinetCount = 0, worktopLength = 0, appliances = 0, pricingMode = 'standard' } = input;

  const trade = tradeConfigs.kitchenFitting;
  const productivity = getProductivity(trade, pricingMode);

  // Kitchen: 0.4 jobs/day in standard mode
  // Estimate based on complexity: 12 units + 3m worktop + 3 appliances = 1 job
  const complexityFactor = (cabinetCount * 0.03 + worktopLength * 0.1 + appliances * 0.15) / 2;
  const estimatedDays = Math.max(0.5, complexityFactor / productivity);

  let dailyRate = getDailyRate(trade, pricingMode);
  if (input.difficulty) {
    dailyRate = applyDifficultyMultiplier(dailyRate, trade, input.difficulty);
  }
  if (input.region) {
    dailyRate = applyRegionMultiplier(dailyRate, input.region);
  }

  return {
    estimatedDays: Math.round(estimatedDays * 10) / 10,
    labourCost: Math.round(estimatedDays * dailyRate),
  };
}

/**
 * Bathroom renovation calculation
 */
export function calculateBathroom(input: CalculationInput): CalculationResult {
  const { floorArea = 0, wallTilingArea = 0, fixtureCount = 0, pricingMode = 'standard' } = input;

  const trade = tradeConfigs.bathroomRenovation;
  const productivity = getProductivity(trade, pricingMode);

  // Bathroom: 0.3 jobs/day in standard mode
  // Estimate: 4.5m² floor + 10m² walls + 4 fixtures = 1 job
  const complexityFactor =
    (floorArea * 0.1 + wallTilingArea * 0.07 + fixtureCount * 0.2) / 1.5;
  const estimatedDays = Math.max(0.5, complexityFactor / productivity);

  let dailyRate = getDailyRate(trade, pricingMode);
  if (input.difficulty) {
    dailyRate = applyDifficultyMultiplier(dailyRate, trade, input.difficulty);
  }
  if (input.region) {
    dailyRate = applyRegionMultiplier(dailyRate, input.region);
  }

  return {
    estimatedDays: Math.round(estimatedDays * 10) / 10,
    labourCost: Math.round(estimatedDays * dailyRate),
  };
}

/**
 * Wardrobe/joinery calculation
 */
export function calculateWardrobe(input: CalculationInput): CalculationResult {
  const { linearMetres = 0, doorCount = 0, drawerCount = 0, hasLighting = false, pricingMode = 'standard' } = input;

  const trade = tradeConfigs.wardrobeJoinery;
  const productivity = getProductivity(trade, pricingMode);

  // Wardrobe: 2 linear metres/day in standard mode
  let estimatedDays = linearMetres / productivity;

  // Add complexity for features
  const complexity = doorCount * 0.1 + drawerCount * 0.08 + (hasLighting ? 0.2 : 0);
  estimatedDays *= 1 + complexity;

  let dailyRate = getDailyRate(trade, pricingMode);
  if (input.difficulty) {
    dailyRate = applyDifficultyMultiplier(dailyRate, trade, input.difficulty);
  }
  if (input.region) {
    dailyRate = applyRegionMultiplier(dailyRate, input.region);
  }

  return {
    estimatedDays: Math.round(estimatedDays * 10) / 10,
    labourCost: Math.round(estimatedDays * dailyRate),
  };
}

/**
 * Get all available trades for selection
 */
export function getAvailableTrades() {
  return Object.entries(tradeConfigs).map(([key, config]) => ({
    id: key,
    name: config.name,
    unit: config.unit,
  }));
}

/**
 * Get pricing modes available
 */
export function getPricingModes() {
  return ['budget', 'standard', 'premium'] as const;
}

/**
 * Get regions for adjustment
 */
export function getRegions() {
  return Object.entries(regionMultipliers).map(([key, multiplier]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    multiplier,
  }));
}
