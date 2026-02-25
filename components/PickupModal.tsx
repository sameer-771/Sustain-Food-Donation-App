
import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Navigation, Clock, CheckCircle, Phone, Copy } from 'lucide-react';
import { FoodListing } from '../types';

interface PickupModalProps {
    listing: FoodListing | null;
    onClose: () => void;
    onConfirmPickup: (id: string) => void;
}

const PickupModal: React.FC<PickupModalProps> = ({ listing, onClose, onConfirmPickup }) => {
    if (!listing) return null;

    const handleCopyAddress = () => {
        navigator.clipboard?.writeText(listing.location.address);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end justify-center"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-ios-lightBg dark:bg-ios-darkBg rounded-t-[2.5rem] overflow-hidden pb-10"
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/10" />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-5 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
                >
                    <X size={16} className="text-ios-systemGray" />
                </button>

                <div className="px-6 pt-2 pb-4 space-y-5">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-lg">
                            <img src={listing.thumbnailUrl} alt={listing.title} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">{listing.title}</h3>
                            <p className="text-ios-systemGray text-sm font-semibold">from {listing.donor.name}</p>
                        </div>
                    </div>

                    {/* Success Banner */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <CheckCircle size={22} className="text-emerald-500 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Food Claimed Successfully!</p>
                            <p className="text-[11px] text-ios-systemGray font-medium">The donor has been notified you're coming.</p>
                        </div>
                    </div>

                    {/* Pickup Location */}
                    <div className="glass-panel rounded-2xl overflow-hidden">
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <MapPin size={16} className="text-ios-blue" />
                                <span className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest">Pickup Location</span>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-[15px] font-bold">{listing.location.address}</p>
                                    <p className="text-[12px] text-ios-systemGray font-medium mt-1">{listing.location.distance} away</p>
                                </div>
                                <button
                                    onClick={handleCopyAddress}
                                    className="shrink-0 w-9 h-9 rounded-xl bg-ios-blue/10 flex items-center justify-center"
                                >
                                    <Copy size={14} className="text-ios-blue" />
                                </button>
                            </div>
                        </div>

                        {/* Mini Map Preview */}
                        <div className="relative h-32 bg-gradient-to-br from-blue-50 via-emerald-50/50 to-blue-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800">
                            <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,#007AFF_0.5px,transparent_0.5px)] [background-size:14px_14px]" />
                            {/* Roads */}
                            <div className="absolute top-[35%] left-0 right-0 h-[1px] bg-ios-systemGray/20" />
                            <div className="absolute top-[65%] left-0 right-0 h-[1px] bg-ios-systemGray/15" />
                            <div className="absolute left-[30%] top-0 bottom-0 w-[1px] bg-ios-systemGray/20" />
                            <div className="absolute left-[70%] top-0 bottom-0 w-[1px] bg-ios-systemGray/15" />
                            {/* Pin */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full z-10">
                                <div className="w-7 h-7 bg-gradient-to-b from-ios-systemRed to-red-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-red-600" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-ios-systemRed/15 animate-ping" />
                            </div>
                        </div>
                    </div>

                    {/* Info Row */}
                    <div className="flex gap-3">
                        <div className="flex-1 glass-panel rounded-xl p-3 flex items-center gap-2">
                            <Clock size={14} className="text-amber-500" />
                            <div>
                                <p className="text-[10px] text-ios-systemGray font-bold uppercase">Pickup By</p>
                                <p className="text-[13px] font-black">
                                    {new Date(listing.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 glass-panel rounded-xl p-3 flex items-center gap-2">
                            <Navigation size={14} className="text-ios-blue" />
                            <div>
                                <p className="text-[10px] text-ios-systemGray font-bold uppercase">Distance</p>
                                <p className="text-[13px] font-black">{listing.location.distance}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => onConfirmPickup(listing.id)}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-black text-[14px] uppercase tracking-wider shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={18} />
                            I've Picked Up the Food
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={onClose}
                            className="w-full py-3.5 rounded-2xl bg-black/5 dark:bg-white/5 text-ios-systemGray font-bold text-[13px]"
                        >
                            Close
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PickupModal;
