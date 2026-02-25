
import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Sparkles, TrendingUp, Users, Flame } from 'lucide-react';

interface TickerItem {
    icon: React.ReactNode;
    label: string;
    value: number;
    suffix: string;
    color: string;
}

const AnimatedCounter: React.FC<{ value: number; suffix: string }> = ({ value, suffix }) => {
    const [display, setDisplay] = useState(0);
    const motionVal = useMotionValue(0);

    useEffect(() => {
        const controls = animate(motionVal, value, {
            duration: 2,
            ease: 'easeOut',
            onUpdate: (v) => setDisplay(Math.round(v * 10) / 10),
        });
        return controls.stop;
    }, [value]);

    return (
        <span className="font-black tabular-nums">
            {display % 1 === 0 ? display.toFixed(0) : display.toFixed(1)}
            {suffix}
        </span>
    );
};

const LiveImpactTicker: React.FC = () => {
    const [stats, setStats] = useState({
        mealsSavedToday: 142,
        kgSaved: 38.5,
        activeDonors: 24,
        peopleFed: 89,
    });

    // Simulate live updates every 8 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                mealsSavedToday: prev.mealsSavedToday + Math.floor(Math.random() * 3),
                kgSaved: Math.round((prev.kgSaved + Math.random() * 1.5) * 10) / 10,
                activeDonors: prev.activeDonors + (Math.random() > 0.5 ? 1 : 0),
                peopleFed: prev.peopleFed + Math.floor(Math.random() * 2),
            }));
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const items: TickerItem[] = [
        { icon: <Sparkles size={13} className="fill-amber-300 text-amber-400" />, label: 'Meals Shared', value: stats.mealsSavedToday, suffix: '', color: 'text-amber-400' },
        { icon: <TrendingUp size={13} />, label: 'Saved', value: stats.kgSaved, suffix: ' kg', color: 'text-emerald-400' },
        { icon: <Flame size={13} />, label: 'Active Donors', value: stats.activeDonors, suffix: '', color: 'text-orange-400' },
        { icon: <Users size={13} />, label: 'People Fed', value: stats.peopleFed, suffix: '', color: 'text-blue-400' },
    ];

    return (
        <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35, delay: 0.3 }}
            className="w-full"
        >
            <div className="relative overflow-hidden rounded-2xl mx-4">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-gray-900/95 to-black/90 dark:from-white/[0.08] dark:via-white/[0.05] dark:to-white/[0.08]" />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10" />

                <div className="relative px-4 py-2.5 flex items-center gap-1">
                    {/* Live Indicator */}
                    <div className="flex items-center gap-1.5 mr-2 shrink-0">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400">Live</span>
                    </div>

                    {/* Scrolling Stats */}
                    <div className="flex-1 overflow-hidden">
                        <motion.div
                            className="flex gap-5 whitespace-nowrap"
                            animate={{ x: ['0%', '-50%'] }}
                            transition={{
                                x: { duration: 20, repeat: Infinity, ease: 'linear' }
                            }}
                        >
                            {[...items, ...items].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 shrink-0">
                                    <span className={item.color}>{item.icon}</span>
                                    <span className="text-[11px] text-white/90 dark:text-white/80">
                                        <AnimatedCounter value={item.value} suffix={item.suffix} />
                                    </span>
                                    <span className="text-[9px] text-white/40 font-bold uppercase">{item.label}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default LiveImpactTicker;
