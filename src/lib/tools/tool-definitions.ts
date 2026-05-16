// src/lib/tools/tool-definitions.ts
//
// ANDROID PARITY: Tool section definitions registry.
// Each tool's visible sections mirror Android's per-tool section contract.
// toolKey values match Android exact strings.
//
// This file is the Website's canonical map of Android tool structure.

import type { ToolKey, CostBucket } from './tool-types';

// ─── Section Field Definition ────────────────────────────────────────────────

export interface ToolFieldDef {
  /** Unique key within the section. */
  key: string;
  /** Display label. */
  label: string;
  /** Default unit (e.g. 'each', 'm²', 'lm', 'hr'). */
  unit: string;
  /** Default cost bucket for auto-classification. */
  defaultBucket: CostBucket;
  /** Placeholder text for description field. */
  placeholder?: string;
}

export interface ToolSectionDef {
  /** Stable key for the section (used in rawPayload). */
  key: string;
  /** Display title matching Android. */
  title: string;
  /** Pre-defined field suggestions for this section. */
  fields: ToolFieldDef[];
}

export interface ToolDefinition {
  /** Android toolKey — exact match. */
  toolKey: ToolKey;
  /** Android toolTitle — exact match. */
  toolTitle: string;
  /** Subtitle if applicable. */
  subtitle?: string;
  /** Emoji icon. */
  icon: string;
  /** Ordered sections matching Android visible structure. */
  sections: ToolSectionDef[];
}

// ─── Android Hub Structure ───────────────────────────────────────────────────

export interface ToolHub {
  title: string;
  icon: string;
  description: string;
  tools: ToolKey[];
}

/**
 * Hub structure mirroring Android.
 * Kitchens, Bathrooms, Bedrooms + standalone trade tools.
 */
export const TOOL_HUBS: ToolHub[] = [
  {
    title: 'Kitchens',
    icon: '🍳',
    description: 'Kitchen fitting and materials calculators.',
    tools: ['kitchen', 'kitchen_materials'],
  },
  {
    title: 'Bathrooms',
    icon: '🚿',
    description: 'Bathroom quick fittings and full renovation calculators.',
    tools: ['bathroom_quick_fittings', 'bathroom_renovation'],
  },
  {
    title: 'Bedrooms',
    icon: '🛏️',
    description: 'Wardrobes, sliding wardrobes, and bedroom joinery.',
    tools: ['bedroom_wardrobes', 'bedroom_sliding_wardrobes'],
    // NOTE: bedside_units, chest_of_drawers, wall_panelling, headboards,
    // shelving, other_joinery are NOT parity-safe yet (Android doesn't
    // fully wire these for attachment reopen/edit).
  },
  {
    title: 'Other Joinery',
    icon: '🪚',
    description: 'Carpentry, shelving, and bespoke joinery work.',
    tools: ['carpentry'],
  },
];

// ─── Tool Definitions ────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS: Record<ToolKey, ToolDefinition> = {
  // ── General Estimate (handled by existing dedicated page) ──
  general_estimate: {
    toolKey: 'general_estimate',
    toolTitle: 'General Estimate',
    icon: '📝',
    sections: [], // General uses its own form structure
  },

  // ── Kitchen Fitting → toolKey: kitchen ──
  kitchen: {
    toolKey: 'kitchen',
    toolTitle: 'Kitchen Fitting',
    subtitle: 'Cabinet installation, worktops, and fitting labour',
    icon: '🍳',
    sections: [
      {
        key: 'base_units',
        title: 'Base Units',
        fields: [
          { key: 'base_standard', label: 'Standard Base Unit', unit: 'each', defaultBucket: 'materials', placeholder: 'e.g. 600mm base unit' },
          { key: 'base_corner', label: 'Corner Base Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'base_drawer', label: 'Drawer Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'base_sink', label: 'Sink Base Unit', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'wall_units',
        title: 'Wall Units',
        fields: [
          { key: 'wall_standard', label: 'Standard Wall Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'wall_corner', label: 'Corner Wall Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'wall_glazed', label: 'Glazed Wall Unit', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'tall_units',
        title: 'Tall Units',
        fields: [
          { key: 'tall_larder', label: 'Larder / Pantry Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'tall_oven', label: 'Oven Housing Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'tall_fridge', label: 'Fridge Housing Unit', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'worktops',
        title: 'Worktops',
        fields: [
          { key: 'worktop_laminate', label: 'Laminate Worktop', unit: 'lm', defaultBucket: 'materials' },
          { key: 'worktop_solid', label: 'Solid Surface Worktop', unit: 'lm', defaultBucket: 'materials' },
          { key: 'worktop_stone', label: 'Stone/Quartz Worktop', unit: 'lm', defaultBucket: 'materials' },
          { key: 'worktop_upstand', label: 'Upstand / Splashback', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'appliances',
        title: 'Appliances',
        fields: [
          { key: 'appliance_oven', label: 'Oven', unit: 'each', defaultBucket: 'materials' },
          { key: 'appliance_hob', label: 'Hob', unit: 'each', defaultBucket: 'materials' },
          { key: 'appliance_extractor', label: 'Extractor Hood', unit: 'each', defaultBucket: 'materials' },
          { key: 'appliance_dishwasher', label: 'Dishwasher', unit: 'each', defaultBucket: 'materials' },
          { key: 'appliance_sink', label: 'Sink & Tap', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'accessories',
        title: 'Accessories & Finishing',
        fields: [
          { key: 'handles', label: 'Handles / Knobs', unit: 'each', defaultBucket: 'materials' },
          { key: 'end_panels', label: 'End Panels', unit: 'each', defaultBucket: 'materials' },
          { key: 'plinths', label: 'Plinths', unit: 'lm', defaultBucket: 'materials' },
          { key: 'cornice_pelmet', label: 'Cornice / Pelmet', unit: 'lm', defaultBucket: 'materials' },
          { key: 'lighting', label: 'Under-Cabinet Lighting', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'fitting_labour', label: 'Kitchen Fitting Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'plumbing_labour', label: 'Plumbing Connection', unit: 'hr', defaultBucket: 'labour' },
          { key: 'electrical_labour', label: 'Electrical Connection', unit: 'hr', defaultBucket: 'labour' },
          { key: 'waste_removal', label: 'Waste Removal', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
    ],
  },

  // ── Kitchen Materials → toolKey: kitchen_materials ──
  kitchen_materials: {
    toolKey: 'kitchen_materials',
    toolTitle: 'Kitchen Materials',
    subtitle: 'Materials-only pricing for kitchen projects',
    icon: '🪵',
    sections: [
      {
        key: 'cabinetry',
        title: 'Cabinetry',
        fields: [
          { key: 'base_units', label: 'Base Units', unit: 'each', defaultBucket: 'materials' },
          { key: 'wall_units', label: 'Wall Units', unit: 'each', defaultBucket: 'materials' },
          { key: 'tall_units', label: 'Tall Units', unit: 'each', defaultBucket: 'materials' },
          { key: 'drawer_units', label: 'Drawer Units', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'worktops',
        title: 'Worktops & Surfaces',
        fields: [
          { key: 'worktop', label: 'Worktop', unit: 'lm', defaultBucket: 'materials' },
          { key: 'splashback', label: 'Splashback', unit: 'm²', defaultBucket: 'materials' },
          { key: 'upstand', label: 'Upstand', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'sinks_taps',
        title: 'Sinks & Taps',
        fields: [
          { key: 'sink', label: 'Sink', unit: 'each', defaultBucket: 'materials' },
          { key: 'tap', label: 'Tap', unit: 'each', defaultBucket: 'materials' },
          { key: 'waste_kit', label: 'Waste Kit', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'hardware',
        title: 'Hardware & Accessories',
        fields: [
          { key: 'handles', label: 'Handles', unit: 'each', defaultBucket: 'materials' },
          { key: 'hinges', label: 'Hinges', unit: 'each', defaultBucket: 'materials' },
          { key: 'drawer_runners', label: 'Drawer Runners', unit: 'pair', defaultBucket: 'materials' },
          { key: 'end_panels', label: 'End Panels', unit: 'each', defaultBucket: 'materials' },
          { key: 'plinths', label: 'Plinths', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
    ],
  },

  // ── Bathroom Quick Fittings → toolKey: bathroom_quick_fittings ──
  bathroom_quick_fittings: {
    toolKey: 'bathroom_quick_fittings',
    toolTitle: 'Bathroom Quick Fittings',
    subtitle: 'Quick fixture and fitting replacement estimates',
    icon: '🚿',
    sections: [
      {
        key: 'fixtures',
        title: 'Fixtures',
        fields: [
          { key: 'toilet', label: 'Toilet / WC', unit: 'each', defaultBucket: 'materials' },
          { key: 'basin', label: 'Basin', unit: 'each', defaultBucket: 'materials' },
          { key: 'bath', label: 'Bath', unit: 'each', defaultBucket: 'materials' },
          { key: 'shower_tray', label: 'Shower Tray', unit: 'each', defaultBucket: 'materials' },
          { key: 'shower_enclosure', label: 'Shower Enclosure', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'taps_showers',
        title: 'Taps & Showers',
        fields: [
          { key: 'basin_taps', label: 'Basin Taps', unit: 'each', defaultBucket: 'materials' },
          { key: 'bath_taps', label: 'Bath Taps', unit: 'each', defaultBucket: 'materials' },
          { key: 'shower_valve', label: 'Shower Valve', unit: 'each', defaultBucket: 'materials' },
          { key: 'shower_head', label: 'Shower Head & Riser', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'accessories',
        title: 'Accessories',
        fields: [
          { key: 'towel_rail', label: 'Towel Rail / Radiator', unit: 'each', defaultBucket: 'materials' },
          { key: 'mirror_cabinet', label: 'Mirror / Cabinet', unit: 'each', defaultBucket: 'materials' },
          { key: 'toilet_roll_holder', label: 'Accessories Set', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'plumbing_labour', label: 'Plumbing Labour', unit: 'hr', defaultBucket: 'labour' },
          { key: 'fitting_labour', label: 'Fitting Labour', unit: 'hr', defaultBucket: 'labour' },
          { key: 'waste_removal', label: 'Waste Removal', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
    ],
  },

  // ── Bathroom Renovation → toolKey: bathroom_renovation ──
  bathroom_renovation: {
    toolKey: 'bathroom_renovation',
    toolTitle: 'Bathroom Renovation',
    subtitle: 'Full bathroom renovation with tiling, plumbing, and fixtures',
    icon: '🛁',
    sections: [
      {
        key: 'strip_out',
        title: 'Strip Out & Preparation',
        fields: [
          { key: 'strip_out', label: 'Strip Out Existing', unit: 'each', defaultBucket: 'labour' },
          { key: 'waste_disposal', label: 'Waste Disposal / Skip', unit: 'each', defaultBucket: 'other_direct_cost' },
          { key: 'floor_prep', label: 'Floor Preparation', unit: 'm²', defaultBucket: 'labour' },
          { key: 'wall_prep', label: 'Wall Preparation', unit: 'm²', defaultBucket: 'labour' },
        ],
      },
      {
        key: 'plumbing',
        title: 'Plumbing',
        fields: [
          { key: 'first_fix', label: 'First Fix Plumbing', unit: 'each', defaultBucket: 'labour' },
          { key: 'second_fix', label: 'Second Fix Plumbing', unit: 'each', defaultBucket: 'labour' },
          { key: 'pipework', label: 'Pipework', unit: 'lm', defaultBucket: 'materials' },
          { key: 'valves', label: 'Valves & Fittings', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'fixtures',
        title: 'Fixtures & Fittings',
        fields: [
          { key: 'toilet', label: 'Toilet / WC', unit: 'each', defaultBucket: 'materials' },
          { key: 'basin', label: 'Basin & Vanity', unit: 'each', defaultBucket: 'materials' },
          { key: 'bath', label: 'Bath', unit: 'each', defaultBucket: 'materials' },
          { key: 'shower', label: 'Shower (enclosure + tray)', unit: 'each', defaultBucket: 'materials' },
          { key: 'taps', label: 'Taps & Mixer', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'tiling',
        title: 'Tiling',
        fields: [
          { key: 'wall_tiles', label: 'Wall Tiles', unit: 'm²', defaultBucket: 'materials' },
          { key: 'floor_tiles', label: 'Floor Tiles', unit: 'm²', defaultBucket: 'materials' },
          { key: 'adhesive', label: 'Adhesive & Grout', unit: 'each', defaultBucket: 'materials' },
          { key: 'tiling_labour', label: 'Tiling Labour', unit: 'm²', defaultBucket: 'labour' },
          { key: 'waterproofing', label: 'Waterproofing / Tanking', unit: 'm²', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'electrical',
        title: 'Electrical',
        fields: [
          { key: 'lighting', label: 'Bathroom Lighting', unit: 'each', defaultBucket: 'materials' },
          { key: 'extractor_fan', label: 'Extractor Fan', unit: 'each', defaultBucket: 'materials' },
          { key: 'heated_mirror', label: 'Heated Mirror / Demister', unit: 'each', defaultBucket: 'materials' },
          { key: 'electrical_labour', label: 'Electrical Labour', unit: 'hr', defaultBucket: 'labour' },
        ],
      },
      {
        key: 'accessories',
        title: 'Accessories & Finishing',
        fields: [
          { key: 'towel_rail', label: 'Towel Rail / Radiator', unit: 'each', defaultBucket: 'materials' },
          { key: 'mirror', label: 'Mirror / Cabinet', unit: 'each', defaultBucket: 'materials' },
          { key: 'silicone_sealant', label: 'Silicone & Sealant', unit: 'each', defaultBucket: 'materials' },
          { key: 'trim', label: 'Tile Trim / Edge Strips', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'project_management', label: 'Project Management', unit: 'day', defaultBucket: 'labour' },
          { key: 'general_labour', label: 'General Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'decoration', label: 'Decoration / Paint Touch-up', unit: 'hr', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Bedroom Wardrobes → toolKey: bedroom_wardrobes ──
  bedroom_wardrobes: {
    toolKey: 'bedroom_wardrobes',
    toolTitle: 'Wardrobes',
    subtitle: 'Built-in and freestanding wardrobe installation',
    icon: '🚪',
    sections: [
      {
        key: 'carcass',
        title: 'Carcass & Frames',
        fields: [
          { key: 'carcass_panels', label: 'Carcass Panels', unit: 'each', defaultBucket: 'materials' },
          { key: 'shelves', label: 'Shelves', unit: 'each', defaultBucket: 'materials' },
          { key: 'hanging_rail', label: 'Hanging Rail', unit: 'lm', defaultBucket: 'materials' },
          { key: 'back_panel', label: 'Back Panel', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'doors',
        title: 'Doors',
        fields: [
          { key: 'hinged_doors', label: 'Hinged Doors', unit: 'each', defaultBucket: 'materials' },
          { key: 'door_hinges', label: 'Door Hinges', unit: 'each', defaultBucket: 'materials' },
          { key: 'handles', label: 'Handles / Knobs', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'internal_fittings',
        title: 'Internal Fittings',
        fields: [
          { key: 'drawers', label: 'Drawers', unit: 'each', defaultBucket: 'materials' },
          { key: 'pull_out_trays', label: 'Pull-out Trays', unit: 'each', defaultBucket: 'materials' },
          { key: 'shoe_rack', label: 'Shoe Rack', unit: 'each', defaultBucket: 'materials' },
          { key: 'lighting', label: 'Internal Lighting', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'assembly_labour', label: 'Assembly & Fitting Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'decoration', label: 'Decoration / Finishing', unit: 'hr', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Bedroom Sliding Wardrobes → toolKey: bedroom_sliding_wardrobes ──
  bedroom_sliding_wardrobes: {
    toolKey: 'bedroom_sliding_wardrobes',
    toolTitle: 'Sliding Wardrobes',
    subtitle: 'Sliding door wardrobe systems',
    icon: '🚪',
    sections: [
      {
        key: 'frame_track',
        title: 'Frame & Track',
        fields: [
          { key: 'top_track', label: 'Top Track', unit: 'lm', defaultBucket: 'materials' },
          { key: 'bottom_track', label: 'Bottom Track', unit: 'lm', defaultBucket: 'materials' },
          { key: 'frame_uprights', label: 'Frame Uprights', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'doors',
        title: 'Sliding Doors',
        fields: [
          { key: 'door_panels', label: 'Door Panels', unit: 'each', defaultBucket: 'materials' },
          { key: 'mirror_panels', label: 'Mirror Panels', unit: 'each', defaultBucket: 'materials' },
          { key: 'door_wheels', label: 'Door Wheels / Rollers', unit: 'set', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'interior',
        title: 'Interior Fitout',
        fields: [
          { key: 'shelves', label: 'Shelves', unit: 'each', defaultBucket: 'materials' },
          { key: 'hanging_rails', label: 'Hanging Rails', unit: 'lm', defaultBucket: 'materials' },
          { key: 'drawers', label: 'Drawers', unit: 'each', defaultBucket: 'materials' },
          { key: 'accessories', label: 'Accessories (tie rack, etc.)', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'fitting_labour', label: 'Fitting Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'adjustment', label: 'Adjustment & Fine-tuning', unit: 'hr', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Flooring → toolKey: flooring ──
  // Android sections: Floor Areas, Flooring Supply, Skirting & Finishing, Labour
  flooring: {
    toolKey: 'flooring',
    toolTitle: 'Flooring',
    subtitle: 'Floor covering, skirting, and finishing',
    icon: '🪵',
    sections: [
      {
        key: 'floor_areas',
        title: 'Floor Areas',
        fields: [
          { key: 'room_area', label: 'Room Area', unit: 'm²', defaultBucket: 'other_direct_cost', placeholder: 'e.g. Living room 24m²' },
          { key: 'waste_allowance', label: 'Waste Allowance', unit: '%', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'flooring_supply',
        title: 'Flooring Supply',
        fields: [
          { key: 'flooring_material', label: 'Flooring Material', unit: 'm²', defaultBucket: 'materials', placeholder: 'e.g. Engineered oak, LVT, Laminate' },
          { key: 'underlay', label: 'Underlay', unit: 'm²', defaultBucket: 'materials' },
          { key: 'adhesive', label: 'Adhesive / Fixings', unit: 'each', defaultBucket: 'materials' },
          { key: 'dpm', label: 'DPM / Moisture Barrier', unit: 'm²', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'skirting_finishing',
        title: 'Skirting & Finishing',
        fields: [
          { key: 'skirting', label: 'Skirting Board', unit: 'lm', defaultBucket: 'materials' },
          { key: 'threshold', label: 'Door Threshold / Profile', unit: 'each', defaultBucket: 'materials' },
          { key: 'beading', label: 'Beading / Scotia', unit: 'lm', defaultBucket: 'materials' },
          { key: 'expansion_gaps', label: 'Expansion Gap Filler', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'floor_prep', label: 'Floor Preparation', unit: 'm²', defaultBucket: 'labour' },
          { key: 'laying_labour', label: 'Laying Labour', unit: 'm²', defaultBucket: 'labour' },
          { key: 'skirting_labour', label: 'Skirting Fitting', unit: 'lm', defaultBucket: 'labour' },
          { key: 'uplift_disposal', label: 'Uplift & Disposal', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
    ],
  },

  // ── Paint & Decor → toolKey: paint ──
  // Android sections: Room Surfaces, Paint Supply, Preparation, Trim/Woodwork, Labour
  paint: {
    toolKey: 'paint',
    toolTitle: 'Paint & Decor',
    subtitle: 'Paint, wallpaper, preparation, and decorating',
    icon: '🎨',
    sections: [
      {
        key: 'room_surfaces',
        title: 'Room Surfaces',
        fields: [
          { key: 'wall_area', label: 'Wall Area', unit: 'm²', defaultBucket: 'other_direct_cost' },
          { key: 'ceiling_area', label: 'Ceiling Area', unit: 'm²', defaultBucket: 'other_direct_cost' },
          { key: 'coats', label: 'Number of Coats', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
      {
        key: 'paint_supply',
        title: 'Paint Supply',
        fields: [
          { key: 'emulsion', label: 'Emulsion (walls/ceilings)', unit: 'ltr', defaultBucket: 'materials' },
          { key: 'eggshell', label: 'Eggshell / Satin', unit: 'ltr', defaultBucket: 'materials' },
          { key: 'gloss', label: 'Gloss', unit: 'ltr', defaultBucket: 'materials' },
          { key: 'primer', label: 'Primer / Undercoat', unit: 'ltr', defaultBucket: 'materials' },
          { key: 'wallpaper', label: 'Wallpaper', unit: 'roll', defaultBucket: 'materials' },
          { key: 'paste', label: 'Wallpaper Paste', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'preparation',
        title: 'Preparation',
        fields: [
          { key: 'filler', label: 'Filler / Caulk', unit: 'each', defaultBucket: 'materials' },
          { key: 'sandpaper', label: 'Sandpaper / Sanding', unit: 'each', defaultBucket: 'materials' },
          { key: 'sugar_soap', label: 'Sugar Soap / Cleaner', unit: 'each', defaultBucket: 'materials' },
          { key: 'dust_sheets', label: 'Dust Sheets', unit: 'each', defaultBucket: 'materials' },
          { key: 'masking_tape', label: 'Masking Tape', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'trim_woodwork',
        title: 'Trim / Woodwork',
        fields: [
          { key: 'skirting_paint', label: 'Skirting Paint', unit: 'lm', defaultBucket: 'materials' },
          { key: 'door_paint', label: 'Door Painting', unit: 'each', defaultBucket: 'labour' },
          { key: 'window_paint', label: 'Window Frame Painting', unit: 'each', defaultBucket: 'labour' },
          { key: 'dado_rail', label: 'Dado / Picture Rail', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'prep_labour', label: 'Preparation Labour', unit: 'hr', defaultBucket: 'labour' },
          { key: 'painting_labour', label: 'Painting Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'wallpapering_labour', label: 'Wallpapering Labour', unit: 'day', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Carpentry → toolKey: carpentry ──
  // Android sections: Door Work, Skirting & Architrave, Shelving & Storage, Timber & Sheet, Fixings, Accessories, Labour
  carpentry: {
    toolKey: 'carpentry',
    toolTitle: 'Carpentry',
    subtitle: 'Doors, skirting, shelving, timber, and joinery',
    icon: '🪚',
    sections: [
      {
        key: 'door_work',
        title: 'Door Work',
        fields: [
          { key: 'internal_door', label: 'Internal Door', unit: 'each', defaultBucket: 'materials' },
          { key: 'external_door', label: 'External Door', unit: 'each', defaultBucket: 'materials' },
          { key: 'door_lining', label: 'Door Lining / Frame', unit: 'each', defaultBucket: 'materials' },
          { key: 'door_hanging', label: 'Door Hanging', unit: 'each', defaultBucket: 'labour' },
        ],
      },
      {
        key: 'skirting_architrave',
        title: 'Skirting & Architrave',
        fields: [
          { key: 'skirting', label: 'Skirting Board', unit: 'lm', defaultBucket: 'materials' },
          { key: 'architrave', label: 'Architrave', unit: 'lm', defaultBucket: 'materials' },
          { key: 'dado_rail', label: 'Dado Rail', unit: 'lm', defaultBucket: 'materials' },
          { key: 'picture_rail', label: 'Picture Rail', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'shelving_storage',
        title: 'Shelving & Storage',
        fields: [
          { key: 'floating_shelf', label: 'Floating Shelf', unit: 'each', defaultBucket: 'materials' },
          { key: 'bracketed_shelf', label: 'Bracketed Shelf', unit: 'each', defaultBucket: 'materials' },
          { key: 'alcove_unit', label: 'Alcove Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'storage_cupboard', label: 'Storage Cupboard', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'timber_sheet',
        title: 'Timber & Sheet',
        fields: [
          { key: 'softwood', label: 'Softwood Timber', unit: 'lm', defaultBucket: 'materials' },
          { key: 'hardwood', label: 'Hardwood Timber', unit: 'lm', defaultBucket: 'materials' },
          { key: 'mdf', label: 'MDF Sheet', unit: 'each', defaultBucket: 'materials' },
          { key: 'plywood', label: 'Plywood Sheet', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'fixings',
        title: 'Fixings',
        fields: [
          { key: 'screws', label: 'Screws', unit: 'box', defaultBucket: 'materials' },
          { key: 'nails', label: 'Nails / Pins', unit: 'box', defaultBucket: 'materials' },
          { key: 'brackets', label: 'Brackets', unit: 'each', defaultBucket: 'materials' },
          { key: 'wall_plugs', label: 'Wall Plugs & Fixings', unit: 'box', defaultBucket: 'materials' },
          { key: 'adhesive', label: 'Wood Glue / Adhesive', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'accessories',
        title: 'Accessories',
        fields: [
          { key: 'hinges', label: 'Hinges', unit: 'pair', defaultBucket: 'materials' },
          { key: 'handles', label: 'Handles / Knobs', unit: 'each', defaultBucket: 'materials' },
          { key: 'catches', label: 'Catches / Latches', unit: 'each', defaultBucket: 'materials' },
          { key: 'locks', label: 'Locks', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'first_fix', label: 'First Fix Carpentry', unit: 'day', defaultBucket: 'labour' },
          { key: 'second_fix', label: 'Second Fix Carpentry', unit: 'day', defaultBucket: 'labour' },
          { key: 'bespoke_joinery', label: 'Bespoke Joinery', unit: 'day', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Electrical → toolKey: electrical ──
  // Android sections: Sockets & Switches, Lighting, Ventilation & Safety, Consumer Unit, Cable & Accessories, Labour
  electrical: {
    toolKey: 'electrical',
    toolTitle: 'Electrical',
    subtitle: 'Sockets, lighting, consumer units, and cable work',
    icon: '⚡',
    sections: [
      {
        key: 'sockets_switches',
        title: 'Sockets & Switches',
        fields: [
          { key: 'single_socket', label: 'Single Socket', unit: 'each', defaultBucket: 'materials' },
          { key: 'double_socket', label: 'Double Socket', unit: 'each', defaultBucket: 'materials' },
          { key: 'usb_socket', label: 'USB Socket', unit: 'each', defaultBucket: 'materials' },
          { key: 'light_switch', label: 'Light Switch', unit: 'each', defaultBucket: 'materials' },
          { key: 'dimmer_switch', label: 'Dimmer Switch', unit: 'each', defaultBucket: 'materials' },
          { key: 'fused_spur', label: 'Fused Spur', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'lighting',
        title: 'Lighting',
        fields: [
          { key: 'downlight', label: 'Downlight', unit: 'each', defaultBucket: 'materials' },
          { key: 'pendant', label: 'Pendant Light', unit: 'each', defaultBucket: 'materials' },
          { key: 'wall_light', label: 'Wall Light', unit: 'each', defaultBucket: 'materials' },
          { key: 'outdoor_light', label: 'Outdoor Light', unit: 'each', defaultBucket: 'materials' },
          { key: 'led_strip', label: 'LED Strip Lighting', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'ventilation_safety',
        title: 'Ventilation & Safety',
        fields: [
          { key: 'extractor_fan', label: 'Extractor Fan', unit: 'each', defaultBucket: 'materials' },
          { key: 'smoke_alarm', label: 'Smoke Alarm', unit: 'each', defaultBucket: 'materials' },
          { key: 'co_alarm', label: 'CO Alarm', unit: 'each', defaultBucket: 'materials' },
          { key: 'heat_detector', label: 'Heat Detector', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'consumer_unit',
        title: 'Consumer Unit',
        fields: [
          { key: 'consumer_unit', label: 'Consumer Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'mcb', label: 'MCB / RCBO', unit: 'each', defaultBucket: 'materials' },
          { key: 'rcd', label: 'RCD', unit: 'each', defaultBucket: 'materials' },
          { key: 'surge_protection', label: 'Surge Protection Device', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'cable_accessories',
        title: 'Cable & Accessories',
        fields: [
          { key: 'twin_earth', label: 'Twin & Earth Cable', unit: 'lm', defaultBucket: 'materials' },
          { key: 'flex', label: 'Flex Cable', unit: 'lm', defaultBucket: 'materials' },
          { key: 'trunking', label: 'Trunking / Conduit', unit: 'lm', defaultBucket: 'materials' },
          { key: 'back_boxes', label: 'Back Boxes', unit: 'each', defaultBucket: 'materials' },
          { key: 'connectors', label: 'Connectors / Junction Boxes', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'first_fix', label: 'First Fix Electrical', unit: 'day', defaultBucket: 'labour' },
          { key: 'second_fix', label: 'Second Fix Electrical', unit: 'day', defaultBucket: 'labour' },
          { key: 'testing', label: 'Testing & Certification', unit: 'each', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Plumbing → toolKey: plumbing ──
  // Android sections: Sanitary Fittings, Taps & Showers, Radiators & Heating, Pipework, Valves & Sundries, Labour
  plumbing: {
    toolKey: 'plumbing',
    toolTitle: 'Plumbing',
    subtitle: 'Sanitary fittings, pipework, heating, and radiators',
    icon: '🔩',
    sections: [
      {
        key: 'sanitary_fittings',
        title: 'Sanitary Fittings',
        fields: [
          { key: 'toilet', label: 'Toilet / WC', unit: 'each', defaultBucket: 'materials' },
          { key: 'basin', label: 'Basin', unit: 'each', defaultBucket: 'materials' },
          { key: 'bath', label: 'Bath', unit: 'each', defaultBucket: 'materials' },
          { key: 'shower_tray', label: 'Shower Tray', unit: 'each', defaultBucket: 'materials' },
          { key: 'bidet', label: 'Bidet', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'taps_showers',
        title: 'Taps & Showers',
        fields: [
          { key: 'basin_taps', label: 'Basin Taps', unit: 'each', defaultBucket: 'materials' },
          { key: 'bath_taps', label: 'Bath Taps', unit: 'each', defaultBucket: 'materials' },
          { key: 'kitchen_tap', label: 'Kitchen Mixer Tap', unit: 'each', defaultBucket: 'materials' },
          { key: 'shower_valve', label: 'Shower Valve', unit: 'each', defaultBucket: 'materials' },
          { key: 'shower_head', label: 'Shower Head & Riser', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'radiators_heating',
        title: 'Radiators & Heating',
        fields: [
          { key: 'radiator', label: 'Radiator', unit: 'each', defaultBucket: 'materials' },
          { key: 'towel_radiator', label: 'Towel Radiator', unit: 'each', defaultBucket: 'materials' },
          { key: 'radiator_valves', label: 'Radiator Valves (TRV)', unit: 'pair', defaultBucket: 'materials' },
          { key: 'underfloor_heating', label: 'Underfloor Heating', unit: 'm²', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'pipework',
        title: 'Pipework',
        fields: [
          { key: 'copper_pipe', label: 'Copper Pipe', unit: 'lm', defaultBucket: 'materials' },
          { key: 'plastic_pipe', label: 'Plastic / PEX Pipe', unit: 'lm', defaultBucket: 'materials' },
          { key: 'waste_pipe', label: 'Waste Pipe', unit: 'lm', defaultBucket: 'materials' },
          { key: 'soil_pipe', label: 'Soil Pipe', unit: 'lm', defaultBucket: 'materials' },
          { key: 'pipe_insulation', label: 'Pipe Insulation', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'valves_sundries',
        title: 'Valves & Sundries',
        fields: [
          { key: 'isolation_valve', label: 'Isolation Valve', unit: 'each', defaultBucket: 'materials' },
          { key: 'gate_valve', label: 'Gate Valve', unit: 'each', defaultBucket: 'materials' },
          { key: 'fittings', label: 'Pipe Fittings (elbows, tees)', unit: 'each', defaultBucket: 'materials' },
          { key: 'solder_flux', label: 'Solder / Flux', unit: 'each', defaultBucket: 'materials' },
          { key: 'ptfe_tape', label: 'PTFE Tape / Jointing', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'first_fix', label: 'First Fix Plumbing', unit: 'day', defaultBucket: 'labour' },
          { key: 'second_fix', label: 'Second Fix Plumbing', unit: 'day', defaultBucket: 'labour' },
          { key: 'testing', label: 'Testing & Commissioning', unit: 'each', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Roofing → toolKey: roofing ──
  // Android sections: Roof Area, Covering, Structural, Flashing & Ridge, Rainwater & Fascia, Access, Labour
  roofing: {
    toolKey: 'roofing',
    toolTitle: 'Roofing',
    subtitle: 'Roof covering, structural, flashing, and rainwater',
    icon: '🏠',
    sections: [
      {
        key: 'roof_area',
        title: 'Roof Area',
        fields: [
          { key: 'roof_area', label: 'Roof Area', unit: 'm²', defaultBucket: 'other_direct_cost' },
          { key: 'pitch_angle', label: 'Pitch / Angle', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
      {
        key: 'covering',
        title: 'Covering',
        fields: [
          { key: 'tiles', label: 'Roof Tiles / Slates', unit: 'm²', defaultBucket: 'materials' },
          { key: 'felt', label: 'Roofing Felt / Membrane', unit: 'm²', defaultBucket: 'materials' },
          { key: 'battens', label: 'Tile Battens', unit: 'lm', defaultBucket: 'materials' },
          { key: 'fixings', label: 'Tile Fixings / Clips', unit: 'box', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'structural',
        title: 'Structural',
        fields: [
          { key: 'rafters', label: 'Rafters', unit: 'lm', defaultBucket: 'materials' },
          { key: 'joists', label: 'Joists', unit: 'lm', defaultBucket: 'materials' },
          { key: 'decking', label: 'Roof Decking', unit: 'm²', defaultBucket: 'materials' },
          { key: 'insulation', label: 'Insulation', unit: 'm²', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'flashing_ridge',
        title: 'Flashing & Ridge',
        fields: [
          { key: 'lead_flashing', label: 'Lead Flashing', unit: 'lm', defaultBucket: 'materials' },
          { key: 'ridge_tiles', label: 'Ridge Tiles', unit: 'lm', defaultBucket: 'materials' },
          { key: 'hip_tiles', label: 'Hip Tiles', unit: 'lm', defaultBucket: 'materials' },
          { key: 'dry_ridge', label: 'Dry Ridge Kit', unit: 'each', defaultBucket: 'materials' },
          { key: 'mortar_cement', label: 'Mortar / Cement', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'rainwater_fascia',
        title: 'Rainwater & Fascia',
        fields: [
          { key: 'guttering', label: 'Guttering', unit: 'lm', defaultBucket: 'materials' },
          { key: 'downpipe', label: 'Downpipe', unit: 'lm', defaultBucket: 'materials' },
          { key: 'fascia', label: 'Fascia Board', unit: 'lm', defaultBucket: 'materials' },
          { key: 'soffit', label: 'Soffit Board', unit: 'lm', defaultBucket: 'materials' },
          { key: 'barge_board', label: 'Barge Board', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'access',
        title: 'Access',
        fields: [
          { key: 'scaffolding', label: 'Scaffolding', unit: 'each', defaultBucket: 'plant_hire' },
          { key: 'scaffold_hire', label: 'Scaffold Hire (weeks)', unit: 'week', defaultBucket: 'plant_hire' },
          { key: 'skip', label: 'Skip Hire', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'roofing_labour', label: 'Roofing Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'leadwork', label: 'Lead Work', unit: 'day', defaultBucket: 'labour' },
          { key: 'fascia_fitting', label: 'Fascia / Gutter Fitting', unit: 'day', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── HVAC → toolKey: hvac ──
  // Android sections: Boiler/Heat Source, Controls, Radiators, Ventilation, Pipework & Accessories, Labour
  hvac: {
    toolKey: 'hvac',
    toolTitle: 'HVAC',
    subtitle: 'Heating, ventilation, and air conditioning',
    icon: '❄️',
    sections: [
      {
        key: 'boiler_heat_source',
        title: 'Boiler / Heat Source',
        fields: [
          { key: 'boiler', label: 'Boiler', unit: 'each', defaultBucket: 'materials' },
          { key: 'heat_pump', label: 'Heat Pump', unit: 'each', defaultBucket: 'materials' },
          { key: 'flue', label: 'Flue / Chimney Liner', unit: 'each', defaultBucket: 'materials' },
          { key: 'filter', label: 'System Filter', unit: 'each', defaultBucket: 'materials' },
          { key: 'expansion_vessel', label: 'Expansion Vessel', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'controls',
        title: 'Controls',
        fields: [
          { key: 'thermostat', label: 'Room Thermostat', unit: 'each', defaultBucket: 'materials' },
          { key: 'programmer', label: 'Programmer / Timer', unit: 'each', defaultBucket: 'materials' },
          { key: 'smart_control', label: 'Smart Heating Control', unit: 'each', defaultBucket: 'materials' },
          { key: 'zone_valve', label: 'Zone Valve', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'radiators',
        title: 'Radiators',
        fields: [
          { key: 'radiator', label: 'Radiator', unit: 'each', defaultBucket: 'materials' },
          { key: 'towel_radiator', label: 'Towel Radiator', unit: 'each', defaultBucket: 'materials' },
          { key: 'trv', label: 'Thermostatic Radiator Valve', unit: 'each', defaultBucket: 'materials' },
          { key: 'lockshield', label: 'Lockshield Valve', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'ventilation',
        title: 'Ventilation',
        fields: [
          { key: 'extractor', label: 'Extractor Fan', unit: 'each', defaultBucket: 'materials' },
          { key: 'mvhr', label: 'MVHR Unit', unit: 'each', defaultBucket: 'materials' },
          { key: 'ducting', label: 'Ducting', unit: 'lm', defaultBucket: 'materials' },
          { key: 'grille_vent', label: 'Grille / Vent', unit: 'each', defaultBucket: 'materials' },
          { key: 'ac_unit', label: 'Air Conditioning Unit', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'pipework_accessories',
        title: 'Pipework & Accessories',
        fields: [
          { key: 'copper_pipe', label: 'Copper Pipe', unit: 'lm', defaultBucket: 'materials' },
          { key: 'fittings', label: 'Fittings', unit: 'each', defaultBucket: 'materials' },
          { key: 'insulation', label: 'Pipe Insulation', unit: 'lm', defaultBucket: 'materials' },
          { key: 'inhibitor', label: 'System Inhibitor', unit: 'each', defaultBucket: 'materials' },
          { key: 'power_flush', label: 'Power Flush', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'boiler_install', label: 'Boiler Installation', unit: 'day', defaultBucket: 'labour' },
          { key: 'radiator_install', label: 'Radiator Installation', unit: 'each', defaultBucket: 'labour' },
          { key: 'gas_safe', label: 'Gas Safe Certificate', unit: 'each', defaultBucket: 'labour' },
          { key: 'commissioning', label: 'Commissioning', unit: 'each', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Tiling → toolKey: tiling ──
  // Android sections: Tiling Surfaces, Tile Supply, Adhesive & Grout, Preparation, Finishing, Labour
  tiling: {
    toolKey: 'tiling',
    toolTitle: 'Tiling',
    subtitle: 'Tile supply, adhesive, grout, and finishing',
    icon: '🔲',
    sections: [
      {
        key: 'tiling_surfaces',
        title: 'Tiling Surfaces',
        fields: [
          { key: 'wall_area', label: 'Wall Area', unit: 'm²', defaultBucket: 'other_direct_cost' },
          { key: 'floor_area', label: 'Floor Area', unit: 'm²', defaultBucket: 'other_direct_cost' },
          { key: 'waste_percent', label: 'Waste Allowance', unit: '%', defaultBucket: 'other_direct_cost' },
        ],
      },
      {
        key: 'tile_supply',
        title: 'Tile Supply',
        fields: [
          { key: 'wall_tiles', label: 'Wall Tiles', unit: 'm²', defaultBucket: 'materials' },
          { key: 'floor_tiles', label: 'Floor Tiles', unit: 'm²', defaultBucket: 'materials' },
          { key: 'mosaic_tiles', label: 'Mosaic / Feature Tiles', unit: 'm²', defaultBucket: 'materials' },
          { key: 'border_tiles', label: 'Border Tiles', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'adhesive_grout',
        title: 'Adhesive & Grout',
        fields: [
          { key: 'adhesive', label: 'Tile Adhesive', unit: 'bag', defaultBucket: 'materials' },
          { key: 'grout', label: 'Grout', unit: 'bag', defaultBucket: 'materials' },
          { key: 'flexible_adhesive', label: 'Flexible Adhesive', unit: 'bag', defaultBucket: 'materials' },
          { key: 'epoxy_grout', label: 'Epoxy Grout', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'preparation',
        title: 'Preparation',
        fields: [
          { key: 'backer_board', label: 'Tile Backer Board', unit: 'm²', defaultBucket: 'materials' },
          { key: 'primer', label: 'Primer / SBR', unit: 'each', defaultBucket: 'materials' },
          { key: 'waterproofing', label: 'Waterproofing / Tanking', unit: 'm²', defaultBucket: 'materials' },
          { key: 'levelling', label: 'Self-Levelling Compound', unit: 'bag', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'finishing',
        title: 'Finishing',
        fields: [
          { key: 'tile_trim', label: 'Tile Trim / Edge', unit: 'lm', defaultBucket: 'materials' },
          { key: 'silicone', label: 'Silicone Sealant', unit: 'each', defaultBucket: 'materials' },
          { key: 'spacers', label: 'Tile Spacers', unit: 'bag', defaultBucket: 'materials' },
          { key: 'grout_pen', label: 'Grout Pen / Finish', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'wall_tiling', label: 'Wall Tiling Labour', unit: 'm²', defaultBucket: 'labour' },
          { key: 'floor_tiling', label: 'Floor Tiling Labour', unit: 'm²', defaultBucket: 'labour' },
          { key: 'prep_labour', label: 'Preparation Labour', unit: 'hr', defaultBucket: 'labour' },
          { key: 'cutting', label: 'Cutting & Detailed Work', unit: 'hr', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Windows & Doors → toolKey: windows ──
  // Android sections: Windows, Doors, Frames & Trims, Hardware & Seals, Removal & Disposal, Labour
  windows: {
    toolKey: 'windows',
    toolTitle: 'Windows & Doors',
    subtitle: 'Window and door supply, frames, hardware, and fitting',
    icon: '🪟',
    sections: [
      {
        key: 'windows',
        title: 'Windows',
        fields: [
          { key: 'casement', label: 'Casement Window', unit: 'each', defaultBucket: 'materials' },
          { key: 'sash', label: 'Sash Window', unit: 'each', defaultBucket: 'materials' },
          { key: 'bay', label: 'Bay Window', unit: 'each', defaultBucket: 'materials' },
          { key: 'velux', label: 'Velux / Roof Window', unit: 'each', defaultBucket: 'materials' },
          { key: 'patio_door', label: 'Patio / Sliding Door', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'doors',
        title: 'Doors',
        fields: [
          { key: 'external_door', label: 'External Door', unit: 'each', defaultBucket: 'materials' },
          { key: 'composite_door', label: 'Composite Door', unit: 'each', defaultBucket: 'materials' },
          { key: 'french_doors', label: 'French Doors', unit: 'pair', defaultBucket: 'materials' },
          { key: 'bifold_doors', label: 'Bi-fold Doors', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'frames_trims',
        title: 'Frames & Trims',
        fields: [
          { key: 'window_frame', label: 'Window Frame', unit: 'each', defaultBucket: 'materials' },
          { key: 'door_frame', label: 'Door Frame', unit: 'each', defaultBucket: 'materials' },
          { key: 'window_sill', label: 'Window Sill', unit: 'lm', defaultBucket: 'materials' },
          { key: 'architrave', label: 'Architrave', unit: 'lm', defaultBucket: 'materials' },
          { key: 'casing', label: 'Casing / Reveal', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'hardware_seals',
        title: 'Hardware & Seals',
        fields: [
          { key: 'hinges', label: 'Hinges', unit: 'pair', defaultBucket: 'materials' },
          { key: 'handles', label: 'Handles', unit: 'each', defaultBucket: 'materials' },
          { key: 'locks', label: 'Locks / Multi-point', unit: 'each', defaultBucket: 'materials' },
          { key: 'letterbox', label: 'Letterbox', unit: 'each', defaultBucket: 'materials' },
          { key: 'weatherseal', label: 'Weatherseal / Draught Strip', unit: 'lm', defaultBucket: 'materials' },
          { key: 'silicone', label: 'Silicone Sealant', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'removal_disposal',
        title: 'Removal & Disposal',
        fields: [
          { key: 'window_removal', label: 'Window Removal', unit: 'each', defaultBucket: 'labour' },
          { key: 'door_removal', label: 'Door Removal', unit: 'each', defaultBucket: 'labour' },
          { key: 'skip', label: 'Skip / Waste Disposal', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'window_fitting', label: 'Window Fitting', unit: 'each', defaultBucket: 'labour' },
          { key: 'door_fitting', label: 'Door Fitting', unit: 'each', defaultBucket: 'labour' },
          { key: 'making_good', label: 'Making Good (plastering/trim)', unit: 'hr', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Landscaping → toolKey: landscaping ──
  // Android sections: Fencing, Paving & Patio, Turf & Ground, Posts & Materials, Waste & Skip, Labour
  landscaping: {
    toolKey: 'landscaping',
    toolTitle: 'Landscaping',
    subtitle: 'Fencing, paving, turf, and outdoor work',
    icon: '🌿',
    sections: [
      {
        key: 'fencing',
        title: 'Fencing',
        fields: [
          { key: 'fence_panel', label: 'Fence Panel', unit: 'each', defaultBucket: 'materials' },
          { key: 'fence_post', label: 'Fence Post', unit: 'each', defaultBucket: 'materials' },
          { key: 'gravel_board', label: 'Gravel Board', unit: 'each', defaultBucket: 'materials' },
          { key: 'post_cap', label: 'Post Cap', unit: 'each', defaultBucket: 'materials' },
          { key: 'gate', label: 'Gate', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'paving_patio',
        title: 'Paving & Patio',
        fields: [
          { key: 'paving_slabs', label: 'Paving Slabs', unit: 'm²', defaultBucket: 'materials' },
          { key: 'block_paving', label: 'Block Paving', unit: 'm²', defaultBucket: 'materials' },
          { key: 'sand', label: 'Sharp Sand / Building Sand', unit: 'bag', defaultBucket: 'materials' },
          { key: 'cement', label: 'Cement', unit: 'bag', defaultBucket: 'materials' },
          { key: 'sub_base', label: 'Sub-base / MOT Type 1', unit: 'tonne', defaultBucket: 'materials' },
          { key: 'edging', label: 'Edging', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'turf_ground',
        title: 'Turf & Ground',
        fields: [
          { key: 'turf', label: 'Turf', unit: 'm²', defaultBucket: 'materials' },
          { key: 'topsoil', label: 'Topsoil', unit: 'tonne', defaultBucket: 'materials' },
          { key: 'membrane', label: 'Weed Membrane', unit: 'm²', defaultBucket: 'materials' },
          { key: 'gravel', label: 'Decorative Gravel', unit: 'tonne', defaultBucket: 'materials' },
          { key: 'bark', label: 'Bark / Mulch', unit: 'bag', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'posts_materials',
        title: 'Posts & Materials',
        fields: [
          { key: 'concrete', label: 'Postcrete / Concrete', unit: 'bag', defaultBucket: 'materials' },
          { key: 'timber', label: 'Timber (general)', unit: 'lm', defaultBucket: 'materials' },
          { key: 'fixings', label: 'Fixings & Brackets', unit: 'each', defaultBucket: 'materials' },
          { key: 'drainage', label: 'Drainage Channel / Pipe', unit: 'lm', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'waste_skip',
        title: 'Waste & Skip',
        fields: [
          { key: 'skip', label: 'Skip Hire', unit: 'each', defaultBucket: 'other_direct_cost' },
          { key: 'waste_removal', label: 'Waste Removal', unit: 'each', defaultBucket: 'other_direct_cost' },
          { key: 'excavation', label: 'Excavation', unit: 'm³', defaultBucket: 'labour' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'fencing_labour', label: 'Fencing Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'paving_labour', label: 'Paving Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'landscaping_labour', label: 'General Landscaping Labour', unit: 'day', defaultBucket: 'labour' },
          { key: 'groundwork', label: 'Groundwork', unit: 'day', defaultBucket: 'labour' },
        ],
      },
    ],
  },

  // ── Cleaning → toolKey: cleaning ──
  // Android sections: Service Type, Property Details, Deep Clean Extras, Specialist Services, Materials, Labour
  cleaning: {
    toolKey: 'cleaning',
    toolTitle: 'Cleaning',
    subtitle: 'Post-build, deep clean, and specialist cleaning services',
    icon: '🧹',
    sections: [
      {
        key: 'service_type',
        title: 'Service Type',
        fields: [
          { key: 'end_of_tenancy', label: 'End of Tenancy Clean', unit: 'each', defaultBucket: 'labour' },
          { key: 'post_build', label: 'Post-Build / After-Builders Clean', unit: 'each', defaultBucket: 'labour' },
          { key: 'deep_clean', label: 'Deep Clean', unit: 'each', defaultBucket: 'labour' },
          { key: 'regular_clean', label: 'Regular Clean', unit: 'hr', defaultBucket: 'labour' },
        ],
      },
      {
        key: 'property_details',
        title: 'Property Details',
        fields: [
          { key: 'bedrooms', label: 'Number of Bedrooms', unit: 'each', defaultBucket: 'other_direct_cost' },
          { key: 'bathrooms', label: 'Number of Bathrooms', unit: 'each', defaultBucket: 'other_direct_cost' },
          { key: 'reception_rooms', label: 'Reception Rooms', unit: 'each', defaultBucket: 'other_direct_cost' },
          { key: 'kitchen', label: 'Kitchen', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
      {
        key: 'deep_clean_extras',
        title: 'Deep Clean Extras',
        fields: [
          { key: 'oven_clean', label: 'Oven Clean', unit: 'each', defaultBucket: 'labour' },
          { key: 'carpet_clean', label: 'Carpet Cleaning', unit: 'm²', defaultBucket: 'labour' },
          { key: 'window_clean', label: 'Window Cleaning (interior)', unit: 'each', defaultBucket: 'labour' },
          { key: 'exterior_windows', label: 'Exterior Windows', unit: 'each', defaultBucket: 'labour' },
        ],
      },
      {
        key: 'specialist_services',
        title: 'Specialist Services',
        fields: [
          { key: 'pressure_washing', label: 'Pressure Washing', unit: 'm²', defaultBucket: 'labour' },
          { key: 'gutter_clean', label: 'Gutter Cleaning', unit: 'lm', defaultBucket: 'labour' },
          { key: 'upholstery', label: 'Upholstery Cleaning', unit: 'each', defaultBucket: 'labour' },
          { key: 'biohazard', label: 'Biohazard / Specialist', unit: 'each', defaultBucket: 'labour' },
        ],
      },
      {
        key: 'materials',
        title: 'Materials',
        fields: [
          { key: 'cleaning_products', label: 'Cleaning Products', unit: 'each', defaultBucket: 'materials' },
          { key: 'bin_bags', label: 'Bin Bags / Waste', unit: 'each', defaultBucket: 'materials' },
          { key: 'specialist_chemicals', label: 'Specialist Chemicals', unit: 'each', defaultBucket: 'materials' },
        ],
      },
      {
        key: 'labour',
        title: 'Labour',
        fields: [
          { key: 'cleaning_team', label: 'Cleaning Team', unit: 'hr', defaultBucket: 'labour' },
          { key: 'supervisor', label: 'Supervisor', unit: 'hr', defaultBucket: 'labour' },
          { key: 'waste_disposal', label: 'Waste Disposal', unit: 'each', defaultBucket: 'other_direct_cost' },
        ],
      },
    ],
  },
};

/** Get a tool definition by key. Returns undefined for unknown keys. */
export function getToolDefinition(key: ToolKey): ToolDefinition | undefined {
  return TOOL_DEFINITIONS[key];
}

/** Get all active trade tool keys (excluding general_estimate which has its own page). */
export function getTradeToolKeys(): ToolKey[] {
  return (Object.keys(TOOL_DEFINITIONS) as ToolKey[]).filter(k => k !== 'general_estimate');
}
