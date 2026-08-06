/**
 * DYNAMIC GEO SERVICE
 * 
 * Loads GeoJSON city files from /geo/{city}.geojson
 * Supports multiple cities — just add a new .geojson file!
 * 
 * NO hardcoded locality names. Everything loaded dynamically.
 * 
 * Usage:
 *   const geo = await GeoService.loadCity('jaipur');
 *   const area = geo.detect(26.974, 75.724);
 *   console.log(area.name); // "Nangal Jaisabohra"
 */

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export interface GeoFeature {
  type: 'Feature';
  id: string;
  properties: {
    name: string;
    zone: string;
    pincode: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface GeoCollection {
  type: 'FeatureCollection';
  city: string;
  state: string;
  generated: string;
  features: GeoFeature[];
}

export interface DetectedArea {
  id: string;
  name: string;
  zone: string;
  pincode: string;
  center: [number, number]; // [lng, lat]
  distance: number;         // km from center
  confidence: 'exact' | 'near' | 'approximate';
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

// Internal cached feature with computed center & bbox
interface IndexedFeature {
  feature: GeoFeature;
  center: [number, number];
  bbox: BoundingBox;
}

// ═══════════════════════════════════════
// POINT-IN-POLYGON ENGINE (Ray Casting)
// ═══════════════════════════════════════

function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function inBBox(point: [number, number], bbox: BoundingBox): boolean {
  const [lng, lat] = point;
  return lng >= bbox.west && lng <= bbox.east && lat >= bbox.south && lat <= bbox.north;
}

function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeBBox(coords: number[][]): BoundingBox {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return { west, south, east, north };
}

function computeCenter(coords: number[][]): [number, number] {
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / coords.length, sumLat / coords.length];
}

// ═══════════════════════════════════════
// CITY CACHE
// ═══════════════════════════════════════

const cityCache = new Map<string, CityGeoIndex>();

// ═══════════════════════════════════════
// CITY GEO INDEX (per-city instance)
// ═══════════════════════════════════════

class CityGeoIndex {
  readonly city: string;
  readonly state: string;
  readonly totalAreas: number;
  private indexed: IndexedFeature[];

  constructor(data: GeoCollection) {
    this.city = data.city;
    this.state = data.state;
    this.totalAreas = data.features.length;

    // Pre-compute bbox + center for each feature
    this.indexed = data.features.map((f) => {
      const ring = f.geometry.coordinates[0];
      return {
        feature: f,
        center: computeCenter(ring),
        bbox: computeBBox(ring),
      };
    });
  }

  /**
   * Detect area from GPS coordinates using Point-in-Polygon
   * Returns the matched area or nearest area
   */
  detect(lat: number, lng: number): DetectedArea {
    const point: [number, number] = [lng, lat];

    let exact: DetectedArea | null = null;
    let nearest: DetectedArea | null = null;
    let nearestDist = Infinity;

    for (const { feature, center, bbox } of this.indexed) {
      const dist = haversine(lng, lat, center[0], center[1]);

      // Fast bbox rejection → then PIP test
      if (inBBox(point, bbox)) {
        const ring = feature.geometry.coordinates[0];
        if (pointInPolygon(point, ring)) {
          exact = {
            id: feature.id,
            name: feature.properties.name,
            zone: feature.properties.zone,
            pincode: feature.properties.pincode,
            center,
            distance: Math.round(dist * 100) / 100,
            confidence: 'exact',
          };
          break;
        }
      }

      // Track nearest
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = {
          id: feature.id,
          name: feature.properties.name,
          zone: feature.properties.zone,
          pincode: feature.properties.pincode,
          center,
          distance: Math.round(dist * 100) / 100,
          confidence: dist < 2 ? 'near' : 'approximate',
        };
      }
    }

    if (exact) return exact;
    if (nearest && nearestDist < 5) return nearest;

    // Fallback: first feature or generic
    const first = this.indexed[0];
    return {
      id: 'unknown',
      name: this.city,
      zone: this.city,
      pincode: '',
      center: first?.center ?? [75.78, 26.91],
      distance: 0,
      confidence: 'approximate',
    };
  }

  /**
   * Get all areas within radius (km) of a point
   */
  nearby(lat: number, lng: number, radiusKm = 5): DetectedArea[] {
    const results: DetectedArea[] = [];
    for (const { feature, center } of this.indexed) {
      const dist = haversine(lng, lat, center[0], center[1]);
      if (dist <= radiusKm) {
        results.push({
          id: feature.id,
          name: feature.properties.name,
          zone: feature.properties.zone,
          pincode: feature.properties.pincode,
          center,
          distance: Math.round(dist * 100) / 100,
          confidence: dist < 1 ? 'exact' : dist < 3 ? 'near' : 'approximate',
        });
      }
    }
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get all unique zones in this city
   */
  zones(): string[] {
    const set = new Set<string>();
    for (const { feature } of this.indexed) {
      set.add(feature.properties.zone);
    }
    return Array.from(set);
  }

  /**
   * Find feature by name (case-insensitive)
   */
  findByName(name: string): GeoFeature | undefined {
    const lower = name.toLowerCase();
    return this.indexed.find((i) => i.feature.properties.name.toLowerCase() === lower)?.feature;
  }

  /**
   * Get all area names
   */
  allNames(): string[] {
    return this.indexed.map((i) => i.feature.properties.name);
  }
}

// ═══════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════

const GeoService = {
  /**
   * Load a city's GeoJSON and return an index.
   * Cached — second call is instant.
   * 
   * @param citySlug  lowercase city name, e.g. "jaipur", "delhi"
   *                  loads from /geo/{citySlug}.geojson
   */
  async loadCity(citySlug: string): Promise<CityGeoIndex> {
    const key = citySlug.toLowerCase();

    if (cityCache.has(key)) {
      return cityCache.get(key)!;
    }

    const url = `/geo/${key}.geojson`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`GeoJSON not found for city "${key}" at ${url}`);
    }

    const data: GeoCollection = await res.json();

    if (!data.features?.length) {
      throw new Error(`GeoJSON for "${key}" has no features`);
    }

    const index = new CityGeoIndex(data);
    cityCache.set(key, index);
    return index;
  },

  /**
   * Check if a city GeoJSON is already cached
   */
  isLoaded(citySlug: string): boolean {
    return cityCache.has(citySlug.toLowerCase());
  },

  /**
   * Get a cached city index (returns null if not loaded)
   */
  getLoaded(citySlug: string): CityGeoIndex | null {
    return cityCache.get(citySlug.toLowerCase()) ?? null;
  },

  /**
   * Clear cache (for testing or refresh)
   */
  clearCache(): void {
    cityCache.clear();
  },

  /**
   * List all loaded cities
   */
  loadedCities(): string[] {
    return Array.from(cityCache.keys());
  },
};

export default GeoService;
export { CityGeoIndex };
