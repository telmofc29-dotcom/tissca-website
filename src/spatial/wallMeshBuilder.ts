// src/spatial/wallMeshBuilder.ts
//
// Creates Three.js wall meshes from LayoutDocument wall data.
// Used by ThreeDTab and (future) shared 3D scene.

import * as THREE from 'three';
import type { Wall } from '@/lib/planner/planner-types';
import { MM, getWallLength, getWallAngle, getWallMidpoint } from './coordinateUtils';

export type WallMeshOptions = {
  color?: string;
  opacity?: number;
  transparent?: boolean;
};

const DEFAULTS: Required<WallMeshOptions> = {
  color: '#e8e5e0',
  opacity: 0.3,
  transparent: true,
};

/**
 * Build a Three.js Mesh for a single wall segment.
 *
 * Geometry: BoxGeometry(length, height, thickness)
 * Position: centred on wall midpoint, half-height up.
 * Rotation: rotated around Y to match wall direction.
 */
export function buildWallMesh(
  wall: Wall,
  heightMM: number,
  opts?: WallMeshOptions,
): THREE.Mesh {
  const o = { ...DEFAULTS, ...opts };

  const lengthM = getWallLength(wall) * MM;
  const heightM = heightMM * MM;
  const thicknessM = (wall.thickness || 100) * MM;
  const angle = getWallAngle(wall);
  const mid = getWallMidpoint(wall);

  const geometry = new THREE.BoxGeometry(lengthM, heightM, thicknessM);
  const material = new THREE.MeshStandardMaterial({
    color: o.color,
    transparent: o.transparent,
    opacity: o.opacity,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(mid.x * MM, heightM / 2, mid.y * MM);
  mesh.rotation.set(0, -angle, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { type: 'wall', wallId: wall.id };

  return mesh;
}

/**
 * Build all wall meshes for a room.
 */
export function buildAllWallMeshes(
  walls: Wall[],
  heightMM: number,
  opts?: WallMeshOptions,
): THREE.Mesh[] {
  return walls.map((w) => buildWallMesh(w, heightMM, opts));
}

/**
 * Build a floor plane mesh.
 */
export function buildFloorMesh(widthMM: number, depthMM: number, color = '#c8bfb0'): THREE.Mesh {
  const w = widthMM * MM;
  const d = depthMM * MM;
  const geometry = new THREE.PlaneGeometry(w, d);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(w / 2, 0, d / 2);
  mesh.rotation.set(-Math.PI / 2, 0, 0);
  mesh.receiveShadow = true;
  mesh.userData = { type: 'floor' };
  return mesh;
}

/**
 * Build a shadow-receiving ground plane extending beyond the room.
 */
export function buildShadowPlane(widthMM: number, depthMM: number): THREE.Mesh {
  const w = widthMM * MM * 3;
  const d = depthMM * MM * 3;
  const geometry = new THREE.PlaneGeometry(w, d);
  const material = new THREE.ShadowMaterial({ opacity: 0.15 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((widthMM * MM) / 2, -0.002, (depthMM * MM) / 2);
  mesh.rotation.set(-Math.PI / 2, 0, 0);
  mesh.receiveShadow = true;
  mesh.userData = { type: 'shadowPlane' };
  return mesh;
}
