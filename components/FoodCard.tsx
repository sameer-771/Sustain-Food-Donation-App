
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, ShieldCheck, Star, ChevronRight, Timer, Eye, Loader2 } from 'lucide-react';
import { FoodListing } from '../types';

interface FoodCardProps {
    listing: FoodListing;
    onClaim: (id: string) => void;
    onViewPickup?: (id: string) => void;
    currentUserEmail?: string;
    isClaimLoading?: boolean;
    index: number;
}

const getTimeSinceCooked = (cookedAt: string): string => {
    const diff = Date.now() - new Date(cookedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const getTimeRemaining = (expiresAt: string): { text: string; urgent: boolean; expired: boolean } => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { text: 'Expired', urgent: true, expired: true };
    const totalMins = Math.floor(diff / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) {
        return { text: `${hours}h ${mins}m left`, urgent: hours < 1, expired: false };
    }
    return { text: `${mins}m left`, urgent: mins <= 30, expired: false };
};

const freshnessColor = (freshness: string) => {
    switch (freshness) {
        case 'excellent': return { bg: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
        case 'good': return { bg: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
        case 'fair': return { bg: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
        default: return { bg: 'bg-gray-500', badge: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    }
};

const FoodCard: React.FC<FoodCardProps> = ({ listing, onClaim, onViewPickup, currentUserEmail, isClaimLoading, index }) => {
    const [timeSince, setTimeSince] = useState(getTimeSinceCooked(listing.cookedAt));
    const [remaining, setRemaining] = useState(getTimeRemaining(listing.expiresAt));
    const colors = freshnessColor(listing.freshness);
    const isAvailable = listing.status === 'available';
    const isClaimedByMe = listing.status === 'claimed' && listing.claimedBy === currentUserEmail;

    // Update timers every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeSince(getTimeSinceCooked(listing.cookedAt));
            setRemaining(getTimeRemaining(listing.expiresAt));
        }, 30000);
        return () => clearInterval(interval);
    }, [listing.cookedAt, listing.expiresAt]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white dark:bg-ios-darkCard rounded-[2rem] overflow-hidden shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] dark:shadow-none border border-black/[0.03] dark:border-white/[0.05]"
        >
            <div className="flex">
                {/* Thumbnail */}
                <div className="relative w-32 h-32 shrink-0">
                    <img
                        src={listing.thumbnailUrl || listing.imageUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    {/* Freshness Dot */}
                    <div className={`absolute top-2.5 left-2.5 w-2.5 h-2.5 rounded-full ${colors.bg} ring-2 ring-white dark:ring-ios-darkCard`} />

                    {/* Countdown Timer Overlay */}
                    {isAvailable && (
                        <div className={`absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-center gap-1 ${remaining.urgent
                                ? 'bg-gradient-to-t from-red-600/90 to-red-600/60'
                                : 'bg-gradient-to-t from-black/70 to-black/30'
                            }`}>
                            <Timer size={9} className="text-white/80" />
                            <span className={`text-[9px] font-black uppercase tracking-wide ${remaining.urgent ? 'text-white' : 'text-white/80'}`}>
                                {remaining.text}
                            </span>
                        </div>
                    )}

                    {/* Claimed by you overlay */}
                    {isClaimedByMe && (
                        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center justify-center gap-1 bg-gradient-to-t from-ios-blue/90 to-ios-blue/60">
                            <span className="text-[9px] font-black uppercase tracking-wide text-white">
                                Claimed by you
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[15px] font-black leading-tight truncate">{listing.title}</h3>
                            <span className="text-[10px] font-bold text-ios-systemGray uppercase shrink-0">{listing.servings} srv</span>
                        </div>

                        {/* Donor Info */}
                        <div className="flex items-center gap-1.5 mt-1">
                            <img src={listing.donor.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                            <span className="text-[11px] text-ios-systemGray font-semibold truncate">{listing.donor.name}</span>
                            {listing.donor.verified && <ShieldCheck size={11} className="text-ios-blue shrink-0" />}
                            <div className="flex items-center gap-0.5 ml-auto shrink-0">
                                <Star size={10} className="text-amber-400 fill-amber-400" />
                                <span className="text-[10px] font-bold text-ios-systemGray">{listing.donor.rating}</span>
                            </div>
                        </div>
                    </div>

                    {/* Badges Row */}
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        {/* Time Since Cooked */}
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/15">
                            <Clock size={10} className="text-orange-500" />
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{timeSince}</span>
                        </div>
                        {/* Distance */}
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-ios-blue/10 border border-ios-blue/15">
                            <MapPin size={10} className="text-ios-blue" />
                            <span className="text-[10px] font-bold text-ios-blue">{listing.location.distance}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dietary Tags + Action Button */}
            <div className="px-4 pb-4 flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                    {listing.dietary.map(tag => (
                        <span key={tag} className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] text-ios-systemGray">
                            {tag}
                        </span>
                    ))}
                </div>

                {isAvailable && (
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => !isClaimLoading && onClaim(listing.id)}
                        disabled={isClaimLoading}
                        className={`flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl text-[12px] font-black uppercase tracking-wide transition-all ${
                            isClaimLoading
                                ? 'bg-ios-blue/60 text-white/80 cursor-wait'
                                : 'bg-ios-blue text-white shadow-lg shadow-ios-blue/25'
                        }`}
                    >
                        {isClaimLoading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Claiming...
                            </>
                        ) : (
                            <>
                                Claim
                                <ChevronRight size={14} />
                            </>
                        )}
                    </motion.button>
                )}

                {isClaimedByMe && onViewPickup && (
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => onViewPickup(listing.id)}
                        className="flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl text-[12px] font-black uppercase tracking-wide bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-all"
                    >
                        <Eye size={14} />
                        View Pickup
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};

export default FoodCard;
