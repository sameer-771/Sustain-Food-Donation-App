
import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, LocateFixed } from 'lucide-react';

interface MapPickerProps {
    onLocationSelect: (lat: number, lng: number, address: string) => void;
}

const MOCK_ADDRESSES = [
    '123 Main St, Downtown',
    '456 Oak Avenue, Westside',
    '789 Elm Blvd, East Quarter',
    '321 Pine Road, North Village',
    '654 Cedar Lane, Riverside',
];

const MapPicker: React.FC<MapPickerProps> = ({ onLocationSelect }) => {
    const [pinPosition, setPinPosition] = useState({ x: 50, y: 45 }); // percentage
    const [address, setAddress] = useState('Tap map to set pickup location');
    const [isDragging, setIsDragging] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);

    const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = mapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPinPosition({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
        const randomAddr = MOCK_ADDRESSES[Math.floor(Math.random() * MOCK_ADDRESSES.length)];
        setAddress(randomAddr);
        onLocationSelect(40.7128 + (y - 50) * 0.001, -74.006 + (x - 50) * 0.001, randomAddr);
    }, [onLocationSelect]);

    const handleUseCurrentLocation = () => {
        setIsLocating(true);
        // Simulate geolocation
        setTimeout(() => {
            setPinPosition({ x: 50, y: 45 });
            setAddress('Your Current Location');
            onLocationSelect(40.7128, -74.006, 'Your Current Location');
            setIsLocating(false);
        }, 1200);
    };

    return (
        <div className="space-y-3">
            <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 flex items-center gap-2">
                <MapPin size={12} /> Pickup Location
            </label>

            <div className="glass-panel rounded-[2rem] overflow-hidden shadow-lg shadow-black/5">
                {/* Map Area */}
                <div
                    ref={mapRef}
                    onClick={handleMapClick}
                    className="relative w-full h-48 cursor-crosshair overflow-hidden select-none"
                    style={{ touchAction: 'none' }}
                >
                    {/* Stylized Map Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-emerald-50/50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

                    {/* Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle,#007AFF_0.5px,transparent_0.5px)] [background-size:16px_16px]" />

                    {/* Roads */}
                    <div className="absolute top-[30%] left-0 right-0 h-[1px] bg-ios-systemGray/20" />
                    <div className="absolute top-[55%] left-0 right-0 h-[1px] bg-ios-systemGray/20" />
                    <div className="absolute top-[75%] left-0 right-0 h-[1px] bg-ios-systemGray/15" />
                    <div className="absolute left-[25%] top-0 bottom-0 w-[1px] bg-ios-systemGray/20" />
                    <div className="absolute left-[60%] top-0 bottom-0 w-[1px] bg-ios-systemGray/20" />
                    <div className="absolute left-[80%] top-0 bottom-0 w-[1px] bg-ios-systemGray/15" />

                    {/* Area Blocks */}
                    <div className="absolute top-[10%] left-[28%] w-[30%] h-[18%] rounded-lg bg-emerald-200/20 dark:bg-emerald-400/10 border border-emerald-300/20" />
                    <div className="absolute top-[58%] left-[10%] w-[14%] h-[15%] rounded-lg bg-blue-200/30 dark:bg-blue-400/10 border border-blue-300/20" />
                    <div className="absolute top-[35%] left-[65%] w-[20%] h-[20%] rounded-lg bg-amber-200/20 dark:bg-amber-400/10 border border-amber-300/20" />

                    {/* Pin */}
                    <motion.div
                        animate={{
                            left: `${pinPosition.x}%`,
                            top: `${pinPosition.y}%`,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="absolute z-20 -translate-x-1/2 -translate-y-full"
                    >
                        {/* Pin Shadow */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/20 rounded-full blur-sm" />

                        <motion.div
                            animate={isDragging ? { scale: 1.2, y: -5 } : { scale: 1, y: 0 }}
                        >
                            <div className="relative">
                                <div className="w-8 h-8 bg-gradient-to-b from-ios-systemRed to-red-600 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                                </div>
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-600" />
                            </div>
                        </motion.div>

                        {/* Pulse Ring */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-ios-systemRed/20 animate-ping" />
                    </motion.div>
                </div>

                {/* Address Bar */}
                <div className="px-5 py-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-ios-blue/10 flex items-center justify-center shrink-0">
                            <MapPin size={16} className="text-ios-blue" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{address}</p>
                            <p className="text-[10px] text-ios-systemGray font-medium">Tap the map to adjust</p>
                        </div>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleUseCurrentLocation}
                        disabled={isLocating}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ios-blue/10 text-ios-blue text-[11px] font-bold disabled:opacity-50"
                    >
                        <LocateFixed size={14} className={isLocating ? 'animate-spin' : ''} />
                        {isLocating ? 'Locating…' : 'Use GPS'}
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default MapPicker;
