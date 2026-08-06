/**
 * Point-in-Polygon Detection Engine
 * Uses Ray Casting algorithm for offline area detection
 * No API calls needed - works entirely offline!
 */

import { JaipurAreaFeature, JAIPUR_GEOJSON } from '../data/jaipur-areas.geojson';

export interface DetectedArea {
  name: string;
  zone: string;
  pincode: string;
  distance: number; // km from area center
  confidence: 'exact' | 'near' | 'approximate';
}

/**
 * Ray Casting Algorithm for Point-in-Polygon test
 * Returns true if point [x, y] is inside the polygon
 */
function pointInPolygon(
  point: [number, number],
  polygon: number[][]
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate distance from point to polygon center (Haversine)
 */
function distanceToCenter(
  point: [number, number],
  center: [number, number]
): number {
  const [lng1, lat1] = point;
  const [lng2, lat2] = center;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // km with 2 decimal
}

/**
 * Quick bounding box check (fast rejection)
 */
function inBoundingBox(
  point: [number, number],
  bbox: [number, number, number, number]
): boolean {
  const [lng, lat] = point;
  const [west, south, east, north] = bbox;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/**
 * DETECT AREA: Main function
 * Takes GPS coordinates [lat, lng] and returns detected area
 * 
 * Steps:
 * 1. Quick bbox check (fast rejection)
 * 2. Point-in-Polygon test (exact match)
 * 3. Distance-based fallback (nearest area)
 */
export function detectArea(latitude: number, longitude: number): DetectedArea {
  const point: [number, number] = [longitude, latitude]; // GeoJSON uses [lng, lat]

  let exactMatch: DetectedArea | null = null;
  let nearestMatch: DetectedArea | null = null;
  let nearestDistance = Infinity;

  for (const feature of JAIPUR_GEOJSON.features) {
    const { properties, geometry } = feature;

    // Step 1: Quick bounding box check
    if (!inBoundingBox(point, properties.bbox)) {
      // Even if outside bbox, check distance to center
      const dist = distanceToCenter(point, properties.center);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestMatch = {
          name: properties.name,
          zone: properties.zone,
          pincode: properties.pincode,
          distance: dist,
          confidence: dist < 2 ? 'near' : 'approximate',
        };
      }
      continue;
    }

    // Step 2: Exact Point-in-Polygon test
    const polygon = geometry.coordinates[0]; // First ring of polygon
    if (pointInPolygon(point, polygon)) {
      const dist = distanceToCenter(point, properties.center);
      exactMatch = {
        name: properties.name,
        zone: properties.zone,
        pincode: properties.pincode,
        distance: dist,
        confidence: 'exact',
      };
      break; // Found exact match, stop searching
    }

    // Track nearest even if not inside polygon
    const dist = distanceToCenter(point, properties.center);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestMatch = {
        name: properties.name,
        zone: properties.zone,
        pincode: properties.pincode,
        distance: dist,
        confidence: dist < 2 ? 'near' : 'approximate',
      };
    }
  }

  // Return exact match if found, otherwise nearest
  if (exactMatch) {
    return exactMatch;
  }

  if (nearestMatch && nearestDistance < 5) {
    return nearestMatch;
  }

  // Fallback: return generic Jaipur
  return {
    name: 'Jaipur',
    zone: 'Jaipur',
    pincode: '302001',
    distance: 0,
    confidence: 'approximate',
  };
}

/**
 * Get all areas within a given radius (km) from a point
 * Useful for "nearby salons" feature
 */
export function getAreasWithinRadius(
  latitude: number,
  longitude: number,
  radiusKm: number
): DetectedArea[] {
  const point: [number, number] = [longitude, latitude];
  const results: DetectedArea[] = [];

  for (const feature of JAIPUR_GEOJSON.features) {
    const { properties } = feature;
    const dist = distanceToCenter(point, properties.center);

    if (dist <= radiusKm) {
      results.push({
        name: properties.name,
        zone: properties.zone,
        pincode: properties.pincode,
        distance: dist,
        confidence: dist < 1 ? 'exact' : dist < 3 ? 'near' : 'approximate',
      });
    }
  }

  // Sort by distance
  results.sort((a, b) => a.distance - b.distance);
  return results;
}

/**
 * Get area feature by name
 */
export function getAreaByName(name: string): JaipurAreaFeature | undefined {
  return JAIPUR_GEOJSON.features.find(
    (f) => f.properties.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get all zone names
 */
export function getAllZones(): string[] {
  const zones = new Set<string>();
  JAIPUR_GEOJSON.features.forEach((f) => zones.add(f.properties.zone));
  return Array.from(zones);
}

/**
 * Get total number of areas in dataset
 */
export function getTotalAreas(): number {
  return JAIPUR_GEOJSON.features.length;
}
