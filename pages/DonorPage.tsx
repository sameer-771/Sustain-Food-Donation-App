
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Utensils, MapPin, Send, Check, Camera, Loader } from 'lucide-react';
import { FoodCategory, FreshnessLevel } from '../types';
import QualitySnapUpload from '../components/QualitySnapUpload';

const springConfig = { type: "spring" as const, stiffness: 400, damping: 35, mass: 0.8 };

const CATEGORIES: { value: FoodCategory; emoji: string }[] = [
    { value: 'Prepared', emoji: '🍲' },
    { value: 'Bakery', emoji: '🥖' },
    { value: 'Produce', emoji: '🥬' },
    { value: 'Dairy', emoji: '🥛' },
    { value: 'Beverages', emoji: '🥤' },
    { value: 'Other', emoji: '📦' },
];

interface LocationSuggestion {
    display_name: string;
    lat: string;
    lon: string;
}

interface DonorPageProps {
    onDonate: (data: {
        foodName: string;
        description: string;
        category: string;
        servings: string;
        location: string;
        lat: number;
        lng: number;
        imagePreviewUrl: string | null;
        freshness: string | null;
    }) => void;
}

const DonorPage: React.FC<DonorPageProps> = ({ onDonate }) => {
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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [freshness, setFreshness] = useState<FreshnessLevel | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [locationError, setLocationError] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const canSubmit = foodName.trim() && selectedLat !== null && selectedLng !== null && !isSubmitting;

    // Live search with Nominatim — debounced, scoped to Chennai
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const query = location.trim();
        if (query.length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const searchQuery = query.toLowerCase().includes('chennai')
                    ? query
                    : `${query}, Chennai`;
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&viewbox=79.95,12.85,80.35,13.25&bounded=1`
                );
                const data: LocationSuggestion[] = await res.json();
                setSuggestions(data);
                setShowDropdown(data.length > 0);
            } catch {
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [location]);

    const handleSelectSuggestion = (s: LocationSuggestion) => {
        // Extract a short display name (area name from the full address)
        const parts = s.display_name.split(',');
        const shortName = parts.length >= 2
            ? `${parts[0].trim()}, ${parts[1].trim()}`
            : parts[0].trim();
        setLocation(shortName);
        setSelectedLat(parseFloat(s.lat));
        setSelectedLng(parseFloat(s.lon));
        setShowDropdown(false);
        setSuggestions([]);
        setLocationError('');
    };

    const handleLocationChange = (value: string) => {
        setLocation(value);
        // Clear stored coords when user edits the text (they need to pick a suggestion)
        setSelectedLat(null);
        setSelectedLng(null);
        setLocationError('');
    };

    const handleSubmit = () => {
        if (!canSubmit || selectedLat === null || selectedLng === null) {
            if (!selectedLat || !selectedLng) {
                setLocationError('Please select a location from the suggestions.');
            }
            return;
        }
        setIsSubmitting(true);
        setLocationError('');

        onDonate({
            foodName,
            description,
            category,
            servings,
            location: location.trim(),
            lat: selectedLat,
            lng: selectedLng,
            imagePreviewUrl,
            freshness,
        });
        setIsSubmitting(false);
        setIsSubmitted(true);
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
        setFreshness(null);
        setIsSubmitted(false);
        setLocationError('');
    };

    if (isSubmitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full px-8 text-center"
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
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReset}
                    className="px-8 py-4 rounded-2xl bg-ios-blue text-white font-black text-[15px] shadow-xl shadow-ios-blue/25"
                >
                    Donate More
                </motion.button>
            </motion.div>
        );
    }

    return (
        <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth">
            <div className="px-5 pb-40 pt-4">
                {/* Title */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black tracking-tight mb-1">Share Food</h1>
                    <p className="text-ios-systemGray font-semibold text-sm">List surplus food for someone who needs it</p>
                </div>

                <div className="space-y-6">
                    {/* Food Name */}
                    <div>
                        <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 flex items-center gap-2 mb-2">
                            <Utensils size={12} /> Food Name
                        </label>
                        <input
                            value={foodName}
                            onChange={(e) => setFoodName(e.target.value)}
                            placeholder="e.g. Rice & Dal, Bread, Biryani..."
                            className="w-full h-14 px-5 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-semibold placeholder:text-ios-systemGray/40 text-[15px]"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-2 block">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="How many portions, any dietary info, best-by time..."
                            rows={3}
                            className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-medium placeholder:text-ios-systemGray/40 text-sm resize-none"
                        />
                    </div>

                    {/* Category + Servings Row */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Category */}
                        <div>
                            <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-2 block">
                                Category
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.value}
                                        onClick={() => setCategory(cat.value)}
                                        className={`py-2.5 rounded-xl text-center transition-colors duration-150 ${category === cat.value
                                            ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20'
                                            : 'bg-white dark:bg-ios-darkCard text-ios-systemGray'
                                            }`}
                                    >
                                        <div className="text-base">{cat.emoji}</div>
                                        <div className="text-[9px] font-bold mt-0.5">{cat.value}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Servings */}
                        <div>
                            <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-2 block">
                                Servings
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {['1-2', '3-5', '6-10', '10+'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setServings(s)}
                                        className={`py-3 rounded-xl text-[13px] font-bold text-center transition-colors duration-150 ${servings === s
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
                        onImageUpload={(file, f) => {
                            setImageFile(file);
                            setImagePreviewUrl(URL.createObjectURL(file));
                            setFreshness(f);
                        }}
                        onImageRemove={() => { setImageFile(null); setImagePreviewUrl(null); setFreshness(null); }}
                    />

                    {/* Location — Live search with Nominatim */}
                    <div className="relative">
                        <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 flex items-center gap-2 mb-2">
                            <MapPin size={12} /> Pickup Location
                        </label>
                        <div className="relative">
                            <input
                                value={location}
                                onChange={(e) => handleLocationChange(e.target.value)}
                                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                placeholder="Type area name, e.g. Royapettah, T Nagar..."
                                className={`w-full h-14 px-5 pr-12 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-semibold placeholder:text-ios-systemGray/40 text-[15px] ${locationError ? 'ring-2 ring-ios-systemRed' : ''} ${selectedLat !== null ? 'ring-2 ring-emerald-500' : ''}`}
                            />
                            {/* Status indicator */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {isSearching ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        className="w-5 h-5 border-2 border-ios-blue/30 border-t-ios-blue rounded-full"
                                    />
                                ) : selectedLat !== null ? (
                                    <Check size={18} className="text-emerald-500" />
                                ) : location.length >= 2 ? (
                                    <MapPin size={18} className="text-ios-systemGray/40" />
                                ) : null}
                            </div>
                        </div>

                        {/* Live suggestions dropdown */}
                        {showDropdown && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-30 glass-panel rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto no-scrollbar">
                                {suggestions.map((s, idx) => {
                                    // Show a short readable name
                                    const parts = s.display_name.split(',');
                                    const shortName = parts.slice(0, 3).join(',').trim();
                                    return (
                                        <button
                                            key={`${s.lat}-${s.lon}-${idx}`}
                                            onMouseDown={() => handleSelectSuggestion(s)}
                                            className="w-full px-5 py-3.5 text-left text-sm font-semibold hover:bg-ios-blue/5 active:bg-ios-blue/10 transition-colors border-b border-black/[0.03] dark:border-white/[0.03] last:border-none flex items-center gap-3"
                                        >
                                            <MapPin size={14} className="text-ios-blue shrink-0" />
                                            <span className="truncate">{shortName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Selected location info */}
                    {selectedLat !== null && selectedLng !== null && (
                        <div className="flex items-center gap-2 px-1 -mt-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                📍 Location set: {location}
                            </span>
                        </div>
                    )}

                    {/* Location Error */}
                    {locationError && (
                        <p className="text-ios-systemRed text-sm font-semibold px-1 -mt-3">{locationError}</p>
                    )}
                </div>
            </div>

            {/* Submit Button — Fixed Bottom */}
            <div className="fixed bottom-24 left-0 right-0 px-5 z-30">
                <div className="max-w-md mx-auto">
                    <motion.button
                        whileTap={canSubmit ? { scale: 0.96 } : {}}
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={`w-full py-4.5 rounded-[1.5rem] font-black text-[15px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors duration-200 ${canSubmit
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-[0_12px_24px_-8px_rgba(52,199,89,0.4)]'
                            : 'bg-gray-200 dark:bg-white/10 text-ios-systemGray cursor-not-allowed'
                            }`}
                    >
                        {isSubmitting ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                        ) : (
                            <>
                                <Send size={18} />
                                Post Donation
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default DonorPage;
