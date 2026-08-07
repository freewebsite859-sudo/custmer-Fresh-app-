/**
 * POINT-IN-POLYGON DETECTION ENGINE
 * 
 * Input:  latitude, longitude, GeoJSON polygons
 * Output: Detected Area, Detected Zone
 * 
 * Rules:
 *   1. Point inside polygon  → return that locality
 *   2. No polygon match      → find nearest centroid
 *   3. Distance < 5km        → return nearest locality
 *   4. Distance >= 5km       → "Outside Jaipur Coverage"
 * 
 * Performance target: < 100ms per lookup
 * 
 * Optimizations:
 *   - Spatial grid index (O(1) cell lookup instead of O(n) scan)
 *   - Bounding box fast rejection
 *   - Pre-computed centroids + bbox at load time
 *   - Cached city index (load GeoJSON once)
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

export interface DetectionResult {
  found: boolean;
  area: string;
  zone: string;
  pincode: string;
  featureId: string;
  confidence: 'exact' | 'nearest' | 'outside';
  distanceFromCenter: number;  // km
  centroid: [number, number];  // [lng, lat]
  lookupMs: number;            // performance metric
}

export interface NearbyResult {
  areas: Array<{
    area: string;
    zone: string;
    pincode: string;
    distance: number;
  }>;
  lookupMs: number;
}

// Internal indexed feature
interface IndexedFeature {
  feature: GeoFeature;
  centroid: [number, number];   // [lng, lat]
  bbox: { w: number; s: number; e: number; n: number };
  ring: number[][];
}

// Spatial grid cell
interface GridCell {
  featureIndices: number[];
}

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════

const MAX_DISTANCE_KM = 5;           // "Outside coverage" threshold
const GRID_RESOLUTION = 0.01;        // ~1.1km per cell (good balance)
const EARTH_RADIUS_KM = 6371;

// ═══════════════════════════════════════
// MATH HELPERS
// ═══════════════════════════════════════

function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Ray Casting algorithm — O(n) where n = vertices in polygon
 */
function pointInPolygon(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function computeCentroid(ring: number[][]): [number, number] {
  let sumLng = 0, sumLat = 0;
  // Exclude last point if it's duplicate of first (closed ring)
  const len = ring[ring.length - 1][0] === ring[0][0] && ring[ring.length - 1][1] === ring[0][1]
    ? ring.length - 1
    : ring.length;
  for (let i = 0; i < len; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return [sumLng / len, sumLat / len];
}

function computeBBox(ring: number[][]): { w: number; s: number; e: number; n: number } {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < w) w = lng;
    if (lng > e) e = lng;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  return { w, s, e, n };
}

// ═══════════════════════════════════════
// SPATIAL GRID INDEX
// ═══════════════════════════════════════

class SpatialGrid {
  private grid = new Map<string, GridCell>();
  private resolution: number;

  constructor(resolution: number) {
    this.resolution = resolution;
  }

  private key(lng: number, lat: number): string {
    const gx = Math.floor(lng / this.resolution);
    const gy = Math.floor(lat / this.resolution);
    return `${gx},${gy}`;
  }

  /**
   * Insert feature index into all grid cells its bbox covers
   */
  insert(featureIdx: number, bbox: { w: number; s: number; e: number; n: number }): void {
    const gxMin = Math.floor(bbox.w / this.resolution);
    const gxMax = Math.floor(bbox.e / this.resolution);
    const gyMin = Math.floor(bbox.s / this.resolution);
    const gyMax = Math.floor(bbox.n / this.resolution);

    for (let gx = gxMin; gx <= gxMax; gx++) {
      for (let gy = gyMin; gy <= gyMax; gy++) {
        const k = `${gx},${gy}`;
        let cell = this.grid.get(k);
        if (!cell) {
          cell = { featureIndices: [] };
          this.grid.set(k, cell);
        }
        cell.featureIndices.push(featureIdx);
      }
    }
  }

  /**
   * Get candidate feature indices for a point — O(1)
   */
  query(lng: number, lat: number): number[] {
    const k = this.key(lng, lat);
    return this.grid.get(k)?.featureIndices ?? [];
  }
}

// ═══════════════════════════════════════
// CITY INDEX (main class)
// ═══════════════════════════════════════

class CityIndex {
  readonly city: string;
  readonly state: string;
  readonly totalFeatures: number;

  private features: IndexedFeature[];
  private grid: SpatialGrid;
  private loaded = false;

  constructor(data: GeoCollection) {
    this.city = data.city;
    this.state = data.state;
    this.totalFeatures = data.features.length;

    // Pre-index all features
    this.features = data.features.map((f) => {
      const ring = f.geometry.coordinates[0];
      return {
        feature: f,
        centroid: computeCentroid(ring),
        bbox: computeBBox(ring),
        ring,
      };
    });

    // Build spatial grid
    this.grid = new SpatialGrid(GRID_RESOLUTION);
    for (let i = 0; i < this.features.length; i++) {
      this.grid.insert(i, this.features[i].bbox);
    }

    this.loaded = true;
  }

  /**
   * DETECT: Main Point-in-Polygon detection
   * 
   * @returns DetectionResult with area, zone, confidence, performance metric
   */
  detect(lat: number, lng: number): DetectionResult {
    const t0 = performance.now();

    if (!this.loaded || this.features.length === 0) {
      console.log('[GeoService] NOT LOADED or 0 features');
      return this.outsideResult(lng, lat, performance.now() - t0);
    }

    // ── STEP 1: Spatial grid lookup (O(1)) ──
    const candidates = this.grid.query(lng, lat);
    console.log('[GeoService] Grid candidates:', candidates.length, 'for', lat, lng);

    // ── STEP 2: Point-in-Polygon on candidates ──
    for (const idx of candidates) {
      const f = this.features[idx];
      // Fast bbox check
      if (lng >= f.bbox.w && lng <= f.bbox.e && lat >= f.bbox.s && lat <= f.bbox.n) {
        // Exact PIP test
        if (pointInPolygon(lng, lat, f.ring)) {
          const dist = haversine(lng, lat, f.centroid[0], f.centroid[1]);
          console.log('[GeoService] ✅ POLYGON MATCH:', f.feature.properties.name);
          return {
            found: true,
            area: f.feature.properties.name,
            zone: f.feature.properties.zone,
            pincode: f.feature.properties.pincode,
            featureId: f.feature.id,
            confidence: 'exact',
            distanceFromCenter: Math.round(dist * 100) / 100,
            centroid: f.centroid,
            lookupMs: Math.round((performance.now() - t0) * 100) / 100,
          };
        }
      }
    }

    // ── STEP 3: No polygon match → find nearest centroid ──
    let nearestIdx = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < this.features.length; i++) {
      const f = this.features[i];
      const dist = haversine(lng, lat, f.centroid[0], f.centroid[1]);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const elapsed = Math.round((performance.now() - t0) * 100) / 100;

    // ── STEP 4: Distance check ──
    if (nearestIdx >= 0 && nearestDist < MAX_DISTANCE_KM) {
      const f = this.features[nearestIdx];
      console.log('[GeoService] ⚠️ NEAREST FALLBACK:', f.feature.properties.name, 'dist:', nearestDist.toFixed(2), 'km');
      return {
        found: true,
        area: f.feature.properties.name,
        zone: f.feature.properties.zone,
        pincode: f.feature.properties.pincode,
        featureId: f.feature.id,
        confidence: 'nearest',
        distanceFromCenter: Math.round(nearestDist * 100) / 100,
        centroid: f.centroid,
        lookupMs: elapsed,
      };
    }

    // ── STEP 5: Outside coverage ──
    return this.outsideResult(lng, lat, elapsed);
  }

  /**
   * NEARBY: Get all areas within radius
   */
  nearby(lat: number, lng: number, radiusKm = 5): NearbyResult {
    const t0 = performance.now();
    const results: NearbyResult['areas'] = [];

    for (const f of this.features) {
      const dist = haversine(lng, lat, f.centroid[0], f.centroid[1]);
      if (dist <= radiusKm) {
        results.push({
          area: f.feature.properties.name,
          zone: f.feature.properties.zone,
          pincode: f.feature.properties.pincode,
          distance: Math.round(dist * 100) / 100,
        });
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    return {
      areas: results,
      lookupMs: Math.round((performance.now() - t0) * 100) / 100,
    };
  }

  /**
   * Get all zones
   */
  zones(): string[] {
    const set = new Set<string>();
    for (const f of this.features) set.add(f.feature.properties.zone);
    return Array.from(set);
  }

  /**
   * Get all area names
   */
  allNames(): string[] {
    return this.features.map((f) => f.feature.properties.name);
  }

  /**
   * Find by name
   */
  findByName(name: string): GeoFeature | undefined {
    const lower = name.toLowerCase();
    return this.features.find((f) => f.feature.properties.name.toLowerCase() === lower)?.feature;
  }

  /**
   * "Outside Jaipur Coverage" result
   */
  private outsideResult(lng: number, lat: number, ms: number): DetectionResult {
    return {
      found: false,
      area: 'Outside Jaipur Coverage',
      zone: 'N/A',
      pincode: '',
      featureId: '',
      confidence: 'outside',
      distanceFromCenter: 0,
      centroid: [lng, lat],
      lookupMs: Math.round(ms * 100) / 100,
    };
  }
}

// ═══════════════════════════════════════
// CITY CACHE + PUBLIC API
// ═══════════════════════════════════════

const cache = new Map<string, CityIndex>();

const GeoService = {
  /**
   * Load a city GeoJSON → build spatial index → cache
   * 
   * @param citySlug  e.g. "jaipur" loads /geo/jaipur.geojson
   * 
   * To add a new city:
   *   1. Create public/geo/{city}.geojson
   *   2. Call GeoService.loadCity('{city}')
   *   Done!
   */
  async loadCity(citySlug: string): Promise<CityIndex> {
    const key = citySlug.toLowerCase().trim();
    if (cache.has(key)) return cache.get(key)!;

    const url = `/geo/${key}.geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GeoJSON not found: ${url}`);

    const data: GeoCollection = await res.json();
    if (!data.features?.length) throw new Error(`Empty GeoJSON: ${key}`);

    const index = new CityIndex(data);
    cache.set(key, index);

    console.log(
      `[GeoService] Loaded "${key}" — ${index.totalFeatures} areas, ` +
      `${index.zones().length} zones`
    );

    return index;
  },

  /**
   * Check if loaded
   */
  isLoaded(citySlug: string): boolean {
    return cache.has(citySlug.toLowerCase().trim());
  },

  /**
   * Get cached index (null if not loaded)
   */
  get(citySlug: string): CityIndex | null {
    return cache.get(citySlug.toLowerCase().trim()) ?? null;
  },

  /**
   * Clear all cached cities
   */
  clearCache(): void {
    cache.clear();
  },

  /**
   * List loaded city slugs
   */
  loadedCities(): string[] {
    return Array.from(cache.keys());
  },
};

export default GeoService;
export { CityIndex };
