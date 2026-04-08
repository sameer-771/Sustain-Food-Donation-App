export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

const CHENNAI_BOUNDS = {
  minLat: 12.85,
  maxLat: 13.25,
  minLng: 80.1,
  maxLng: 80.36,
};

const CHENNAI_VIEWBOX = `${CHENNAI_BOUNDS.minLng},${CHENNAI_BOUNDS.maxLat},${CHENNAI_BOUNDS.maxLng},${CHENNAI_BOUNDS.minLat}`;

const isSuggestionInChennai = (suggestion: LocationSuggestion): boolean => {
  const lat = Number.parseFloat(suggestion.lat);
  const lon = Number.parseFloat(suggestion.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return false;
  }

  return (
    lat >= CHENNAI_BOUNDS.minLat
    && lat <= CHENNAI_BOUNDS.maxLat
    && lon >= CHENNAI_BOUNDS.minLng
    && lon <= CHENNAI_BOUNDS.maxLng
  );
};

const splitSearchTokens = (value: string): string[] => (
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
);

const rankSuggestion = (query: string, suggestion: LocationSuggestion): number => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return 999;
  }

  const primary = suggestion.display_name.split(',')[0]?.trim().toLowerCase() || '';
  const full = suggestion.display_name.toLowerCase();
  const primaryTokens = splitSearchTokens(primary);
  const fullTokens = splitSearchTokens(full);

  if (primary.startsWith(normalizedQuery)) return 0;
  if (primaryTokens.some((token) => token.startsWith(normalizedQuery))) return 1;
  if (fullTokens.some((token) => token.startsWith(normalizedQuery))) return 2;
  if (primary.includes(normalizedQuery)) return 3;
  if (full.includes(normalizedQuery)) return 4;
  return 5;
};

const prioritizeSuggestions = (
  query: string,
  suggestions: LocationSuggestion[],
  limit: number,
): LocationSuggestion[] => {
  const chennaiSuggestions = suggestions.filter(isSuggestionInChennai);

  const scored = chennaiSuggestions.map((item, index) => ({
    item,
    index,
    score: rankSuggestion(query, item),
    nameLength: item.display_name.length,
  }));

  const strictMatches = scored
    .filter((entry) => entry.score <= 2)
    .sort((a, b) => a.score - b.score || a.nameLength - b.nameLength || a.index - b.index)
    .map((entry) => entry.item);

  if (strictMatches.length > 0) {
    return strictMatches.slice(0, limit);
  }

  return scored
    .filter((entry) => entry.score <= 4)
    .sort((a, b) => a.score - b.score || a.nameLength - b.nameLength || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
};

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const API_BASE_URL = (() => {
  const runtimeWindow = globalThis.window;
  if (runtimeWindow === undefined) {
    return 'http://127.0.0.1:8000';
  }

  const envValue = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
  if (envValue?.trim()) {
    return envValue.trim().replace(/\/$/, '');
  }

  const protocol = runtimeWindow.location.protocol;
  const host = runtimeWindow.location.hostname || '127.0.0.1';
  return `${protocol}//${host}:8000`;
})();

const mapGeolocationError = (error: GeolocationPositionError): Error => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new Error('Location permission was denied.');
    case error.POSITION_UNAVAILABLE:
      return new Error('Location information is unavailable.');
    case error.TIMEOUT:
      return new Error('Location request timed out.');
    default:
      return new Error('Unable to fetch current location.');
  }
};

export const getCurrentLocation = (
  options?: PositionOptions,
): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(mapGeolocationError(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
        ...options,
      },
    );
  });
};

export const watchCurrentLocation = (
  onUpdate: (location: Coordinates) => void,
  onError?: (error: Error) => void,
  options?: PositionOptions,
): (() => void) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.(new Error('Geolocation is not supported by this browser.'));
    return () => undefined;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (error) => {
      onError?.(mapGeolocationError(error));
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 3000,
      ...options,
    },
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
};

export const searchNominatimLocations = async (
  query: string,
  limit = 6,
): Promise<LocationSuggestion[]> => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const params = new URLSearchParams({
    format: 'json',
    q: normalizedQuery,
    limit: String(limit),
    addressdetails: '1',
    viewbox: CHENNAI_VIEWBOX,
    bounded: '1',
  });

  // Primary path: go through backend proxy for better reliability and no browser-side provider restrictions.
  try {
    const apiResponse = await fetch(`${API_BASE_URL}/api/geocoding/search?${params.toString()}`);
    if (apiResponse.ok) {
      const data = (await apiResponse.json()) as LocationSuggestion[];
      return prioritizeSuggestions(normalizedQuery, data, limit);
    }
  } catch {
    // Fall back to direct provider request.
  }

  const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
    headers: {
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim search failed: ${response.status}`);
  }

  const data = (await response.json()) as LocationSuggestion[];
  return prioritizeSuggestions(normalizedQuery, data, limit);
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const params = new URLSearchParams({
    format: 'json',
    lat: String(lat),
    lon: String(lng),
    zoom: '18',
  });

  // Primary path: backend proxy.
  try {
    const apiResponse = await fetch(`${API_BASE_URL}/api/geocoding/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`);
    if (apiResponse.ok) {
      const data = (await apiResponse.json()) as { display_name?: string };
      if (data.display_name) {
        return data.display_name;
      }
    }
  } catch {
    // Fall back to direct provider request.
  }

  const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`, {
    headers: {
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim reverse geocode failed: ${response.status}`);
  }

  const data = (await response.json()) as { display_name?: string };
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

export const haversineDistanceKm = (from: Coordinates, to: Coordinates): number => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const formatDistanceKm = (distanceKm: number, suffix = true): string => {
  const safeDistance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
  const text = safeDistance < 1
    ? `${Math.max(50, Math.round(safeDistance * 1000))} m`
    : `${safeDistance.toFixed(1)} km`;
  return suffix ? `${text} away` : text;
};
