
export type UserRole = 'donor' | 'receiver';

export type ViewType = 'home' | 'map' | 'activity' | 'profile' | 'login' | 'signup';

export type FoodCategory = 'Produce' | 'Prepared' | 'Bakery' | 'Dairy' | 'Beverages' | 'Other';

export type FreshnessLevel = 'excellent' | 'good' | 'fair';

export type FoodStatus = 'available' | 'claimed' | 'expired';

export interface DonationItem {
  id: string;
  title: string;
  description: string;
  donor: string;
  distance: string;
  timeLeft: string;
  category: FoodCategory;
  imageUrl: string;
}

export interface FoodListing {
  id: string;
  title: string;
  description: string;
  category: FoodCategory;
  imageUrl: string;
  thumbnailUrl: string;
  donor: {
    name: string;
    avatar: string;
    rating: number;
    verified: boolean;
  };
  location: {
    address: string;
    lat: number;
    lng: number;
    distance: string; // e.g. "0.4 mi"
    distanceValue: number; // numeric for sorting
  };
  cookedAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  servings: number;
  freshness: FreshnessLevel;
  dietary: string[]; // e.g. ['Vegan', 'Gluten-Free']
  status: FoodStatus;
  claimed: boolean; // kept for backward compat
  claimedBy?: string;
  donorEmail?: string; // to track who posted
}

export interface ImpactStats {
  mealsSavedToday: number;
  kgSaved: number;
  activeDonors: number;
  peopleFed: number;
}

export interface AppNotification {
  id: string;
  type: 'claimed' | 'expired' | 'donation_posted' | 'pickup_confirmed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedListingId?: string;
  icon?: string;
}
