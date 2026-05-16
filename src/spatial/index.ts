// src/spatial/index.ts
//
// Barrel export for the TISSCA spatial engine.

export {
  // Constants
  MM,
  PLINTH_HEIGHT_MM,
  PLINTH_HEIGHT,
  WALL_CAB_ELEVATION_MM,
  WALL_CAB_ELEVATION,
  CATEGORY_COLORS,
  OPENING_COLORS,
  // Wall geometry
  getWallLength,
  getWallDirection,
  getWallAngle,
  getWallNormal,
  getWallMidpoint,
  // Coordinate transforms
  worldToWallLocal,
  wallLocalToWorld,
  // Category helpers
  isBaseCategory,
  isWallCategory,
  isTallCategory,
  getModuleFloorElevation,
  getModuleBodyHeight,
  getModuleColor,
} from './coordinateUtils';

export { buildWallMesh, buildAllWallMeshes, buildFloorMesh, buildShadowPlane } from './wallMeshBuilder';

export { buildModuleGroup, buildAllModuleGroups } from './moduleMeshBuilder';

export {
  buildOpeningMarker,
  buildAllOpeningMarkers,
  projectModuleOnWall,
  projectOpeningOnWall,
} from './openingProjector';
export type { ElevationProjection, OpeningMarkerData } from './openingProjector';

export {
  validatePlacement,
  findNearestWall,
  effectiveDims,
  moduleCentre,
} from './placementRules';
export type { PlacementResult, NearestWallResult } from './placementRules';

export { snapToWall, snapToGrid } from './snapping';
export type { SnapResult } from './snapping';

export { checkCollision, checkWallCollision, checkAABBCollision } from './collision';
export type { CollisionResult } from './collision';

export {
  getWallDimensions,
  getModuleDimensions,
  getGapsOnWall,
  getOpeningDimensions,
  classifyGap,
  analyzeWallLayout,
  DEFAULT_GAP_THRESHOLDS,
  COMMON_FILLER_WIDTHS,
} from './dimensions';
export type {
  WallDimension,
  ModuleDimension,
  GapInfo,
  WallGaps,
  OpeningDimension,
  GapClass,
  GapThresholds,
  ClassifiedGap,
  WallLayoutAnalysis,
} from './dimensions';

export { analyzeLayout } from './layoutIntelligence';

export {
  detectAllRuns,
  correctAppliancePosition,
} from './relationships';
export type { CabinetRun } from './relationships';

export {
  validateConstraints,
  applyConstraintFixes,
  isPlacementBlocked,
} from './constraints';
export type { ConstraintViolation, ConstraintRule, ConstraintFix } from './constraints';

export {
  suggestGapFill,
  analyzeGapsForWall,
  autoFillWall,
  analyzeAllGaps,
} from './gapAutoFill';
export type { GapSuggestion, FillOption } from './gapAutoFill';

export {
  alignModules,
  distributeModules,
  snapSelectionToWall,
} from './alignmentTools';
export type { AlignAction, DistributeAction, AlignmentResult } from './alignmentTools';
export type {
  InsightSeverity,
  LayoutInsight,
  LayoutAnalysisResult,
} from './layoutIntelligence';

export { drawDimH, drawDimV, drawGapH, drawDimAligned } from './dimensionRenderer';
