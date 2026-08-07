export interface CurrentLocation {
  latitude: number;
  longitude: number;
  area: string;            // Sublocality (e.g. "Vaishali Nagar") or Locality
  city: string;            // Locality (e.g. "Jaipur")
  state: string;           // Administrative Area (e.g. "Rajasthan")
  country: string;         // Country (e.g. "India")
  formattedAddress: string;
  accuracy: number;        // Accuracy in meters
  timestamp: number;       // Detection timestamp in epoch ms
}

export type LocationErrorType =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'OFFLINE'
  | 'GEOCODING_FAILED'
  | 'INVALID_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'UNKNOWN';

export interface LocationError {
  type: LocationErrorType;
  message: string;
  code?: number;
  originalError?: any;
}

export interface GeocodingResult {
  area: string;
  city: string;
  state: string;
  country: string;
  formattedAddress: string;
  placeId?: string;
  raw?: any;
}

export type RadiusOption = 2 | 5 | 10 | 'all';
