// src/spatial/moduleMeshBuilder.ts
//
// Creates Three.js Groups for placed kitchen/wardrobe modules.
// Returns a THREE.Group with structured sub-meshes.
//
// Fallback chain (Phase 3B.2):
//   1a. shape_editor.mesh_ref → async GLB load (replaces placeholder on success)
//   1b. shape_editor → extruded profile mesh (immediate placeholder / fallback)
//   2.  cabinet_spec → parametric box with doors/drawers/shelves
//   3.  default → generic box geometry based on category
//
// Used by ThreeDTab. Position/rotation applied by caller.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { PlacedModule } from '@/lib/planner/planner-types';
import {
  MM,
  PLINTH_HEIGHT,
  WALL_CAB_ELEVATION,
  isBaseCategory,
  isWallCategory,
  isTallCategory,
  getModuleColor,
} from './coordinateUtils';
import { buildExtrudedMesh } from './profileExtrusion';
import type { ProfilePoint, ExtrusionConfig, CurveSegment } from '@/lib/warehouse/shape-editor-types';

// ─── mesh_ref extraction (Phase 3B.2) ────────────────────────────────────────

/** Extract mesh_ref path from PlacedModule.config.shape_editor if present. */
function extractMeshRef(mod: PlacedModule): string | null {
  const cfg = mod.config as Record<string, unknown> | undefined;
  const se = cfg?.shape_editor as Record<string, unknown> | undefined;
  if (!se) return null;
  return typeof se.mesh_ref === 'string' && se.mesh_ref.length > 0
    ? se.mesh_ref
    : null;
}

/**
 * Async-load a GLB from storage proxy and swap it into a group that already
 * contains placeholder meshes (direct extrusion). If loading fails or the
 * group was removed from the scene before completion, the placeholder remains.
 */
function loadMeshRefGLB(group: THREE.Group, meshRef: string): void {
  (async () => {
    try {
      // Fetch the GLB binary via the storage proxy (follows 302 → signed URL)
      const res = await fetch(`/api/storage/${meshRef}`);
      if (!res.ok) throw new Error(`Storage proxy returned ${res.status}`);

      // Bail if group was disposed while fetching
      if (!group.parent) return;

      const buffer = await res.arrayBuffer();
      if (!group.parent) return;

      // Parse GLB binary
      const loader = new GLTFLoader();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.parse(buffer, '', resolve, reject);
      });

      // Final check — group still in scene?
      if (!group.parent) return;

      // Remove placeholder meshes (shape_editor_extrusion + edges)
      const toRemove = group.children.filter(
        (c) =>
          c.userData?.part === 'shape_editor_extrusion' ||
          c.userData?.part === 'shapeEditorEdges',
      );
      for (const child of toRemove) {
        group.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        } else if (child instanceof THREE.LineSegments) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      }

      // Add GLB scene children to the group
      const glbScene = gltf.scene;
      while (glbScene.children.length > 0) {
        const child = glbScene.children[0];
        child.userData = { ...child.userData, part: 'mesh_ref_glb' };
        child.castShadow = true;
        child.receiveShadow = true;
        group.add(child);
      }

      group.userData.meshRefLoaded = true;
    } catch (err) {
      // Fallback preserved — placeholder (direct extrusion) stays visible
      console.warn('[moduleMeshBuilder] mesh_ref GLB load failed:', meshRef, err);
      group.userData.meshRefFailed = true;
    }
  })();
}

// ─── Shape editor extraction (Phase 3B) ──────────────────────────────────────

/** Safely extract shape_editor profile + extrusion + curves from PlacedModule.config. */
function extractShapeEditor(mod: PlacedModule): {
  points: ProfilePoint[];
  extrusion: ExtrusionConfig;
  curves?: CurveSegment[];
} | null {
  const cfg = mod.config as Record<string, unknown> | undefined;
  const se = cfg?.shape_editor as Record<string, unknown> | undefined;
  if (!se) return null;
  const profile = se.profile as Record<string, unknown> | undefined;
  const extrusion = se.extrusion as Record<string, unknown> | undefined;
  if (!profile || !extrusion) return null;
  const points = profile.points as ProfilePoint[] | undefined;
  if (!Array.isArray(points) || points.length < 3) return null;
  const depth = typeof extrusion.depth === 'number' ? extrusion.depth : 0;
  if (depth <= 0) return null;
  const curves = Array.isArray(profile.curves) ? (profile.curves as CurveSegment[]) : undefined;
  return {
    points,
    extrusion: {
      depth,
      direction: (typeof extrusion.direction === 'string' ? extrusion.direction : 'z') as ExtrusionConfig['direction'],
      symmetric: !!extrusion.symmetric,
    },
    curves,
  };
}

// ─── Cabinet spec extraction ─────────────────────────────────────────────────

/** Safely extract cabinet_spec from PlacedModule.config if present. */
function extractCabinetSpec(mod: PlacedModule) {
  const cfg = mod.config as Record<string, unknown> | undefined;
  if (!cfg?.cabinet_spec || typeof cfg.cabinet_spec !== 'object') return null;
  const spec = cfg.cabinet_spec as Record<string, unknown>;
  // Minimal shape validation — must have 'type' string
  if (typeof spec.type !== 'string') return null;
  return spec;
}

function specShelfCount(spec: Record<string, unknown> | null, fallback: number): number {
  if (!spec) return fallback;
  const shelves = spec.shelves as Record<string, unknown> | undefined;
  return typeof shelves?.count === 'number' ? shelves.count : fallback;
}

function specDrawerCount(spec: Record<string, unknown> | null): number {
  if (!spec) return 0;
  const drawers = spec.drawers as Record<string, unknown> | undefined;
  return typeof drawers?.count === 'number' ? drawers.count : 0;
}

function specDrawerHeights(spec: Record<string, unknown> | null): number[] {
  if (!spec) return [];
  const drawers = spec.drawers as Record<string, unknown> | undefined;
  if (!Array.isArray(drawers?.heights)) return [];
  return (drawers.heights as number[]).filter((h) => typeof h === 'number' && h > 0);
}

function specDoorCount(spec: Record<string, unknown> | null, fallback: number): number {
  if (!spec) return fallback;
  const doors = spec.doors as Record<string, unknown> | undefined;
  return typeof doors?.count === 'number' ? doors.count : fallback;
}

function specPlinthHeight(spec: Record<string, unknown> | null): number | null {
  if (!spec) return null;
  const plinth = spec.plinth as Record<string, unknown> | undefined;
  if (!plinth?.enabled) return null;
  return typeof plinth?.height === 'number' ? plinth.height * MM : null;
}

// ─── Module mesh builder ─────────────────────────────────────────────────────

/**
 * Build a Three.js Group representing a placed module in 3D space.
 *
 * The group is positioned at the module's world location and rotated.
 * Internal meshes are positioned relative to group origin (bottom-centre of module footprint).
 */
export function buildModuleGroup(mod: PlacedModule): THREE.Group {
  const group = new THREE.Group();
  group.userData = { type: 'module', moduleId: mod.id, category: mod.category };

  const w = mod.width * MM;
  const d = mod.depth * MM;
  const h = mod.height * MM;

  // ── Fallback tier 1b: shape_editor (extruded profile mesh — immediate) ──
  // Built synchronously as the instant visual. If mesh_ref exists (tier 1a),
  // the GLB is loaded async and swaps in when ready; extrusion stays as fallback.
  const shapeData = extractShapeEditor(mod);
  if (shapeData) {
    const colour = getModuleColor(mod.category, mod.color);
    const mesh = buildExtrudedMesh(shapeData.points, shapeData.extrusion, colour, shapeData.curves);

    // Position the extruded mesh so its origin aligns with the module footprint
    // The profile is authored in mm with 0,0 at bottom-left.
    // buildExtrudedMesh already converts to metres internally.
    group.add(mesh);

    // Add wireframe edges for readability
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry);
    const edgesMat = new THREE.LineBasicMaterial({ color: '#00000020', linewidth: 1 });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    edges.position.copy(mesh.position);
    edges.rotation.copy(mesh.rotation);
    edges.userData = { part: 'shapeEditorEdges' };
    group.add(edges);

    // Position group in world space
    const px = mod.position.x * MM + w / 2;
    const pz = mod.position.y * MM + d / 2;
    const rotY = -(mod.rotation * Math.PI) / 180;
    group.position.set(px, 0, pz);
    group.rotation.set(0, rotY, 0);

    // ── Fallback tier 1a: mesh_ref GLB (async upgrade) ──
    // If a generated GLB exists, load it and replace the extrusion placeholder.
    // On failure, the extrusion remains visible (tier 1b preserved).
    const meshRef = extractMeshRef(mod);
    if (meshRef) {
      loadMeshRefGLB(group, meshRef);
    }

    return group;
  }

  // ── Fallback tiers 2 & 3: cabinet_spec or default box ──

  const isBase = isBaseCategory(mod.category);
  const isWall = isWallCategory(mod.category);
  const isTall = isTallCategory(mod.category);

  const colour = getModuleColor(mod.category, mod.color);

  // Extract cabinet_spec from config if available (from parametric builder)
  const cabSpec = extractCabinetSpec(mod);

  // Plinth height: use spec if available, else default constant
  const plinthH = isBase || isTall
    ? (specPlinthHeight(cabSpec) ?? PLINTH_HEIGHT)
    : 0;

  let floorY = 0;
  if (isWall) floorY = WALL_CAB_ELEVATION;
  if (isBase) floorY = plinthH;

  const bodyH = (isBase || isTall) ? h - plinthH : h;

  // ── Plinth (base/tall cabinets) ──
  if ((isBase || isTall) && plinthH > 0) {
    const plinthGeo = new THREE.BoxGeometry(w - 0.01, plinthH, d * 0.85);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: '#3a3a3a',
      roughness: 0.85,
      metalness: 0.05,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(0, plinthH / 2, 0);
    plinth.castShadow = true;
    plinth.userData = { part: 'plinth' };
    group.add(plinth);
  }

  // ── Main body ──
  const isWorktop = mod.label.toLowerCase().includes('worktop') || mod.label.toLowerCase().includes('countertop');
  const bodyGeo = new THREE.BoxGeometry(w, bodyH, d);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isWorktop ? '#c4a882' : colour,
    roughness: isWorktop ? 0.35 : 0.7,
    metalness: isWorktop ? 0.08 : 0.02,
    transparent: true,
    opacity: isWorktop ? 0.95 : 0.88,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, floorY + bodyH / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData = { part: 'body' };
  group.add(body);

  // ── Body edge lines (readability without textures) ──
  const edgesGeo = new THREE.EdgesGeometry(bodyGeo);
  const edgesMat = new THREE.LineBasicMaterial({ color: '#00000025', linewidth: 1 });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  edges.position.copy(body.position);
  edges.userData = { part: 'bodyEdges' };
  group.add(edges);

  // ── Door faces (uses cabinet_spec.doors.count if available) ──
  const doorCount = specDoorCount(cabSpec, 1);
  const doorGap = 0.003; // gap between doors
  const panelH = bodyH - 0.01;
  const panelColor = new THREE.Color(colour);
  panelColor.offsetHSL(0, -0.03, 0.06); // slightly lighter/desaturated
  const panelMat = new THREE.MeshStandardMaterial({
    color: panelColor,
    roughness: 0.45,
    metalness: 0.05,
  });

  const totalDoorW = w - 0.01;
  const singleDoorW = (totalDoorW - doorGap * (doorCount - 1)) / doorCount;

  for (let di = 0; di < doorCount; di++) {
    const doorGeo = new THREE.BoxGeometry(singleDoorW, panelH, 0.008);
    const door = new THREE.Mesh(doorGeo, panelMat.clone());
    const doorX = -totalDoorW / 2 + singleDoorW / 2 + di * (singleDoorW + doorGap);
    door.position.set(doorX, floorY + bodyH / 2, -d / 2 + 0.005);
    door.castShadow = true;
    door.userData = { part: 'door', index: di };
    group.add(door);
  }

  // ── Drawer fronts (only when cabinet_spec provides drawer info) ──
  const drawerCount = specDrawerCount(cabSpec);
  const drawerHeights = specDrawerHeights(cabSpec);
  if (drawerCount > 0) {
    const drawerColor = new THREE.Color(colour);
    drawerColor.offsetHSL(0, -0.02, 0.03);
    const drawerMat = new THREE.MeshStandardMaterial({
      color: drawerColor,
      roughness: 0.5,
      metalness: 0.04,
    });
    let drawerBaseY = floorY;
    for (let dri = 0; dri < drawerCount; dri++) {
      const drH = dri < drawerHeights.length ? drawerHeights[dri] * MM : bodyH / (drawerCount + 1);
      const drawerGeo = new THREE.BoxGeometry(w - 0.02, drH - 0.004, 0.01);
      const drawer = new THREE.Mesh(drawerGeo, drawerMat.clone());
      drawer.position.set(0, drawerBaseY + drH / 2, -d / 2 + 0.006);
      drawer.castShadow = true;
      drawer.userData = { part: 'drawer', index: dri };
      group.add(drawer);
      drawerBaseY += drH;
    }
  }

  // ── Shelf dividers ──
  const defaultShelves = isTall ? 3 : isBase ? 1 : 0;
  const shelfCount = specShelfCount(cabSpec, defaultShelves);
  for (let i = 1; i <= shelfCount; i++) {
    const sy = floorY + (bodyH / (shelfCount + 1)) * i;
    const shelfGeo = new THREE.BoxGeometry(w - 0.02, 0.006, d - 0.02);
    const shelfMat = new THREE.MeshStandardMaterial({
      color: '#999',
      roughness: 0.8,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5,
    });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(0, sy, 0);
    shelf.userData = { part: 'shelf', index: i };
    group.add(shelf);
  }

  // ── Position group in world space ──
  const px = mod.position.x * MM + w / 2;
  const pz = mod.position.y * MM + d / 2;
  const rotY = -(mod.rotation * Math.PI) / 180;

  group.position.set(px, 0, pz);
  group.rotation.set(0, rotY, 0);

  return group;
}

/**
 * Build all module groups for a layout.
 */
export function buildAllModuleGroups(modules: PlacedModule[]): THREE.Group[] {
  return modules.map(buildModuleGroup);
}
