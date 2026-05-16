// src/components/admin/ModelImporter.tsx
//
// Admin External Model Importer — Phase 4A.
// Allows importing existing 3D models (GLB/glTF) into the TISSCA warehouse.
//
// Workflow:
//   1. Upload GLB/glTF file (drag-drop or file picker)
//   2. Preview + auto-extract bounding box
//   3. Normalise: set dimensions, category, placement, metadata
//   4. Save as a structured warehouse asset with mesh_ref
//
// Reuses existing upload pipeline, CRUD endpoints, and storage proxy.

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ['.glb', '.gltf'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (matches warehouse-upload)

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

const ROOM_TYPES = [
  'kitchen', 'wardrobe', 'bathroom', 'utility', 'bedroom', 'living', 'general',
];

/** Unit systems for smart dimension guessing. */
type ModelUnit = 'metres' | 'millimetres' | 'centimetres' | 'unknown';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelInfo {
  /** Original filename */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Raw bounding box from GLTFLoader (in model's native units) */
  rawBBox: THREE.Box3;
  /** Detected unit system */
  detectedUnit: ModelUnit;
  /** Bounding box converted to mm */
  bboxMm: { width: number; depth: number; height: number };
  /** Number of meshes in the scene */
  meshCount: number;
  /** Total triangle count */
  triangleCount: number;
  /** Parsed THREE.Group (for preview rendering) */
  scene: THREE.Group;
}

interface ImportFormState {
  name: string;
  category: string;
  subtype: string;
  width: number;
  depth: number;
  height: number;
  placement_mode: string;
  is_wall_mounted: boolean;
  is_freestanding: boolean;
  compatible_room_types: string[];
  material_name: string;
  notes: string;
  /** User-selected unit interpretation for the raw model */
  unit: ModelUnit;
  /** Orientation correction: rotation around Y axis in 90° increments */
  yRotation: 0 | 90 | 180 | 270;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Detect likely unit system from raw GLTF bounding box.
 * glTF spec says metres, but many exporters use mm or cm.
 *
 * Heuristic: if the largest dimension is > 50, it's likely mm.
 * If between 1–50, likely metres. If between 50–5000, could be mm or cm.
 */
function detectUnit(bbox: THREE.Box3): ModelUnit {
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim <= 0) return 'unknown';
  if (maxDim > 100) return 'millimetres'; // e.g. 600 → probably mm
  if (maxDim > 5) return 'centimetres';  // e.g. 60 → probably cm
  return 'metres'; // e.g. 0.6 → standard glTF metres
}

/** Convert a dimension from model units to mm. */
function toMm(value: number, unit: ModelUnit): number {
  switch (unit) {
    case 'metres': return Math.round(value * 1000);
    case 'centimetres': return Math.round(value * 10);
    case 'millimetres': return Math.round(value);
    default: return Math.round(value * 1000); // assume metres
  }
}

/** Compute bbox in mm applying unit + rotation. */
function computeBBoxMm(
  rawBBox: THREE.Box3,
  unit: ModelUnit,
  yRotation: 0 | 90 | 180 | 270,
): { width: number; depth: number; height: number } {
  const size = new THREE.Vector3();
  rawBBox.getSize(size);

  // Raw → mm
  let w = toMm(size.x, unit);
  let d = toMm(size.z, unit);
  const h = toMm(size.y, unit);

  // Apply Y-axis rotation
  if (yRotation === 90 || yRotation === 270) {
    const tmp = w;
    w = d;
    d = tmp;
  }

  return { width: Math.abs(w), depth: Math.abs(d), height: Math.abs(h) };
}

/**
 * Parse a GLB/glTF file from an ArrayBuffer.
 * Returns model info with parsed scene and computed metadata.
 */
async function parseModelFile(
  buffer: ArrayBuffer,
  fileName: string,
  fileSize: number,
): Promise<ModelInfo> {
  const loader = new GLTFLoader();

  return new Promise<ModelInfo>((resolve, reject) => {
    loader.parse(
      buffer,
      '', // path (unused for binary)
      (gltf) => {
        const scene = gltf.scene;

        // Compute bounding box
        const rawBBox = new THREE.Box3().setFromObject(scene);

        // Count meshes + triangles
        let meshCount = 0;
        let triangleCount = 0;
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshCount++;
            const geo = child.geometry;
            if (geo.index) {
              triangleCount += geo.index.count / 3;
            } else if (geo.attributes.position) {
              triangleCount += geo.attributes.position.count / 3;
            }
          }
        });

        const detectedUnit = detectUnit(rawBBox);
        const bboxMm = computeBBoxMm(rawBBox, detectedUnit, 0);

        resolve({
          fileName,
          fileSize,
          rawBBox,
          detectedUnit,
          bboxMm,
          meshCount,
          triangleCount: Math.round(triangleCount),
          scene,
        });
      },
      (err) => {
        reject(new Error(`Failed to parse model: ${err}`));
      },
    );
  });
}

// ─── 3D Preview (Three.js without R3F — purely imperative for admin) ─────

function ModelPreviewCanvas({
  scene,
  yRotation,
}: {
  scene: THREE.Group;
  yRotation: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !scene) return;

    const width = container.clientWidth;
    const height = 320;

    // Scene setup
    const previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color('#1e293b');

    // Clone and add the model
    const model = scene.clone();
    model.rotation.y = (yRotation * Math.PI) / 180;

    // Centre model at origin
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    previewScene.add(model);

    // Compute camera distance from bounding sphere
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const fov = 45;
    const camDist = (sphere.radius / Math.sin((fov / 2) * (Math.PI / 180))) * 1.3;

    // Camera
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.01, camDist * 10);
    camera.position.set(camDist * 0.6, camDist * 0.5, camDist * 0.8);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight('#ffffff', 0.6);
    previewScene.add(ambient);
    const dirLight = new THREE.DirectionalLight('#ffffff', 0.8);
    dirLight.position.set(camDist, camDist, camDist);
    previewScene.add(dirLight);

    // Grid helper (floor)
    const gridSize = Math.ceil(sphere.radius * 3);
    const grid = new THREE.GridHelper(gridSize, 20, '#475569', '#334155');
    grid.position.y = box.min.y - center.y;
    previewScene.add(grid);

    // Axes helper
    const axes = new THREE.AxesHelper(sphere.radius * 0.5);
    previewScene.add(axes);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Animate (slow auto-rotate)
    let angle = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      angle += 0.003;
      camera.position.set(
        Math.sin(angle) * camDist * 0.8,
        camDist * 0.5,
        Math.cos(angle) * camDist * 0.8,
      );
      camera.lookAt(0, 0, 0);
      renderer.render(previewScene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      container.innerHTML = '';
      rendererRef.current = null;
    };
  }, [scene, yRotation]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden border border-gray-700"
      style={{ height: 320 }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ModelImporter() {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── State ───────────────────────────────────────────────────────────

  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);

  const [form, setForm] = useState<ImportFormState>({
    name: '',
    category: 'kitchen',
    subtype: 'base_unit',
    width: 600,
    depth: 580,
    height: 870,
    placement_mode: 'wall',
    is_wall_mounted: false,
    is_freestanding: false,
    compatible_room_types: [],
    material_name: 'Standard',
    notes: '',
    unit: 'metres',
    yRotation: 0,
  });

  // Update form dimensions when unit or rotation changes
  const recalcDimensions = useCallback(
    (unit: ModelUnit, yRot: 0 | 90 | 180 | 270) => {
      if (!modelInfo) return;
      const dims = computeBBoxMm(modelInfo.rawBBox, unit, yRot);
      setForm((prev) => ({
        ...prev,
        unit,
        yRotation: yRot,
        width: dims.width,
        depth: dims.depth,
        height: dims.height,
      }));
    },
    [modelInfo],
  );

  // ─── File Validation & Parsing ───────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setSuccess(null);
    setModelInfo(null);
    setRawBuffer(null);

    // Validate extension
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large: ${formatBytes(file.size)}. Maximum: ${formatBytes(MAX_FILE_SIZE)}`);
      return;
    }

    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const info = await parseModelFile(buffer, file.name, file.size);
      setModelInfo(info);
      setRawBuffer(buffer);

      // Auto-populate form from model metadata
      const nameBase = file.name.replace(/\.(glb|gltf)$/i, '').replace(/[_-]/g, ' ');
      const dims = computeBBoxMm(info.rawBBox, info.detectedUnit, 0);

      setForm((prev) => ({
        ...prev,
        name: nameBase,
        unit: info.detectedUnit,
        yRotation: 0,
        width: dims.width,
        depth: dims.depth,
        height: dims.height,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse model file');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Drag & Drop ────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [processFile],
  );

  // ─── Form Helpers ──────────────────────────────────────────────────

  const updateField = useCallback(<K extends keyof ImportFormState>(
    key: K,
    value: ImportFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    const subs = SUBTYPES[cat] || [];
    setForm((prev) => ({
      ...prev,
      category: cat,
      subtype: subs[0]?.value || '',
    }));
  }, []);

  const toggleRoomType = useCallback((rt: string) => {
    setForm((prev) => ({
      ...prev,
      compatible_room_types: prev.compatible_room_types.includes(rt)
        ? prev.compatible_room_types.filter((r) => r !== rt)
        : [...prev.compatible_room_types, rt],
    }));
  }, []);

  // ─── Save to Warehouse ────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!modelInfo || !rawBuffer) {
      setError('No model loaded. Upload a file first.');
      return;
    }
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.category || !form.subtype) {
      setError('Category and subtype are required');
      return;
    }
    if (form.width <= 0 || form.depth <= 0 || form.height <= 0) {
      setError('All dimensions must be greater than zero');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getAccessToken();

      // Step 1: Upload the GLB file to asset-meshes
      const glbFile = new File(
        [rawBuffer],
        'imported.glb',
        { type: 'model/gltf-binary' },
      );
      const uploadForm = new FormData();
      uploadForm.append('file', glbFile);
      uploadForm.append('bucket', 'model');

      const uploadRes = await fetch('/api/admin/warehouse-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(body.error || 'Failed to upload model file');
      }

      const uploadResult = await uploadRes.json();
      const meshRef = uploadResult.fullPath as string;

      // Step 2: Create warehouse asset
      const now = new Date().toISOString();
      const importMeta = {
        imported_model: {
          original_filename: modelInfo.fileName,
          original_size: modelInfo.fileSize,
          detected_unit: form.unit,
          mesh_count: modelInfo.meshCount,
          triangle_count: modelInfo.triangleCount,
          y_rotation_applied: form.yRotation,
          import_date: now,
        },
        shape_editor: {
          version: 1 as const,
          mode: 'profile_polyline' as const,
          profile: {
            // Create a rectangular profile matching the imported dimensions
            points: [
              [0, 0],
              [form.width, 0],
              [form.width, form.height],
              [0, form.height],
            ] as [number, number][],
            closed: true,
          },
          bbox: { width: form.width, height: form.height },
          extrusion: {
            depth: form.depth,
            direction: 'z' as const,
            symmetric: false,
          },
          mesh_ref: meshRef,
          mesh_generated_at: now,
        },
      };

      const payload = {
        name: form.name.trim(),
        category: form.category,
        subtype: form.subtype,
        source: 'imported',
        source_platform: 'web',
        width: form.width,
        depth: form.depth,
        height: form.height,
        front_clearance: 0,
        placement_mode: form.placement_mode,
        is_wall_mounted: form.is_wall_mounted,
        is_freestanding: form.is_freestanding,
        compatible_room_types: form.compatible_room_types.length > 0
          ? form.compatible_room_types
          : null,
        requires_services: null,
        planner_hints: importMeta,
        material_name: form.material_name || 'Standard',
        thumbnail_ref: null,
        notes: form.notes || null,
      };

      const createRes = await fetch('/api/workspace/warehouse-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({ error: 'Create failed' }));
        throw new Error(body.error || 'Failed to create warehouse asset');
      }

      const result = await createRes.json();
      setSuccess('Model imported and saved as warehouse asset');

      // Redirect to the new asset's edit page
      if (result.asset?.id) {
        setTimeout(() => {
          router.push(`/admin/warehouse/${result.asset.id}`);
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSaving(false);
    }
  }, [modelInfo, rawBuffer, form, router, getAccessToken]);

  // ─── Derived ─────────────────────────────────────────────────────────

  const subtypeOptions = SUBTYPES[form.category] || [];
  const hasModel = modelInfo !== null;

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-6">
      {/* Status messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Section A: File Upload
          ═══════════════════════════════════════════════════════════════════ */}
      <fieldset className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
        <legend className="text-sm font-semibold text-gray-700 px-2">
          A. Upload Model File
        </legend>

        <div
          className={`
            mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
            ${loading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            onChange={handleFileSelect}
            className="hidden"
          />

          {loading ? (
            <div className="space-y-2">
              <div className="animate-spin mx-auto w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full" />
              <p className="text-sm text-gray-500">Parsing model...</p>
            </div>
          ) : hasModel ? (
            <div className="space-y-1">
              <p className="text-lg font-medium text-green-700">✓ Model loaded</p>
              <p className="text-sm text-gray-500">
                {modelInfo.fileName} · {formatBytes(modelInfo.fileSize)}
              </p>
              <p className="text-xs text-gray-400">Click or drag to replace</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-3xl">📦</p>
              <p className="text-sm font-medium text-gray-700">
                Drag & drop a GLB/glTF file here
              </p>
              <p className="text-xs text-gray-400">
                or click to browse · Max {formatBytes(MAX_FILE_SIZE)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-400 space-y-1">
          <p>
            <strong>Supported now:</strong> GLB (Binary glTF), glTF
          </p>
          <p>
            <strong>Future:</strong> SketchUp (.skp) — export to GLB from SketchUp first
          </p>
        </div>
      </fieldset>

      {/* ═══════════════════════════════════════════════════════════════════
          Section B: Model Preview & Inspection
          ═══════════════════════════════════════════════════════════════════ */}
      {hasModel && (
        <fieldset className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
          <legend className="text-sm font-semibold text-gray-700 px-2">
            B. Model Preview & Inspection
          </legend>

          {/* 3D Preview */}
          <div className="mt-2">
            <ModelPreviewCanvas
              scene={modelInfo.scene}
              yRotation={form.yRotation}
            />
          </div>

          {/* Model Stats */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Meshes</p>
              <p className="text-lg font-semibold text-gray-900">{modelInfo.meshCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Triangles</p>
              <p className="text-lg font-semibold text-gray-900">
                {modelInfo.triangleCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">File Size</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatBytes(modelInfo.fileSize)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Detected Unit</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {modelInfo.detectedUnit}
              </p>
            </div>
          </div>

          {/* Quality warnings */}
          {modelInfo.triangleCount > 100000 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-xs">
              ⚠ High triangle count ({modelInfo.triangleCount.toLocaleString()}).
              Consider decimating the mesh for better planner performance.
            </div>
          )}
          {modelInfo.meshCount === 0 && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              ✕ No meshes found in this file. The model cannot be used.
            </div>
          )}
        </fieldset>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Section C: Normalisation Controls
          ═══════════════════════════════════════════════════════════════════ */}
      {hasModel && (
        <fieldset className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
          <legend className="text-sm font-semibold text-gray-700 px-2">
            C. Normalisation & Metadata
          </legend>

          {/* C.1 — Identity */}
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Asset Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. IKEA METOD Base Cabinet 60cm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subtype *</label>
                <select
                  value={form.subtype}
                  onChange={(e) => updateField('subtype', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {subtypeOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* C.2 — Unit & Orientation */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Unit System & Orientation
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Model Units
                </label>
                <select
                  value={form.unit}
                  onChange={(e) => {
                    const u = e.target.value as ModelUnit;
                    recalcDimensions(u, form.yRotation);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="metres">Metres (glTF standard)</option>
                  <option value="centimetres">Centimetres</option>
                  <option value="millimetres">Millimetres</option>
                </select>
                {modelInfo && (
                  <p className="text-xs text-gray-400 mt-1">
                    Auto-detected: {modelInfo.detectedUnit}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Forward Orientation (Y Rotation)
                </label>
                <div className="flex gap-2">
                  {([0, 90, 180, 270] as const).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => recalcDimensions(form.unit, deg)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                        ${form.yRotation === deg
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'}
                      `}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Rotate so the front face points towards the camera
                </p>
              </div>
            </div>
          </div>

          {/* C.3 — Dimensions */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Dimensions (mm)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Width</label>
                <input
                  type="number"
                  value={form.width}
                  onChange={(e) => updateField('width', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Depth</label>
                <input
                  type="number"
                  value={form.depth}
                  onChange={(e) => updateField('depth', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Height</label>
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) => updateField('height', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  min={1}
                />
              </div>
            </div>
            {modelInfo && (
              <p className="text-xs text-gray-400 mt-2">
                Auto-extracted from bounding box. Override manually if the model scale is incorrect.
              </p>
            )}
          </div>

          {/* C.4 — Placement */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Placement
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Placement Mode
                </label>
                <select
                  value={form.placement_mode}
                  onChange={(e) => updateField('placement_mode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {PLACEMENT_MODES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_wall_mounted}
                    onChange={(e) => updateField('is_wall_mounted', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Wall Mounted
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_freestanding}
                    onChange={(e) => updateField('is_freestanding', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Freestanding
                </label>
              </div>
            </div>
          </div>

          {/* C.5 — Room Compatibility */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Room Compatibility
            </h4>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => toggleRoomType(rt)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize
                    ${form.compatible_room_types.includes(rt)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-gray-300 text-gray-500 hover:bg-gray-50'}
                  `}
                >
                  {rt}
                </button>
              ))}
            </div>
          </div>

          {/* C.6 — Material & Notes */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Additional Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Material Name
                </label>
                <input
                  type="text"
                  value={form.material_name}
                  onChange={(e) => updateField('material_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. Oak, Laminate, Steel"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  placeholder="Import source, model credits, etc."
                />
              </div>
            </div>
          </div>
        </fieldset>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Section D: Save Actions
          ═══════════════════════════════════════════════════════════════════ */}
      {hasModel && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.name.trim() || modelInfo.meshCount === 0}
            className={`
              px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors
              ${saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}
            `}
          >
            {saving ? 'Importing...' : 'Import to Warehouse'}
          </button>

          <button
            type="button"
            onClick={() => {
              setModelInfo(null);
              setRawBuffer(null);
              setError(null);
              setSuccess(null);
            }}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>

          {saving && (
            <span className="text-xs text-gray-500 animate-pulse">
              Uploading model and creating asset...
            </span>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Format Support Info
          ═══════════════════════════════════════════════════════════════════ */}
      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">
          Format support & workflow notes
        </summary>
        <div className="mt-2 space-y-2 bg-gray-50 rounded-lg p-3">
          <p>
            <strong>GLB/glTF (supported now):</strong> Binary glTF is the canonical runtime format.
            Models are parsed client-side, bounding boxes extracted automatically,
            and stored in Supabase Storage. The planner loads them via the existing
            mesh_ref pipeline.
          </p>
          <p>
            <strong>SketchUp (.skp):</strong> Not directly supported. Export your SketchUp model
            to GLB format first (File → Export → 3D Model → glTF/GLB). This preserves
            geometry and materials while ensuring compatibility.
          </p>
          <p>
            <strong>Other formats (OBJ, FBX, STEP):</strong> Future work. Convert to GLB using
            Blender or other tools before importing.
          </p>
          <p>
            <strong>After import:</strong> The asset appears in the warehouse with source &quot;Imported&quot;.
            You can edit it further in the Warehouse Object Editor to add parametric
            specs, shape profiles, or custom thumbnails.
          </p>
        </div>
      </details>
    </div>
  );
}
