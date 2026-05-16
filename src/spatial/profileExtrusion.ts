// src/spatial/profileExtrusion.ts
//
// Converts a 2D profile polyline + extrusion config into a Three.js Mesh.
// Used by moduleMeshBuilder for shape_editor assets (Phase 3B).
//
// Profile points are in mm. Three.js units are metres (1 unit = 1000mm).
// ExtrudeGeometry expects a Shape in the XY plane, extruded along Z.

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { ProfilePoint, ExtrusionConfig, CurveSegment } from '@/lib/warehouse/shape-editor-types';
import { getCurveForEdge } from '@/lib/warehouse/shape-editor-types';

const MM = 0.001; // mm → metres

/**
 * Convert an array of [x, y] mm points + optional curves into a THREE.Shape.
 * Uses moveTo for the first point, then lineTo or quadraticCurveTo per edge.
 * The shape is automatically closed by Three.js.
 */
export function profileToShape(
  points: ProfilePoint[],
  curves?: CurveSegment[],
): THREE.Shape {
  const shape = new THREE.Shape();
  if (points.length < 3) return shape;

  shape.moveTo(points[0][0] * MM, points[0][1] * MM);
  for (let i = 1; i < points.length; i++) {
    const curve = getCurveForEdge(curves, i - 1);
    if (curve) {
      shape.quadraticCurveTo(
        curve.cp[0] * MM,
        curve.cp[1] * MM,
        points[i][0] * MM,
        points[i][1] * MM,
      );
    } else {
      shape.lineTo(points[i][0] * MM, points[i][1] * MM);
    }
  }
  // Handle closing edge (last → first)
  const lastCurve = getCurveForEdge(curves, points.length - 1);
  if (lastCurve) {
    shape.quadraticCurveTo(
      lastCurve.cp[0] * MM,
      lastCurve.cp[1] * MM,
      points[0][0] * MM,
      points[0][1] * MM,
    );
  }
  return shape;
}

/**
 * Generate an extruded THREE.Mesh from a profile + extrusion config.
 *
 * The resulting mesh:
 *  - Is extruded along the Z axis (Three.js ExtrudeGeometry default)
 *  - Then rotated to align with the specified extrusion direction
 *  - Uses MeshStandardMaterial with the specified colour
 *
 * @param points  Profile polyline points in mm
 * @param ext     Extrusion config (depth, direction, symmetric)
 * @param color   CSS colour string for the material
 * @param curves  Optional curve segments for quadratic bezier edges
 * @returns       THREE.Mesh ready to add to a Group
 */
export function buildExtrudedMesh(
  points: ProfilePoint[],
  ext: ExtrusionConfig,
  color: string,
  curves?: CurveSegment[],
): THREE.Mesh {
  const shape = profileToShape(points, curves);
  const depthM = ext.depth * MM;

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depthM,
    bevelEnabled: false,
  });

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // ExtrudeGeometry creates geometry along +Z by default.
  // Rotate to match the requested extrusion direction.
  if (ext.direction === 'x') {
    // Profile in YZ plane, extrude along X
    mesh.rotation.set(0, Math.PI / 2, 0);
  } else if (ext.direction === 'y') {
    // Profile in XZ plane, extrude along Y
    mesh.rotation.set(-Math.PI / 2, 0, 0);
  }
  // 'z' = default (no rotation needed)

  // If symmetric, shift back by half the depth
  if (ext.symmetric) {
    const halfDepth = depthM / 2;
    if (ext.direction === 'z') mesh.position.z -= halfDepth;
    else if (ext.direction === 'x') mesh.position.x -= halfDepth;
    else if (ext.direction === 'y') mesh.position.y -= halfDepth;
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { part: 'shape_editor_extrusion' };

  return mesh;
}

/**
 * Generate a GLB binary blob from a 2D profile + extrusion config.
 *
 * Flow: profile → extruded mesh → GLTFExporter (binary) → Blob
 * The resulting Blob can be uploaded directly to Supabase Storage.
 */
export async function generateExtrusionGLB(
  points: ProfilePoint[],
  ext: ExtrusionConfig,
  color: string,
  curves?: CurveSegment[],
): Promise<Blob> {
  const mesh = buildExtrudedMesh(points, ext, color, curves);

  // Wrap in a Scene (GLTFExporter requires a Scene or Group root)
  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new GLTFExporter();

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        // Binary mode returns ArrayBuffer
        const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
        resolve(blob);
      },
      (err) => {
        reject(new Error(`GLB export failed: ${err}`));
      },
      { binary: true },
    );
  });
}
