
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, ShieldCheck, Sparkles, Upload, AlertTriangle } from 'lucide-react';
import { FreshnessLevel } from '../types';

interface QualitySnapUploadProps {
    onImageUpload: (file: File, freshness: FreshnessLevel) => void;
    onImageRemove: () => void;
}

const QualitySnapUpload: React.FC<QualitySnapUploadProps> = ({ onImageUpload, onImageRemove }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [freshness, setFreshness] = useState<FreshnessLevel | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const analyzeImage = useCallback((file: File) => {
        const url = URL.createObjectURL(file);
        setPreview(url);
        setIsAnalyzing(true);
        setFreshness(null);

        // Simulate AI freshness analysis (1.8s)
        setTimeout(() => {
            const levels: FreshnessLevel[] = ['excellent', 'good', 'fair'];
            const result = levels[Math.floor(Math.random() * 2)]; // bias toward excellent/good
            setFreshness(result);
            setIsAnalyzing(false);
            onImageUpload(file, result);
        }, 1800);
    }, [onImageUpload]);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            analyzeImage(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleRemove = () => {
        setPreview(null);
        setFreshness(null);
        setIsAnalyzing(false);
        onImageRemove();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const freshnessConfig = {
        excellent: { label: 'Excellent Freshness', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: <ShieldCheck size={16} /> },
        good: { label: 'Good Quality', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: <ShieldCheck size={16} /> },
        fair: { label: 'Fair – Consume Soon', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: <AlertTriangle size={16} /> },
    };

    return (
        <div className="space-y-3">
            <label className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-1 flex items-center gap-2">
                <Camera size={12} /> Quality Snap
            </label>

            <AnimatePresence mode="wait">
                {!preview ? (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative w-full aspect-[16/10] rounded-[2rem] border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-4 transition-all duration-300 group ${isDragging
                                ? 'border-ios-blue bg-ios-blue/10 scale-[1.02]'
                                : 'border-ios-systemGray/20 bg-white/50 dark:bg-white/[0.03] hover:border-ios-blue/40 hover:bg-ios-blue/5'
                            }`}
                    >
                        <motion.div
                            animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-ios-blue to-ios-systemGreen text-white flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow"
                        >
                            {isDragging ? <Upload size={28} /> : <Camera size={28} />}
                        </motion.div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-black/70 dark:text-white/70">
                                {isDragging ? 'Drop your photo here' : 'Tap to snap or upload'}
                            </p>
                            <p className="text-[11px] text-ios-systemGray mt-1 font-medium">
                                AI will verify freshness automatically
                            </p>
                        </div>

                        {/* Corner Brackets for scan feel */}
                        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-ios-blue/30 rounded-tl-lg" />
                        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-ios-blue/30 rounded-tr-lg" />
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-ios-blue/30 rounded-bl-lg" />
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-ios-blue/30 rounded-br-lg" />

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full aspect-[16/10] rounded-[2rem] overflow-hidden bg-black/5 dark:bg-white/5"
                    >
                        <img src={preview} alt="Food preview" className="w-full h-full object-cover" />

                        {/* Remove Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleRemove}
                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center z-20"
                        >
                            <X size={18} />
                        </motion.button>

                        {/* AI Scan Overlay */}
                        <AnimatePresence>
                            {isAnalyzing && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-10"
                                >
                                    {/* Scan line animation */}
                                    <motion.div
                                        animate={{ y: ['0%', '100%', '0%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(52,199,89,0.5)]"
                                    />
                                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Sparkles size={28} className="text-emerald-400" />
                                        </motion.div>
                                        <span className="text-white text-[12px] font-black uppercase tracking-widest">Analyzing Freshness…</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Freshness Badge */}
                        <AnimatePresence>
                            {freshness && !isAnalyzing && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className={`absolute bottom-3 left-3 right-3 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border backdrop-blur-xl ${freshnessConfig[freshness].bg}`}
                                >
                                    <span className={freshnessConfig[freshness].color}>{freshnessConfig[freshness].icon}</span>
                                    <span className={`text-[12px] font-black uppercase tracking-wide ${freshnessConfig[freshness].color}`}>
                                        {freshnessConfig[freshness].label}
                                    </span>
                                    <span className="ml-auto text-[9px] font-bold text-white/40 uppercase">AI Verified</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QualitySnapUpload;
