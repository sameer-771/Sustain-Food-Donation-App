
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Navigation, Clock, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { FoodListing } from '../types';

declare const L: any;

interface PickupModalProps {
    listing: FoodListing;
    onClose: () => void;
    onConfirmPickup: (id: string) => void;
}

const PickupModal: React.FC<PickupModalProps> = ({ listing, onClose, onConfirmPickup }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    // Initialize map
    useEffect(() => {
        if (!listing || !mapRef.current) return;

        const timer = setTimeout(() => {
            if (!mapRef.current || mapInstanceRef.current) return;

            try {
                const map = L.map(mapRef.current, {
                    zoomControl: false,
                    attributionControl: false,
                    dragging: false,
                    scrollWheelZoom: false,
                    doubleClickZoom: false,
                    touchZoom: false,
                }).setView([listing.location.lat, listing.location.lng], 16);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                const icon = L.divIcon({
                    html: `<div style="
                        width: 28px; height: 28px;
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex; align-items: center; justify-content: center;
                    "><div style="
                        width: 6px; height: 6px;
                        background: white;
                        border-radius: 50%;
                        transform: rotate(45deg);
                    "></div></div>`,
                    className: '',
                    iconSize: [28, 28],
                    iconAnchor: [14, 28],
                });

                L.marker([listing.location.lat, listing.location.lng], { icon }).addTo(map);
                mapInstanceRef.current = map;
            } catch (e) {
                console.error('Map init error:', e);
            }
        }, 200);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [listing]);

    const handleCopyAddress = () => {
        navigator.clipboard?.writeText(listing.location.address);
    };

    const handleOpenInMaps = () => {
        window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${listing.location.lat},${listing.location.lng}`,
            '_blank'
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[150] flex items-end justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/50"
            />

            {/* Modal */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-ios-lightBg dark:bg-ios-darkBg rounded-t-[2rem] overflow-hidden"
                style={{ maxHeight: '90dvh' }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-ios-lightBg dark:bg-ios-darkBg z-10">
                    <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                </div>

                {/* Close Button — larger touch target */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-4 w-11 h-11 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center z-20"
                >
                    <X size={18} className="text-ios-systemGray" />
                </button>

                {/* Scrollable Content */}
                <div className="overflow-y-auto overscroll-contain px-5 pt-1 pb-32 safe-area-modal-bottom space-y-3.5" style={{ maxHeight: 'calc(90dvh - 32px)' }}>
                    {/* Food Image */}
                    <div className="w-full h-44 rounded-2xl overflow-hidden shadow-lg">
                        <img src={listing.imageUrl || listing.thumbnailUrl} alt={listing.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Header */}
                    <div>
                        <h3 className="text-xl font-black leading-tight">{listing.title}</h3>
                        <p className="text-ios-systemGray text-sm font-semibold mt-0.5">from {listing.donor.name}</p>
                    </div>

                    {/* Success Banner */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3">
                        <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                        <div>
                            <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">Food Claimed Successfully!</p>
                            <p className="text-[11px] text-ios-systemGray font-medium">Head to the pickup location below.</p>
                        </div>
                    </div>

                    {/* Pickup Location */}
                    <div className="bg-white dark:bg-ios-darkCard rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <MapPin size={13} className="text-ios-blue" />
                                <span className="text-[10px] font-black text-ios-systemGray uppercase tracking-widest">Pickup Location</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-[13px] font-bold">{listing.location.address}</p>
                                    <p className="text-[11px] text-ios-systemGray font-medium">{listing.location.distance} away</p>
                                </div>
                                <button
                                    onClick={handleCopyAddress}
                                    className="shrink-0 w-7 h-7 rounded-lg bg-ios-blue/10 flex items-center justify-center"
                                >
                                    <Copy size={12} className="text-ios-blue" />
                                </button>
                            </div>
                        </div>

                        {/* Embedded Map */}
                        <div ref={mapRef} className="w-full" style={{ height: '140px' }} />
                    </div>

                    {/* Info Row */}
                    <div className="flex gap-2.5">
                        <div className="flex-1 bg-white dark:bg-ios-darkCard rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
                            <Clock size={13} className="text-amber-500" />
                            <div>
                                <p className="text-[9px] text-ios-systemGray font-bold uppercase">Pickup By</p>
                                <p className="text-[12px] font-black">
                                    {new Date(listing.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-ios-darkCard rounded-xl p-2.5 flex items-center gap-2 shadow-sm">
                            <Navigation size={13} className="text-ios-blue" />
                            <div>
                                <p className="text-[9px] text-ios-systemGray font-bold uppercase">Distance</p>
                                <p className="text-[12px] font-black">{listing.location.distance}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2.5 pt-1">
                        <button
                            onClick={() => onConfirmPickup(listing.id)}
                            className="w-full py-4 min-h-[48px] rounded-2xl bg-emerald-500 text-white font-black text-[14px] uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                        >
                            <CheckCircle size={18} />
                            I've Picked Up the Food
                        </button>
                        <button
                            onClick={handleOpenInMaps}
                            className="w-full py-3.5 min-h-[48px] rounded-2xl bg-ios-blue/10 text-ios-blue font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                        >
                            <ExternalLink size={14} />
                            Open in Google Maps
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 min-h-[48px] rounded-2xl bg-black/5 dark:bg-white/5 text-ios-systemGray font-bold text-[13px] active:scale-[0.97] transition-transform"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PickupModal;
