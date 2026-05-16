// src/lib/planner/pricing.ts
//
// Pricing engine for the TISSCA planner.
// Centralises price resolution, material multipliers, cost optimisation,
// and quote generation so all UI surfaces share a single source of truth.

import type { PlacedModule, ModuleCategory, LayoutDocument } from './planner-types';
import { MODULE_DEFAULT_PRICES, MODULE_CATEGORY_LABELS } from './planner-types';

// ─── Material Types & Multipliers ────────────────────────────────────────────

export type MaterialType = 'mdf' | 'laminate' | 'veneer' | 'solid_wood' | 'quartz';

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  mdf: 'MDF',
  laminate: 'Laminate',
  veneer: 'Veneer',
  solid_wood: 'Solid Wood',
  quartz: 'Quartz',
};

/** Cost multiplier relative to the base (MDF = 1.0) */
export const MATERIAL_MULTIPLIERS: Record<MaterialType, number> = {
  mdf: 1.0,
  laminate: 1.15,
  veneer: 1.6,
  solid_wood: 2.2,
  quartz: 3.0,
};

export const ALL_MATERIALS: MaterialType[] = ['mdf', 'laminate', 'veneer', 'solid_wood', 'quartz'];

// ─── Price Resolution ────────────────────────────────────────────────────────

/** Resolve effective unit price for a module (own price → category default, with material multiplier). */
export function getModulePrice(mod: Pick<PlacedModule, 'unitPrice' | 'category' | 'materialType'>): number {
  const base = mod.unitPrice ?? MODULE_DEFAULT_PRICES[mod.category] ?? 0;
  const multiplier = mod.materialType
    ? MATERIAL_MULTIPLIERS[mod.materialType as MaterialType] ?? 1.0
    : 1.0;
  return Math.round(base * multiplier);
}

import { formatMinorCurrency } from '@/lib/currency';

/** Format pence as currency string (e.g. 15000 → "£150.00"). */
export function formatPrice(pence: number, currencyCode?: string | null): string {
  return formatMinorCurrency(pence, currencyCode);
}

/** Compute total cost of all modules in pence. */
export function computeTotalCost(modules: PlacedModule[]): number {
  return modules.reduce((sum, mod) => sum + getModulePrice(mod), 0);
}

// ─── Quote Generation ────────────────────────────────────────────────────────

export type QuoteLineItem = {
  moduleId: string;
  label: string;
  category: ModuleCategory;
  categoryLabel: string;
  widthMM: number;
  material: string;
  unitPricePence: number;
  quantity: number;
  lineTotalPence: number;
};

export type QuoteCategorySummary = {
  category: ModuleCategory;
  categoryLabel: string;
  count: number;
  totalWidthMM: number;
  totalPence: number;
};

export type QuoteWallSummary = {
  wallId: string;
  wallLabel: string;
  count: number;
  totalPence: number;
};

/** Client details attached to a quote. */
export type QuoteClient = {
  name: string;
  address: string;
  projectName: string;
};

/** Profit and labour settings. */
export type QuoteMargins = {
  /** Markup percentage (e.g. 20 = 20%) */
  markupPercent: number;
  /** Fixed labour cost in pence */
  labourPence: number;
};

export type GeneratedQuote = {
  generatedAt: string;
  /** Optional client details */
  client?: QuoteClient;
  lineItems: QuoteLineItem[];
  categories: QuoteCategorySummary[];
  walls: QuoteWallSummary[];
  totalUnits: number;
  totalLinearMM: number;
  /** Materials cost (before markup & labour) */
  totalPence: number;
  /** Margin settings used */
  margins?: QuoteMargins;
  /** Labour cost in pence */
  labourPence: number;
  /** Markup amount in pence */
  markupPence: number;
  /** Final sell price (materials + markup + labour) */
  sellPricePence: number;
  /** Profit (sell price − materials cost − labour) */
  profitPence: number;
  /** Layout reference */
  layoutId?: string;
  layoutName?: string;
};

/** Generate a structured quote from the current layout. */
export function generateQuote(
  layout: LayoutDocument,
  options?: {
    client?: QuoteClient;
    margins?: QuoteMargins;
    layoutId?: string;
    layoutName?: string;
  },
): GeneratedQuote {
  const { placedModules, room } = layout;
  const margins = options?.margins;

  // Line items
  const lineItems: QuoteLineItem[] = placedModules.map((mod) => {
    const price = getModulePrice(mod);
    return {
      moduleId: mod.id,
      label: mod.label,
      category: mod.category,
      categoryLabel: MODULE_CATEGORY_LABELS[mod.category] || mod.category,
      widthMM: mod.width,
      material: mod.materialType
        ? MATERIAL_LABELS[mod.materialType as MaterialType] ?? mod.materialType
        : 'Standard',
      unitPricePence: price,
      quantity: 1,
      lineTotalPence: price,
    };
  });

  // Category summaries
  const catMap = new Map<ModuleCategory, QuoteCategorySummary>();
  for (const item of lineItems) {
    const existing = catMap.get(item.category);
    if (existing) {
      existing.count += item.quantity;
      existing.totalWidthMM += item.widthMM;
      existing.totalPence += item.lineTotalPence;
    } else {
      catMap.set(item.category, {
        category: item.category,
        categoryLabel: item.categoryLabel,
        count: item.quantity,
        totalWidthMM: item.widthMM,
        totalPence: item.lineTotalPence,
      });
    }
  }
  const categories = Array.from(catMap.values()).sort((a, b) => b.totalPence - a.totalPence);

  // Wall summaries
  const wallMap = new Map<string, QuoteWallSummary>();
  for (const mod of placedModules) {
    const wallId = mod.wall_id ?? '__free';
    const wall = room.walls.find((w) => w.id === wallId);
    const wallLabel = wall?.label ?? 'Free-standing';
    const price = getModulePrice(mod);
    const existing = wallMap.get(wallId);
    if (existing) {
      existing.count++;
      existing.totalPence += price;
    } else {
      wallMap.set(wallId, { wallId, wallLabel, count: 1, totalPence: price });
    }
  }
  const walls = Array.from(wallMap.values()).sort((a, b) => b.totalPence - a.totalPence);

  const totalPence = lineItems.reduce((s, i) => s + i.lineTotalPence, 0);
  const totalLinearMM = lineItems.reduce((s, i) => s + i.widthMM, 0);

  // Profit & labour calculations
  const markupPercent = margins?.markupPercent ?? 0;
  const labourPence = margins?.labourPence ?? 0;
  const markupPence = Math.round(totalPence * (markupPercent / 100));
  const sellPricePence = totalPence + markupPence + labourPence;
  const profitPence = markupPence;

  return {
    generatedAt: new Date().toISOString(),
    client: options?.client,
    lineItems,
    categories,
    walls,
    totalUnits: placedModules.length,
    totalLinearMM,
    totalPence,
    margins,
    labourPence,
    markupPence,
    sellPricePence,
    profitPence,
    layoutId: options?.layoutId,
    layoutName: options?.layoutName,
  };
}

// ─── Cost Optimisation ───────────────────────────────────────────────────────

export type CostOptimisation = {
  moduleId: string;
  moduleLabel: string;
  currentPricePence: number;
  suggestedCategory: ModuleCategory;
  suggestedLabel: string;
  suggestedPricePence: number;
  savingPence: number;
  reason: string;
};

/** Category substitution map: expensive → cheaper alternative with same role. */
const CHEAPER_ALTERNATIVES: Partial<Record<ModuleCategory, { category: ModuleCategory; reason: string }>> = {
  drawer_unit: { category: 'base_cabinet', reason: 'Replace drawer unit with base cabinet (shelves instead of drawers)' },
  tall_cabinet: { category: 'wardrobe_single', reason: 'Replace tall cabinet with wardrobe module (simpler construction)' },
  wardrobe_double: { category: 'wardrobe_single', reason: 'Replace double wardrobe with two singles (more flexible)' },
};

/** Material downgrade path: expensive → cheaper material. */
const CHEAPER_MATERIALS: Partial<Record<MaterialType, { material: MaterialType; reason: string }>> = {
  quartz: { material: 'laminate', reason: 'Switch from quartz to laminate finish' },
  solid_wood: { material: 'veneer', reason: 'Switch from solid wood to veneer finish' },
  veneer: { material: 'laminate', reason: 'Switch from veneer to laminate finish' },
  laminate: { material: 'mdf', reason: 'Switch from laminate to MDF finish' },
};

/** Analyse the layout and suggest cost optimisations. */
export function suggestOptimisations(modules: PlacedModule[]): CostOptimisation[] {
  const suggestions: CostOptimisation[] = [];

  for (const mod of modules) {
    const currentPrice = getModulePrice(mod);

    // 1. Material downgrade
    if (mod.materialType) {
      const downgrade = CHEAPER_MATERIALS[mod.materialType as MaterialType];
      if (downgrade) {
        const cheaperPrice = getModulePrice({ ...mod, materialType: downgrade.material });
        if (cheaperPrice < currentPrice) {
          suggestions.push({
            moduleId: mod.id,
            moduleLabel: mod.label,
            currentPricePence: currentPrice,
            suggestedCategory: mod.category,
            suggestedLabel: mod.label,
            suggestedPricePence: cheaperPrice,
            savingPence: currentPrice - cheaperPrice,
            reason: downgrade.reason,
          });
        }
      }
    }

    // 2. Category substitution
    const alt = CHEAPER_ALTERNATIVES[mod.category];
    if (alt) {
      const altPrice = getModulePrice({ ...mod, category: alt.category });
      if (altPrice < currentPrice) {
        suggestions.push({
          moduleId: mod.id,
          moduleLabel: mod.label,
          currentPricePence: currentPrice,
          suggestedCategory: alt.category,
          suggestedLabel: `${MODULE_CATEGORY_LABELS[alt.category]} ${mod.width}`,
          suggestedPricePence: altPrice,
          savingPence: currentPrice - altPrice,
          reason: alt.reason,
        });
      }
    }
  }

  // Sort by highest saving first
  return suggestions.sort((a, b) => b.savingPence - a.savingPence);
}
