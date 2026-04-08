
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
import {
  getFoods, saveFoods, addFood, updateFood,
  getCurrentUser, setCurrentUser, clearCurrentUser,
  loginUser, registerUser,
  getNotifications, addNotification as addNotif, markAllNotificationsRead, markNotificationRead,
  checkAndUpdateExpiry, isSeeded, markSeeded,
  syncFoodsFromApi, syncNotificationsFromApi, createFoodInApi, updateFoodInApi, verifyQualityInApi,
  User,
} from './utils/storage';

const EXPIRY_DURATION = 5 * 60 * 60 * 1000; // 5 hours in ms

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
    location: { address: 'Anna Nagar, Chennai', lat: 13.0850, lng: 80.2101, distance: '1.2 km', distanceValue: 1.2 },
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
    location: { address: 'Velachery, Chennai', lat: 12.9815, lng: 80.2180, distance: '0.6 km', distanceValue: 0.6 },
    cookedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + EXPIRY_DURATION - 45 * 60 * 1000).toISOString(),
    servings: 4, freshness: 'excellent', dietary: ['Vegan', 'Nut-Free'], status: 'available', claimed: false,
  },
];

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('donor');
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFromBackend = useCallback(async () => {
    try {
      const [foods, notifs] = await Promise.all([
        syncFoodsFromApi(),
        syncNotificationsFromApi(),
      ]);
      setListings(foods);
      setNotifications(notifs);
    } catch {
      // Keep local state if backend is unreachable.
    }
  }, []);

  // --- Initialize: load user, seed data, check expiry ---
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    setDarkMode(storedTheme ? storedTheme === 'dark' : isDark);

    // Seed data on first load
    if (!isSeeded()) {
      saveFoods(SEED_LISTINGS);
      markSeeded();
    }

    // Check expiry
    const foods = checkAndUpdateExpiry();
    setListings(foods);

    // Load notifications
    setNotifications(getNotifications());

    // Pull latest backend state if available
    refreshFromBackend();

    // Check logged-in user
    const user = getCurrentUser();
    if (user) {
      setCurrentUserState(user);
      setUserRole(user.role);
    }

    setIsLoading(false);
  }, [refreshFromBackend]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (currentUser) {
      setUserRole(currentUser.role);
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
              setNotifications(getNotifications());
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
    setNotifications(getNotifications());
    setActiveToast(notif);
  }, []);

  const markAllRead = useCallback(() => {
    markAllNotificationsRead();
    setNotifications(getNotifications());
  }, []);

  // --- Auth handlers ---
  const handleLogin = useCallback((email: string, password: string): { success: boolean; error?: string } => {
    const user = loginUser(email, password);
    if (user) {
      setCurrentUser(user);
      setCurrentUserState(user);
      setUserRole(user.role);
      setActiveView('home');
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password' };
  }, []);

  const handleSignup = useCallback((name: string, email: string, password: string, role: UserRole): { success: boolean; error?: string } => {
    const user = registerUser({ name, email, password, role });
    if (user) {
      setCurrentUser(user);
      setCurrentUserState(user);
      setUserRole(user.role);
      setActiveView('home');
      return { success: true };
    }
    return { success: false, error: 'An account with this email already exists' };
  }, []);

  const handleLogout = useCallback(() => {
    clearCurrentUser();
    setCurrentUserState(null);
    setActiveView('login');
  }, []);

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
        rating: 5.0,
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
      servings: parseInt(donation.servings) || 4,
      freshness: 'excellent',
      isVerified: false,
      qualityLabel: null,
      qualityConfidence: null,
      dietary: [],
      status: 'available',
      claimed: false,
      donorEmail: currentUser?.email,
    };

    const updatedFoods = addFood(newListing);
    setListings(updatedFoods);

    try {
      await createFoodInApi(newListing);
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
  }, [pushNotification, currentUser]);

  // --- Receiver claims (race-condition safe) ---
  const handleClaimListing = useCallback((id: string): boolean => {
    // Re-read from localStorage for atomic validation
    const freshFoods = getFoods();
    const listing = freshFoods.find(l => l.id === id);
    if (!listing) return false;

    // Validate: must be available and not expired
    if (listing.status !== 'available') return false;
    if (Date.now() >= new Date(listing.expiresAt).getTime()) return false;

    const updated = updateFood(id, { status: 'claimed', claimed: true, claimedBy: currentUser?.email || 'unknown' });
    setListings(updated);

    updateFoodInApi(id, { status: 'claimed', claimed: true, claimedBy: currentUser?.email || 'unknown' }).catch(() => {
      // Keep local UX responsive even if backend is temporarily unavailable.
    });

    pushNotification({
      type: 'claimed',
      title: 'Food Claimed! 🙌',
      message: `"${listing.title}" was claimed successfully. Head to ${listing.location.address} for pickup.`,
      relatedListingId: id,
    });
    return true;
  }, [pushNotification, currentUser]);

  // --- Pickup confirmed (mark as completed only after secure verification) ---
  const handlePickupConfirmed = useCallback((id: string) => {
    const listing = listings.find(l => l.id === id);
    const updated = updateFood(id, { status: 'completed' });
    setListings(updated);

    updateFoodInApi(id, { status: 'completed' }).catch(() => {
      // Keep local UX responsive even if backend is temporarily unavailable.
    });

    if (listing) {
      pushNotification({
        type: 'pickup_confirmed',
        title: 'Pickup Complete! ✅',
        message: `"${listing.title}" has been picked up successfully. Thank you for reducing food waste!`,
        relatedListingId: id,
      });
    }
  }, [listings, pushNotification]);

  const showRoleToggle = activeView === 'home' && currentUser;

  // --- Loading ---
  if (isLoading) {
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
      <NotificationToast
        notification={activeToast}
        onDismiss={() => setActiveToast(null)}
      />

      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-[10%] -left-[10%] w-[100%] h-[60%] blur-[100px] rounded-full transition-colors duration-700 ${userRole === 'donor'
          ? 'bg-emerald-500/10 dark:bg-emerald-500/5'
          : 'bg-ios-blue/10 dark:bg-ios-blue/5'
          }`} />
        <div className={`absolute bottom-[5%] -right-[15%] w-[90%] h-[70%] blur-[100px] rounded-full transition-colors duration-700 ${userRole === 'donor'
          ? 'bg-ios-systemGreen/10 dark:bg-ios-systemGreen/5'
          : 'bg-violet-500/10 dark:bg-violet-500/5'
          }`} />
      </div>

      {/* Top Section: Toggle */}
      {showRoleToggle && (
        <div className="relative z-20 pt-12 pb-3">
          <div className="px-5">
            <RoleToggle role={userRole} onRoleChange={setUserRole} />
          </div>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeView === 'home' ? `home-${userRole}` : activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            {activeView === 'home' && userRole === 'donor' && (
              <DonorPage
                listings={listings}
                currentUserEmail={currentUser?.email || ''}
                onDonate={handleNewDonation}
                onRefresh={refreshFromBackend}
              />
            )}
            {activeView === 'home' && userRole === 'receiver' && (
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
                onClaim={handleClaimListing}
              />
            )}
            {activeView === 'activity' && (
              <ActivityView
                notifications={notifications}
                onMarkAllRead={markAllRead}
                onMarkRead={(id: string) => {
                  markNotificationRead(id);
                  setNotifications(getNotifications());
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
        userRole={userRole}
        notificationCount={unreadCount}
      />
    </div>
  );
};

export default App;
