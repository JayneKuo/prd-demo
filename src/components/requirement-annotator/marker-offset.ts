import type { RequirementAnnotation } from './types';

export function clearMarkerOffset(annotation: RequirementAnnotation): RequirementAnnotation {
  const rest = { ...annotation };
  delete rest.markerOffset;
  return rest;
}
