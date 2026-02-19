/**
 * Calculation utilities for all constructors
 * Pure functions for reliable, testable calculations
 */

// ============================================================================
// TILING CALCULATOR
// ============================================================================

export function calculateTiling(inputs: {
  area: number;
  tileWidth: number;
  tileHeight: number;
  waste: number;
  adhesiveCoverage: number;
  groutPerSqm?: number;
}) {
  const tileAreaSqm = (inputs.tileWidth * inputs.tileHeight) / 1000000;
  const tilesPerSqm = 1 / tileAreaSqm;
  const tilesNeeded = Math.ceil(inputs.area * tilesPerSqm * (1 + inputs.waste / 100));
  const totalAreaIncWaste = inputs.area * (1 + inputs.waste / 100);

  // Auto-estimate grout if not provided
  let groutPerSqm = inputs.groutPerSqm;
  if (groutPerSqm === undefined) {
    if (tileAreaSqm < 0.04) groutPerSqm = 0.6;
    else if (tileAreaSqm <= 0.09) groutPerSqm = 0.45;
    else groutPerSqm = 0.3;
  }

  const adhesiveBags = Math.ceil(totalAreaIncWaste / inputs.adhesiveCoverage);
  const groutKg = totalAreaIncWaste * groutPerSqm;

  return {
    tileAreaSqm: round(tileAreaSqm, 4),
    tilesPerSqm: round(tilesPerSqm, 2),
    tilesNeeded,
    totalAreaIncWaste: round(totalAreaIncWaste, 2),
    adhesiveBags,
    groutKg: round(groutKg, 1),
  };
}

// ============================================================================
// PAINTING CALCULATOR
// ============================================================================

export function calculatePainting(inputs: {
  wallArea: number;
  ceilingArea: number;
  coats: number;
  paintCoverage: number;
  includePrimer: boolean;
  primerCoverage: number;
  wastage: number;
}) {
  const totalArea = inputs.wallArea + inputs.ceilingArea;
  const paintNeeded = (totalArea * inputs.coats * (1 + inputs.wastage / 100)) / inputs.paintCoverage;
  const paintLitres = Math.ceil(paintNeeded * 2) / 2; // Round to 0.5L

  const primerLitres = inputs.includePrimer
    ? Math.ceil((totalArea * (1 + inputs.wastage / 100)) / inputs.primerCoverage * 2) / 2
    : 0;

  // Suggest tins: 1L, 2.5L, 5L
  const { tins: paintTins } = suggestTins(paintLitres);
  const { tins: primerTins } = inputs.includePrimer ? suggestTins(primerLitres) : { tins: [] };

  return {
    totalArea: round(totalArea, 2),
    paintLitres: round(paintLitres, 1),
    primerLitres: round(primerLitres, 1),
    paintTins,
    primerTins,
  };
}

function suggestTins(litres: number) {
  const sizes = [5, 2.5, 1];
  const tins: { size: number; count: number }[] = [];
  let remaining = litres;

  for (const size of sizes) {
    const count = Math.floor(remaining / size);
    if (count > 0) {
      tins.push({ size, count });
      remaining -= count * size;
    }
  }

  if (remaining > 0) {
    tins.push({ size: 1, count: 1 });
  }

  return { tins };
}

// ============================================================================
// PLASTERING CALCULATOR
// ============================================================================

export function calculatePlastering(inputs: {
  area: number;
  thickness: number;
  productYield: number;
  wastage: number;
  includeBonding: boolean;
  bondingThickness?: number;
  bondingYield?: number;
  waterPerBag?: number;
}) {
  const adjustedArea = inputs.area * (1 + inputs.wastage / 100);
  const bagsRequired = Math.ceil(adjustedArea / inputs.productYield);
  const waterLitres = bagsRequired * (inputs.waterPerBag || 11.5);

  let bondingBags = 0;
  if (inputs.includeBonding) {
    const bondingYield = inputs.bondingYield || 2.5;
    bondingBags = Math.ceil(adjustedArea / bondingYield);
  }

  return {
    adjustedArea: round(adjustedArea, 2),
    bagsRequired,
    waterLitres: round(waterLitres, 1),
    bondingBags,
  };
}

// ============================================================================
// FLOORING CALCULATOR
// ============================================================================

export function calculateFlooring(inputs: {
  length: number;
  width: number;
  waste: number;
  packCoverage: number;
  underlayPackCoverage: number;
}) {
  const roomArea = inputs.length * inputs.width;
  const areaIncWaste = roomArea * (1 + inputs.waste / 100);
  const packsRequired = Math.ceil(areaIncWaste / inputs.packCoverage);
  const underlayPacksRequired = Math.ceil(areaIncWaste / inputs.underlayPackCoverage);
  const perimeter = 2 * (inputs.length + inputs.width);

  return {
    roomArea: round(roomArea, 2),
    areaIncWaste: round(areaIncWaste, 2),
    packsRequired,
    underlayPacksRequired,
    perimeter: round(perimeter, 2),
  };
}

// ============================================================================
// CONCRETE CALCULATOR
// ============================================================================

export function calculateConcrete(inputs: {
  shape: 'slab' | 'footing' | 'post-holes';
  length?: number;
  width?: number;
  depth?: number;
  numHoles?: number;
  holeDiameter?: number;
  waste: number;
  bagYield?: number;
}) {
  let volumeM3 = 0;

  if (inputs.shape === 'slab' || inputs.shape === 'footing') {
    const depthM = (inputs.depth || 0) / 1000;
    volumeM3 = (inputs.length || 0) * (inputs.width || 0) * depthM;
  } else if (inputs.shape === 'post-holes') {
    const depthM = (inputs.depth || 0) / 1000;
    const diameterM = (inputs.holeDiameter || 0) / 1000;
    const holeVolume = Math.PI * Math.pow(diameterM / 2, 2) * depthM;
    volumeM3 = holeVolume * (inputs.numHoles || 0);
  }

  const volumeIncWaste = volumeM3 * (1 + inputs.waste / 100);
  const bagYield = inputs.bagYield || 0.012;
  const bagsRequired = Math.ceil(volumeIncWaste / bagYield);

  // Dry volume (multiply by 1.54 for shrinkage)
  const dryVolume = volumeIncWaste * 1.54;
  // 1:2:4 ratio: cement = 1/7, sand = 2/7, aggregate = 4/7
  const cement = round((dryVolume / 7) * 1440, 0); // 1440 kg/m³ cement density
  const sand = round((dryVolume * 2) / 7, 2);
  const aggregate = round((dryVolume * 4) / 7, 2);

  return {
    volumeM3: round(volumeM3, 3),
    volumeIncWaste: round(volumeIncWaste, 3),
    bagsRequired,
    mixOnSite: {
      dryVolume: round(dryVolume, 3),
      cementKg: cement,
      sandM3: sand,
      aggregateM3: aggregate,
    },
  };
}

// ============================================================================
// INSULATION CALCULATOR
// ============================================================================

export function calculateInsulation(inputs: {
  area: number;
  packCoverage: number;
  waste: number;
}) {
  const areaIncWaste = inputs.area * (1 + inputs.waste / 100);
  const packsRequired = Math.ceil(areaIncWaste / inputs.packCoverage);

  return {
    areaIncWaste: round(areaIncWaste, 2),
    packsRequired,
  };
}

// ============================================================================
// BRICK & BLOCK CALCULATOR
// ============================================================================

export function calculateBrickBlock(inputs: {
  length: number;
  height: number;
  openingsArea: number;
  unitType: 'brick' | 'block';
  unitsPerSqm: number;
  mortarLitresPerSqm: number;
  waste: number;
}) {
  const grossArea = inputs.length * inputs.height;
  const netArea = grossArea - inputs.openingsArea;
  const unitsNeeded = Math.ceil(netArea * inputs.unitsPerSqm * (1 + inputs.waste / 100));
  const mortarLitres = round(netArea * inputs.mortarLitresPerSqm, 1);

  return {
    netArea: round(netArea, 2),
    unitsNeeded,
    mortarLitres,
  };
}

// ============================================================================
// LABOUR ESTIMATOR
// ============================================================================

export function calculateLabour(inputs: {
  trade: 'painting' | 'tiling' | 'plastering' | 'flooring';
  area: number;
  difficulty: 'easy' | 'standard' | 'hard';
  ratePerDay: number;
}) {
  const baseProductivity: Record<string, number> = {
    painting: 35,
    tiling: 12,
    plastering: 25,
    flooring: 25,
  };

  const difficultyMultiplier: Record<string, number> = {
    easy: 0.9,
    standard: 1.0,
    hard: 1.25,
  };

  const productivity = baseProductivity[inputs.trade] * difficultyMultiplier[inputs.difficulty];
  const estimatedDays = round(inputs.area / productivity, 1);
  const labourCost = round(estimatedDays * inputs.ratePerDay, 2);

  return {
    estimatedDays,
    labourCost,
  };
}

// ============================================================================
// MATERIAL WASTE ESTIMATOR
// ============================================================================

export function calculateWaste(inputs: {
  baseQuantity: number;
  waste: number;
}) {
  const wasteQuantity = round((inputs.baseQuantity * inputs.waste) / 100, 2);
  const totalQuantity = round(inputs.baseQuantity + wasteQuantity, 2);

  return {
    wasteQuantity,
    totalQuantity,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function round(num: number, decimals: number = 0): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function validateNumber(value: unknown, min = 0, max = Infinity): number | null {
  let num: number;

  if (typeof value === 'number') num = value;
  else if (typeof value === 'string') num = parseFloat(value);
  else return null;

  if (!Number.isFinite(num) || num < min || num > max) return null;
  return num;
}

export function formatArea(sqm: number): string {
  return `${round(sqm, 2)} m²`;
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${round(kg / 1000, 2)} t`;
  }
  return `${round(kg, 1)} kg`;
}

export function formatVolume(m3: number): string {
  return `${round(m3, 3)} m³`;
}

export function formatCurrency(amount: number): string {
  return `£${round(amount, 2).toLocaleString()}`;
}

// ============================================================================
// KITCHEN CALCULATOR
// ============================================================================

export function calculateKitchen(inputs: {
  cabinetCount: number;
  worktopLength: number; // linear metres
  appliances: number;
  pricingMode: 'budget' | 'standard' | 'premium';
}) {
  const baseLabourDay = inputs.cabinetCount * 0.5 + inputs.worktopLength * 0.3;
  const modeMultiplier = { budget: 0.75, standard: 1.0, premium: 1.5 }[inputs.pricingMode];
  const labourDays = baseLabourDay / modeMultiplier;
  const dailyRate = { budget: 100, standard: 160, premium: 240 }[inputs.pricingMode];
  const labourCost = labourDays * dailyRate;

  return {
    cabinetCount: inputs.cabinetCount,
    worktopLength: inputs.worktopLength,
    appliances: inputs.appliances,
    estimatedDays: round(labourDays, 1),
    labourCost: round(labourCost, 0),
  };
}

// ============================================================================
// BATHROOM CALCULATOR
// ============================================================================

export function calculateBathroom(inputs: {
  floorArea: number;
  wallTilingArea: number;
  fixtureCount: number;
  pricingMode: 'budget' | 'standard' | 'premium';
}) {
  const baseDays = 2.5 + inputs.floorArea * 0.1 + inputs.wallTilingArea * 0.15;
  const modeMultiplier = { budget: 0.75, standard: 1.0, premium: 1.5 }[inputs.pricingMode];
  const labourDays = baseDays / modeMultiplier;
  const dailyRate = { budget: 110, standard: 170, premium: 260 }[inputs.pricingMode];
  const labourCost = labourDays * dailyRate;

  return {
    floorArea: inputs.floorArea,
    wallTilingArea: inputs.wallTilingArea,
    fixtureCount: inputs.fixtureCount,
    estimatedDays: round(labourDays, 1),
    labourCost: round(labourCost, 0),
  };
}

// ============================================================================
// WARDROBE CALCULATOR
// ============================================================================

export function calculateWardrobe(inputs: {
  linearMetres: number;
  doorCount: number;
  drawerCount: number;
  hasLighting: boolean;
  pricingMode: 'budget' | 'standard' | 'premium';
}) {
  const baseDays = inputs.linearMetres * 0.5 + inputs.doorCount * 0.2 + inputs.drawerCount * 0.1 + (inputs.hasLighting ? 0.5 : 0);
  const modeMultiplier = { budget: 0.75, standard: 1.0, premium: 1.5 }[inputs.pricingMode];
  const labourDays = baseDays / modeMultiplier;
  const dailyRate = { budget: 95, standard: 155, premium: 235 }[inputs.pricingMode];
  const labourCost = labourDays * dailyRate;

  return {
    linearMetres: inputs.linearMetres,
    doorCount: inputs.doorCount,
    drawerCount: inputs.drawerCount,
    hasLighting: inputs.hasLighting,
    estimatedDays: round(labourDays, 1),
    labourCost: round(labourCost, 0),
  };
}
