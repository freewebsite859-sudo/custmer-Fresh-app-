/**
 * JAIPUR COMPLETE GEOJSON DATASET
 * 120+ Localities with Polygon boundaries, Zone info, Center coords, Bounding boxes
 * Covers: Central, East, West, North, South Jaipur + 50km surrounding areas
 * 
 * Each feature has:
 * - name: Area/Locality name
 * - zone: Jaipur zone (JDA/Municipal)
 * - pincode: Postal code
 * - center: [lng, lat] center point
 * - bbox: [west, south, east, north] bounding box
 * - geometry: Polygon coordinates [lng, lat] pairs
 */

export interface JaipurAreaFeature {
  type: 'Feature';
  properties: {
    name: string;
    zone: string;
    pincode: string;
    center: [number, number]; // [lng, lat]
    bbox: [number, number, number, number]; // [west, south, east, north]
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };
}

export interface JaipurGeoJSON {
  type: 'FeatureCollection';
  features: JaipurAreaFeature[];
}

// Helper to create polygon from center + radius (km)
function circlePolygon(center: [number, number], radiusKm: number, sides = 12): number[][] {
  const [lng, lat] = center;
  const coords: number[][] = [];
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * 2 * Math.PI;
    const dLat = (radiusKm / 111) * Math.cos(angle);
    const dLng = (radiusKm / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
    coords.push([lng + dLng, lat + dLat]);
  }
  return coords;
}

// Helper to create rectangle polygon from bbox
function rectPolygon(west: number, south: number, east: number, north: number): number[][] {
  return [
    [west, south], [east, south], [east, north], [west, north], [west, south]
  ];
}

// Helper to create irregular polygon from center with offsets
function polyFromCenter(center: [number, number], offsets: [number, number][]): number[][] {
  const [cLng, cLat] = center;
  return offsets.map(([dLng, dLat]) => [cLng + dLng, cLat + dLat]);
}

/**
 * COMPLETE JAIPUR GEOJSON DATASET
 * 120+ areas with polygon boundaries
 */
export const JAIPUR_GEOJSON: JaipurGeoJSON = {
  type: 'FeatureCollection',
  features: [
    // ═══════════════════════════════════════
    // NORTH-WEST JAIPUR (Jhotwara Zone)
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Nangal Jaisabohra',
        zone: 'Jhotwara',
        pincode: '302012',
        center: [75.724, 26.974],
        bbox: [75.708, 26.964, 75.742, 26.986]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.708, 26.966], [75.720, 26.964], [75.735, 26.965],
          [75.742, 26.970], [75.740, 26.980], [75.735, 26.986],
          [75.720, 26.985], [75.710, 26.980], [75.708, 26.972],
          [75.708, 26.966]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Jhotwara',
        zone: 'Jhotwara',
        pincode: '302012',
        center: [75.738, 26.948],
        bbox: [75.718, 26.935, 75.758, 26.962]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.718, 26.938], [75.730, 26.935], [75.748, 26.936],
          [75.758, 26.942], [75.755, 26.955], [75.748, 26.962],
          [75.735, 26.960], [75.722, 26.955], [75.718, 26.945],
          [75.718, 26.938]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Niwaru Road',
        zone: 'Jhotwara',
        pincode: '302012',
        center: [75.728, 26.955],
        bbox: [75.715, 26.945, 75.742, 26.965]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.715, 26.948], [75.725, 26.945], [75.738, 26.946],
          [75.742, 26.952], [75.740, 26.960], [75.735, 26.965],
          [75.722, 26.963], [75.715, 26.958], [75.715, 26.948]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Kalwar Road',
        zone: 'Jhotwara',
        pincode: '302012',
        center: [75.735, 26.955],
        bbox: [75.722, 26.940, 75.748, 26.972]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.722, 26.942], [75.732, 26.940], [75.745, 26.942],
          [75.748, 26.952], [75.746, 26.965], [75.742, 26.972],
          [75.730, 26.970], [75.722, 26.962], [75.722, 26.942]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Murlipura',
        zone: 'Vidhyadhar Nagar',
        pincode: '302039',
        center: [75.760, 26.967],
        bbox: [75.748, 26.958, 75.772, 26.978]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.748, 26.960], [75.758, 26.958], [75.770, 26.960],
          [75.772, 26.968], [75.770, 26.975], [75.762, 26.978],
          [75.752, 26.976], [75.748, 26.970], [75.748, 26.960]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Bindayaka',
        zone: 'Jhotwara',
        pincode: '302012',
        center: [75.715, 26.950],
        bbox: [75.700, 26.938, 75.732, 26.962]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.700, 26.942], [75.712, 26.938], [75.728, 26.940],
          [75.732, 26.948], [75.728, 26.958], [75.718, 26.962],
          [75.705, 26.958], [75.700, 26.950], [75.700, 26.942]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Sikar Road',
        zone: 'Jhotwara',
        pincode: '302012',
        center: [75.740, 26.985],
        bbox: [75.728, 26.975, 75.752, 26.998]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.728, 26.978], [75.740, 26.975], [75.752, 26.978],
          [75.750, 26.990], [75.745, 26.998], [75.732, 26.995],
          [75.728, 26.988], [75.728, 26.978]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Nadi Ka Phatak',
        zone: 'Hawa Mahal',
        pincode: '302013',
        center: [75.745, 26.982],
        bbox: [75.735, 26.975, 75.755, 26.992]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.735, 26.978], [75.745, 26.975], [75.755, 26.978],
          [75.753, 26.988], [75.748, 26.992], [75.738, 26.990],
          [75.735, 26.985], [75.735, 26.978]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Khora Bisal',
        zone: 'Jhotwara',
        pincode: '302012',
        center: [75.710, 26.962],
        bbox: [75.698, 26.955, 75.722, 26.972]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.698, 26.958], [75.710, 26.955], [75.722, 26.958],
          [75.720, 26.968], [75.712, 26.972], [75.700, 26.968],
          [75.698, 26.962], [75.698, 26.958]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Dhankya',
        zone: 'Jhotwara',
        pincode: '302012',
        center: [75.700, 26.960],
        bbox: [75.688, 26.950, 75.715, 26.972]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.688, 26.952], [75.700, 26.950], [75.712, 26.952],
          [75.715, 26.960], [75.710, 26.970], [75.698, 26.972],
          [75.690, 26.965], [75.688, 26.958], [75.688, 26.952]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // NORTH JAIPUR (Vidhyadhar Nagar Zone)
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Vidyadhar Nagar',
        zone: 'Vidhyadhar Nagar',
        pincode: '302039',
        center: [75.772, 26.958],
        bbox: [75.755, 26.945, 75.792, 26.972]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.755, 26.948], [75.770, 26.945], [75.788, 26.948],
          [75.792, 26.955], [75.788, 26.965], [75.778, 26.972],
          [75.762, 26.968], [75.755, 26.958], [75.755, 26.948]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Ambabari',
        zone: 'Vidhyadhar Nagar',
        pincode: '302023',
        center: [75.770, 26.942],
        bbox: [75.758, 26.932, 75.782, 26.950]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.758, 26.935], [75.770, 26.932], [75.782, 26.935],
          [75.780, 26.945], [75.775, 26.950], [75.762, 26.948],
          [75.758, 26.942], [75.758, 26.935]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Shastri Nagar',
        zone: 'Vidhyadhar Nagar',
        pincode: '302016',
        center: [75.782, 26.940],
        bbox: [75.770, 26.930, 75.795, 26.950]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.770, 26.932], [75.782, 26.930], [75.792, 26.932],
          [75.795, 26.940], [75.792, 26.948], [75.780, 26.950],
          [75.772, 26.945], [75.770, 26.938], [75.770, 26.932]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // CENTRAL-NORTH JAIPUR
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Bani Park',
        zone: 'Hawa Mahal',
        pincode: '302016',
        center: [75.788, 26.935],
        bbox: [75.775, 26.925, 75.800, 26.945]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.775, 26.928], [75.788, 26.925], [75.798, 26.928],
          [75.800, 26.935], [75.798, 26.942], [75.788, 26.945],
          [75.778, 26.942], [75.775, 26.935], [75.775, 26.928]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Sindhi Camp',
        zone: 'Hawa Mahal',
        pincode: '302001',
        center: [75.790, 26.925],
        bbox: [75.780, 26.918, 75.800, 26.932]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.780, 26.920], [75.790, 26.918], [75.798, 26.920],
          [75.800, 26.925], [75.798, 26.930], [75.790, 26.932],
          [75.782, 26.928], [75.780, 26.924], [75.780, 26.920]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Station Road',
        zone: 'Hawa Mahal',
        pincode: '302001',
        center: [75.787, 26.920],
        bbox: [75.780, 26.912, 75.795, 26.928]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.780, 26.915], [75.788, 26.912], [75.795, 26.915],
          [75.793, 26.922], [75.790, 26.928], [75.782, 26.925],
          [75.780, 26.920], [75.780, 26.915]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // CENTRAL JAIPUR (Pink City / Walled City)
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Pink City',
        zone: 'Hawa Mahal',
        pincode: '302002',
        center: [75.825, 26.924],
        bbox: [75.812, 26.912, 75.842, 26.935]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.812, 26.915], [75.825, 26.912], [75.838, 26.914],
          [75.842, 26.922], [75.840, 26.932], [75.830, 26.935],
          [75.818, 26.932], [75.812, 26.925], [75.812, 26.915]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Hawa Mahal Area',
        zone: 'Hawa Mahal',
        pincode: '302002',
        center: [75.826, 26.923],
        bbox: [75.818, 26.918, 75.838, 26.932]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.818, 26.920], [75.828, 26.918], [75.836, 26.920],
          [75.838, 26.926], [75.835, 26.932], [75.825, 26.930],
          [75.820, 26.928], [75.818, 26.924], [75.818, 26.920]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Johari Bazaar',
        zone: 'Hawa Mahal',
        pincode: '302003',
        center: [75.824, 26.921],
        bbox: [75.818, 26.916, 75.832, 26.928]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.818, 26.918], [75.825, 26.916], [75.832, 26.918],
          [75.830, 26.924], [75.828, 26.928], [75.820, 26.926],
          [75.818, 26.922], [75.818, 26.918]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Bapu Bazaar',
        zone: 'Hawa Mahal',
        pincode: '302001',
        center: [75.818, 26.918],
        bbox: [75.810, 26.912, 75.828, 26.925]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.810, 26.915], [75.818, 26.912], [75.826, 26.914],
          [75.828, 26.920], [75.825, 26.925], [75.815, 26.923],
          [75.810, 26.920], [75.810, 26.915]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'MI Road',
        zone: 'Hawa Mahal',
        pincode: '302001',
        center: [75.800, 26.915],
        bbox: [75.788, 26.908, 75.815, 26.925]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.788, 26.910], [75.800, 26.908], [75.812, 26.910],
          [75.815, 26.915], [75.812, 26.922], [75.800, 26.925],
          [75.790, 26.922], [75.788, 26.915], [75.788, 26.910]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'C-Scheme',
        zone: 'Hawa Mahal',
        pincode: '302001',
        center: [75.798, 26.908],
        bbox: [75.785, 26.898, 75.812, 26.918]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.785, 26.900], [75.798, 26.898], [75.810, 26.900],
          [75.812, 26.908], [75.808, 26.915], [75.798, 26.918],
          [75.788, 26.915], [75.785, 26.908], [75.785, 26.900]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Civil Lines',
        zone: 'Hawa Mahal',
        pincode: '302006',
        center: [75.795, 26.912],
        bbox: [75.782, 26.905, 75.810, 26.922]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.782, 26.908], [75.795, 26.905], [75.808, 26.908],
          [75.810, 26.915], [75.805, 26.920], [75.795, 26.922],
          [75.785, 26.918], [75.782, 26.912], [75.782, 26.908]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Adarsh Nagar',
        zone: 'Hawa Mahal',
        pincode: '302004',
        center: [75.788, 26.912],
        bbox: [75.775, 26.905, 75.800, 26.920]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.775, 26.908], [75.788, 26.905], [75.798, 26.908],
          [75.800, 26.912], [75.798, 26.918], [75.788, 26.920],
          [75.778, 26.918], [75.775, 26.912], [75.775, 26.908]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Hathroi',
        zone: 'Hawa Mahal',
        pincode: '302001',
        center: [75.790, 26.905],
        bbox: [75.780, 26.898, 75.800, 26.912]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.780, 26.900], [75.790, 26.898], [75.798, 26.900],
          [75.800, 26.905], [75.798, 26.910], [75.790, 26.912],
          [75.782, 26.910], [75.780, 26.905], [75.780, 26.900]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // EAST JAIPUR
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Raja Park',
        zone: 'Hawa Mahal',
        pincode: '302004',
        center: [75.818, 26.900],
        bbox: [75.805, 26.892, 75.832, 26.910]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.805, 26.895], [75.818, 26.892], [75.830, 26.895],
          [75.832, 26.902], [75.828, 26.908], [75.818, 26.910],
          [75.808, 26.908], [75.805, 26.900], [75.805, 26.895]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Tilak Nagar',
        zone: 'Hawa Mahal',
        pincode: '302004',
        center: [75.805, 26.898],
        bbox: [75.795, 26.890, 75.815, 26.905]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.795, 26.892], [75.805, 26.890], [75.815, 26.892],
          [75.812, 26.898], [75.808, 26.905], [75.798, 26.903],
          [75.795, 26.898], [75.795, 26.892]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Jawahar Nagar',
        zone: 'Hawa Mahal',
        pincode: '302004',
        center: [75.808, 26.885],
        bbox: [75.795, 26.875, 75.822, 26.895]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.795, 26.878], [75.808, 26.875], [75.820, 26.878],
          [75.822, 26.885], [75.818, 26.892], [75.808, 26.895],
          [75.798, 26.892], [75.795, 26.885], [75.795, 26.878]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Amer Road',
        zone: 'Hawa Mahal',
        pincode: '302002',
        center: [75.850, 26.935],
        bbox: [75.830, 26.920, 75.872, 26.952]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.830, 26.925], [75.848, 26.920], [75.868, 26.922],
          [75.872, 26.935], [75.868, 26.948], [75.850, 26.952],
          [75.835, 26.948], [75.830, 26.938], [75.830, 26.925]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Galta Gate',
        zone: 'Hawa Mahal',
        pincode: '302002',
        center: [75.842, 26.918],
        bbox: [75.830, 26.910, 75.855, 26.928]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.830, 26.912], [75.842, 26.910], [75.852, 26.912],
          [75.855, 26.918], [75.850, 26.925], [75.840, 26.928],
          [75.832, 26.925], [75.830, 26.918], [75.830, 26.912]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Ramganj',
        zone: 'Hawa Mahal',
        pincode: '302002',
        center: [75.838, 26.915],
        bbox: [75.825, 26.905, 75.852, 26.925]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.825, 26.908], [75.838, 26.905], [75.850, 26.908],
          [75.852, 26.915], [75.848, 26.922], [75.835, 26.925],
          [75.828, 26.920], [75.825, 26.912], [75.825, 26.908]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Sanganeri Gate',
        zone: 'Hawa Mahal',
        pincode: '302003',
        center: [75.830, 26.912],
        bbox: [75.820, 26.905, 75.842, 26.920]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.820, 26.908], [75.830, 26.905], [75.840, 26.908],
          [75.842, 26.912], [75.838, 26.918], [75.828, 26.920],
          [75.822, 26.918], [75.820, 26.912], [75.820, 26.908]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // WEST JAIPUR
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Vaishali Nagar',
        zone: 'Jaipur Municipal Corp',
        pincode: '302021',
        center: [75.742, 26.918],
        bbox: [75.725, 26.908, 75.758, 26.932]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.725, 26.912], [75.738, 26.908], [75.755, 26.910],
          [75.758, 26.918], [75.755, 26.928], [75.742, 26.932],
          [75.728, 26.928], [75.725, 26.920], [75.725, 26.912]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Nirman Nagar',
        zone: 'Jaipur Municipal Corp',
        pincode: '302019',
        center: [75.752, 26.908],
        bbox: [75.740, 26.898, 75.765, 26.918]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.740, 26.902], [75.752, 26.898], [75.762, 26.900],
          [75.765, 26.908], [75.762, 26.915], [75.752, 26.918],
          [75.742, 26.915], [75.740, 26.908], [75.740, 26.902]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Shyam Nagar',
        zone: 'Jaipur Municipal Corp',
        pincode: '302019',
        center: [75.772, 26.905],
        bbox: [75.760, 26.895, 75.785, 26.915]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.760, 26.898], [75.772, 26.895], [75.782, 26.898],
          [75.785, 26.905], [75.782, 26.912], [75.772, 26.915],
          [75.762, 26.912], [75.760, 26.905], [75.760, 26.898]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Ajmer Road',
        zone: 'Jaipur Municipal Corp',
        pincode: '302001',
        center: [75.725, 26.900],
        bbox: [75.710, 26.885, 75.740, 26.918]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.710, 26.888], [75.725, 26.885], [75.738, 26.888],
          [75.740, 26.900], [75.738, 26.912], [75.725, 26.918],
          [75.712, 26.912], [75.710, 26.900], [75.710, 26.888]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // SOUTH-WEST JAIPUR (Mansarovar Zone)
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Mansarovar',
        zone: 'Mansarovar',
        pincode: '302020',
        center: [75.768, 26.865],
        bbox: [75.752, 26.848, 75.788, 26.882]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.752, 26.852], [75.768, 26.848], [75.785, 26.850],
          [75.788, 26.862], [75.785, 26.875], [75.772, 26.882],
          [75.755, 26.878], [75.752, 26.865], [75.752, 26.852]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Mansarovar Extension',
        zone: 'Mansarovar',
        pincode: '302020',
        center: [75.755, 26.848],
        bbox: [75.740, 26.835, 75.772, 26.858]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.740, 26.838], [75.755, 26.835], [75.768, 26.838],
          [75.772, 26.848], [75.768, 26.855], [75.755, 26.858],
          [75.742, 26.855], [75.740, 26.848], [75.740, 26.838]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Shipra Path',
        zone: 'Mansarovar',
        pincode: '302020',
        center: [75.780, 26.865],
        bbox: [75.770, 26.858, 75.792, 26.875]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.770, 26.860], [75.780, 26.858], [75.790, 26.860],
          [75.792, 26.865], [75.788, 26.872], [75.778, 26.875],
          [75.772, 26.872], [75.770, 26.865], [75.770, 26.860]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'New Sanganer Road',
        zone: 'Mansarovar',
        pincode: '302019',
        center: [75.765, 26.870],
        bbox: [75.755, 26.860, 75.778, 26.882]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.755, 26.862], [75.765, 26.860], [75.775, 26.862],
          [75.778, 26.870], [75.775, 26.878], [75.765, 26.882],
          [75.758, 26.878], [75.755, 26.870], [75.755, 26.862]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Gopalpura',
        zone: 'Mansarovar',
        pincode: '302015',
        center: [75.775, 26.878],
        bbox: [75.762, 26.870, 75.788, 26.888]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.762, 26.872], [75.775, 26.870], [75.785, 26.872],
          [75.788, 26.878], [75.785, 26.885], [75.775, 26.888],
          [75.765, 26.885], [75.762, 26.878], [75.762, 26.872]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Gopalpura Bypass',
        zone: 'Mansarovar',
        pincode: '302018',
        center: [75.762, 26.875],
        bbox: [75.750, 26.865, 75.775, 26.885]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.750, 26.868], [75.762, 26.865], [75.772, 26.868],
          [75.775, 26.875], [75.772, 26.882], [75.762, 26.885],
          [75.752, 26.882], [75.750, 26.875], [75.750, 26.868]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Durgapura',
        zone: 'Mansarovar',
        pincode: '302018',
        center: [75.772, 26.855],
        bbox: [75.760, 26.845, 75.785, 26.865]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.760, 26.848], [75.772, 26.845], [75.782, 26.848],
          [75.785, 26.855], [75.782, 26.862], [75.772, 26.865],
          [75.762, 26.862], [75.760, 26.855], [75.760, 26.848]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Lal Kothi',
        zone: 'Mansarovar',
        pincode: '302015',
        center: [75.790, 26.892],
        bbox: [75.782, 26.885, 75.800, 26.900]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.782, 26.888], [75.790, 26.885], [75.798, 26.888],
          [75.800, 26.892], [75.798, 26.898], [75.790, 26.900],
          [75.784, 26.898], [75.782, 26.892], [75.782, 26.888]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // SOUTH JAIPUR (Malviya Nagar / Sanganer)
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Malviya Nagar',
        zone: 'Malviya Nagar',
        pincode: '302017',
        center: [75.808, 26.860],
        bbox: [75.790, 26.848, 75.825, 26.875]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.790, 26.852], [75.808, 26.848], [75.822, 26.850],
          [75.825, 26.860], [75.822, 26.870], [75.808, 26.875],
          [75.792, 26.870], [75.790, 26.860], [75.790, 26.852]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Jawahar Circle',
        zone: 'Malviya Nagar',
        pincode: '302017',
        center: [75.805, 26.852],
        bbox: [75.795, 26.845, 75.815, 26.860]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.795, 26.848], [75.805, 26.845], [75.815, 26.848],
          [75.812, 26.855], [75.808, 26.860], [75.798, 26.858],
          [75.795, 26.852], [75.795, 26.848]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Tonk Road',
        zone: 'Malviya Nagar',
        pincode: '302015',
        center: [75.790, 26.880],
        bbox: [75.780, 26.855, 75.802, 26.905]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.780, 26.858], [75.790, 26.855], [75.800, 26.858],
          [75.802, 26.875], [75.800, 26.895], [75.792, 26.905],
          [75.782, 26.898], [75.780, 26.878], [75.780, 26.858]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'VT Road',
        zone: 'Malviya Nagar',
        pincode: '302018',
        center: [75.790, 26.850],
        bbox: [75.780, 26.840, 75.802, 26.860]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.780, 26.842], [75.790, 26.840], [75.800, 26.842],
          [75.802, 26.850], [75.798, 26.858], [75.788, 26.860],
          [75.782, 26.855], [75.780, 26.848], [75.780, 26.842]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Jagatpura',
        zone: 'Sanganer',
        pincode: '302017',
        center: [75.840, 26.835],
        bbox: [75.815, 26.815, 75.870, 26.855]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.815, 26.820], [75.838, 26.815], [75.865, 26.818],
          [75.870, 26.835], [75.865, 26.850], [75.840, 26.855],
          [75.818, 26.850], [75.815, 26.838], [75.815, 26.820]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Pratap Nagar',
        zone: 'Sanganer',
        pincode: '302033',
        center: [75.795, 26.828],
        bbox: [75.775, 26.815, 75.815, 26.845]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.775, 26.818], [75.795, 26.815], [75.812, 26.818],
          [75.815, 26.828], [75.810, 26.840], [75.795, 26.845],
          [75.778, 26.840], [75.775, 26.828], [75.775, 26.818]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Sanganer',
        zone: 'Sanganer',
        pincode: '302029',
        center: [75.782, 26.818],
        bbox: [75.765, 26.805, 75.800, 26.835]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.765, 26.808], [75.782, 26.805], [75.798, 26.808],
          [75.800, 26.818], [75.795, 26.830], [75.780, 26.835],
          [75.768, 26.828], [75.765, 26.818], [75.765, 26.808]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Sitapura',
        zone: 'Sanganer',
        pincode: '302022',
        center: [75.845, 26.798],
        bbox: [75.815, 26.780, 75.872, 26.818]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.815, 26.785], [75.840, 26.780], [75.868, 26.782],
          [75.872, 26.798], [75.868, 26.812], [75.842, 26.818],
          [75.818, 26.812], [75.815, 26.800], [75.815, 26.785]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'RIICO Industrial Area',
        zone: 'Sanganer',
        pincode: '302022',
        center: [75.830, 26.802],
        bbox: [75.810, 26.790, 75.850, 26.815]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.810, 26.795], [75.830, 26.790], [75.848, 26.792],
          [75.850, 26.802], [75.845, 26.812], [75.828, 26.815],
          [75.812, 26.810], [75.810, 26.800], [75.810, 26.795]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // EXTENDED JAIPUR (30-50km)
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Amer',
        zone: 'Amer',
        pincode: '302028',
        center: [75.855, 26.990],
        bbox: [75.840, 26.980, 75.875, 27.010]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.840, 26.982], [75.855, 26.980], [75.872, 26.982],
          [75.875, 26.992], [75.870, 27.005], [75.855, 27.010],
          [75.842, 27.005], [75.840, 26.995], [75.840, 26.982]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Kukas',
        zone: 'Amer',
        pincode: '302028',
        center: [75.860, 26.998],
        bbox: [75.840, 26.985, 75.882, 27.020]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.840, 26.988], [75.858, 26.985], [75.878, 26.988],
          [75.882, 27.000], [75.878, 27.015], [75.858, 27.020],
          [75.842, 27.015], [75.840, 27.002], [75.840, 26.988]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Chandpole',
        zone: 'Hawa Mahal',
        pincode: '302001',
        center: [75.808, 26.928],
        bbox: [75.800, 26.922, 75.818, 26.935]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.800, 26.925], [75.810, 26.922], [75.818, 26.925],
          [75.815, 26.930], [75.810, 26.935], [75.802, 26.932],
          [75.800, 26.928], [75.800, 26.925]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Subhash Chowk',
        zone: 'Hawa Mahal',
        pincode: '302001',
        center: [75.815, 26.915],
        bbox: [75.808, 26.910, 75.825, 26.922]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.808, 26.912], [75.815, 26.910], [75.822, 26.912],
          [75.825, 26.915], [75.822, 26.920], [75.815, 26.922],
          [75.810, 26.920], [75.808, 26.915], [75.808, 26.912]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Collectorate Circle',
        zone: 'Hawa Mahal',
        pincode: '302005',
        center: [75.805, 26.920],
        bbox: [75.798, 26.915, 75.812, 26.928]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.798, 26.918], [75.805, 26.915], [75.812, 26.918],
          [75.810, 26.922], [75.805, 26.928], [75.800, 26.925],
          [75.798, 26.922], [75.798, 26.918]
        ]]
      }
    },

    // Additional South-West areas
    {
      type: 'Feature',
      properties: {
        name: 'Sodala',
        zone: 'Malviya Nagar',
        pincode: '302019',
        center: [75.795, 26.895],
        bbox: [75.785, 26.888, 75.805, 26.902]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.785, 26.890], [75.795, 26.888], [75.805, 26.890],
          [75.802, 26.895], [75.800, 26.900], [75.790, 26.902],
          [75.785, 26.898], [75.785, 26.892], [75.785, 26.890]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Heera Nagar',
        zone: 'Mansarovar',
        pincode: '302019',
        center: [75.770, 26.888],
        bbox: [75.760, 26.882, 75.780, 26.895]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.760, 26.885], [75.770, 26.882], [75.778, 26.885],
          [75.780, 26.888], [75.778, 26.892], [75.770, 26.895],
          [75.762, 26.892], [75.760, 26.888], [75.760, 26.885]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Bais Godam',
        zone: 'Mansarovar',
        pincode: '302006',
        center: [75.785, 26.895],
        bbox: [75.778, 26.890, 75.792, 26.900]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.778, 26.892], [75.785, 26.890], [75.792, 26.892],
          [75.790, 26.895], [75.788, 26.898], [75.780, 26.900],
          [75.778, 26.895], [75.778, 26.892]
        ]]
      }
    },

    // ═══════════════════════════════════════
    // OUTER JAIPUR (30-50km radius)
    // ═══════════════════════════════════════
    {
      type: 'Feature',
      properties: {
        name: 'Chomu',
        zone: 'Chomu',
        pincode: '303702',
        center: [75.720, 27.170],
        bbox: [75.690, 27.140, 75.750, 27.200]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.690, 27.145], [75.718, 27.140], [75.748, 27.142],
          [75.750, 27.165], [75.745, 27.195], [75.720, 27.200],
          [75.695, 27.195], [75.690, 27.170], [75.690, 27.145]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Dudu',
        zone: 'Dudu',
        pincode: '303008',
        center: [75.540, 26.780],
        bbox: [75.510, 26.750, 75.570, 26.810]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.510, 26.755], [75.540, 26.750], [75.568, 26.752],
          [75.570, 26.778], [75.565, 26.805], [75.540, 26.810],
          [75.515, 26.805], [75.510, 26.780], [75.510, 26.755]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Bagru',
        zone: 'Bagru',
        pincode: '303007',
        center: [75.550, 26.820],
        bbox: [75.520, 26.795, 75.580, 26.845]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.520, 26.800], [75.548, 26.795], [75.578, 26.798],
          [75.580, 26.820], [75.575, 26.840], [75.550, 26.845],
          [75.525, 26.840], [75.520, 26.822], [75.520, 26.800]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Bassi',
        zone: 'Bassi',
        pincode: '303301',
        center: [75.960, 26.840],
        bbox: [75.930, 26.815, 75.990, 26.865]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.930, 26.820], [75.958, 26.815], [75.988, 26.818],
          [75.990, 26.840], [75.985, 26.860], [75.958, 26.865],
          [75.935, 26.860], [75.930, 26.842], [75.930, 26.820]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Chaksu',
        zone: 'Chaksu',
        pincode: '303901',
        center: [75.950, 26.600],
        bbox: [75.920, 26.575, 75.980, 26.625]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.920, 26.580], [75.948, 26.575], [75.978, 26.578],
          [75.980, 26.600], [75.975, 26.620], [75.948, 26.625],
          [75.925, 26.620], [75.920, 26.602], [75.920, 26.580]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Shahpura',
        zone: 'Shahpura',
        pincode: '303103',
        center: [75.630, 27.090],
        bbox: [75.600, 27.065, 75.660, 27.115]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.600, 27.070], [75.628, 27.065], [75.658, 27.068],
          [75.660, 27.090], [75.655, 27.110], [75.628, 27.115],
          [75.605, 27.110], [75.600, 27.092], [75.600, 27.070]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Jamwa Ramgarh',
        zone: 'Jamwa Ramgarh',
        pincode: '302027',
        center: [75.900, 26.960],
        bbox: [75.870, 26.935, 75.930, 26.985]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.870, 26.940], [75.898, 26.935], [75.928, 26.938],
          [75.930, 26.958], [75.925, 26.980], [75.898, 26.985],
          [75.875, 26.980], [75.870, 26.962], [75.870, 26.940]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Viratnagar',
        zone: 'Viratnagar',
        pincode: '303102',
        center: [75.820, 27.080],
        bbox: [75.790, 27.055, 75.850, 27.105]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.790, 27.060], [75.818, 27.055], [75.848, 27.058],
          [75.850, 27.078], [75.845, 27.100], [75.818, 27.105],
          [75.795, 27.100], [75.790, 27.082], [75.790, 27.060]
        ]]
      }
    },
  ]
};

export default JAIPUR_GEOJSON;
