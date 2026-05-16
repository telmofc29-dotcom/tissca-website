// src/components/admin/WarehouseObjectEditor.tsx
//
// Admin Warehouse Object Editor — form for creating/editing warehouse assets.
// Sections: Identity, Dimensions, Placement, Parametric Builder, Presentation, Preview.

'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import type { WarehouseAssetRow } from '@/lib/workspace-data';
import type { CabinetSpec } from '@/lib/warehouse/parametric-types';
import {
  isParametricEligible,
  subtypeToCabinetType,
  defaultCabinetSpec,
} from '@/lib/warehouse/parametric-types';
import ParametricBuilder from './ParametricBuilder';
import ParametricPreview from './ParametricPreview';
import ProfileEditor from './ProfileEditor';
import type { ShapeEditorConfig } from '@/lib/warehouse/shape-editor-types';
import { defaultShapeEditorConfig, defaultExtrusionConfig } from '@/lib/warehouse/shape-editor-types';
import { generateExtrusionGLB } from '@/spatial/profileExtrusion';

/** Resolve a thumbnail_ref to a renderable URL via the storage proxy. */
function thumbnailUrl(ref: string): string {
  if (!ref) return '';
  // Already a full URL (e.g. external CDN or legacy)
  if (ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  // Storage reference: "bucket/path" → proxy route
  return `/api/storage/${ref}`;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'wardrobe', label: 'Wardrobe' },
  { value: 'openings', label: 'Openings' },
  { value: 'room_elements', label: 'Room Elements' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'hardware', label: 'Hardware' },
];

const SUBTYPES: Record<string, { value: string; label: string }[]> = {
  kitchen: [
    { value: 'base_unit', label: 'Base Unit' },
    { value: 'wall_unit', label: 'Wall Unit' },
    { value: 'tall_unit', label: 'Tall Unit' },
    { value: 'drawer_unit', label: 'Drawer Unit' },
    { value: 'corner_unit', label: 'Corner Unit' },
    { value: 'appliance_housing', label: 'Appliance Housing' },
  ],
  wardrobe: [
    { value: 'single', label: 'Single' },
    { value: 'double', label: 'Double' },
    { value: 'shelving', label: 'Shelving' },
    { value: 'drawers', label: 'Drawers' },
    { value: 'hanging_module', label: 'Hanging Module' },
  ],
  openings: [
    { value: 'door', label: 'Door' },
    { value: 'window', label: 'Window' },
    { value: 'bi_fold', label: 'Bi-Fold' },
    { value: 'sliding', label: 'Sliding' },
  ],
  room_elements: [
    { value: 'radiator', label: 'Radiator' },
    { value: 'island', label: 'Island' },
    { value: 'column', label: 'Column' },
    { value: 'custom_block', label: 'Custom Block' },
    { value: 'worktop', label: 'Worktop' },
    { value: 'plinth', label: 'Plinth' },
    { value: 'cornice', label: 'Cornice' },
    { value: 'end_panel', label: 'End Panel' },
    { value: 'filler_panel', label: 'Filler Panel' },
    { value: 'pelmet', label: 'Pelmet' },
  ],
  appliances: [
    { value: 'oven', label: 'Oven' },
    { value: 'hob', label: 'Hob' },
    { value: 'fridge', label: 'Fridge' },
    { value: 'dishwasher', label: 'Dishwasher' },
    { value: 'washing_machine', label: 'Washing Machine' },
    { value: 'microwave', label: 'Microwave' },
    { value: 'extractor', label: 'Extractor' },
  ],
  hardware: [
    { value: 'handle', label: 'Handle' },
    { value: 'hinge', label: 'Hinge' },
  ],
};

const PLACEMENT_MODES = [
  { value: 'wall', label: 'Wall (against wall)' },
  { value: 'floor', label: 'Floor (freestanding)' },
  { value: 'wall_mounted', label: 'Wall Mounted' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'free', label: 'Free (no constraint)' },
];

const SOURCES = [
  { value: 'systemPreset', label: 'System Preset' },
  { value: 'imported', label: 'Imported' },
  { value: 'scannedCustom', label: 'Scanned (Custom)' },
];

const PLATFORMS = [
  { value: 'web', label: 'Web' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'api', label: 'API' },
];

const ROOM_TYPES = [
  'kitchen', 'wardrobe', 'bathroom', 'utility', 'bedroom', 'living', 'general',
];

const SERVICE_TYPES = [
  'water_supply', 'water_drain', 'gas', 'electric_13a', 'electric_32a', 'extraction', 'ventilation',
];

// ─── Form State ──────────────────────────────────────────────────────────────

interface EditorFormState {
  name: string;
  category: string;
  subtype: string;
  source: string;
  source_platform: string;
  width: number;
  depth: number;
  height: number;
  front_clearance: number;
  placement_mode: string;
  is_wall_mounted: boolean;
  is_freestanding: boolean;
  compatible_room_types: string[];
  requires_services: string[];
  planner_hints: Record<string, unknown>;
  material_name: string;
  notes: string;
  thumbnail_ref: string;
}

function assetToFormState(asset: WarehouseAssetRow | null): EditorFormState {
  if (!asset) {
    return {
      name: '',
      category: 'kitchen',
      subtype: 'base_unit',
      source: 'imported',
      source_platform: 'web',
      width: 600,
      depth: 580,
      height: 870,
      front_clearance: 0,
      placement_mode: 'wall',
      is_wall_mounted: false,
      is_freestanding: false,
      compatible_room_types: [],
      requires_services: [],
      planner_hints: {},
      material_name: 'Standard',
      notes: '',
      thumbnail_ref: '',
    };
  }

  return {
    name: asset.name || '',
    category: asset.category || 'kitchen',
    subtype: asset.subtype || 'base_unit',
    source: asset.source || 'imported',
    source_platform: asset.source_platform || 'web',
    width: asset.width ?? 600,
    depth: asset.depth ?? 580,
    height: asset.height ?? 870,
    front_clearance: asset.front_clearance ?? 0,
    placement_mode: asset.placement_mode || 'wall',
    is_wall_mounted: asset.is_wall_mounted ?? false,
    is_freestanding: asset.is_freestanding ?? false,
    compatible_room_types: Array.isArray(asset.compatible_room_types)
      ? (asset.compatible_room_types as string[])
      : [],
    requires_services: Array.isArray(asset.requires_services)
      ? (asset.requires_services as string[])
      : [],
    planner_hints: (asset.planner_hints && typeof asset.planner_hints === 'object'
      ? asset.planner_hints
      : {}) as Record<string, unknown>,
    material_name: asset.material_name || 'Standard',
    notes: asset.notes || '',
    thumbnail_ref: asset.thumbnail_ref || '',
  };
}

// ─── Extrusion Preview (Phase 3B) ────────────────────────────────────────────

/**
 * Inline SVG isometric preview of the extruded shape.
 * Renders a simplified 2.5D projection: front face + depth extrusion offset.
 */
function ExtrusionPreviewSection({
  config,
  color,
}: {
  config: ShapeEditorConfig;
  color?: string;
}) {
  const pts = config.profile.points;
  if (pts.length < 3) return null;

  const ext = config.extrusion;
  if (!ext || ext.depth <= 0) {
    return (
      <div className="text-xs text-gray-400 italic">
        Set extrusion depth to see a 3D preview.
      </div>
    );
  }

  // SVG viewport
  const svgW = 320;
  const svgH = 260;
  const pad = 30;

  // Isometric projection constants (cabinet-style 30° perspective)
  const isoAngle = Math.PI / 6; // 30°
  const isoScale = 0.4; // depth scaling factor
  const dx = Math.cos(isoAngle) * isoScale;
  const dy = Math.sin(isoAngle) * isoScale;

  // Compute profile bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const profileW = maxX - minX || 1;
  const profileH = maxY - minY || 1;

  // Total projected size including depth offset
  const totalW = profileW + ext.depth * dx;
  const totalH = profileH + ext.depth * dy;

  const scaleX = (svgW - pad * 2) / totalW;
  const scaleY = (svgH - pad * 2) / totalH;
  const scale = Math.min(scaleX, scaleY);

  const offX = pad + (svgW - pad * 2 - totalW * scale) / 2;
  const offY = pad + (svgH - pad * 2 - totalH * scale) / 2;

  // Transform: flip Y (SVG top-down), apply scale + offset
  const toSvg = (x: number, y: number) => [
    (x - minX) * scale + offX,
    svgH - ((y - minY) * scale + offY),
  ];

  const depthOffX = ext.depth * dx * scale;
  const depthOffY = ext.depth * dy * scale;

  // Front face polygon path
  const frontPath = pts
    .map(([x, y], i) => {
      const [sx, sy] = toSvg(x, y);
      return `${i === 0 ? 'M' : 'L'}${sx},${sy}`;
    })
    .join(' ') + ' Z';

  // Back face polygon path (offset by depth)
  const backPath = pts
    .map(([x, y], i) => {
      const [sx, sy] = toSvg(x, y);
      return `${i === 0 ? 'M' : 'L'}${sx + depthOffX},${sy - depthOffY}`;
    })
    .join(' ') + ' Z';

  // Side connecting lines (only for outline edges — top and right edges visible)
  const sideLines: JSX.Element[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [sx, sy] = toSvg(pts[i][0], pts[i][1]);
    sideLines.push(
      <line
        key={`side-${i}`}
        x1={sx}
        y1={sy}
        x2={sx + depthOffX}
        y2={sy - depthOffY}
        stroke={color ?? '#6b7280'}
        strokeWidth="1"
        opacity="0.35"
      />,
    );
  }

  // Side fill polygons (connect front and back edges for visible faces)
  const sideFills: JSX.Element[] = [];
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const [ax, ay] = toSvg(pts[i][0], pts[i][1]);
    const [bx, by] = toSvg(pts[j][0], pts[j][1]);
    const path = `M${ax},${ay} L${bx},${by} L${bx + depthOffX},${by - depthOffY} L${ax + depthOffX},${ay - depthOffY} Z`;
    sideFills.push(
      <path
        key={`sidefill-${i}`}
        d={path}
        fill={color ?? '#93c5fd'}
        opacity="0.12"
        stroke={color ?? '#6b7280'}
        strokeWidth="0.5"
      />,
    );
  }

  const fillColor = color ?? '#93c5fd';

  return (
    <fieldset className="border border-gray-200 rounded-lg p-4">
      <legend className="text-sm font-semibold text-gray-700 px-2">Extrusion Preview</legend>
      <div className="flex justify-center">
        <svg width={svgW} height={svgH} className="bg-gray-50 rounded">
          {/* Back face */}
          <path d={backPath} fill={fillColor} opacity="0.15" stroke={color ?? '#6b7280'} strokeWidth="1" strokeDasharray="3 2" />
          {/* Side fills */}
          {sideFills}
          {/* Side connecting lines */}
          {sideLines}
          {/* Front face */}
          <path d={frontPath} fill={fillColor} opacity="0.3" stroke={color ?? '#3b82f6'} strokeWidth="1.5" />

          {/* Dimension label — depth */}
          {(() => {
            const [sx, sy] = toSvg(pts[0][0], pts[0][1]);
            return (
              <g>
                <line
                  x1={sx}
                  y1={sy}
                  x2={sx + depthOffX}
                  y2={sy - depthOffY}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text
                  x={sx + depthOffX / 2 - 8}
                  y={sy - depthOffY / 2 - 6}
                  fontSize="10"
                  fill="#ef4444"
                  fontFamily="monospace"
                >
                  {ext.depth}mm
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </fieldset>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface WarehouseObjectEditorProps {
  asset: WarehouseAssetRow | null; // null = create mode
}

export default function WarehouseObjectEditor({ asset }: WarehouseObjectEditorProps) {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const isNew = !asset;
  const [form, setForm] = useState<EditorFormState>(() => assetToFormState(asset));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [plannerHintsRaw, setPlannerHintsRaw] = useState<string>(
    JSON.stringify(form.planner_hints, null, 2),
  );
  const [plannerHintsError, setPlannerHintsError] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  // Parametric builder state: initialise from existing planner_hints.cabinet_spec if present
  const [cabinetSpec, setCabinetSpec] = useState<CabinetSpec | null>(() => {
    const existing = form.planner_hints?.cabinet_spec;
    if (existing && typeof existing === 'object' && 'type' in (existing as object)) {
      return existing as CabinetSpec;
    }
    // Auto-initialise if the subtype is parametric-eligible
    const cabType = subtypeToCabinetType(form.category, form.subtype);
    return cabType ? defaultCabinetSpec(cabType) : null;
  });

  // Shape editor state: initialise from existing planner_hints.shape_editor if present
  const [shapeEditorConfig, setShapeEditorConfig] = useState<ShapeEditorConfig | null>(() => {
    const existing = form.planner_hints?.shape_editor;
    if (existing && typeof existing === 'object' && 'version' in (existing as object)) {
      return existing as ShapeEditorConfig;
    }
    return null;
  });

  // Mesh generation state
  const [meshStatus, setMeshStatus] = useState<'idle' | 'generating' | 'uploading' | 'done' | 'error'>('idle');

  // Wrap setShapeEditorConfig to reset mesh status on profile/extrusion edits
  const updateShapeEditor = useCallback((
    valueOrUpdater: ShapeEditorConfig | null | ((prev: ShapeEditorConfig | null) => ShapeEditorConfig | null),
  ) => {
    setShapeEditorConfig(valueOrUpdater);
    // Any edit after a successful generation marks the mesh as potentially stale
    setMeshStatus((prev) => (prev === 'done' ? 'idle' : prev));
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const updateField = useCallback(<K extends keyof EditorFormState>(
    key: K,
    value: EditorFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }, []);

  const toggleArrayItem = useCallback((key: 'compatible_room_types' | 'requires_services', value: string) => {
    setForm((prev) => {
      const arr = prev[key];
      return {
        ...prev,
        [key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  }, []);

  // When category changes, reset subtype to first available and update parametric state
  const handleCategoryChange = useCallback((cat: string) => {
    const subs = SUBTYPES[cat] || [];
    const newSubtype = subs[0]?.value || '';
    setForm((prev) => ({
      ...prev,
      category: cat,
      subtype: newSubtype,
    }));
    // Auto-init or clear parametric spec
    const cabType = subtypeToCabinetType(cat, newSubtype);
    setCabinetSpec(cabType ? defaultCabinetSpec(cabType) : null);
  }, []);

  // ─── Planner hints editor ─────────────────────────────────────────────────

  const handlePlannerHintsChange = useCallback((raw: string) => {
    setPlannerHintsRaw(raw);
    try {
      const parsed = JSON.parse(raw);
      setForm((prev) => ({ ...prev, planner_hints: parsed }));
      setPlannerHintsError(null);
    } catch {
      setPlannerHintsError('Invalid JSON');
    }
  }, []);

  // ─── File upload ─────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (
    file: File,
    bucketType: 'thumbnail' | 'model',
  ) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucketType);
      if (asset?.id) formData.append('assetId', asset.id);

      const token = await getAccessToken();
      const res = await fetch('/api/admin/warehouse-upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(body.error || 'Upload failed');
      }

      const result = await res.json();

      if (bucketType === 'thumbnail') {
        updateField('thumbnail_ref', result.fullPath);
      } else {
        // Store model ref in planner_hints
        setForm((prev) => {
          const hints = { ...prev.planner_hints, model_ref: result.fullPath };
          setPlannerHintsRaw(JSON.stringify(hints, null, 2));
          return { ...prev, planner_hints: hints };
        });
      }

      setSuccess(`${bucketType === 'thumbnail' ? 'Thumbnail' : 'Model'} uploaded successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [asset?.id, updateField, getAccessToken]);

  // ─── GLB Mesh Generation ───────────────────────────────────────────────

  const handleGenerateMesh = useCallback(async () => {
    if (!shapeEditorConfig?.profile?.points || !shapeEditorConfig.extrusion) return;
    if (shapeEditorConfig.profile.points.length < 3) {
      setError('Profile needs at least 3 points to generate a mesh');
      return;
    }

    setMeshStatus('generating');
    setError(null);

    try {
      const color = (form.planner_hints?.material_color as string) || '#8899aa';
      const blob = await generateExtrusionGLB(
        shapeEditorConfig.profile.points,
        shapeEditorConfig.extrusion,
        color,
        shapeEditorConfig.profile.curves,
      );

      setMeshStatus('uploading');

      const file = new File([blob], 'profile.glb', { type: 'model/gltf-binary' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'model');
      if (asset?.id) formData.append('assetId', asset.id);

      const token = await getAccessToken();
      const res = await fetch('/api/admin/warehouse-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(body.error || 'Mesh upload failed');
      }

      const result = await res.json();
      const now = new Date().toISOString();

      setShapeEditorConfig((prev) =>
        prev
          ? { ...prev, mesh_ref: result.fullPath, mesh_generated_at: now }
          : prev,
      );

      setMeshStatus('done');
      setSuccess('Mesh generated and uploaded');
    } catch (err) {
      setMeshStatus('error');
      setError(err instanceof Error ? err.message : 'Mesh generation failed');
    }
  }, [shapeEditorConfig, form.planner_hints, asset?.id, getAccessToken]);

  // ─── Save ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    // Validation
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.category) {
      setError('Category is required');
      return;
    }
    if (!form.subtype) {
      setError('Subtype is required');
      return;
    }
    if (plannerHintsError) {
      setError('Fix planner hints JSON before saving');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Merge cabinet_spec and shape_editor into planner_hints before sending
      const mergedHints = { ...form.planner_hints };
      if (cabinetSpec) {
        mergedHints.cabinet_spec = cabinetSpec;
      } else {
        delete mergedHints.cabinet_spec;
      }
      if (shapeEditorConfig) {
        mergedHints.shape_editor = shapeEditorConfig;
      } else {
        delete mergedHints.shape_editor;
      }

      const payload = {
        name: form.name.trim(),
        category: form.category,
        subtype: form.subtype,
        source: form.source,
        source_platform: form.source_platform,
        width: form.width,
        depth: form.depth,
        height: form.height,
        front_clearance: form.front_clearance,
        placement_mode: form.placement_mode,
        is_wall_mounted: form.is_wall_mounted,
        is_freestanding: form.is_freestanding,
        compatible_room_types: form.compatible_room_types.length > 0
          ? form.compatible_room_types
          : null,
        requires_services: form.requires_services.length > 0
          ? form.requires_services
          : null,
        planner_hints: Object.keys(mergedHints).length > 0
          ? mergedHints
          : null,
        material_name: form.material_name || 'Standard',
        thumbnail_ref: form.thumbnail_ref || null,
        notes: form.notes || null,
      };

      const url = '/api/workspace/warehouse-assets';
      const method = isNew ? 'POST' : 'PATCH';
      const body = isNew ? payload : { id: asset!.id, ...payload };

      const token = await getAccessToken();
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(data.error || 'Save failed');
      }

      const result = await res.json();
      setSuccess(isNew ? 'Object created successfully' : 'Object saved successfully');

      if (isNew && result.asset?.id) {
        // Redirect to edit page
        router.push(`/admin/warehouse/${result.asset.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [form, isNew, asset, plannerHintsError, cabinetSpec, shapeEditorConfig, router, getAccessToken]);

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!asset?.id) return;
    if (!confirm('Delete this warehouse object? This cannot be undone.')) return;

    setSaving(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/workspace/warehouse-assets', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: asset.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(data.error || 'Delete failed');
      }

      router.push('/admin/warehouse');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setSaving(false);
    }
  }, [asset, router, getAccessToken]);

  // ─── Subtype options for current category ──────────────────────────────

  const subtypeOptions = SUBTYPES[form.category] || [];

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-6">
      {/* Status messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* ── Section A: Identity ──────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Base Unit 600"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Subtype */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtype *</label>
            <select
              value={form.subtype}
              onChange={(e) => {
                const sub = e.target.value;
                updateField('subtype', sub);
                // Update parametric spec when subtype changes
                const cabType = subtypeToCabinetType(form.category, sub);
                setCabinetSpec(cabType ? defaultCabinetSpec(cabType) : null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {subtypeOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={form.source}
              onChange={(e) => updateField('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Source Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Platform</label>
            <select
              value={form.source_platform}
              onChange={(e) => updateField('source_platform', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── Section B: Dimensions ────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dimensions (mm)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
            <input
              type="number"
              value={form.width}
              onChange={(e) => updateField('width', Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Depth</label>
            <input
              type="number"
              value={form.depth}
              onChange={(e) => updateField('depth', Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
            <input
              type="number"
              value={form.height}
              onChange={(e) => updateField('height', Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Front Clearance</label>
            <input
              type="number"
              value={form.front_clearance}
              onChange={(e) => updateField('front_clearance', Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </section>

      {/* ── Section C: Placement / Planner Behaviour ─────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Placement &amp; Planner Behaviour</h3>
        <div className="space-y-4">
          {/* Placement mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placement Mode</label>
            <select
              value={form.placement_mode}
              onChange={(e) => updateField('placement_mode', e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {PLACEMENT_MODES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_wall_mounted}
                onChange={(e) => updateField('is_wall_mounted', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Wall Mounted</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_freestanding}
                onChange={(e) => updateField('is_freestanding', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Freestanding</span>
            </label>
          </div>

          {/* Compatible Room Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Compatible Room Types</label>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => toggleArrayItem('compatible_room_types', rt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.compatible_room_types.includes(rt)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {rt.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            {form.compatible_room_types.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">None selected — object works in all room types</p>
            )}
          </div>

          {/* Requires Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Requires Services</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((sv) => (
                <button
                  key={sv}
                  type="button"
                  onClick={() => toggleArrayItem('requires_services', sv)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.requires_services.includes(sv)
                      ? 'bg-amber-100 border-amber-300 text-amber-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {sv.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Planner Hints (JSON) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Planner Hints (JSON)
            </label>
            <textarea
              value={plannerHintsRaw}
              onChange={(e) => handlePlannerHintsChange(e.target.value)}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none ${
                plannerHintsError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder='{"parametric": {"resizable": true, "minWidth": 300, "maxWidth": 1200}}'
            />
            {plannerHintsError && (
              <p className="text-xs text-red-500 mt-1">{plannerHintsError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Advanced: parametric rules, connection rules, material details, pricing, auto-fit hints.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section C2: Parametric Builder (conditional) ─────────────────── */}
      {cabinetSpec && isParametricEligible(form.category, form.subtype) && (
        <section className="bg-white rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Parametric Builder
              <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {cabinetSpec.type.replace(/_/g, ' ')}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => {
                const cabType = subtypeToCabinetType(form.category, form.subtype);
                if (cabType) setCabinetSpec(defaultCabinetSpec(cabType));
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Builder form — 2 columns */}
            <div className="lg:col-span-2">
              <ParametricBuilder
                spec={cabinetSpec}
                onChange={setCabinetSpec}
              />
            </div>

            {/* Live preview — 1 column */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Live Preview</p>
                <ParametricPreview
                  spec={cabinetSpec}
                  width={form.width}
                  depth={form.depth}
                  height={form.height}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section C3: Shape Editor (Phase 3A + 3B) ─────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Shape Editor
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              2D Profile + Extrusion
            </span>
          </h3>
          <div className="flex items-center gap-3">
            {shapeEditorConfig ? (
              <button
                type="button"
                onClick={() => updateShapeEditor(null)}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Remove Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  updateShapeEditor(
                    defaultShapeEditorConfig(form.width, form.height, form.depth),
                  )
                }
                className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Create Custom Profile
              </button>
            )}
          </div>
        </div>

        {shapeEditorConfig ? (
          <div className="space-y-6">
            {/* 2D Profile Editor (Phase 3A) */}
            <ProfileEditor
              config={shapeEditorConfig}
              onChange={updateShapeEditor}
              assetWidth={form.width}
              assetHeight={form.height}
            />

            {/* Extrusion Controls (Phase 3B) */}
            <fieldset className="border border-gray-200 rounded-lg p-4">
              <legend className="text-sm font-semibold text-gray-700 px-2">Extrusion</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Depth */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Depth (mm)</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    step={10}
                    value={shapeEditorConfig.extrusion?.depth ?? 580}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 580);
                      updateShapeEditor({
                        ...shapeEditorConfig,
                        extrusion: {
                          ...(shapeEditorConfig.extrusion ?? defaultExtrusionConfig()),
                          depth: val,
                        },
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Direction */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
                  <select
                    value={shapeEditorConfig.extrusion?.direction ?? 'z'}
                    onChange={(e) => {
                      updateShapeEditor({
                        ...shapeEditorConfig,
                        extrusion: {
                          ...(shapeEditorConfig.extrusion ?? defaultExtrusionConfig()),
                          direction: e.target.value as 'x' | 'y' | 'z',
                        },
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="z">Z — Into depth (front→back)</option>
                    <option value="y">Y — Upward (along height)</option>
                    <option value="x">X — Sideways (along width)</option>
                  </select>
                </div>

                {/* Symmetric */}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shapeEditorConfig.extrusion?.symmetric ?? false}
                      onChange={(e) => {
                        updateShapeEditor({
                          ...shapeEditorConfig,
                          extrusion: {
                            ...(shapeEditorConfig.extrusion ?? defaultExtrusionConfig()),
                            symmetric: e.target.checked,
                          },
                        });
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Symmetric</span>
                  </label>
                </div>
              </div>

              {/* Extrusion summary */}
              <div className="mt-3 text-xs text-gray-500">
                Profile ({shapeEditorConfig.bbox.width}×{shapeEditorConfig.bbox.height}mm)
                extruded {shapeEditorConfig.extrusion?.depth ?? 580}mm
                along {(shapeEditorConfig.extrusion?.direction ?? 'z').toUpperCase()}-axis
                {shapeEditorConfig.extrusion?.symmetric ? ' (symmetric)' : ''}
                {shapeEditorConfig.mesh_ref && (
                  <span className="ml-2 text-emerald-600">
                    · Mesh saved ✓
                  </span>
                )}
              </div>
            </fieldset>

            {/* ── Generate Mesh (Phase 3B.1) ──────────────────────────────── */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={
                  meshStatus === 'generating' ||
                  meshStatus === 'uploading' ||
                  !shapeEditorConfig.extrusion ||
                  shapeEditorConfig.profile.points.length < 3 ||
                  isNew
                }
                onClick={handleGenerateMesh}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  meshStatus === 'generating' || meshStatus === 'uploading'
                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {meshStatus === 'generating'
                  ? 'Generating GLB…'
                  : meshStatus === 'uploading'
                    ? 'Uploading…'
                    : shapeEditorConfig.mesh_ref
                      ? 'Regenerate Mesh'
                      : 'Generate Mesh'}
              </button>

              {isNew && (
                <span className="text-xs text-amber-600">
                  Save the asset first before generating a mesh.
                </span>
              )}

              {meshStatus === 'done' && (
                <span className="text-xs text-emerald-600">
                  ✓ GLB uploaded
                </span>
              )}
              {meshStatus === 'error' && (
                <span className="text-xs text-red-500">
                  ✗ Generation failed
                </span>
              )}

              {/* Stale mesh warning */}
              {shapeEditorConfig.mesh_ref &&
                shapeEditorConfig.mesh_generated_at &&
                meshStatus !== 'done' && (
                  (() => {
                    const genTime = new Date(shapeEditorConfig.mesh_generated_at!).getTime();
                    const isStale = Date.now() - genTime > 5000 && meshStatus !== 'generating' && meshStatus !== 'uploading';
                    return isStale ? (
                      <span className="text-xs text-amber-500">
                        ⚠ Profile or extrusion may have changed since last mesh generation
                      </span>
                    ) : null;
                  })()
                )}
            </div>

            {shapeEditorConfig.mesh_ref && (
              <div className="text-xs text-gray-400 truncate">
                Mesh: {shapeEditorConfig.mesh_ref}
                {shapeEditorConfig.mesh_generated_at && (
                  <span className="ml-2">
                    ({new Date(shapeEditorConfig.mesh_generated_at).toLocaleString()})
                  </span>
                )}
              </div>
            )}

            {/* Extrusion Preview (Phase 3B — isometric SVG) */}
            <ExtrusionPreviewSection config={shapeEditorConfig} color={form.planner_hints?.material_color as string | undefined} />
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No custom profile. Click &quot;Create Custom Profile&quot; to define a 2D shape
            for this object. The default bounding box ({form.width}×{form.height}mm) applies.
          </p>
        )}
      </section>

      {/* ── Section D: Presentation ──────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Presentation</h3>
        <div className="space-y-4">
          {/* Material name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
            <input
              type="text"
              value={form.material_name}
              onChange={(e) => updateField('material_name', e.target.value)}
              placeholder="e.g. Oak Veneer, White Gloss"
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              placeholder="Internal notes, specifications, compatibility notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Thumbnail upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.thumbnail_ref ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl(form.thumbnail_ref)}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-gray-400 text-2xl">🖼️</span>
                )}
              </div>

              <div className="flex-1">
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'thumbnail');
                  }}
                />
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Thumbnail'}
                </button>
                <p className="text-xs text-gray-400 mt-1">JPEG or PNG, max 2MB</p>

                {/* Manual reference */}
                <input
                  type="text"
                  value={form.thumbnail_ref}
                  onChange={(e) => updateField('thumbnail_ref', e.target.value)}
                  placeholder="Or paste a reference path..."
                  className="mt-2 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Model file upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">3D Model (optional)</label>
            <div className="flex items-center gap-4">
              <input
                ref={modelInputRef}
                type="file"
                accept=".ply,.usdz,.glb,.obj"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'model');
                }}
              />
              <button
                type="button"
                onClick={() => modelInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload 3D Model'}
              </button>
              <p className="text-xs text-gray-400">PLY, USDZ, or OBJ — max 25MB</p>
            </div>
            {!!(form.planner_hints as Record<string, unknown>)?.model_ref && (
              <p className="text-xs text-emerald-600 mt-1">
                Model: {String((form.planner_hints as Record<string, unknown>).model_ref)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Section E: Preview ───────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Visual preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Visual</h4>
            <div className="aspect-square bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
              {form.thumbnail_ref ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailUrl(form.thumbnail_ref)}
                  alt={form.name || 'Object preview'}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
                      '<div class="text-center"><p class="text-4xl mb-2">📦</p><p class="text-sm text-gray-400">No thumbnail</p></div>';
                  }}
                />
              ) : cabinetSpec ? (
                <div className="w-full p-2">
                  <ParametricPreview
                    spec={cabinetSpec}
                    width={form.width}
                    depth={form.depth}
                    height={form.height}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-4xl mb-2">📦</p>
                  <p className="text-sm text-gray-400">No thumbnail</p>
                </div>
              )}
            </div>
          </div>

          {/* Structured summary */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Structured Data</h4>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3 text-sm">
              <SummaryRow label="Name" value={form.name || '—'} />
              <SummaryRow label="Category" value={form.category} />
              <SummaryRow label="Subtype" value={form.subtype.replace(/_/g, ' ')} />
              <SummaryRow label="Dimensions" value={`${form.width} × ${form.depth} × ${form.height} mm`} />
              <SummaryRow label="Placement" value={form.placement_mode} />
              <SummaryRow label="Wall Mounted" value={form.is_wall_mounted ? 'Yes' : 'No'} />
              <SummaryRow label="Freestanding" value={form.is_freestanding ? 'Yes' : 'No'} />
              <SummaryRow label="Front Clearance" value={`${form.front_clearance} mm`} />
              <SummaryRow label="Material" value={form.material_name} />
              <SummaryRow label="Source" value={form.source} />
              <SummaryRow label="Platform" value={form.source_platform} />
              {form.compatible_room_types.length > 0 && (
                <SummaryRow
                  label="Room Types"
                  value={form.compatible_room_types.join(', ')}
                />
              )}
              {form.requires_services.length > 0 && (
                <SummaryRow
                  label="Services"
                  value={form.requires_services.join(', ')}
                />
              )}
              {!!(form.planner_hints as Record<string, unknown>)?.model_ref && (
                <SummaryRow label="3D Model" value="Uploaded" />
              )}
              {form.thumbnail_ref && (
                <SummaryRow label="Thumbnail" value="Set" />
              )}
              {cabinetSpec && (
                <SummaryRow label="Parametric" value={cabinetSpec.type.replace(/_/g, ' ')} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Saving...' : isNew ? 'Create Object' : 'Save Changes'}
          </button>
          <button
            onClick={() => router.push('/admin/warehouse')}
            className="px-6 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>

        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Delete Object
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Small helper ────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}
