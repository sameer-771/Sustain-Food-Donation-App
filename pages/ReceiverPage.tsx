import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, MapPin, ArrowUpDown, X, PackageX, LocateFixed, AlertCircle } from 'lucide-react';
import { FoodListing, FoodCategory } from '../types';
import FoodCard from '../components/FoodCard';
import PickupModal from '../components/PickupModal.tsx';
import QrScannerModal from '../components/QrScannerModal';
import RatingModal from '../components/RatingModal';
import { saveRatingToApi, hasRatedInApi, verifyPickupInApi } from '../utils/storage';
import { Coordinates, formatDistanceKm, getCurrentLocation, haversineDistanceKm, watchCurrentLocation } from '../utils/location';

const CATEGORIES: (FoodCategory | 'All')[] = ['All', 'Prepared', 'Bakery', 'Produce', 'Dairy', 'Beverages'];
type SortMode = 'nearest' | 'freshest';
type LocationStatus = 'idle' | 'loading' | 'ready' | 'error';
const DISTANCE_HYSTERESIS_KM = 0.2;

interface ReceiverPageProps {
  listings: FoodListing[];
  onClaim: (id: string) => boolean;
  onPickupConfirmed: (id: string) => void;
  onFeedbackSubmitted?: () => Promise<void>;
  currentUserEmail: string;
  currentUserId: string;
}

const ReceiverPage: React.FC<ReceiverPageProps> = ({ listings, onClaim, onPickupConfirmed, onFeedbackSubmitted, currentUserEmail, currentUserId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FoodCategory | 'All'>('All');
  const [sortMode, setSortMode] = useState<SortMode>('nearest');
  const [showFilters, setShowFilters] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [receiverLocation, setReceiverLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationError, setLocationError] = useState('');

  // State-based overlays: only one active at a time
  const [pickupListingId, setPickupListingId] = useState<string | null>(null);
  const [scannerListingId, setScannerListingId] = useState<string | null>(null);
  const [ratingListingId, setRatingListingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const refreshCurrentLocation = useCallback(async () => {
    setLocationStatus('loading');
    setLocationError('');
    try {
      const location = await getCurrentLocation();
      setReceiverLocation(location);
      setLocationStatus('ready');
    } catch (error) {
      setLocationStatus('error');
      setLocationError(error instanceof Error ? error.message : 'Unable to fetch your location.');
    }
  }, []);

  useEffect(() => {
    refreshCurrentLocation();
  }, [refreshCurrentLocation]);

  useEffect(() => {
    const stopWatching = watchCurrentLocation(
      (location) => {
        setReceiverLocation(location);
        setLocationStatus('ready');
        setLocationError('');
      },
      (error) => {
        setLocationStatus('error');
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000,
      },
    );

    return () => {
      stopWatching();
    };
  }, []);

  const listingsWithDistance = useMemo(() => {
    return listings.map((listing) => {
      if (!receiverLocation) {
        return listing;
      }

      const hasValidCoordinates = Number.isFinite(listing.location.lat) && Number.isFinite(listing.location.lng);
      if (!hasValidCoordinates) {
        return {
          ...listing,
          location: {
            ...listing.location,
            distance: 'Location unavailable',
            distanceValue: Number.POSITIVE_INFINITY,
          },
        };
      }

      const distanceKm = haversineDistanceKm(receiverLocation, {
        lat: listing.location.lat,
        lng: listing.location.lng,
      });

      return {
        ...listing,
        location: {
          ...listing.location,
          distance: formatDistanceKm(distanceKm),
          distanceValue: distanceKm,
        },
      };
    });
  }, [listings, receiverLocation]);

  // Strict feed filtering
  const filtered = useMemo(() => {
    let result = listingsWithDistance.filter((listing) => {
      if (listing.status === 'available') return true;
      if (listing.status === 'claimed' && listing.claimedBy === currentUserEmail) return true;
      return false;
    });

    if (activeCategory !== 'All') {
      result = result.filter((listing) => listing.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((listing) =>
        listing.title.toLowerCase().includes(q)
        || listing.donor.name.toLowerCase().includes(q)
        || listing.category.toLowerCase().includes(q)
        || listing.location.address.toLowerCase().includes(q)
        || listing.dietary.some((diet) => diet.toLowerCase().includes(q)),
      );
    }

    if (receiverLocation) {
      result = result.filter((listing) => listing.location.distanceValue <= (maxDistance + DISTANCE_HYSTERESIS_KM));
    }

    if (sortMode === 'nearest') {
      result.sort((a, b) => a.location.distanceValue - b.location.distanceValue);
    } else {
      result.sort((a, b) => new Date(b.cookedAt).getTime() - new Date(a.cookedAt).getTime());
    }

    return result;
  }, [listingsWithDistance, activeCategory, searchQuery, sortMode, maxDistance, currentUserEmail, receiverLocation]);

  // Claim handler with loading state and debounce
  const handleClaim = useCallback((id: string) => {
    if (claimingId) return; // Prevent double-tap
    setClaimingId(id);

    setTimeout(() => {
      const success = onClaim(id);
      if (success) {
        setPickupListingId(id);
      }
      setClaimingId(null);
    }, 300);
  }, [claimingId, onClaim]);

  // View pickup for already-claimed items
  const handleViewPickup = useCallback((id: string) => {
    setPickupListingId(id);
  }, []);

  // Begin secure pickup verification by opening scanner.
  const handlePickupConfirmed = useCallback((id: string) => {
    setScannerListingId(id);
  }, []);

  const handleVerifyPickup = useCallback(async (payload: { scannedPayload?: string; code?: string }) => {
    if (!scannerListingId) return;

    await verifyPickupInApi(scannerListingId, payload);
    onPickupConfirmed(scannerListingId);
    setPickupListingId(null);
    setScannerListingId(null);

    const alreadyRated = await hasRatedInApi(scannerListingId, currentUserId).catch(() => false);
    if (!alreadyRated) {
      setTimeout(() => setRatingListingId(scannerListingId), 350);
    }
  }, [scannerListingId, onPickupConfirmed, currentUserId]);

  // Rating handlers
  const handleRatingSubmit = useCallback(async (rating: number, feedback: string) => {
    if (!ratingListingId) return;
    try {
      await saveRatingToApi({
        listingId: ratingListingId,
        userId: currentUserId,
        rating,
        feedback: feedback || undefined,
        timestamp: new Date().toISOString(),
      });
      if (onFeedbackSubmitted) {
        await onFeedbackSubmitted();
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('409')) {
        alert('You already submitted a rating for this listing.');
        setRatingListingId(null);
        return;
      }
      alert('Could not submit rating right now. Please ensure backend is running and try again.');
      return;
    }
    setRatingListingId(null);
  }, [ratingListingId, currentUserId, onFeedbackSubmitted]);

  const handleRatingSkip = useCallback(() => {
    setRatingListingId(null);
  }, []);

  // Resolve listings for modals
  const pickupListing = pickupListingId ? listingsWithDistance.find((listing) => listing.id === pickupListingId) : null;
  const scannerListing = scannerListingId ? listingsWithDistance.find((listing) => listing.id === scannerListingId) : null;
  const ratingListing = ratingListingId ? listingsWithDistance.find((listing) => listing.id === ratingListingId) : null;

  const availableCount = filtered.filter((listing) => listing.status === 'available').length;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth">
      <div className="px-5 pb-28 safe-area-bottom pt-4">
        <div className="mb-5">
          <h1 className="text-3xl font-black tracking-tight mb-1">Available Nearby</h1>
          <p className="text-ios-systemGray font-semibold text-sm">
            {availableCount} listings {receiverLocation ? `within ${maxDistance} km` : 'near your area'}
          </p>
        </div>

        <div className="glass-panel rounded-2xl px-3.5 py-2.5 mb-4 flex items-start gap-2.5">
          {locationStatus === 'error' ? (
            <AlertCircle size={15} className="text-ios-systemRed mt-0.5 shrink-0" />
          ) : (
            <LocateFixed size={15} className={`mt-0.5 shrink-0 ${locationStatus === 'ready' ? 'text-emerald-500' : 'text-ios-blue'}`} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-ios-systemGray">Your Location</p>
            <p className="text-[12px] font-semibold leading-snug">
              {locationStatus === 'loading' && 'Requesting GPS access...'}
              {locationStatus === 'ready' && 'Live location enabled. Distances are real-time.'}
              {locationStatus === 'error' && (locationError || 'Location unavailable. Enable permission for accurate distance.')}
              {locationStatus === 'idle' && 'Location pending...'}
            </p>
          </div>
          <button
            onClick={() => void refreshCurrentLocation()}
            className="shrink-0 h-8 px-3 rounded-lg bg-ios-blue/10 text-ios-blue text-[11px] font-black uppercase tracking-wide"
          >
            Refresh
          </button>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex gap-2.5 mb-5">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-systemGray transition-colors group-focus-within:text-ios-blue" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food, donors, locations..."
              className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-semibold placeholder:text-ios-systemGray/40 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
              >
                <X size={12} className="text-ios-systemGray" />
              </button>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all ${showFilters ? 'bg-ios-blue text-white shadow-ios-blue/20' : 'glass-panel text-ios-blue'
              }`}
          >
            <SlidersHorizontal size={20} />
          </motion.button>
        </div>

        {/* Expandable Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-5"
            >
              <div className="glass-panel rounded-2xl p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin size={11} /> Max Distance
                    </label>
                    <span className="text-[12px] font-black text-ios-blue">{maxDistance} km</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={25}
                    step={0.5}
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number.parseFloat(e.target.value))}
                    disabled={!receiverLocation}
                    className="w-full accent-ios-blue h-1 disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[9px] text-ios-systemGray/50 font-bold mt-1">
                    <span>0.5 km</span><span>25 km</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <ArrowUpDown size={11} /> Sort By
                  </label>
                  <div className="flex gap-2">
                    {([{ value: 'nearest' as SortMode, label: 'Nearest First' }, { value: 'freshest' as SortMode, label: 'Freshest First' }]).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortMode(option.value)}
                        className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all ${sortMode === option.value ? 'bg-ios-blue text-white shadow-md' : 'bg-white/50 dark:bg-white/[0.05] text-ios-systemGray'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-6 py-1">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-full text-[12px] font-black whitespace-nowrap transition-colors duration-150 shadow-sm ${activeCategory === category
                ? 'bg-ios-blue text-white shadow-ios-blue/20'
                : 'bg-white dark:bg-ios-darkCard text-ios-systemGray'
                }`}
            >
              {category.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between px-1 mb-4">
          <h2 className="text-lg font-black">
            {activeCategory === 'All' ? 'All Food' : activeCategory}
            <span className="text-ios-systemGray font-bold text-sm ml-2">({availableCount})</span>
          </h2>
          <span className="text-[10px] font-bold text-ios-systemGray uppercase">
            {sortMode === 'nearest' ? 'Real Distance' : 'Freshness'}
          </span>
        </div>

        {/* Food Cards */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((listing, idx) => (
              <FoodCard
                key={listing.id}
                listing={listing}
                onClaim={handleClaim}
                onViewPickup={handleViewPickup}
                currentUserEmail={currentUserEmail}
                isClaimLoading={claimingId === listing.id}
                index={idx}
              />
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-ios-blue/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <PackageX size={28} className="text-ios-blue/30" />
              </div>
              <h3 className="text-lg font-black mb-1">No food available nearby</h3>
              <p className="text-ios-systemGray text-sm font-medium">
                Try adjusting your filters or expanding the search radius
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pickup Modal — only one active screen at a time */}
      <AnimatePresence>
        {pickupListing?.status === 'claimed' && !ratingListingId && (
          <PickupModal
            listing={pickupListing}
            currentLocation={receiverLocation}
            onClose={() => setPickupListingId(null)}
            onConfirmPickup={handlePickupConfirmed}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scannerListing && (
          <QrScannerModal
            title={scannerListing.title}
            onClose={() => setScannerListingId(null)}
            onVerify={handleVerifyPickup}
          />
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingListing && (
          <RatingModal
            listingTitle={ratingListing.title}
            onSubmit={handleRatingSubmit}
            onSkip={handleRatingSkip}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReceiverPage;
