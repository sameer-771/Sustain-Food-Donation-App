import { FoodListing, AppNotification, PickupCodeResult, Rating } from '../types';
import axios from 'axios';
import { supabase } from '../src/utils/supabaseClient';

const API_BASE_URL = (() => {
  const runtimeWindow = globalThis.window;
  if (runtimeWindow === undefined) {
    return 'http://127.0.0.1:8000';
  }

  const protocol = runtimeWindow.location.protocol;
  const host = runtimeWindow.location.hostname || '127.0.0.1';
  return `${protocol}//${host}:8000`;
})();

interface VerifyQualityApiResponse {
  quality: {
    freshness: 'Fresh' | 'Questionable' | 'Spoiled';
    confidence: number;
    isVerified: boolean;
  };
}

interface VerifyQualityPreviewApiResponse {
  quality: {
    freshness: 'Fresh' | 'Questionable' | 'Spoiled';
    confidence: number;
    isVerified: boolean;
  };
}

interface VerifyPickupApiResponse {
  verified: boolean;
  food: FoodListing;
}

const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

const getAuthHeaders = async (baseHeaders?: Record<string, string>): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  if (!token) {
    return baseHeaders || {};
  }

  if (!baseHeaders) {
    return { Authorization: `Bearer ${token}` };
  }

  return { ...baseHeaders, Authorization: `Bearer ${token}` };
};

// ── Keys ──
const KEYS = {
  FOODS: 'sustain_foods',
  NOTIFICATIONS: 'sustain_notifications',
  SEEDED: 'sustain_seeded',
  RATINGS: 'sustain_ratings',
};

// ── Foods ──
export const getFoods = (): FoodListing[] => {
  try {
    const data = localStorage.getItem(KEYS.FOODS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveFoods = (foods: FoodListing[]): void => {
  localStorage.setItem(KEYS.FOODS, JSON.stringify(foods));
};

export const updateFood = (id: string, updates: Partial<FoodListing>): FoodListing[] => {
  const foods = getFoods();
  const updated = foods.map(f => f.id === id ? { ...f, ...updates } : f);
  saveFoods(updated);
  return updated;
};

export const addFood = (food: FoodListing): FoodListing[] => {
  const foods = getFoods();
  const updated = [food, ...foods];
  saveFoods(updated);
  return updated;
};

// ── Notifications ──
export const getNotifications = (): AppNotification[] => {
  try {
    const data = localStorage.getItem(KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveNotifications = (notifications: AppNotification[]): void => {
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
};

export const addNotification = (
  partial: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
): AppNotification => {
  const notif: AppNotification = {
    ...partial,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  const notifications = getNotifications();
  const updated = [notif, ...notifications];
  saveNotifications(updated);
  return notif;
};

export const markNotificationRead = (id: string): void => {
  const notifications = getNotifications();
  const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  saveNotifications(updated);
};

export const markAllNotificationsRead = (): void => {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  saveNotifications(updated);
};

// ── Expiry Check ──
const EXPIRY_DURATION = 5 * 60 * 60 * 1000; // 5 hours

export const checkAndUpdateExpiry = (): FoodListing[] => {
  const foods = getFoods();
  const now = Date.now();
  let changed = false;

  const updated = foods.map(f => {
    // Expire available items past creation + 5h
    if (f.status === 'available') {
      const createdTime = new Date(f.createdAt || f.cookedAt).getTime();
      if (now - createdTime >= EXPIRY_DURATION) {
        changed = true;
        return { ...f, status: 'expired' as const };
      }
    }
    // Expire claimed items past their expiresAt (uncollected)
    if (f.status === 'claimed' && f.expiresAt) {
      if (now >= new Date(f.expiresAt).getTime()) {
        changed = true;
        return { ...f, status: 'expired' as const };
      }
    }
    return f;
  });

  if (changed) {
    saveFoods(updated);
  }
  return updated;
};

// ── Seed check ──
export const isSeeded = (): boolean => {
  return localStorage.getItem(KEYS.SEEDED) === 'true';
};

export const markSeeded = (): void => {
  localStorage.setItem(KEYS.SEEDED, 'true');
};

// ── Random lat/lng near Chennai ──
export const randomChennaiLocation = (): { lat: number; lng: number } => {
  // Chennai center: 13.0827, 80.2707
  const lat = 13.0827 + (Math.random() - 0.5) * 0.08;
  const lng = 80.2707 + (Math.random() - 0.5) * 0.08;
  return { lat: Number.parseFloat(lat.toFixed(4)), lng: Number.parseFloat(lng.toFixed(4)) };
};

// ── Ratings ──
export const getRatings = (): Rating[] => {
  try {
    const data = localStorage.getItem(KEYS.RATINGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveRating = (rating: Rating): void => {
  const ratings = getRatings();
  ratings.push(rating);
  localStorage.setItem(KEYS.RATINGS, JSON.stringify(ratings));
};

export const hasRated = (listingId: string, userId: string): boolean => {
  return getRatings().some(r => r.listingId === listingId && r.userId === userId);
};

// ── Backend sync helpers (frontend integration) ──
export const syncFoodsFromApi = async (options?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
}): Promise<FoodListing[]> => {
  const params = new URLSearchParams();
  if (typeof options?.lat === 'number') params.set('lat', String(options.lat));
  if (typeof options?.lng === 'number') params.set('lng', String(options.lng));
  if (typeof options?.radiusKm === 'number') params.set('radiusKm', String(options.radiusKm));

  const query = params.toString();
  const endpoint = query ? `${API_BASE_URL}/api/foods?${query}` : `${API_BASE_URL}/api/foods`;

  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error(`Failed to fetch foods: ${res.status}`);
  }
  const foods = await res.json() as FoodListing[];
  saveFoods(foods);
  return foods;
};

export const syncNotificationsFromApi = async (): Promise<AppNotification[]> => {
  const res = await fetch(`${API_BASE_URL}/api/notifications`);
  if (!res.ok) {
    throw new Error(`Failed to fetch notifications: ${res.status}`);
  }
  const notifications = await res.json() as AppNotification[];
  saveNotifications(notifications);
  return notifications;
};

export const hasRatedInApi = async (listingId: string, userId: string): Promise<boolean> => {
  const params = new URLSearchParams({ listingId, userId });
  const res = await fetch(`${API_BASE_URL}/api/ratings/has-rated?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to check rating: ${res.status}`);
  }
  const data = await res.json() as { hasRated: boolean };
  return Boolean(data.hasRated);
};

export const saveRatingToApi = async (rating: Rating): Promise<void> => {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${API_BASE_URL}/api/ratings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rating),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Failed to save rating: ${res.status}`);
  }
};

export const createFoodInApi = async (food: FoodListing): Promise<void> => {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${API_BASE_URL}/api/foods`, {
    method: 'POST',
    headers,
    body: JSON.stringify(food),
  });

  if (!res.ok && res.status !== 409) {
    const errorText = await res.text();
    throw new Error(errorText || `Failed to create food: ${res.status}`);
  }
};

export const updateFoodInApi = async (id: string, updates: Partial<FoodListing>): Promise<void> => {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  const res = await fetch(`${API_BASE_URL}/api/foods/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Failed to update food: ${res.status}`);
  }
};

export const verifyQualityInApi = async (foodId: string, imageFile: File): Promise<VerifyQualityApiResponse> => {
  const formData = new FormData();
  formData.append('food_id', foodId);
  formData.append('image', imageFile);
  const headers = await getAuthHeaders();

  try {
    const response = await axios.post<VerifyQualityApiResponse>(
      `${API_BASE_URL}/verify-quality`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...headers,
        },
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
      throw new Error(detail || 'Unable to verify food quality right now.');
    }
    throw new Error('Unable to verify food quality right now.');
  }
};

export const verifyQualityPreviewInApi = async (imageFile: File): Promise<VerifyQualityPreviewApiResponse> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  try {
    const response = await axios.post<VerifyQualityPreviewApiResponse>(
      `${API_BASE_URL}/verify-quality-preview`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
      throw new Error(detail || 'Unable to analyze this image now.');
    }
    throw new Error('Unable to analyze this image now.');
  }
};

export const generatePickupCodeInApi = async (foodId: string): Promise<PickupCodeResult> => {
  const headers = await getAuthHeaders();
  try {
    const response = await axios.post<PickupCodeResult>(
      `${API_BASE_URL}/api/foods/${encodeURIComponent(foodId)}/pickup-code`,
      undefined,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
      throw new Error(detail || 'Unable to generate pickup QR right now.');
    }
    throw new Error('Unable to generate pickup QR right now.');
  }
};

export const verifyPickupInApi = async (
  foodId: string,
  payload: { scannedPayload?: string; code?: string },
): Promise<VerifyPickupApiResponse> => {
  const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
  try {
    const response = await axios.post<VerifyPickupApiResponse>(
      `${API_BASE_URL}/api/foods/${encodeURIComponent(foodId)}/verify-pickup`,
      payload,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
      throw new Error(detail || 'Unable to verify pickup code.');
    }
    throw new Error('Unable to verify pickup code.');
  }
};
