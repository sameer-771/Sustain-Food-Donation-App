
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationToastProps {
    notification: AppNotification | null;
    onDismiss: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
    claimed: <CheckCircle size={20} className="text-emerald-400" />,
    expired: <AlertTriangle size={20} className="text-amber-400" />,
    donation_posted: <Bell size={20} className="text-ios-blue" />,
    pickup_confirmed: <MapPin size={20} className="text-ios-systemGreen" />,
    feedback: <Bell size={20} className="text-violet-400" />,
};

const bgMap: Record<string, string> = {
    claimed: 'from-emerald-500/20 to-emerald-500/5',
    expired: 'from-amber-500/20 to-amber-500/5',
    donation_posted: 'from-ios-blue/20 to-ios-blue/5',
    pickup_confirmed: 'from-ios-systemGreen/20 to-ios-systemGreen/5',
    feedback: 'from-violet-500/20 to-violet-500/5',
};

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(onDismiss, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification, onDismiss]);

    return (
        <AnimatePresence>
            {notification && (
                <motion.div
                    initial={{ y: -80, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -80, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed top-12 left-4 right-4 z-[1200] max-w-md mx-auto"
                >
                    <div className={`glass-panel rounded-2xl p-4 shadow-2xl border border-white/20 overflow-hidden`}>
                        {/* Gradient accent */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${bgMap[notification.type] || bgMap.donation_posted} rounded-2xl`} />

                        <div className="relative flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-white/5 flex items-center justify-center shrink-0 backdrop-blur-sm">
                                {iconMap[notification.type] || iconMap.donation_posted}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black">{notification.title}</p>
                                <p className="text-[11px] text-ios-systemGray font-semibold mt-0.5 line-clamp-2">{notification.message}</p>
                            </div>
                            <button
                                onClick={onDismiss}
                                className="shrink-0 w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center mt-0.5"
                            >
                                <X size={12} className="text-ios-systemGray" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NotificationToast;
