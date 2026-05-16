-- ============================================================
-- TISSCA Warehouse — Asset Registry Table
-- SQL Migration for Supabase
-- ============================================================
-- PURPOSE:
-- Stores warehouse assets (system presets + user imports + scanned customs)
-- in Supabase for cross-platform sync and web admin management.
--
-- The warehouse_assets table mirrors the WarehouseAsset TypeScript type.
-- System presets are seeded from warehouse-registry.ts.
-- User-imported and scanned assets are created via API.
-- ============================================================

CREATE TABLE IF NOT EXISTS warehouse_assets (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id   UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Core identity
  name           TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (category IN ('kitchen', 'wardrobe', 'openings', 'room_elements', 'appliances')),
  subtype        TEXT NOT NULL,
  
  -- Dimensions (mm)
  width          INTEGER NOT NULL DEFAULT 600,
  depth          INTEGER NOT NULL DEFAULT 580,
  height         INTEGER NOT NULL DEFAULT 870,
  
  -- Parametric rules (jsonb)
  parametric     JSONB NOT NULL DEFAULT '{"resizable": false}',
  
  -- Material / visual
  material_name  TEXT DEFAULT 'Standard',
  material_type  TEXT DEFAULT 'laminate',
  material_color TEXT DEFAULT '#8FAABE',
  texture_ref    TEXT,
  
  -- Placement & connection
  placement      TEXT NOT NULL DEFAULT 'wall_only' CHECK (placement IN ('wall_only', 'floor', 'wall_mounted', 'ceiling', 'free')),
  connection     JSONB NOT NULL DEFAULT '{"canAttachSide": true, "canStack": false}',
  
  -- Source
  source         TEXT NOT NULL DEFAULT 'systemPreset' CHECK (source IN ('systemPreset', 'imported', 'scannedCustom')),
  
  -- Preview / thumbnail
  preview_url    TEXT,
  
  -- Metadata
  brand          TEXT,
  model          TEXT,
  notes          TEXT,
  unit_price     DECIMAL(10,2),
  currency       TEXT DEFAULT 'GBP',
  tags           TEXT[] DEFAULT '{}',
  
  -- Scan data (for scannedCustom source)
  scan_source    TEXT, -- 'lidar_iphone', 'arcore', etc.
  scan_data      JSONB, -- mesh reference, confidence, raw geometry
  scanned_at     TIMESTAMPTZ,
  
  -- Admin
  enabled        BOOLEAN DEFAULT TRUE,
  sort_order     INTEGER DEFAULT 0,
  created_by     UUID,
  updated_by     UUID,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_assets_workspace 
  ON warehouse_assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_assets_category 
  ON warehouse_assets(category, subtype);
CREATE INDEX IF NOT EXISTS idx_warehouse_assets_source 
  ON warehouse_assets(source);
CREATE INDEX IF NOT EXISTS idx_warehouse_assets_enabled 
  ON warehouse_assets(enabled) WHERE enabled = TRUE;

-- RLS policies
ALTER TABLE warehouse_assets ENABLE ROW LEVEL SECURITY;

-- Users can read system presets + their own workspace assets
CREATE POLICY "Users can read warehouse assets"
  ON warehouse_assets FOR SELECT
  USING (
    source = 'systemPreset' 
    OR workspace_id IN (
      SELECT wp.workspace_id 
      FROM user_profiles wp 
      WHERE wp.auth_id = auth.uid()
    )
  );

-- Users can insert assets into their own workspace
CREATE POLICY "Users can create warehouse assets"
  ON warehouse_assets FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wp.workspace_id 
      FROM user_profiles wp 
      WHERE wp.auth_id = auth.uid()
    )
  );

-- Users can update their own workspace assets
CREATE POLICY "Users can update own warehouse assets"
  ON warehouse_assets FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wp.workspace_id 
      FROM user_profiles wp 
      WHERE wp.auth_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_warehouse_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER warehouse_assets_updated_at
  BEFORE UPDATE ON warehouse_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_assets_updated_at();

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE warehouse_assets IS 'TISSCA Warehouse — reusable spatial design assets (cabinets, openings, elements, appliances)';
COMMENT ON COLUMN warehouse_assets.source IS 'systemPreset = built-in, imported = user file, scannedCustom = scanned from real world';
COMMENT ON COLUMN warehouse_assets.parametric IS 'JSON: resizable, minWidth, maxWidth, stepWidth, etc.';
COMMENT ON COLUMN warehouse_assets.connection IS 'JSON: canAttachSide, canStack, connectsTo, requiredGap';
