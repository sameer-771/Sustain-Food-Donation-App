
import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ViewType, UserRole, FoodListing, AppNotification } from './types';
import DonorPage from './pages/DonorPage';
import ReceiverPage from './pages/ReceiverPage';
import MapView from './pages/MapView';
import ActivityView from './pages/ActivityView';
import ProfileView from './pages/ProfileView';
import BottomNav from './components/BottomNav';
import LiveImpactTicker from './components/LiveImpactTicker';
import RoleToggle from './components/RoleToggle';
import NotificationToast from './components/NotificationToast';

const EXPIRY_DURATION = 5 * 60 * 60 * 1000; // 5 hours in ms

// Pre-seeded listings
const INITIAL_LISTINGS: FoodListing[] = [
  {
    id: '1',
    title: 'Artisan Bread Basket',
    description: 'A mix of rustic sourdough loaves and crispy baguettes, baked fresh at 5 AM today.',
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Wild Flour Bakery', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100', rating: 4.8, verified: true },
    location: { address: '123 Baker St, Downtown', lat: 40.712, lng: -74.006, distance: '0.4 mi', distanceValue: 0.4 },
    cookedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    servings: 8, freshness: 'excellent', dietary: ['Vegan'], claimed: false,
  },
  {
    id: '2',
    title: 'Veggie Power Bowl',
    description: 'Healthy grain bowls with roasted sweet potato, kale, and chickpeas.',
    category: 'Prepared',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Green Leaf Cafe', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', rating: 4.6, verified: true },
    location: { address: '456 Oak Ave, Westside', lat: 40.715, lng: -74.010, distance: '1.2 mi', distanceValue: 1.2 },
    cookedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    servings: 5, freshness: 'excellent', dietary: ['Vegan', 'Gluten-Free'], claimed: false,
  },
  {
    id: '3',
    title: 'Honeycrisp Apples',
    description: 'Crunchy, sweet organic apples. Great for a healthy snack.',
    category: 'Produce',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e470124239e?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1560806887-1e470124239e?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Market Fresh', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100', rating: 4.3, verified: false },
    location: { address: '789 Elm Blvd, East Quarter', lat: 40.710, lng: -74.002, distance: '2.5 mi', distanceValue: 2.5 },
    cookedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + EXPIRY_DURATION - 5 * 60 * 60 * 1000).toISOString(),
    servings: 12, freshness: 'good', dietary: ['Organic'], claimed: false,
  },
  {
    id: '4',
    title: 'Gourmet Pastry Box',
    description: "Croissants, muffins and cinnamon rolls from today's surplus.",
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Sugar & Spice', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100', rating: 4.9, verified: true },
    location: { address: '321 Pine Rd, North Village', lat: 40.718, lng: -74.008, distance: '0.8 mi', distanceValue: 0.8 },
    cookedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    servings: 6, freshness: 'good', dietary: ['Vegetarian'], claimed: false,
  },
  {
    id: '5',
    title: 'Dal & Rice Combo',
    description: 'Home-style yellow dal with steamed basmati rice, serves 4.',
    category: 'Prepared',
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=300',
    donor: { name: 'Annapurna Kitchen', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100', rating: 4.7, verified: true },
    location: { address: '654 Cedar Ln, Riverside', lat: 40.713, lng: -74.004, distance: '0.6 mi', distanceValue: 0.6 },
    cookedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + EXPIRY_DURATION - 45 * 60 * 1000).toISOString(),
    servings: 4, freshness: 'excellent', dietary: ['Vegan', 'Nut-Free'], claimed: false,
  },
];

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=600',
];

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [userRole, setUserRole] = useState<UserRole>('donor');
  const [listings, setListings] = useState<FoodListing[]>(INITIAL_LISTINGS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- Theme & role persistence ---
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem('theme');
    setDarkMode(storedTheme ? storedTheme === 'dark' : isDark);
    const storedRole = localStorage.getItem('userRole') as UserRole | null;
    if (storedRole) setUserRole(storedRole);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('userRole', userRole);
  }, [userRole]);

  // --- 5-hour expiry: check every 30 seconds, remove expired unclaimed items ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setListings(prev => {
        const expired = prev.filter(l => !l.claimed && new Date(l.expiresAt).getTime() <= now);
        if (expired.length > 0) {
          expired.forEach(item => {
            pushNotification({
              type: 'expired',
              title: 'Listing Expired',
              message: `"${item.title}" has expired and been removed.`,
              relatedListingId: item.id,
            });
          });
          return prev.filter(l => l.claimed || new Date(l.expiresAt).getTime() > now);
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

  // --- Notification helpers ---
  const pushNotification = useCallback((partial: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const notif: AppNotification = {
      ...partial,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev]);
    setActiveToast(notif);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // --- Donor submits ---
  const handleNewDonation = useCallback((donation: {
    foodName: string;
    description: string;
    category: string;
    servings: string;
    location: string;
    imagePreviewUrl: string | null;
    freshness: string | null;
  }) => {
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
        name: 'You',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
        rating: 5.0,
        verified: true,
      },
      location: {
        address: donation.location || 'Your Location',
        lat: 40.7128,
        lng: -74.006,
        distance: '0.1 mi',
        distanceValue: 0.1,
      },
      cookedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + EXPIRY_DURATION).toISOString(),
      servings: parseInt(donation.servings) || 4,
      freshness: (donation.freshness as any) || 'excellent',
      dietary: [],
      claimed: false,
    };

    setListings(prev => [newListing, ...prev]);

    pushNotification({
      type: 'donation_posted',
      title: 'Donation Posted! 🎉',
      message: `"${donation.foodName}" is now live. Receivers nearby will be notified. Timer: 5 hours.`,
      relatedListingId: newListing.id,
    });
  }, [pushNotification]);

  // --- Receiver claims ---
  const handleClaimListing = useCallback((id: string) => {
    const listing = listings.find(l => l.id === id);
    setListings(prev => prev.map(l => l.id === id ? { ...l, claimed: true, claimedBy: 'Receiver' } : l));

    if (listing) {
      // Notification for the donor
      pushNotification({
        type: 'claimed',
        title: 'Someone claimed your food! 🙌',
        message: `"${listing.title}" was claimed by a receiver. They're on their way to ${listing.location.address}.`,
        relatedListingId: id,
      });
    }
  }, [listings, pushNotification]);

  // --- Pickup confirmed ---
  const handlePickupConfirmed = useCallback((id: string) => {
    const listing = listings.find(l => l.id === id);
    // Remove from active listings
    setListings(prev => prev.filter(l => l.id !== id));

    if (listing) {
      pushNotification({
        type: 'pickup_confirmed',
        title: 'Pickup Complete! ✅',
        message: `"${listing.title}" has been picked up successfully. Thank you for reducing food waste!`,
        relatedListingId: id,
      });
    }
  }, [listings, pushNotification]);

  const showRoleToggle = activeView === 'home';

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

      {/* Top Section: Ticker + Toggle */}
      {showRoleToggle && (
        <div className="relative z-20 pt-12 pb-3 space-y-4">
          <LiveImpactTicker />
          <div className="px-5">
            <RoleToggle role={userRole} onRoleChange={setUserRole} />
          </div>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 relative z-10 overflow-hidden">
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
              <DonorPage onDonate={handleNewDonation} />
            )}
            {activeView === 'home' && userRole === 'receiver' && (
              <ReceiverPage
                listings={listings}
                onClaim={handleClaimListing}
                onPickupConfirmed={handlePickupConfirmed}
              />
            )}
            {activeView === 'map' && <MapView />}
            {activeView === 'activity' && (
              <ActivityView
                notifications={notifications}
                onMarkAllRead={markAllRead}
              />
            )}
            {activeView === 'profile' && (
              <ProfileView darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
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
