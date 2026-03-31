
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Utensils, MapPin, Send, Check } from 'lucide-react';
import { FoodCategory, FreshnessLevel } from '../types';
import QualitySnapUpload from '../components/QualitySnapUpload';

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
    const [formError, setFormError] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasRequiredPhoto = imageFile !== null && imagePreviewUrl !== null && freshness !== null;
    const canSubmit = foodName.trim() && selectedLat !== null && selectedLng !== null && hasRequiredPhoto && !isSubmitting;

    // Live search — debounced 300ms, partial match, scoped to Chennai
    // Position dropdown ABOVE input so it's not clipped by bottom nav
    const updateDropdownPosition = useCallback(() => {
        // No-op: dropdown now uses CSS absolute positioning
    }, []);

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
                const searchQuery = query.toLowerCase().includes('chennai')
                    ? query
                    : `${query}, Chennai, India`;
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=6&countrycodes=in&addressdetails=1`
                );
                const data: LocationSuggestion[] = await res.json();
                setSuggestions(data);
                if (data.length > 0) {
                    updateDropdownPosition();
                    setShowDropdown(true);
                } else {
                    setShowDropdown(false);
                }
            } catch {
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [location, selectedLat, updateDropdownPosition]);

    const handleSelectSuggestion = (s: LocationSuggestion) => {
        const parts = s.display_name.split(',');
        const shortName = parts.length >= 2
            ? `${parts[0].trim()}, ${parts[1].trim()}`
            : parts[0].trim();
        setLocation(shortName);
        setSelectedLat(Number.parseFloat(s.lat));
        setSelectedLng(Number.parseFloat(s.lon));
        setShowDropdown(false);
        setSuggestions([]);
    };

    const handleLocationChange = (value: string) => {
        setLocation(value);
        setSelectedLat(null);
        setSelectedLng(null);
        setLocationError('');
    };

    const handleSubmit = () => {
        if (!canSubmit || selectedLat === null || selectedLng === null) {
            const missingFields: string[] = [];
            if (!foodName.trim()) {
                missingFields.push('Food Name');
            }
            if (!selectedLat || !selectedLng) {
                missingFields.push('Pickup Location');
            }
            if (!hasRequiredPhoto) {
                missingFields.push('Food Photo');
            }
            setFormError(`Please fill these required fields: ${missingFields.join(', ')}.`);
            return;
        }
        setIsSubmitting(true);
        setFormError('');

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
        setFormError('');
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
            <div className="px-5 pb-24 pt-4">
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black tracking-tight mb-1">Share Food</h1>
                    <p className="text-ios-systemGray font-semibold text-sm">List surplus food for someone who needs it</p>
                </div>

                <div className="space-y-7">
                    {/* Food Name */}
                    <div>
                        <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 flex items-center gap-2 mb-3">
                            <Utensils size={12} /> Food Name
                        </label>
                        <input
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
                        <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-3 block">
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
                    <div className="grid grid-cols-2 gap-4">
                        {/* Category */}
                        <div>
                            <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-3 block">
                                Category
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
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
                            <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 mb-3 block">
                                Servings
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {['1-2', '3-5', '6-10', '10+'].map(s => (
                                    <button
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
                        onImageUpload={(file, f) => {
                            setImageFile(file);
                            setImagePreviewUrl(URL.createObjectURL(file));
                            setFreshness(f);
                        }}
                        onImageRemove={() => {
                            setImageFile(null);
                            setImagePreviewUrl(null);
                            setFreshness(null);
                        }}
                    />

                    {/* Location — Live search with Nominatim */}
                    <div className="relative z-[100]">
                        <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 flex items-center gap-2 mb-3">
                            <MapPin size={12} /> Pickup Location
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                value={location}
                                onChange={(e) => handleLocationChange(e.target.value)}
                                onFocus={() => {
                                    if (suggestions.length > 0 && selectedLat === null) {
                                        setShowDropdown(true);
                                    }
                                }}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 300)}
                                placeholder="Type area name, e.g. Royapuram..."
                                className={`w-full h-14 px-5 pr-12 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 transition-all font-semibold placeholder:text-ios-systemGray/40 text-[15px] ${
                                    selectedLat !== null
                                        ? 'ring-2 ring-emerald-500 focus:ring-emerald-500'
                                        : 'focus:ring-ios-blue'
                                }`}
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
                                    <Check size={18} className="text-emerald-500" strokeWidth={3} />
                                ) : location.length >= 2 ? (
                                    <MapPin size={18} className="text-ios-systemGray/40" />
                                ) : null}
                            </div>
                        </div>

                        {/* Suggestions dropdown — directly below input */}
                        {showDropdown && suggestions.length > 0 && (
                            <div
                                ref={dropdownRef}
                                className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white dark:bg-ios-darkCard rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden z-[9999]"
                            >
                                <div
                                    className="overflow-y-auto"
                                    style={{ maxHeight: '220px' }}
                                >
                                    {suggestions.map((s, idx) => {
                                        const parts = s.display_name.split(',');
                                        const primary = parts[0].trim();
                                        const secondary = parts.slice(1, 3).join(',').trim();
                                        return (
                                            <button
                                                key={`${s.lat}-${s.lon}-${idx}`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleSelectSuggestion(s);
                                                }}
                                                onTouchEnd={(e) => {
                                                    e.preventDefault();
                                                    handleSelectSuggestion(s);
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

                    {/* Selected location confirmation */}
                    {selectedLat !== null && selectedLng !== null && (
                        <div className="flex items-center gap-2.5 px-1 -mt-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                                📍 {location}
                            </span>
                        </div>
                    )}

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
                            : 'bg-gray-300 dark:bg-white/[0.14] text-ios-systemGray active:shadow-md'
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
