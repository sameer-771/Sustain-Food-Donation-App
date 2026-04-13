
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Utensils, MapPin, Send, Check, LocateFixed, Trash2 } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { FoodCategory, FoodListing, PickupCodeResult, QualityCheckResult } from '../types';
import QualitySnapUpload from '../components/QualitySnapUpload';
import DonorPickupQrModal from '../components/DonorPickupQrModal';
import { generatePickupCodeInApi } from '../utils/storage';
import { showAppPopup } from '../utils/popup';
import { selectedLocationMarkerIcon } from '../utils/leaflet';
import {
    Coordinates,
    LocationSuggestion,
    getCurrentLocation,
    reverseGeocode,
    searchNominatimLocations,
} from '../utils/location';

const CATEGORIES: { value: FoodCategory; emoji: string }[] = [
    { value: 'Prepared', emoji: '🍲' },
    { value: 'Bakery', emoji: '🥖' },
    { value: 'Produce', emoji: '🥬' },
    { value: 'Dairy', emoji: '🥛' },
    { value: 'Beverages', emoji: '🥤' },
    { value: 'Other', emoji: '📦' },
];

const DEFAULT_PICKER_CENTER: Coordinates = { lat: 13.0827, lng: 80.2707 };

const getLocationStatusIcon = (
    isSearching: boolean,
    isLocationSelected: boolean,
    locationLength: number,
) => {
    if (isSearching) {
        return (
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-ios-blue/30 border-t-ios-blue rounded-full"
            />
        );
    }

    if (isLocationSelected) {
        return <Check size={18} className="text-emerald-500" strokeWidth={3} />;
    }

    if (locationLength >= 2) {
        return <MapPin size={18} className="text-ios-systemGray/40" />;
    }

    return null;
};

const getFreshnessVisualClasses = (freshness: QualityCheckResult['freshness']) => {
    if (freshness === 'Fresh') {
        return {
            cardClass: 'bg-emerald-500/10 border-emerald-500/25',
            textClass: 'text-emerald-600 dark:text-emerald-400',
        };
    }

    if (freshness === 'Spoiled') {
        return {
            cardClass: 'bg-red-500/10 border-red-500/25',
            textClass: 'text-red-600 dark:text-red-400',
        };
    }

    return {
        cardClass: 'bg-amber-500/10 border-amber-500/25',
        textClass: 'text-amber-600 dark:text-amber-400',
    };
};

const getMissingRequiredFields = (
    foodName: string,
    selectedLat: number | null,
    selectedLng: number | null,
    hasRequiredPhoto: boolean,
) => {
    const missingFields: string[] = [];

    if (!foodName.trim()) {
        missingFields.push('Food Name');
    }
    if (selectedLat === null || selectedLng === null) {
        missingFields.push('Pickup Location');
    }
    if (!hasRequiredPhoto) {
        missingFields.push('Food Photo');
    }

    return missingFields;
};

const getListingStatusMeta = (status: FoodListing['status']) => {
    if (status === 'available') {
        return {
            label: 'Available',
            className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
    }

    if (status === 'claimed') {
        return {
            label: 'Claimed',
            className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
    }

    if (status === 'completed' || status === 'picked') {
        return {
            label: 'Completed',
            className: 'bg-ios-blue/10 text-ios-blue border-ios-blue/20',
        };
    }

    return {
        label: 'Expired',
        className: 'bg-ios-systemGray/15 text-ios-systemGray border-ios-systemGray/20',
    };
};

const getPickupQrErrorPopup = (message: string) => {
    if (message.toLowerCase().includes('claimed listings')) {
        return {
            title: 'QR unavailable',
            message: 'This listing is not claimed on the server yet. Please claim it again from a receiver account.',
            tone: 'error' as const,
        };
    }

    return {
        title: 'QR generation failed',
        message,
        tone: 'error' as const,
    };
};

interface DonationMapPickerProps {
    selectedLat: number | null;
    selectedLng: number | null;
    onPick: (lat: number, lng: number) => void;
}

const DonationMapPicker: React.FC<DonationMapPickerProps> = ({ selectedLat, selectedLng, onPick }) => {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });

    if (selectedLat === null || selectedLng === null) {
        return null;
    }

    return <Marker position={[selectedLat, selectedLng]} icon={selectedLocationMarkerIcon} />;
};

interface DonorMapFlyToProps {
    selectedLat: number | null;
    selectedLng: number | null;
}

const DonorMapFlyTo: React.FC<DonorMapFlyToProps> = ({ selectedLat, selectedLng }) => {
    const map = useMap();

    useEffect(() => {
        if (selectedLat === null || selectedLng === null) {
            return;
        }
        map.flyTo([selectedLat, selectedLng], 15, { duration: 0.6 });
    }, [map, selectedLat, selectedLng]);

    return null;
};

interface PostedListingsPanelProps {
    postedListings: FoodListing[];
    pickupCodeLoadingId: string | null;
    removeLoadingId: string | null;
    onGeneratePickupCode: (listing: FoodListing) => void;
    onRequestRemove: (listing: FoodListing) => void;
}

const PostedListingsPanel: React.FC<PostedListingsPanelProps> = ({
    postedListings,
    pickupCodeLoadingId,
    removeLoadingId,
    onGeneratePickupCode,
    onRequestRemove,
}) => {
    if (postedListings.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 mb-6 w-full self-stretch text-left">
            <h3 className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest mb-3 px-1">Your Posted Donations</h3>
            <p className="text-[12px] font-semibold text-ios-systemGray px-1 mb-3">Only you can remove these listings.</p>
            <div className="space-y-3">
                {postedListings.map((listing) => {
                    const statusMeta = getListingStatusMeta(listing.status);
                    const isRemoveLoading = removeLoadingId === listing.id;
                    const isQrLoading = pickupCodeLoadingId === listing.id;

                    return (
                        <div key={listing.id} className="glass-panel rounded-2xl p-4 border border-black/5 dark:border-white/10">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="font-black text-sm">{listing.title}</p>
                                    <div className="mt-1 flex items-center gap-2 min-w-0">
                                        <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusMeta.className}`}>
                                            {statusMeta.label}
                                        </span>
                                        <p className="min-w-0 flex-1 text-xs text-ios-systemGray font-semibold truncate">
                                            {listing.status === 'claimed'
                                                ? `Claimed by ${listing.claimedBy || 'Receiver'}`
                                                : listing.location.address}
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center justify-end gap-2 sm:flex-col sm:items-end">
                                    {listing.status === 'claimed' && (
                                        <button
                                            onClick={() => onGeneratePickupCode(listing)}
                                            disabled={isQrLoading || isRemoveLoading}
                                            className="px-4 h-10 min-w-[102px] rounded-xl bg-ios-blue text-white text-xs font-black uppercase tracking-wide disabled:opacity-60"
                                        >
                                            {isQrLoading ? 'Generating...' : 'Show QR'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onRequestRemove(listing)}
                                        disabled={isRemoveLoading || isQrLoading}
                                        className="px-4 h-10 min-w-[102px] rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-wide disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 size={14} />
                                        {isRemoveLoading ? 'Removing...' : 'Remove'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface DonorPageProps {
    listings: FoodListing[];
    currentUserEmail: string;
    currentUserId: string;
    onDonate: (data: {
        foodName: string;
        description: string;
        category: string;
        servings: string;
        location: string;
        lat: number;
        lng: number;
        imageFile: File;
        imagePreviewUrl: string | null;
    }) => Promise<QualityCheckResult | null>;
    onRemoveDonation: (listingId: string) => Promise<{ success: boolean; error?: string }>;
    onRefresh?: () => Promise<void>;
}

const DonorPage: React.FC<DonorPageProps> = ({ listings, currentUserEmail, currentUserId, onDonate, onRemoveDonation, onRefresh }) => {
    const [foodName, setFoodName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<FoodCategory>('Prepared');
    const [servings, setServings] = useState('3-5');
    const [location, setLocation] = useState('');
    const [selectedLat, setSelectedLat] = useState<number | null>(null);
    const [selectedLng, setSelectedLng] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [aiResult, setAiResult] = useState<QualityCheckResult | null>(null);
    const [pickupModalData, setPickupModalData] = useState<{ listing: FoodListing; pickup: PickupCodeResult } | null>(null);
    const [pickupCodeLoadingId, setPickupCodeLoadingId] = useState<string | null>(null);
    const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
    const [confirmRemoveListing, setConfirmRemoveListing] = useState<FoodListing | null>(null);
    const [formError, setFormError] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hasRequiredPhoto = imageFile !== null && imagePreviewUrl !== null;
    const canSubmit = foodName.trim() && selectedLat !== null && selectedLng !== null && hasRequiredPhoto && !isSubmitting;
    const isLocationSelected = selectedLat !== null && selectedLng !== null;
    const locationStatusIcon = getLocationStatusIcon(isSearching, isLocationSelected, location.length);
    const postedListings = useMemo(() => {
        const normalizedUserEmail = currentUserEmail.trim().toLowerCase();
        const normalizedUserId = currentUserId.trim();
        const mine = listings.filter((listing) => {
            const listingDonorEmail = (listing.donorEmail || '').trim().toLowerCase();
            const listingDonorId = (listing.donorId || '').trim();
            const isActiveDonation = listing.status === 'available' || listing.status === 'claimed';
            return (
                isActiveDonation && (
                    (normalizedUserId !== '' && listingDonorId !== '' && listingDonorId === normalizedUserId)
                    || (normalizedUserEmail !== '' && listingDonorEmail !== '' && listingDonorEmail === normalizedUserEmail)
                )
            );
        });

        const byId = new Map<string, FoodListing>();
        for (const listing of mine) {
            byId.set(listing.id, listing);
        }
        return [...byId.values()].sort((a, b) => {
            const aTs = Date.parse(a.createdAt || a.cookedAt || '');
            const bTs = Date.parse(b.createdAt || b.cookedAt || '');
            const safeATs = Number.isFinite(aTs) ? aTs : 0;
            const safeBTs = Number.isFinite(bTs) ? bTs : 0;
            return safeBTs - safeATs;
        });
    }, [listings, currentUserEmail, currentUserId]);

    useEffect(() => {
        void onRefresh?.();
    }, [onRefresh]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const query = location.trim();
        if (query.length < 2 || selectedLat !== null) {
            if (query.length < 2) { setSuggestions([]); setShowDropdown(false); }
            return;
        }

        setIsSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const data = await searchNominatimLocations(query, 6);
                setSuggestions(data);
                if (data.length > 0) {
                    setShowDropdown(true);
                } else {
                    setShowDropdown(false);
                }
            } catch {
                setSuggestions([]);
                setShowDropdown(false);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [location, selectedLat]);

    const handleSelectSuggestion = async (s: LocationSuggestion) => {
        const parts = s.display_name.split(',');
        const shortName = parts.length >= 2
            ? `${parts[0].trim()}, ${parts[1].trim()}`
            : parts[0].trim();
        await setLocationFromCoordinates(Number.parseFloat(s.lat), Number.parseFloat(s.lon), shortName);
        setShowDropdown(false);
        setSuggestions([]);
    };

    const handleLocationChange = (value: string) => {
        setLocation(value);
        setSelectedLat(null);
        setSelectedLng(null);
    };

    const setLocationFromCoordinates = async (lat: number, lng: number, addressOverride?: string) => {
        setSelectedLat(lat);
        setSelectedLng(lng);
        setFormError('');

        if (addressOverride) {
            setLocation(addressOverride);
            return;
        }

        try {
            const address = await reverseGeocode(lat, lng);
            setLocation(address);
        } catch {
            setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
    };

    const handleUseCurrentLocation = async () => {
        setIsLocatingCurrent(true);
        try {
            const current = await getCurrentLocation();
            await setLocationFromCoordinates(current.lat, current.lng);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not fetch your current location.';
            setFormError(message);
        } finally {
            setIsLocatingCurrent(false);
        }
    };

    const handleSubmit = async () => {
        if (!canSubmit || selectedLat === null || selectedLng === null || !imageFile) {
            const missingFields = getMissingRequiredFields(foodName, selectedLat, selectedLng, hasRequiredPhoto);
            setFormError(`Please fill these required fields: ${missingFields.join(', ')}.`);
            return;
        }
        setIsSubmitting(true);
        setIsAiProcessing(true);
        setFormError('');
        let postedSuccessfully = false;

        try {
            const quality = await onDonate({
                foodName,
                description,
                category,
                servings,
                location: location.trim(),
                lat: selectedLat,
                lng: selectedLng,
                imageFile,
                imagePreviewUrl,
            });
            setAiResult(quality);
            postedSuccessfully = true;
        } catch (error) {
            setAiResult(null);
            const message = error instanceof Error ? error.message : 'Could not post donation right now. Please try again.';
            setFormError(message);
        }

        setIsAiProcessing(false);
        setIsSubmitting(false);
        if (postedSuccessfully) {
            setIsSubmitted(true);
        }
    };

    const handleReset = () => {
        setFoodName('');
        setDescription('');
        setCategory('Prepared');
        setServings('3-5');
        setLocation('');
        setSelectedLat(null);
        setSelectedLng(null);
        setImageFile(null);
        setImagePreviewUrl(null);
        setAiResult(null);
        setIsAiProcessing(false);
        setIsSubmitted(false);
        setFormError('');
    };

    const handleGeneratePickupCode = async (listing: FoodListing) => {
        setPickupCodeLoadingId(listing.id);
        try {
            const pickup = await generatePickupCodeInApi(listing.id);
            setPickupModalData({ listing, pickup });
            await onRefresh?.();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not generate pickup QR right now.';
            await onRefresh?.();
            showAppPopup(getPickupQrErrorPopup(message));
        } finally {
            setPickupCodeLoadingId(null);
        }
    };

    const handleConfirmRemove = async () => {
        const listingToRemove = confirmRemoveListing;
        setRemoveLoadingId(listingToRemove.id);

        try {
            const result = await onRemoveDonation(listingToRemove.id);
            showAppPopup({
                title: result.success ? 'Donation removed' : 'Unable to remove',
                message: result.success
                    ? `"${listingToRemove.title}" was removed successfully.`
                    : (result.error || 'Could not remove this listing right now.'),
                tone: result.success ? 'success' : 'error',
            });
            result.success && setConfirmRemoveListing(null);
            await (result.success ? (onRefresh?.() ?? Promise.resolve()) : Promise.resolve());
        } finally {
            setRemoveLoadingId(null);
        }
    };

    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center h-full overflow-y-auto no-scrollbar px-6 pt-8 pb-24 text-center"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.15 }}
                    className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30"
                >
                    <Check size={48} className="text-white" strokeWidth={3} />
                </motion.div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Donation Listed!</h2>
                <p className="text-ios-systemGray font-semibold leading-relaxed mb-2">
                    Your <span className="text-black dark:text-white font-bold">{foodName}</span> is now visible to nearby receivers.
                </p>
                <p className="text-ios-systemGray text-sm font-medium mb-8">
                    They'll get a notification instantly. Thank you for making a difference! 🙏
                </p>

                <PostedListingsPanel
                    postedListings={postedListings}
                    pickupCodeLoadingId={pickupCodeLoadingId}
                    removeLoadingId={removeLoadingId}
                    onGeneratePickupCode={(listing) => {
                        void handleGeneratePickupCode(listing);
                    }}
                    onRequestRemove={(listing) => setConfirmRemoveListing(listing)}
                />

                {aiResult && (
                    <div className={`w-full max-w-sm rounded-2xl border px-4 py-3 mb-8 text-left ${
                        getFreshnessVisualClasses(aiResult.freshness).cardClass
                    }`}>
                        <p className="text-[11px] uppercase tracking-widest font-black text-ios-systemGray mb-1">AI Quality Snap</p>
                        <p className={`text-sm font-black ${
                            getFreshnessVisualClasses(aiResult.freshness).textClass
                        }`}>
                            Freshness Class: {aiResult.freshness}
                        </p>
                        <p className="text-xs font-semibold text-ios-systemGray mt-1">
                            Confidence Score: {(aiResult.confidence * 100).toFixed(1)}%
                        </p>
                    </div>
                )}

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReset}
                    className="px-8 py-4 rounded-2xl bg-ios-blue text-white font-black text-[15px] shadow-xl shadow-ios-blue/25"
                >
                    Donate More
                </motion.button>

                {pickupModalData && (
                    <DonorPickupQrModal
                        listingTitle={pickupModalData.listing.title}
                        pickupData={pickupModalData.pickup}
                        onClose={() => setPickupModalData(null)}
                    />
                )}

                {confirmRemoveListing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1300] flex items-center justify-center px-5"
                        onClick={() => !removeLoadingId && setConfirmRemoveListing(null)}
                    >
                        <div className="absolute inset-0 bg-black/55" />
                        <motion.div
                            initial={{ scale: 0.96, y: 14, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.96, y: 14, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                            className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-ios-darkCard p-5 shadow-2xl text-left"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                                Confirm Removal
                            </div>
                            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-black dark:text-white">
                                Remove "{confirmRemoveListing.title}" from your posted donations?
                            </p>
                            <p className="mt-1 text-xs text-ios-systemGray font-semibold">
                                This action cannot be undone.
                            </p>

                            <div className="mt-5 grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setConfirmRemoveListing(null)}
                                    disabled={removeLoadingId === confirmRemoveListing.id}
                                    className="h-11 rounded-2xl text-sm font-black text-ios-systemGray bg-ios-systemGray/10 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void handleConfirmRemove();
                                    }}
                                    disabled={removeLoadingId === confirmRemoveListing.id}
                                    className="h-11 rounded-2xl text-sm font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-60"
                                >
                                    {removeLoadingId === confirmRemoveListing.id ? 'Removing...' : 'Remove'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </motion.div>
        );
    }

    return (
        <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth">
            <div className="px-5 pb-24 pt-4">
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black tracking-tight mb-1">Share Food</h1>
                    <p className="text-ios-systemGray font-semibold text-sm">List surplus food for someone who needs it</p>
                </div>

                <PostedListingsPanel
                    postedListings={postedListings}
                    pickupCodeLoadingId={pickupCodeLoadingId}
                    removeLoadingId={removeLoadingId}
                    onGeneratePickupCode={(listing) => {
                        void handleGeneratePickupCode(listing);
                    }}
                    onRequestRemove={(listing) => setConfirmRemoveListing(listing)}
                />

                <div className="space-y-7">
                    {/* Food Name */}
                    <div>
                        <label htmlFor="donor-food-name" className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 flex items-center gap-2 mb-3">
                            <Utensils size={12} /> Food Name
                        </label>
                        <input
                            id="donor-food-name"
                            value={foodName}
                            onChange={(e) => {
                                setFoodName(e.target.value);
                                if (e.target.value.trim()) {
                                    setFormError('');
                                }
                            }}
                            placeholder="e.g. Rice & Dal, Bread, Biryani..."
                            className="w-full h-14 px-5 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-semibold placeholder:text-ios-systemGray/40 text-[15px]"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="donor-description" className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-3 block">
                            Description (optional)
                        </label>
                        <textarea
                            id="donor-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="How many portions, any dietary info, best-by time..."
                            rows={3}
                            className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-medium placeholder:text-ios-systemGray/40 text-sm resize-none"
                        />
                    </div>

                    {/* Category + Servings Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Category */}
                        <div>
                            <p className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-3 block">
                                Category
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        type="button"
                                        key={cat.value}
                                        onClick={() => setCategory(cat.value)}
                                        className={`py-3 rounded-xl text-center transition-colors duration-150 ${category === cat.value
                                            ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20'
                                            : 'bg-white dark:bg-ios-darkCard text-ios-systemGray'
                                            }`}
                                    >
                                        <div className="text-lg">{cat.emoji}</div>
                                        <div className="text-[9px] font-bold mt-0.5">{cat.value}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Servings */}
                        <div>
                            <p className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-3 block">
                                Servings
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {['1-2', '3-5', '6-10', '10+'].map(s => (
                                    <button
                                        type="button"
                                        key={s}
                                        onClick={() => setServings(s)}
                                        className={`py-3.5 rounded-xl text-[13px] font-bold text-center transition-colors duration-150 ${servings === s
                                            ? 'bg-ios-systemGreen text-white shadow-md shadow-ios-systemGreen/20'
                                            : 'bg-white dark:bg-ios-darkCard text-ios-systemGray'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quality Snap Upload */}
                    <QualitySnapUpload
                        onImageUpload={(file) => {
                            setImageFile(file);
                            setImagePreviewUrl(URL.createObjectURL(file));
                        }}
                        onImageRemove={() => {
                            setImageFile(null);
                            setImagePreviewUrl(null);
                        }}
                    />

                    {/* Location — Live search with Nominatim */}
                    <div className="relative z-[300]">
                        <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center gap-2">
                                <MapPin size={12} /> Pickup Location
                            </span>
                            <button
                                type="button"
                                onClick={() => void handleUseCurrentLocation()}
                                disabled={isLocatingCurrent}
                                className="h-8 px-3 rounded-xl bg-ios-blue/10 text-ios-blue text-[10px] font-black uppercase tracking-wide disabled:opacity-55 inline-flex items-center gap-1.5"
                            >
                                <LocateFixed size={12} className={isLocatingCurrent ? 'animate-spin' : ''} />
                                {isLocatingCurrent ? 'Locating' : 'Use My GPS'}
                            </button>
                        </label>

                        <div className="relative">
                            <input
                                value={location}
                                onChange={(e) => handleLocationChange(e.target.value)}
                                onFocus={() => {
                                    if (suggestions.length > 0 && selectedLat === null) {
                                        setShowDropdown(true);
                                    }
                                }}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 300)}
                                placeholder="Search street, landmark, or area..."
                                className={`w-full h-14 px-5 pr-12 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 transition-all font-semibold placeholder:text-ios-systemGray/40 text-[15px] ${
                                    isLocationSelected
                                        ? 'ring-2 ring-emerald-500 focus:ring-emerald-500'
                                        : 'focus:ring-ios-blue'
                                }`}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {locationStatusIcon}
                            </div>
                        </div>

                        {showDropdown && suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white dark:bg-ios-darkCard rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden z-[350]">
                                <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                                    {suggestions.map((s, idx) => {
                                        const parts = s.display_name.split(',');
                                        const primary = parts[0].trim();
                                        const secondary = parts.slice(1, 4).join(',').trim();
                                        return (
                                            <button
                                                key={`${s.place_id}-${idx}`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    void handleSelectSuggestion(s);
                                                }}
                                                onTouchEnd={(e) => {
                                                    e.preventDefault();
                                                    void handleSelectSuggestion(s);
                                                }}
                                                className="w-full px-4 py-4 text-left hover:bg-ios-blue/5 active:bg-ios-blue/10 transition-colors border-b border-black/[0.04] dark:border-white/[0.04] last:border-none flex items-start gap-3 cursor-pointer"
                                            >
                                                <div className="w-9 h-9 rounded-xl bg-ios-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MapPin size={16} className="text-ios-blue" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[14px] font-bold truncate">{primary}</div>
                                                    <div className="text-[11px] text-ios-systemGray font-medium truncate">{secondary}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 mt-1 relative z-0">
                        {selectedLat !== null && selectedLng !== null && (
                            <div className="flex items-center gap-2.5 px-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                    {location}
                                </span>
                            </div>
                        )}
                        <div className="h-44 rounded-2xl overflow-hidden border border-black/5 dark:border-white/10">
                            <MapContainer
                                center={[selectedLat ?? DEFAULT_PICKER_CENTER.lat, selectedLng ?? DEFAULT_PICKER_CENTER.lng]}
                                zoom={selectedLat !== null && selectedLng !== null ? 15 : 12}
                                className="h-full w-full relative z-0"
                                scrollWheelZoom
                            >
                                <TileLayer
                                    attribution='&copy; OpenStreetMap contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <DonationMapPicker
                                    selectedLat={selectedLat}
                                    selectedLng={selectedLng}
                                    onPick={(lat, lng) => {
                                        void setLocationFromCoordinates(lat, lng);
                                    }}
                                />
                                <DonorMapFlyTo selectedLat={selectedLat} selectedLng={selectedLng} />
                            </MapContainer>
                        </div>
                        <p className="text-[11px] text-ios-systemGray font-semibold px-1">Tap the map to set or fine-tune your pickup pin.</p>
                    </div>

                </div>

                {/* Submit Button — separate section, only visible after scrolling past form */}
                <div className="mt-16 mb-8">
                    {formError && (
                        <p className="text-ios-systemRed text-[13px] font-semibold px-1 mb-3">{formError}</p>
                    )}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSubmit}
                        className={`w-full py-[18px] rounded-2xl font-black text-[15px] tracking-wide flex items-center justify-center gap-2.5 transition-all duration-300 min-h-[52px] ${canSubmit
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:shadow-md'
                            : 'bg-emerald-500 text-white/90 shadow-lg shadow-emerald-500/20 active:shadow-md'
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                />
                                {isAiProcessing ? 'Processing with AI...' : 'Posting Donation...'}
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Post Donation
                            </>
                        )}
                    </motion.button>
                </div>

            </div>

            {pickupModalData && (
                <DonorPickupQrModal
                    listingTitle={pickupModalData.listing.title}
                    pickupData={pickupModalData.pickup}
                    onClose={() => setPickupModalData(null)}
                />
            )}

            {confirmRemoveListing && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1300] flex items-center justify-center px-5"
                    onClick={() => !removeLoadingId && setConfirmRemoveListing(null)}
                >
                    <div className="absolute inset-0 bg-black/55" />
                    <motion.div
                        initial={{ scale: 0.96, y: 14, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.96, y: 14, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-ios-darkCard p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                            Confirm Removal
                        </div>
                        <p className="mt-3 text-[15px] font-semibold leading-relaxed text-black dark:text-white">
                            Remove "{confirmRemoveListing.title}" from your posted donations?
                        </p>
                        <p className="mt-1 text-xs text-ios-systemGray font-semibold">
                            This action cannot be undone.
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setConfirmRemoveListing(null)}
                                disabled={removeLoadingId === confirmRemoveListing.id}
                                className="h-11 rounded-2xl text-sm font-black text-ios-systemGray bg-ios-systemGray/10 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void handleConfirmRemove();
                                }}
                                disabled={removeLoadingId === confirmRemoveListing.id}
                                className="h-11 rounded-2xl text-sm font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-60"
                            >
                                {removeLoadingId === confirmRemoveListing.id ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};

export default DonorPage;
