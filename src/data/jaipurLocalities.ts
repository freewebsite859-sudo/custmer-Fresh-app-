/**
 * Jaipur localities — comprehensive list of 100+ neighborhoods across Jaipur.
 *
 * Each entry includes approximate WGS84 coordinates so the app can compute
 * distances with the Haversine formula when a user manually picks an area
 * (instead of relying on live GPS). Coordinates are approximate centroids
 * sourced from public mapping data and are only used as a manual-selection
 * fallback — live navigator.geolocation always takes priority.
 */

export interface JaipurLocality {
  name: string;
  lat: number;
  lng: number;
  zone?: string;
}

export const JAIPUR_LOCALITIES: JaipurLocality[] = [
  { name: 'Vaishali Nagar', lat: 26.9030, lng: 75.7423, zone: 'West' },
  { name: 'Malviya Nagar', lat: 26.8530, lng: 75.8170, zone: 'South' },
  { name: 'C-Scheme', lat: 26.9110, lng: 75.8030, zone: 'Central' },
  { name: 'Civil Lines', lat: 26.9060, lng: 75.7870, zone: 'Central' },
  { name: 'Bani Park', lat: 26.9290, lng: 75.7950, zone: 'Central' },
  { name: 'Raja Park', lat: 26.8980, lng: 75.8310, zone: 'Central' },
  { name: 'Mansarovar', lat: 26.8550, lng: 75.7660, zone: 'West' },
  { name: 'Jhotwara', lat: 26.9450, lng: 75.7580, zone: 'North-West' },
  { name: 'Tonk Road', lat: 26.8750, lng: 75.7950, zone: 'South' },
  { name: 'Jagatpura', lat: 26.8220, lng: 75.8640, zone: 'South-East' },
  { name: 'Pratap Nagar', lat: 26.8040, lng: 75.8150, zone: 'South' },
  { name: 'Vidhyadhar Nagar', lat: 26.9600, lng: 75.7820, zone: 'North' },
  { name: 'Sanganer', lat: 26.8180, lng: 75.7720, zone: 'South' },
  { name: 'Shyam Nagar', lat: 26.8920, lng: 75.7660, zone: 'West' },
  { name: 'Gopalpura Bypass', lat: 26.8740, lng: 75.7830, zone: 'South' },
  { name: 'Pink City', lat: 26.9220, lng: 75.8270, zone: 'Central' },
  { name: 'Bapu Nagar', lat: 26.8920, lng: 75.8140, zone: 'Central' },
  { name: 'Adarsh Nagar', lat: 26.8990, lng: 75.8190, zone: 'Central' },
  { name: 'Ajmeri Gate', lat: 26.9190, lng: 75.8180, zone: 'Central' },
  { name: 'Akshardham Colony', lat: 26.8520, lng: 75.8050, zone: 'South' },
  { name: 'Ambabari', lat: 26.9460, lng: 75.7710, zone: 'North' },
  { name: 'Amber', lat: 26.9859, lng: 75.8517, zone: 'North' },
  { name: 'Amrapali Circle', lat: 26.8960, lng: 75.7480, zone: 'West' },
  { name: 'Anand Vihar', lat: 26.8580, lng: 75.7680, zone: 'West' },
  { name: 'Arjun Nagar', lat: 26.9050, lng: 75.8230, zone: 'Central' },
  { name: 'Ashok Nagar', lat: 26.9000, lng: 75.8170, zone: 'Central' },
  { name: 'Bajaj Nagar', lat: 26.8850, lng: 75.8120, zone: 'Central' },
  { name: 'Bapu Bazaar', lat: 26.9180, lng: 75.8210, zone: 'Central' },
  { name: 'Barkat Nagar', lat: 26.8830, lng: 75.8150, zone: 'Central' },
  { name: 'Bhawani Singh Zone', lat: 26.9120, lng: 75.8050, zone: 'Central' },
  { name: 'Brahampuri', lat: 26.9340, lng: 75.8290, zone: 'North' },
  { name: 'Budh Vihar', lat: 26.9500, lng: 75.7650, zone: 'North-West' },
  { name: 'Chandpole', lat: 26.9260, lng: 75.8140, zone: 'Central' },
  { name: 'Chitrakoot', lat: 26.8820, lng: 75.7450, zone: 'West' },
  { name: 'Chomu', lat: 27.0820, lng: 75.7230, zone: 'North' },
  { name: 'Durgapura', lat: 26.8580, lng: 75.8030, zone: 'South' },
  { name: 'Gandhi Nagar', lat: 26.8830, lng: 75.8050, zone: 'Central' },
  { name: 'Ganga Jamuna Colony', lat: 26.9400, lng: 75.8200, zone: 'North' },
  { name: 'Gopalpura', lat: 26.8740, lng: 75.7830, zone: 'South' },
  { name: 'Govindpuri', lat: 26.8660, lng: 75.7980, zone: 'South' },
  { name: 'Hawa Mahal Bazaar', lat: 26.9239, lng: 75.8267, zone: 'Central' },
  { name: 'Hathroi', lat: 26.9160, lng: 75.8070, zone: 'Central' },
  { name: 'Hiran Magri', lat: 26.8450, lng: 75.8250, zone: 'South' },
  { name: 'Imli Phatak', lat: 26.9030, lng: 75.7920, zone: 'Central' },
  { name: 'Indira Bazaar', lat: 26.9200, lng: 75.8250, zone: 'Central' },
  { name: 'Indira Gandhi Nagar', lat: 26.9620, lng: 75.7890, zone: 'North' },
  { name: 'Jai Jawan Colony', lat: 26.8880, lng: 75.8230, zone: 'Central' },
  { name: 'Jawahar Nagar', lat: 26.8970, lng: 75.8230, zone: 'Central' },
  { name: 'Johari Bazaar', lat: 26.9190, lng: 75.8260, zone: 'Central' },
  { name: 'Kartarpura', lat: 26.9040, lng: 75.7980, zone: 'Central' },
  { name: 'Khatipura', lat: 26.9340, lng: 75.7600, zone: 'North-West' },
  { name: 'Kishan Nagar', lat: 26.9210, lng: 75.7720, zone: 'West' },
  { name: 'Lal Kothi', lat: 26.8950, lng: 75.8050, zone: 'Central' },
  { name: 'Lalkothi', lat: 26.8950, lng: 75.8050, zone: 'Central' },
  { name: 'Laxmi Nagar', lat: 26.9230, lng: 75.7780, zone: 'North' },
  { name: 'Madhopura', lat: 26.9200, lng: 75.7950, zone: 'Central' },
  { name: 'Maharani Farm', lat: 26.8500, lng: 75.8250, zone: 'South' },
  { name: 'Mahesh Nagar', lat: 26.9160, lng: 75.7920, zone: 'Central' },
  { name: 'Malviya Nagar Industrial Area', lat: 26.8500, lng: 75.8120, zone: 'South' },
  { name: 'Mansarovar Extension', lat: 26.8500, lng: 75.7580, zone: 'West' },
  { name: 'Mansarovar Plaza', lat: 26.8560, lng: 75.7700, zone: 'West' },
  { name: 'MI Road', lat: 26.9150, lng: 75.8170, zone: 'Central' },
  { name: 'Muhana', lat: 26.8100, lng: 75.7550, zone: 'South-West' },
  { name: 'Murlipura', lat: 26.9540, lng: 75.7750, zone: 'North' },
  { name: 'Nirman Nagar', lat: 26.8880, lng: 75.7580, zone: 'West' },
  { name: 'Nishatganj', lat: 26.9250, lng: 75.8200, zone: 'Central' },
  { name: 'Panchyawala', lat: 26.9200, lng: 75.7350, zone: 'West' },
  { name: 'Ram Nagar', lat: 26.8960, lng: 75.7850, zone: 'Central' },
  { name: 'Rambagh', lat: 26.8970, lng: 75.8030, zone: 'Central' },
  { name: 'Ramesh Marg', lat: 26.9070, lng: 75.8050, zone: 'Central' },
  { name: 'Rani Sati Nagar', lat: 26.8680, lng: 75.7650, zone: 'West' },
  { name: 'Sardar Patel Marg', lat: 26.8990, lng: 75.7950, zone: 'Central' },
  { name: 'Satya Vihar', lat: 26.8620, lng: 75.7720, zone: 'West' },
  { name: 'Sawai Jai Singh Highway', lat: 26.9060, lng: 75.8000, zone: 'Central' },
  { name: 'Sawai Mansingh Road', lat: 26.8970, lng: 75.8080, zone: 'Central' },
  { name: 'Shastri Nagar', lat: 26.9280, lng: 75.7780, zone: 'North' },
  { name: 'Shiv Marg', lat: 26.9040, lng: 75.7880, zone: 'Central' },
  { name: 'Sindhi Camp', lat: 26.9210, lng: 75.8000, zone: 'Central' },
  { name: 'Sitapura', lat: 26.7920, lng: 75.8050, zone: 'South' },
  { name: 'Sitapura Industrial Area', lat: 26.7880, lng: 75.8000, zone: 'South' },
  { name: 'Sodala', lat: 26.9070, lng: 75.7910, zone: 'Central' },
  { name: 'Subhash Nagar', lat: 26.9130, lng: 75.7800, zone: 'West' },
  { name: 'Subhash Chowk', lat: 26.9250, lng: 75.8220, zone: 'Central' },
  { name: 'Sukhdeopura', lat: 26.9380, lng: 75.7700, zone: 'North' },
  { name: 'Sunder Nagar', lat: 26.8860, lng: 75.7600, zone: 'West' },
  { name: 'Tilak Nagar', lat: 26.8900, lng: 75.8180, zone: 'Central' },
  { name: 'Tonk Phatak', lat: 26.8760, lng: 75.7970, zone: 'South' },
  { name: 'Tripolia Bazaar', lat: 26.9240, lng: 75.8200, zone: 'Central' },
  { name: 'Vidyut Nagar', lat: 26.8620, lng: 75.7980, zone: 'South' },
  { name: 'Vidyadhar Nagar', lat: 26.9600, lng: 75.7820, zone: 'North' },
  { name: 'Vijay Bari', lat: 26.9480, lng: 75.7720, zone: 'North' },
  { name: 'Vijaywada Colony', lat: 26.8650, lng: 75.8200, zone: 'South' },
  { name: 'Vinayak Vihar', lat: 26.8700, lng: 75.7550, zone: 'West' },
  { name: 'Vishwakarma Industrial Area', lat: 26.9680, lng: 75.7600, zone: 'North-West' },
  { name: 'Wardhman Nagar', lat: 26.9330, lng: 75.7780, zone: 'North' },
  { name: 'Ajmer Road', lat: 26.9000, lng: 75.7500, zone: 'West' },
  { name: 'Delhi Road', lat: 26.9600, lng: 75.8000, zone: 'North' },
  { name: 'Sikar Road', lat: 26.9550, lng: 75.7900, zone: 'North' },
  { name: 'Agra Road', lat: 26.9300, lng: 75.8500, zone: 'East' },
  { name: 'Galta Gate', lat: 26.9280, lng: 75.8400, zone: 'East' },
  { name: 'Ghat Gate', lat: 26.9220, lng: 75.8370, zone: 'East' },
  { name: 'Jorawar Singh Gate', lat: 26.9300, lng: 75.8320, zone: 'North' },
  { name: 'New Aatish Market', lat: 26.8700, lng: 75.7850, zone: 'South' },
  { name: 'Mansarovar Metro Station', lat: 26.8570, lng: 75.7660, zone: 'West' },
  { name: 'Chandpole Bazaar', lat: 26.9260, lng: 75.8150, zone: 'Central' },
  { name: 'Kishanpole Bazaar', lat: 26.9240, lng: 75.8190, zone: 'Central' },
  { name: 'Nehru Bazaar', lat: 26.9170, lng: 75.8190, zone: 'Central' },
  { name: 'Indra Bazaar', lat: 26.9190, lng: 75.8240, zone: 'Central' },
  { name: 'Sanganeri Gate', lat: 26.9180, lng: 75.8280, zone: 'Central' },
  { name: 'Ghat Darwaza', lat: 26.9210, lng: 75.8360, zone: 'East' },
  { name: 'Surajpole', lat: 26.9200, lng: 75.8290, zone: 'Central' },
  { name: 'Zorawar Singh Gate', lat: 26.9300, lng: 75.8320, zone: 'North' },
  { name: 'Naya Khera', lat: 26.9400, lng: 75.7650, zone: 'North-West' },
  { name: 'Sirsi Road', lat: 26.9300, lng: 75.7300, zone: 'West' },
  { name: 'Niwaroo', lat: 26.9750, lng: 75.7450, zone: 'North-West' },
  { name: 'Bindayaka', lat: 26.8900, lng: 75.7150, zone: 'West' },
  { name: 'Muhana Mandi', lat: 26.8050, lng: 75.7600, zone: 'South-West' },
  { name: 'Phagi Road', lat: 26.8000, lng: 75.7300, zone: 'South-West' },
  { name: 'Diggi Road', lat: 26.7900, lng: 75.7800, zone: 'South' },
  { name: 'Renwal', lat: 26.8700, lng: 75.6800, zone: 'West' },
  { name: 'Jobner', lat: 27.0600, lng: 75.3200, zone: 'West' },
  { name: 'Sanganer Airport Area', lat: 26.8280, lng: 75.8050, zone: 'South' },
  { name: 'Pratap Nagar Housing Board', lat: 26.8100, lng: 75.8180, zone: 'South' },
  { name: 'Kumbha Marg', lat: 26.8300, lng: 75.8300, zone: 'South-East' },
  { name: 'Mahal Road', lat: 26.8350, lng: 75.8550, zone: 'South-East' },
  { name: 'Patrakar Colony', lat: 26.8700, lng: 75.7950, zone: 'South' },
  { name: 'Mansarovar Sector 1', lat: 26.8600, lng: 75.7700, zone: 'West' },
  { name: 'Heerapura', lat: 26.8950, lng: 75.7300, zone: 'West' },
  { name: 'Rohini Nagar', lat: 26.8650, lng: 75.7500, zone: 'West' },
];

/** Deduplicated, alphabetically-sorted list (guards against accidental duplicate entries). */
export const JAIPUR_LOCALITY_NAMES: string[] = Array.from(
  new Set(JAIPUR_LOCALITIES.map((l) => l.name.trim())),
).sort((a, b) => a.localeCompare(b));

/**
 * Look up approximate coordinates for a locality name.
 * Returns null when the locality is not recognized (no hardcoded city fallback).
 */
export function findLocalityCoordinates(name: string): { lat: number; lng: number } | null {
  const key = name.trim().toLowerCase();
  const match = JAIPUR_LOCALITIES.find((l) => l.name.toLowerCase() === key);
  if (match) return { lat: match.lat, lng: match.lng };

  // Tolerant "includes" match for entries like "C-Scheme" vs "C Scheme"
  const tolerant = JAIPUR_LOCALITIES.find(
    (l) => l.name.toLowerCase().replace(/[\s-]+/g, '') === key.replace(/[\s-]+/g, ''),
  );
  return tolerant ? { lat: tolerant.lat, lng: tolerant.lng } : null;
}
