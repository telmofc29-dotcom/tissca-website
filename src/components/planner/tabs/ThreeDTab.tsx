// src/components/planner/tabs/ThreeDTab.tsx v3.0
//
// PURPOSE:
// Real interactive 3D viewport using Three.js (via @react-three/fiber + drei).
// Renders room walls, floor, placed modules, and openings from LayoutDocument.
// Camera: orbit controls with rotate, zoom, pan.
//
// ENGINE:
// All geometry logic delegated to /src/spatial/ shared helpers.
// This component is a renderer only — no inline mesh building.

'use client';

import { useState, useRef, useEffect } from 'react';
import type { LayoutDocument } from '@/lib/planner/planner-types';
import { formatMM } from '@/lib/planner/planner-types';
import type { ThreeDSubTab } from '@/lib/warehouse/warehouse-types';
import { THREE_D_SUBTABS } from '@/lib/warehouse/warehouse-types';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  MM,
  getModuleFloorElevation,
  getModuleBodyHeight,
  isTallCategory,
} from '@/spatial/coordinateUtils';
import { buildAllWallMeshes, buildFloorMesh, buildShadowPlane } from '@/spatial/wallMeshBuilder';
import { buildModuleGroup } from '@/spatial/moduleMeshBuilder';
import { buildAllOpeningMarkers } from '@/spatial/openingProjector';

type Props = {
  layout: LayoutDocument;
};

// ─── Camera Presets ──────────────────────────────────────────────────────────

type CameraPreset = {
  label: string;
  icon: string;
  /** Camera position relative to room centre as multipliers of camDist */
  pos: [number, number, number];
};

const CAMERA_PRESETS: CameraPreset[] = [
  { label: 'Front',      icon: '⬆',  pos: [0,   0.3,  1.2] },
  { label: 'Back',       icon: '⬇',  pos: [0,   0.3, -1.2] },
  { label: 'Left',       icon: '⬅',  pos: [-1.2, 0.3, 0]   },
  { label: 'Right',      icon: '➡',  pos: [1.2, 0.3, 0]    },
  { label: 'Top',        icon: '🔽', pos: [0,   1.4, 0.001] },
  { label: 'Isometric',  icon: '◇',  pos: [0.55, 0.5, 0.55] },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ThreeDTab({ layout }: Props) {
  const [subTab, setSubTab] = useState<ThreeDSubTab>('planned');
  const controlsRef = useRef<{ reset: () => void } | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [hiddenWalls, setHiddenWalls] = useState<Set<string>>(new Set());
  const [sectionCut, setSectionCut] = useState(false);

  const toggleWall = (wallId: string) => {
    setHiddenWalls((prev) => {
      const next = new Set(prev);
      if (next.has(wallId)) next.delete(wallId);
      else next.add(wallId);
      return next;
    });
  };

  const showAllWalls = () => { setHiddenWalls(new Set()); setSectionCut(false); };
  const hideAllWalls = () => setHiddenWalls(new Set(layout.room.walls.map((w) => w.id)));

  // Section cut: hide front wall (first wall, typically the one facing the camera)
  const toggleSectionCut = () => {
    setSectionCut((prev) => {
      const next = !prev;
      if (next && layout.room.walls.length > 0) {
        setHiddenWalls(new Set([layout.room.walls[0].id]));
      } else {
        setHiddenWalls(new Set());
      }
      return next;
    });
  };

  const applyPreset = (preset: CameraPreset) => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current as { target: THREE.Vector3; update: () => void } | null;
    if (!cam || !ctrl) return;

    const roomW = layout.room.width * MM;
    const roomD = layout.room.depth * MM;
    const roomH = layout.room.height * MM;
    const cx = roomW / 2;
    const cz = roomD / 2;
    const diag = Math.sqrt(roomW * roomW + roomD * roomD + roomH * roomH);
    const d = diag * 1.1;

    cam.position.set(
      cx + preset.pos[0] * d,
      preset.pos[1] * d,
      cz + preset.pos[2] * d,
    );
    ctrl.target.set(cx, roomH * 0.35, cz);
    ctrl.update();
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {THREE_D_SUBTABS.map((tab) => {
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {subTab === 'planned' && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Camera presets */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  title={preset.label}
                  className="px-2 py-1 rounded-md text-[10px] font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                >
                  {preset.icon}
                </button>
              ))}
            </div>

            {/* Wall visibility */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={toggleSectionCut}
                title="Section cut (hide front wall)"
                className={`px-1.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  sectionCut
                    ? 'bg-amber-100 text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                ✂ Cut
              </button>
              <button
                onClick={showAllWalls}
                title="Show all walls"
                className="px-1.5 py-1 rounded-md text-[10px] font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all"
              >
                👁
              </button>
              <button
                onClick={hideAllWalls}
                title="Hide all walls"
                className="px-1.5 py-1 rounded-md text-[10px] font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all"
              >
                👁‍🗨
              </button>
              {layout.room.walls.map((w) => {
                const isHidden = hiddenWalls.has(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWall(w.id)}
                    title={`${isHidden ? 'Show' : 'Hide'} ${w.label}`}
                    className={`px-1.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                      isHidden
                        ? 'text-slate-300 line-through'
                        : 'text-slate-700 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    {w.label.replace('Wall ', 'W')}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                if (controlsRef.current) controlsRef.current.reset();
              }}
              className="px-3 py-1.5 rounded-md bg-slate-100 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Reset View
            </button>
          </div>
        )}
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 min-h-[400px] rounded-xl border border-gray-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-sm overflow-hidden relative">
        {subTab === 'planned' && (
          <SceneViewport layout={layout} controlsRef={controlsRef} cameraRef={cameraRef} hiddenWalls={hiddenWalls} />
        )}
        {subTab === 'scanned' && <ScannedView />}
        {subTab === 'ar' && <ARView />}
      </div>

      {/* Controls help */}
      {subTab === 'planned' && (
        <div className="flex items-center gap-4 px-2 text-[11px] text-slate-400">
          <span>🖱️ Drag to rotate</span>
          <span>⚲ Scroll to zoom</span>
          <span>⇧ Shift+Drag to pan</span>
          <span>📦 {layout.placedModules.length} modules · {layout.room.walls.length} walls</span>
        </div>
      )}
    </div>
  );
}

// ─── 3D Scene ────────────────────────────────────────────────────────────────

function SceneViewport({
  layout,
  controlsRef,
  cameraRef,
  hiddenWalls,
}: {
  layout: LayoutDocument;
  controlsRef: React.MutableRefObject<{ reset: () => void } | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  hiddenWalls: Set<string>;
}) {
  const { room, placedModules } = layout;

  // Scene bounds: room footprint + height
  const roomW = room.width * MM;
  const roomD = room.depth * MM;
  const roomH = room.height * MM;
  const cx = roomW / 2;
  const cz = roomD / 2;
  const maxDim = Math.max(roomW, roomD, roomH);

  // Camera distance based on diagonal of bounding box — ensures whole room fits
  const diag = Math.sqrt(roomW * roomW + roomD * roomD + roomH * roomH);
  const camDist = diag * 1.1;

  return (
    <Canvas shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#1e2028']} />

      <PerspectiveCamera
        ref={(ref) => { cameraRef.current = ref; }}
        makeDefault
        position={[cx + camDist * 0.55, camDist * 0.5, cz + camDist * 0.55]}
        fov={40}
        near={0.01}
        far={200}
      />

      <OrbitControls
        ref={(ref) => { controlsRef.current = ref; }}
        target={[cx, roomH * 0.35, cz]}
        enableDamping
        dampingFactor={0.12}
        minDistance={maxDim * 0.3}
        maxDistance={maxDim * 6}
        maxPolarAngle={Math.PI * 0.85}
      />

      {/* ── Lighting ── */}

      {/* Soft base ambient — enough to read shapes in shadow */}
      <ambientLight intensity={0.35} color="#f5f0eb" />

      {/* Hemisphere sky/ground fill — adds subtle warmth from below */}
      <hemisphereLight
        args={['#c8d4e0', '#8a7b6b', 0.4]}
      />

      {/* Main directional (sun) — diagonal from above-right, casts shadows */}
      <directionalLight
        position={[cx + maxDim * 1.5, maxDim * 2, cz - maxDim * 0.8]}
        intensity={0.9}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.001}
        shadow-camera-left={-maxDim * 2}
        shadow-camera-right={maxDim * 2}
        shadow-camera-top={maxDim * 2}
        shadow-camera-bottom={-maxDim * 2}
        shadow-camera-near={0.1}
        shadow-camera-far={maxDim * 6}
      />

      {/* Fill light — softer, opposite side */}
      <directionalLight
        position={[cx - maxDim * 0.8, maxDim * 0.6, cz + maxDim * 1.2]}
        intensity={0.25}
        color="#e0e8f0"
      />

      {/* Interior point light — illuminates cabinet cavities */}
      <pointLight
        position={[cx, roomH * 0.5, cz]}
        intensity={0.3}
        color="#fff5e6"
        distance={maxDim * 3}
        decay={2}
      />

      {/* Scene objects built from spatial engine */}
      <SceneObjects layout={layout} hiddenWalls={hiddenWalls} />

      {/* Module labels (React Three Fiber — needs to stay declarative) */}
      {placedModules.map((mod) => {
        const w = mod.width * MM;
        const d = mod.depth * MM;
        const h = mod.height * MM;
        const px = mod.position.x * MM + w / 2;
        const pz = mod.position.y * MM + d / 2;
        const isTall = isTallCategory(mod.category);
        const floorY = getModuleFloorElevation(mod.category) * MM;
        const bodyH = getModuleBodyHeight(mod.category, mod.height) * MM;
        const labelY = isTall ? h + 0.06 : floorY + bodyH + 0.06;

        return (
          <Text
            key={mod.id}
            position={[px, labelY, pz]}
            fontSize={0.04}
            color="#94A3B8"
            anchorX="center"
            anchorY="bottom"
          >
            {formatMM(mod.width)} × {formatMM(mod.depth)}
          </Text>
        );
      })}

      {/* Ground grid — centred on room, subtle */}
      <gridHelper
        args={[maxDim * 4, Math.round(maxDim * 4 / 0.5), '#2a2d38', '#24272f']}
        position={[cx, -0.003, cz]}
      />
    </Canvas>
  );
}

// ─── Imperative scene objects (walls, floor, modules, openings) ──────────────

function SceneObjects({ layout, hiddenWalls }: { layout: LayoutDocument; hiddenWalls: Set<string> }) {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group | null>(null);

  const { room, placedModules, openings } = layout;

  useEffect(() => {
    // Remove previous group if any
    if (groupRef.current) {
      scene.remove(groupRef.current);
      disposeGroup(groupRef.current);
    }

    const group = new THREE.Group();
    group.userData = { type: 'sceneObjects' };

    // Floor
    group.add(buildFloorMesh(room.width, room.depth));

    // Shadow catch plane (extends beyond room)
    group.add(buildShadowPlane(room.width, room.depth));

    // Walls (filtered by hiddenWalls)
    for (const mesh of buildAllWallMeshes(room.walls, room.height)) {
      const wallId = mesh.userData?.wallId;
      if (wallId && hiddenWalls.has(wallId)) continue;
      group.add(mesh);
    }

    // Openings
    for (const mesh of buildAllOpeningMarkers(openings, room.walls)) {
      group.add(mesh);
    }

    // Modules
    for (const mod of placedModules) {
      group.add(buildModuleGroup(mod));
    }

    scene.add(group);
    groupRef.current = group;

    return () => {
      if (groupRef.current) {
        scene.remove(groupRef.current);
        disposeGroup(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [scene, room, placedModules, openings, hiddenWalls]);

  return null;
}

/** Dispose all geometry + materials in a group recursively */
function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

// ─── Scanned View (placeholder — requires mobile scan data) ──────────────────

function ScannedView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
        <span className="text-3xl">📱</span>
      </div>
      <h3 className="text-base font-bold text-white">Scanned Room</h3>
      <p className="text-sm text-slate-400 max-w-md mt-2">
        Real captured room data from LiDAR or AR scanning.
        Import from iOS (LiDAR) or Android (ARCore) to view here.
      </p>
      <div className="mt-6 px-4 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
        <p className="text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
          Scan data will render here when imported from the mobile app.
        </p>
      </div>
    </div>
  );
}

// ─── AR View (placeholder — requires mobile camera) ──────────────────────────

function ARView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
        <span className="text-3xl">🔮</span>
      </div>
      <h3 className="text-base font-bold text-white">AR View</h3>
      <p className="text-sm text-slate-400 max-w-md mt-2">
        Overlay your design onto the real room using augmented reality.
        Requires the mobile app.
      </p>
      <div className="mt-6 px-4 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
        <p className="text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-1.5" />
          AR overlay requires iOS or Android. Web shows side-by-side comparison
          once scan data is available.
        </p>
      </div>
    </div>
  );
}
