
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Navigation, Clock, CheckCircle, Copy } from 'lucide-react';
import { FoodListing } from '../types';

declare const L: any;

interface PickupModalProps {
    listing: FoodListing | null;
    onClose: () => void;
    onConfirmPickup: (id: string) => void;
}

const PickupModal: React.FC<PickupModalProps> = ({ listing, onClose, onConfirmPickup }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (!listing || !mapRef.current) return;

        // Small delay to let the modal animation finish before rendering map
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

                // Custom red marker
                const icon = L.divIcon({
                    html: `<div style="
                        width: 32px; height: 32px;
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 3px solid white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: flex; align-items: center; justify-content: center;
                    "><div style="
                        width: 8px; height: 8px;
                        background: white;
                        border-radius: 50%;
                        transform: rotate(45deg);
                    "></div></div>`,
                    className: '',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                });

                L.marker([listing.location.lat, listing.location.lng], { icon }).addTo(map);
                mapInstanceRef.current = map;
            } catch (e) {
                console.error('Map init error:', e);
            }
        }, 350);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [listing]);

    if (!listing) return null;

    const handleCopyAddress = () => {
        navigator.clipboard?.writeText(listing.location.address);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] flex items-end justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-ios-lightBg dark:bg-ios-darkBg rounded-t-[2rem] overflow-hidden"
                style={{ maxHeight: '85vh' }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center z-10"
                >
                    <X size={16} className="text-ios-systemGray" />
                </button>

                {/* Scrollable Content */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 40px)' }}>
                    <div className="px-5 pt-1 pb-8 space-y-4">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                                <img src={listing.thumbnailUrl} alt={listing.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black leading-tight">{listing.title}</h3>
                                <p className="text-ios-systemGray text-sm font-semibold">from {listing.donor.name}</p>
                            </div>
                        </div>

                        {/* Success Banner */}
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center gap-3">
                            <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Food Claimed Successfully!</p>
                                <p className="text-[11px] text-ios-systemGray font-medium">The donor has been notified you're coming.</p>
                            </div>
                        </div>

                        {/* Pickup Location with Real Map */}
                        <div className="bg-white dark:bg-ios-darkCard rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-3.5 space-y-2">
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-ios-blue" />
                                    <span className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest">Pickup Location</span>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                        <p className="text-[14px] font-bold">{listing.location.address}</p>
                                        <p className="text-[12px] text-ios-systemGray font-medium mt-0.5">{listing.location.distance} away</p>
                                    </div>
                                    <button
                                        onClick={handleCopyAddress}
                                        className="shrink-0 w-8 h-8 rounded-xl bg-ios-blue/10 flex items-center justify-center"
                                    >
                                        <Copy size={13} className="text-ios-blue" />
                                    </button>
                                </div>
                            </div>

                            {/* Real Leaflet Map */}
                            <div
                                ref={mapRef}
                                className="w-full"
                                style={{ height: '160px' }}
                            />
                        </div>

                        {/* Info Row */}
                        <div className="flex gap-3">
                            <div className="flex-1 bg-white dark:bg-ios-darkCard rounded-xl p-3 flex items-center gap-2 shadow-sm">
                                <Clock size={14} className="text-amber-500" />
                                <div>
                                    <p className="text-[10px] text-ios-systemGray font-bold uppercase">Pickup By</p>
                                    <p className="text-[13px] font-black">
                                        {new Date(listing.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex-1 bg-white dark:bg-ios-darkCard rounded-xl p-3 flex items-center gap-2 shadow-sm">
                                <Navigation size={14} className="text-ios-blue" />
                                <div>
                                    <p className="text-[10px] text-ios-systemGray font-bold uppercase">Distance</p>
                                    <p className="text-[13px] font-black">{listing.location.distance}</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2.5 pt-1">
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onConfirmPickup(listing.id)}
                                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-[14px] uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} />
                                I've Picked Up the Food
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={onClose}
                                className="w-full py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-ios-systemGray font-bold text-[13px]"
                            >
                                Close
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PickupModal;
