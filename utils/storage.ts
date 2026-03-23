import { FoodListing, AppNotification, Rating } from '../types';

// ── User types ──
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'donor' | 'receiver';
}

// ── Keys ──
const KEYS = {
  FOODS: 'sustain_foods',
  USERS: 'sustain_users',
  CURRENT_USER: 'sustain_current_user',
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

// ── Users ──
export const getUsers = (): User[] => {
  try {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveUsers = (users: User[]): void => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const registerUser = (user: Omit<User, 'id'>): User | null => {
  const users = getUsers();
  if (users.find(u => u.email === user.email)) return null; // duplicate
  const newUser: User = { ...user, id: `user-${Date.now()}` };
  saveUsers([...users, newUser]);
  return newUser;
};

export const loginUser = (email: string, password: string): User | null => {
  const users = getUsers();
  return users.find(u => u.email === email && u.password === password) || null;
};

// ── Session ──
export const getCurrentUser = (): User | null => {
  try {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User): void => {
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
};

export const clearCurrentUser = (): void => {
  localStorage.removeItem(KEYS.CURRENT_USER);
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
  return { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) };
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
