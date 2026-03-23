
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, MapPin, ArrowUpDown, X, PackageX } from 'lucide-react';
import { FoodListing, FoodCategory } from '../types';
import FoodCard from '../components/FoodCard';
import PickupModal from '../components/PickupModal';
import RatingModal from '../components/RatingModal';
import { saveRating, hasRated } from '../utils/storage';

const CATEGORIES: (FoodCategory | 'All')[] = ['All', 'Prepared', 'Bakery', 'Produce', 'Dairy', 'Beverages'];
type SortMode = 'nearest' | 'freshest';

interface ReceiverPageProps {
    listings: FoodListing[];
    onClaim: (id: string) => boolean;
    onPickupConfirmed: (id: string) => void;
    currentUserEmail: string;
    currentUserId: string;
}

const ReceiverPage: React.FC<ReceiverPageProps> = ({ listings, onClaim, onPickupConfirmed, currentUserEmail, currentUserId }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<FoodCategory | 'All'>('All');
    const [sortMode, setSortMode] = useState<SortMode>('nearest');
    const [showFilters, setShowFilters] = useState(false);
    const [maxDistance, setMaxDistance] = useState<number>(10);

    // State-based overlays: only one active at a time
    const [pickupListingId, setPickupListingId] = useState<string | null>(null);
    const [ratingListingId, setRatingListingId] = useState<string | null>(null);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    // Persisted claim state: reopen pickup on mount if user has an active claim
    useEffect(() => {
        const activeClaim = listings.find(
            l => l.status === 'claimed' && l.claimedBy === currentUserEmail
        );
        if (activeClaim && !pickupListingId && !ratingListingId) {
            setPickupListingId(activeClaim.id);
        }
    }, []); // Only on mount

    // Strict feed filtering
    const filtered = useMemo(() => {
        let result = listings.filter(l => {
            // Show available items
            if (l.status === 'available') return true;
            // Show items claimed by current user
            if (l.status === 'claimed' && l.claimedBy === currentUserEmail) return true;
            // Hide everything else (claimed by others, picked, expired)
            return false;
        });

        if (activeCategory !== 'All') {
            result = result.filter(l => l.category === activeCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(l =>
                l.title.toLowerCase().includes(q) ||
                l.donor.name.toLowerCase().includes(q) ||
                l.category.toLowerCase().includes(q) ||
                l.dietary.some(d => d.toLowerCase().includes(q))
            );
        }
        result = result.filter(l => l.location.distanceValue <= maxDistance);

        if (sortMode === 'nearest') {
            result.sort((a, b) => a.location.distanceValue - b.location.distanceValue);
        } else {
            result.sort((a, b) => new Date(b.cookedAt).getTime() - new Date(a.cookedAt).getTime());
        }

        return result;
    }, [listings, activeCategory, searchQuery, sortMode, maxDistance, currentUserEmail]);

    // Claim handler with loading state and debounce
    const handleClaim = useCallback((id: string) => {
        if (claimingId) return; // Prevent double-tap
        setClaimingId(id);

        // Small delay to show loading state, then process
        setTimeout(() => {
            const success = onClaim(id);
            if (success) {
                // Immediately open pickup screen
                setPickupListingId(id);
            }
            setClaimingId(null);
        }, 300);
    }, [claimingId, onClaim]);

    // View pickup for already-claimed items
    const handleViewPickup = useCallback((id: string) => {
        setPickupListingId(id);
    }, []);

    // Pickup confirmed → close pickup, show rating if not already rated
    const handlePickupConfirmed = useCallback((id: string) => {
        onPickupConfirmed(id);
        setPickupListingId(null);

        // Show rating modal if not already rated
        if (!hasRated(id, currentUserId)) {
            // Small delay so pickup modal exit animation completes
            setTimeout(() => setRatingListingId(id), 350);
        }
    }, [onPickupConfirmed, currentUserId]);

    // Rating handlers
    const handleRatingSubmit = useCallback((rating: number, feedback: string) => {
        if (!ratingListingId) return;
        saveRating({
            listingId: ratingListingId,
            userId: currentUserId,
            rating,
            feedback: feedback || undefined,
            timestamp: new Date().toISOString(),
        });
        setRatingListingId(null);
    }, [ratingListingId, currentUserId]);

    const handleRatingSkip = useCallback(() => {
        setRatingListingId(null);
    }, []);

    // Resolve listings for modals
    const pickupListing = pickupListingId ? listings.find(l => l.id === pickupListingId) : null;
    const ratingListing = ratingListingId ? listings.find(l => l.id === ratingListingId) : null;

    const availableCount = filtered.filter(l => l.status === 'available').length;

    return (
        <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth">
            <div className="px-5 pb-28 safe-area-bottom pt-4">
                {/* Title */}
                <div className="mb-5">
                    <h1 className="text-3xl font-black tracking-tight mb-1">Available Nearby</h1>
                    <p className="text-ios-systemGray font-semibold text-sm">
                        {availableCount} listings within {maxDistance} km
                    </p>
                </div>

                {/* Search + Filter Bar */}
                <div className="flex gap-2.5 mb-5">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-systemGray transition-colors group-focus-within:text-ios-blue" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search food, donors, dietary..."
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
                                        type="range" min={0.5} max={10} step={0.5}
                                        value={maxDistance}
                                        onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
                                        className="w-full accent-ios-blue h-1"
                                    />
                                    <div className="flex justify-between text-[9px] text-ios-systemGray/50 font-bold mt-1">
                                        <span>0.5 km</span><span>10 km</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <ArrowUpDown size={11} /> Sort By
                                    </label>
                                    <div className="flex gap-2">
                                        {([{ value: 'nearest' as SortMode, label: 'Nearest First' }, { value: 'freshest' as SortMode, label: 'Freshest First' }]).map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setSortMode(opt.value)}
                                                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all ${sortMode === opt.value ? 'bg-ios-blue text-white shadow-md' : 'bg-white/50 dark:bg-white/[0.05] text-ios-systemGray'
                                                    }`}
                                            >
                                                {opt.label}
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
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2.5 rounded-full text-[12px] font-black whitespace-nowrap transition-colors duration-150 shadow-sm ${activeCategory === cat
                                    ? 'bg-ios-blue text-white shadow-ios-blue/20'
                                    : 'bg-white dark:bg-ios-darkCard text-ios-systemGray'
                                }`}
                        >
                            {cat.toUpperCase()}
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
                        {sortMode === 'nearest' ? '📍 Distance' : '🕐 Freshness'}
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
                {pickupListing && pickupListing.status === 'claimed' && !ratingListingId && (
                    <PickupModal
                        listing={pickupListing}
                        onClose={() => setPickupListingId(null)}
                        onConfirmPickup={handlePickupConfirmed}
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
