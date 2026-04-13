
import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ViewType, UserRole, FoodListing, AppNotification, QualityCheckResult } from './types';
import DonorPage from './pages/DonorPage';
import ReceiverPage from './pages/ReceiverPage';
import MapView from './pages/MapView';
import ActivityView from './pages/ActivityView';
import ProfileView from './pages/ProfileView';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BottomNav from './components/BottomNav';
import RoleToggle from './components/RoleToggle';
import NotificationToast from './components/NotificationToast';
import AppPopupModal from './components/AppPopupModal';
import { useAuth } from './src/context/AuthContext';
import { APP_POPUP_EVENT, AppPopupPayload, showAppPopup } from './utils/popup';
import {
  saveFoods,
  saveNotifications,
  getNotifications, addNotification as addNotif, markAllNotificationsRead, markNotificationRead,
  checkAndUpdateExpiry,
  syncFoodsFromApi, syncNotificationsFromApi, createFoodInApi, updateFoodInApi, verifyQualityInApi,
  createNotificationInApi, markNotificationReadInApi, markAllNotificationsReadInApi,
} from './utils/storage';

const EXPIRY_DURATION = 5 * 60 * 60 * 1000; // 5 hours in ms
const LOCAL_LISTING_GRACE_MS = 10 * 60 * 1000;

type ClaimResult = { success: true } | { success: false; error: string };

const toTimestamp = (listing: FoodListing): number => {
  const value = Date.parse(listing.createdAt || listing.cookedAt || '');
  return Number.isFinite(value) ? value : 0;
};

const mergeListingsForUi = (localListings: FoodListing[], backendListings: FoodListing[]): FoodListing[] => {
  const backendById = new Map(backendListings.map((listing) => [listing.id, listing]));
  const now = Date.now();
  const merged: FoodListing[] = [...backendListings];

  for (const local of localListings) {
    if (backendById.has(local.id)) {
      continue;
    }

    const isRecentlyCreated = now - toTimestamp(local) <= LOCAL_LISTING_GRACE_MS;
    const isStillActive = local.status === 'available' || local.status === 'claimed';
    if (isRecentlyCreated && isStillActive) {
      merged.push(local);
    }
  }

  const deduped = new Map<string, FoodListing>();
  for (const listing of merged) {
    deduped.set(listing.id, listing);
  }

  return [...deduped.values()].sort((a, b) => toTimestamp(b) - toTimestamp(a));
};

const notificationTimestamp = (notification: AppNotification): number => {
  const value = Date.parse(notification.timestamp || '');
  return Number.isFinite(value) ? value : 0;
};

const mergeNotificationsForUi = (localNotifications: AppNotification[], backendNotifications: AppNotification[]): AppNotification[] => {
  const mergedById = new Map<string, AppNotification>();

  for (const notification of localNotifications) {
    mergedById.set(notification.id, notification);
  }

  for (const notification of backendNotifications) {
    const existing = mergedById.get(notification.id);
    if (!existing) {
      mergedById.set(notification.id, notification);
      continue;
    }

    mergedById.set(notification.id, {
      ...notification,
      ...existing,
      read: existing.read || notification.read,
    });
  }

  return [...mergedById.values()].sort((a, b) => notificationTimestamp(b) - notificationTimestamp(a));
};

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=600',
];

// Pre-seeded listings (used only on first load)
const SEED_LISTINGS: FoodListing[] = [
  {
    id: '1',
    title: 'Artisan Bread Basket',
    description: 'A mix of rustic sourdough loaves and crispy baguettes, baked fresh at 5 AM today.',
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Wild Flour Bakery', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100', rating: 4.8, verified: true },
    location: { address: 'T. Nagar, Chennai', lat: 13.0418, lng: 80.2341, distance: '0.4 km', distanceValue: 0.4 },
    cookedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    servings: 8, freshness: 'excellent', dietary: ['Vegan'], status: 'available', claimed: false,
  },
  {
    id: '2',
    title: 'Veggie Power Bowl',
    description: 'Healthy grain bowls with roasted sweet potato, kale, and chickpeas.',
    category: 'Prepared',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Green Leaf Cafe', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', rating: 4.6, verified: true },
    location: { address: 'Anna Nagar, Chennai', lat: 13.085, lng: 80.2101, distance: '1.2 km', distanceValue: 1.2 },
    cookedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    servings: 5, freshness: 'excellent', dietary: ['Vegan', 'Gluten-Free'], status: 'available', claimed: false,
  },
  {
    id: '3',
    title: 'Honeycrisp Apples',
    description: 'Crunchy, sweet organic apples. Great for a healthy snack.',
    category: 'Produce',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e470124239e?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1560806887-1e470124239e?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Market Fresh', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100', rating: 4.3, verified: false },
    location: { address: 'Adyar, Chennai', lat: 13.0063, lng: 80.2574, distance: '2.5 km', distanceValue: 2.5 },
    cookedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    servings: 12, freshness: 'good', dietary: ['Organic'], status: 'available', claimed: false,
  },
  {
    id: '4',
    title: 'Gourmet Pastry Box',
    description: "Croissants, muffins and cinnamon rolls from today's surplus.",
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Sugar & Spice', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100', rating: 4.9, verified: true },
    location: { address: 'Mylapore, Chennai', lat: 13.0339, lng: 80.2695, distance: '0.8 km', distanceValue: 0.8 },
    cookedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    servings: 6, freshness: 'good', dietary: ['Vegetarian'], status: 'available', claimed: false,
  },
  {
    id: '5',
    title: 'Dal & Rice Combo',
    description: 'Home-style yellow dal with steamed basmati rice, serves 4.',
    category: 'Prepared',
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Annapurna Kitchen', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100', rating: 4.7, verified: true },
    location: { address: 'Velachery, Chennai', lat: 12.9815, lng: 80.218, distance: '0.6 km', distanceValue: 0.6 },
    cookedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + EXPIRY_DURATION - 45 * 60 * 1000).toISOString(),
    servings: 4, freshness: 'excellent', dietary: ['Vegan', 'Nut-Free'], status: 'available', claimed: false,
  },
];

const App: React.FC = () => {
  const { user: currentUser, isAuthLoading, signIn, signUp, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [userRole, setUserRole] = useState<UserRole>('donor');
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [activePopup, setActivePopup] = useState<AppPopupPayload | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFromBackend = useCallback(async () => {
    try {
      const [foods, notifs] = await Promise.all([
        syncFoodsFromApi(),
        syncNotificationsFromApi(),
      ]);
      setListings((prev) => {
        const merged = mergeListingsForUi(prev, foods);
        saveFoods(merged);
        return merged;
      });
      setNotifications((prev) => {
        const merged = mergeNotificationsForUi(prev, notifs);
        saveNotifications(merged);
        return merged;
      });
    } catch {
      // Keep local state if backend is unreachable.
    }
  }, []);

  // --- Initialize: load user, seed data, check expiry ---
  useEffect(() => {
    const isDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    setDarkMode(storedTheme ? storedTheme === 'dark' : isDark);

    // Check expiry
    const foods = checkAndUpdateExpiry();
    setListings(foods);

    // Load notifications
    setNotifications(getNotifications());

    // Pull latest backend state if available
    refreshFromBackend();

    setIsLoading(false);
  }, [refreshFromBackend]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshFromBackend();
    }, 20000);
    return () => clearInterval(interval);
  }, [refreshFromBackend]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePopupEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AppPopupPayload>;
      if (!customEvent.detail?.message) {
        return;
      }
      setActivePopup(customEvent.detail);
    };

    window.addEventListener(APP_POPUP_EVENT, handlePopupEvent as EventListener);
    return () => {
      window.removeEventListener(APP_POPUP_EVENT, handlePopupEvent as EventListener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (currentUser) {
      setUserRole(currentUser.role === 'donor' ? 'donor' : 'receiver');
    }
  }, [currentUser]);

  // --- 5-hour expiry: check every 30 seconds ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setListings(prev => {
        let changed = false;
        const updated = prev.map(l => {
          if (l.status === 'available') {
            const createdTime = new Date(l.createdAt || l.cookedAt).getTime();
            if (now - createdTime >= EXPIRY_DURATION) {
              changed = true;
              const notif = addNotif({
                type: 'expired',
                title: 'Listing Expired',
                message: `"${l.title}" has expired.`,
                relatedListingId: l.id,
              });
              const localNotifications = getNotifications();
              setNotifications(localNotifications);
              void createNotificationInApi(notif).catch(() => {
                // Keep local notification even if backend write fails.
              });
              setActiveToast(notif);
              return { ...l, status: 'expired' as const };
            }
          }
          return l;
        });
        if (changed) {
          saveFoods(updated);
          return updated;
        }
        return prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- Unread count ---
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // --- Notification helper ---
  const pushNotification = useCallback((partial: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const notif = addNotif(partial);
    const localNotifications = getNotifications();
    setNotifications(localNotifications);
    setActiveToast(notif);
    void createNotificationInApi(notif).catch(() => {
      // Keep local notification even if backend write fails.
    });
  }, []);

  const markAllRead = useCallback(() => {
    markAllNotificationsRead();
    setNotifications(getNotifications());
    void markAllNotificationsReadInApi().catch(() => {
      // Local update already applied.
    });
  }, []);

  // --- Auth handlers ---
  const handleLogin = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await signIn(email, password);
    if (result.success) {
      setActiveView('home');
    }
    return result;
  }, [signIn]);

  const handleSignup = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await signUp(name, email, password, role);
    if (result.success) {
      setActiveView('home');
    }
    return result;
  }, [signUp]);

  const handleLogout = useCallback(async () => {
    await signOut();
    setActiveView('login');
  }, [signOut]);

  // --- Donor submits ---
  const handleNewDonation = useCallback(async (donation: {
    foodName: string;
    description: string;
    category: string;
    servings: string;
    location: string;
    lat: number;
    lng: number;
    imageFile: File;
    imagePreviewUrl: string | null;
  }): Promise<QualityCheckResult | null> => {
    const randomImg = FOOD_IMAGES[Math.floor(Math.random() * FOOD_IMAGES.length)];
    const imgUrl = donation.imagePreviewUrl || randomImg;
    const now = new Date();

    const newListing: FoodListing = {
      id: `user-${Date.now()}`,
      title: donation.foodName,
      description: donation.description || `Fresh ${donation.foodName} available for pickup.`,
      category: donation.category as any,
      imageUrl: imgUrl,
      thumbnailUrl: imgUrl,
      donor: {
        name: currentUser?.name || 'Anonymous Donor',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
        rating: 5,
        verified: true,
      },
      location: {
        address: donation.location,
        lat: donation.lat,
        lng: donation.lng,
        distance: '0.0 km away',
        distanceValue: 0,
      },
      cookedAt: now.toISOString(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + EXPIRY_DURATION).toISOString(),
      servings: Number.parseInt(donation.servings, 10) || 4,
      freshness: 'excellent',
      isVerified: false,
      qualityLabel: null,
      qualityConfidence: null,
      dietary: [],
      status: 'available',
      claimed: false,
      donorEmail: currentUser?.email,
      donorId: currentUser?.id,
    };

    setListings((prev) => {
      const updated = [newListing, ...prev.filter((item) => item.id !== newListing.id)];
      saveFoods(updated);
      return updated;
    });

    try {
      const created = await createFoodInApi(newListing);
      if (created) {
        setListings((prev) => {
          const updated = [created, ...prev.filter((item) => item.id !== created.id)];
          saveFoods(updated);
          return updated;
        });
      }
      void refreshFromBackend();
    } catch {
      // Keep local UX responsive even if backend is temporarily unavailable.
    }

    let qualityResult: QualityCheckResult | null = null;
    try {
      const response = await verifyQualityInApi(newListing.id, donation.imageFile);
      qualityResult = {
        freshness: response.quality.freshness,
        confidence: response.quality.confidence,
        isVerified: response.quality.isVerified,
      };

      setListings(prev => {
        const freshnessMap: Record<string, FoodListing['freshness']> = {
          Fresh: 'excellent',
          Questionable: 'good',
          Spoiled: 'fair',
        };
        const updated = prev.map(item => item.id === newListing.id ? {
          ...item,
          isVerified: qualityResult?.isVerified ?? false,
          qualityLabel: qualityResult?.freshness ?? null,
          qualityConfidence: qualityResult?.confidence ?? null,
          freshness: freshnessMap[qualityResult?.freshness ?? 'Questionable'],
        } : item);
        saveFoods(updated);
        return updated;
      });
    } catch {
      // Listing stays unverified if AI service fails.
    }

    pushNotification({
      type: 'donation_posted',
      title: 'Donation Posted! 🎉',
      message: `"${donation.foodName}" is now live. Receivers nearby will be notified.`,
      relatedListingId: newListing.id,
    });
    return qualityResult;
  }, [pushNotification, currentUser, refreshFromBackend]);

  // --- Receiver claims (race-condition safe) ---
  const handleClaimListing = useCallback(async (id: string): Promise<ClaimResult> => {
    const listing = listings.find(l => l.id === id);
    if (!listing) {
      return { success: false, error: 'Listing not found.' };
    }

    // Validate: must be available and not expired
    if (listing.status !== 'available') {
      return { success: false, error: 'This listing is no longer available.' };
    }
    if (Date.now() >= new Date(listing.expiresAt).getTime()) {
      return { success: false, error: 'This listing has already expired.' };
    }

    const actorEmail = (currentUser?.email || '').trim().toLowerCase();
    const listingDonorEmail = (listing.donorEmail || '').trim().toLowerCase();
    const actorId = currentUser?.id || '';
    const listingDonorId = listing.donorId || '';

    if ((listingDonorEmail && actorEmail && listingDonorEmail === actorEmail) || (listingDonorId && actorId && listingDonorId === actorId)) {
      return { success: false, error: 'You cannot claim your own donation. Use a separate receiver account for demo.' };
    }

    try {
      const updatedFromApi = await updateFoodInApi(id, {
        status: 'claimed',
        claimed: true,
        claimedBy: currentUser?.email || 'unknown',
      });

      setListings((prev) => {
        const updated = prev.map((item) => item.id === id ? updatedFromApi : item);
        saveFoods(updated);
        return updated;
      });

      void refreshFromBackend();

      pushNotification({
        type: 'claimed',
        title: 'Food Claimed! 🙌',
        message: `"${listing.title}" was claimed successfully. Head to ${listing.location.address} for pickup.`,
        relatedListingId: id,
      });
      return { success: true };
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Unable to claim this listing right now.';
      let parsedMessage = rawMessage;
      try {
        const parsed = JSON.parse(rawMessage) as { detail?: string };
        if (parsed?.detail) {
          parsedMessage = parsed.detail;
        }
      } catch {
        // Keep original raw message.
      }

      const normalized = parsedMessage.toLowerCase();
      if (normalized.includes('donor cannot claim own listing')) {
        return { success: false, error: 'You cannot claim your own donation. Use a separate receiver account for demo.' };
      }
      if (normalized.includes('not available')) {
        return { success: false, error: 'This listing was already claimed by someone else.' };
      }
      if (normalized.includes('unauthorized') || normalized.includes('401')) {
        return { success: false, error: 'Session expired. Please sign in again.' };
      }
      return { success: false, error: parsedMessage || 'Unable to claim this listing right now.' };
    }
  }, [listings, pushNotification, currentUser, refreshFromBackend]);

  // --- Pickup confirmed (mark as completed only after secure verification) ---
  const handlePickupConfirmed = useCallback((id: string) => {
    const listing = listings.find(l => l.id === id);
    setListings((prev) => {
      const updated = prev.map((item) => item.id === id ? { ...item, status: 'completed' } : item);
      saveFoods(updated);
      return updated;
    });
    void refreshFromBackend();

    if (listing) {
      pushNotification({
        type: 'pickup_confirmed',
        title: 'Pickup Complete! ✅',
        message: `"${listing.title}" has been picked up successfully. Thank you for reducing food waste!`,
        relatedListingId: id,
      });
    }
  }, [listings, pushNotification, refreshFromBackend]);

  const effectiveUserRole: UserRole = currentUser?.role === 'donor' ? userRole : 'receiver';
  const showRoleToggle = activeView === 'home' && currentUser?.role === 'donor';

  // --- Loading ---
  if (isLoading || isAuthLoading) {
    return (
      <div className="h-screen w-full max-w-md mx-auto flex items-center justify-center bg-ios-lightBg dark:bg-ios-darkBg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-3 border-ios-blue/30 border-t-ios-blue rounded-full"
        />
      </div>
    );
  }

  // --- Auth screens ---
  if (!currentUser) {
    if (activeView === 'signup') {
      return <SignupPage onSignup={handleSignup} onGoToLogin={() => setActiveView('login')} />;
    }
    return <LoginPage onLogin={handleLogin} onGoToSignup={() => setActiveView('signup')} />;
  }

  return (
    <div className="relative h-screen w-full max-w-md mx-auto overflow-hidden bg-ios-lightBg dark:bg-ios-darkBg text-black dark:text-white flex flex-col selection:bg-ios-blue/30">

      {/* Notification Toast */}
      <AppPopupModal
        popup={activePopup}
        onClose={() => setActivePopup(null)}
      />

      <NotificationToast
        notification={activeToast}
        onDismiss={() => setActiveToast(null)}
      />

      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-[10%] -left-[10%] w-[100%] h-[60%] blur-[100px] rounded-full transition-colors duration-700 ${effectiveUserRole === 'donor'
          ? 'bg-emerald-500/10 dark:bg-emerald-500/5'
          : 'bg-ios-blue/10 dark:bg-ios-blue/5'
          }`} />
        <div className={`absolute bottom-[5%] -right-[15%] w-[90%] h-[70%] blur-[100px] rounded-full transition-colors duration-700 ${effectiveUserRole === 'donor'
          ? 'bg-ios-systemGreen/10 dark:bg-ios-systemGreen/5'
          : 'bg-violet-500/10 dark:bg-violet-500/5'
          }`} />
      </div>

      {/* Top Section: Toggle */}
      {showRoleToggle && (
        <div className="relative z-20 pt-12 pb-3">
          <div className="px-5">
            <RoleToggle
              role={effectiveUserRole}
              onRoleChange={(nextRole) => {
                if (currentUser?.role === 'donor') {
                  setUserRole(nextRole);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeView === 'home' ? `home-${effectiveUserRole}` : activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            {activeView === 'home' && effectiveUserRole === 'donor' && (
              <DonorPage
                listings={listings}
                currentUserEmail={currentUser?.email || ''}
                onDonate={handleNewDonation}
                onRefresh={refreshFromBackend}
              />
            )}
            {activeView === 'home' && effectiveUserRole === 'receiver' && (
              <ReceiverPage
                listings={listings}
                onClaim={handleClaimListing}
                onPickupConfirmed={handlePickupConfirmed}
                onFeedbackSubmitted={refreshFromBackend}
                currentUserEmail={currentUser?.email || ''}
                currentUserId={currentUser?.id || ''}
              />
            )}
            {activeView === 'map' && (
              <MapView
                listings={listings.filter(l => l.status === 'available')}
                onClaim={(id: string) => {
                  void handleClaimListing(id).then((result) => {
                    if (!result.success) {
                      showAppPopup({
                        title: 'Unable to claim',
                        message: result.error,
                        tone: 'error',
                      });
                    }
                  });
                }}
              />
            )}
            {activeView === 'activity' && (
              <ActivityView
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onMarkRead={(id: string) => {
                  markNotificationRead(id);
                  setNotifications(getNotifications());
                  void markNotificationReadInApi(id).catch(() => {
                    // Local update already applied.
                  });
                }}
              />
            )}
            {activeView === 'profile' && (
              <ProfileView
                darkMode={darkMode}
                onToggleTheme={() => setDarkMode(!darkMode)}
                currentUser={currentUser}
                listings={listings}
                onLogout={handleLogout}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        userRole={effectiveUserRole}
        notificationCount={unreadCount}
      />
    </div>
  );
};

export default App;
