
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, ShieldCheck, Upload, Loader2 } from 'lucide-react';

import { verifyQualityPreviewInApi } from '../utils/storage';

type LocalQualityStatus = 'good' | 'bad';

interface LocalQualityResult {
    status: LocalQualityStatus;
    freshness: 'Fresh' | 'Questionable' | 'Spoiled';
    confidence: number;
    source: 'gemini' | 'local';
}

interface QualitySnapUploadProps {
    onImageUpload: (file: File) => void;
    onImageRemove: () => void;
}

const QualitySnapUpload: React.FC<QualitySnapUploadProps> = ({ onImageUpload, onImageRemove }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [qualityResult, setQualityResult] = useState<LocalQualityResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const setPreviewImage = useCallback(async (file: File) => {
        const url = URL.createObjectURL(file);
        setPreview(url);
        setIsAnalyzing(true);
        setQualityResult(null);
        setAnalysisError(null);
        onImageUpload(file);

        try {
            const response = await verifyQualityPreviewInApi(file);
            const statusMap: Record<LocalQualityResult['freshness'], LocalQualityStatus> = {
                Fresh: 'good',
                Questionable: 'bad',
                Spoiled: 'bad',
            };
            setQualityResult({
                freshness: response.quality.freshness,
                status: statusMap[response.quality.freshness],
                confidence: response.quality.confidence,
                source: response.quality.topPrediction.toLowerCase().startsWith('gemini:') ? 'gemini' : 'local',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not analyze image right now.';
            setAnalysisError(message);
        } finally {
            setIsAnalyzing(false);
        }
    }, [onImageUpload]);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            setPreviewImage(file);
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
        setIsAnalyzing(false);
        setQualityResult(null);
        setAnalysisError(null);
        onImageRemove();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const qualityBadgeClass = !qualityResult
        ? 'bg-ios-blue/10 border-ios-blue/20 text-ios-blue'
        : qualityResult.status === 'good'
            ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/12 border-red-500/30 text-red-600 dark:text-red-400';

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

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={`absolute bottom-3 left-3 right-3 px-4 py-2.5 rounded-2xl border backdrop-blur-xl ${qualityBadgeClass}`}
                        >
                            {isAnalyzing ? (
                                <div className="flex items-center gap-2.5">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-[12px] font-black uppercase tracking-wide">
                                        Processing with AI...
                                    </span>
                                </div>
                            ) : qualityResult ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5">
                                        <ShieldCheck size={16} />
                                        <span className="text-[12px] font-black uppercase tracking-wide">
                                            {qualityResult.status === 'good' ? 'Good Quality' : 'Bad Quality'}
                                        </span>
                                        <span className="ml-auto text-[10px] font-bold opacity-80">
                                            {(qualityResult.confidence * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                        Source: {qualityResult.source === 'gemini' ? 'Gemini API' : 'Local Analyzer'}
                                    </p>
                                </div>
                            ) : analysisError ? (
                                <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                                    {analysisError}
                                </span>
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <ShieldCheck size={16} />
                                    <span className="text-[12px] font-black uppercase tracking-wide">
                                        Ready For AI Quality Check
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QualitySnapUpload;
