
import React from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, AlertTriangle, MapPin, Heart, ChevronRight, CheckCheck } from 'lucide-react';
import { AppNotification } from '../types';

interface ActivityViewProps {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  claimed: <CheckCircle size={18} className="text-emerald-500" />,
  expired: <AlertTriangle size={18} className="text-amber-500" />,
  donation_posted: <Heart size={18} className="text-ios-blue" />,
  pickup_confirmed: <MapPin size={18} className="text-ios-systemGreen" />,
};

const bgMap: Record<string, string> = {
  claimed: 'bg-emerald-500/10',
  expired: 'bg-amber-500/10',
  donation_posted: 'bg-ios-blue/10',
  pickup_confirmed: 'bg-ios-systemGreen/10',
};

const formatTime = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const ActivityView: React.FC<ActivityViewProps> = ({ notifications, onMarkAllRead }) => {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar px-6 pt-16 pb-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-0.5">Activity</h1>
          <p className="text-ios-systemGray font-semibold text-sm">
            {unread > 0 ? `${unread} new notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ios-blue/10 text-ios-blue text-[11px] font-bold"
          >
            <CheckCheck size={14} />
            Mark All Read
          </motion.button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif, idx) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: idx * 0.02 }}
              className={`glass-panel rounded-2xl p-4 flex items-start gap-3.5 shadow-sm transition-all ${!notif.read ? 'border-l-4 border-l-ios-blue' : 'opacity-70'}`}
            >
              <div className={`w-10 h-10 rounded-xl ${bgMap[notif.type] || 'bg-gray-100'} flex items-center justify-center shrink-0`}>
                {iconMap[notif.type] || <Bell size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-[13px] font-black leading-tight">{notif.title}</h4>
                  <span className="text-[10px] text-ios-systemGray font-bold whitespace-nowrap shrink-0">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>
                <p className="text-[12px] text-ios-systemGray font-medium mt-1 leading-relaxed">
                  {notif.message}
                </p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 bg-ios-blue rounded-full shrink-0 mt-1.5" />
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-ios-blue/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={28} className="text-ios-blue/30" />
          </div>
          <h3 className="text-lg font-black mb-1">No Activity Yet</h3>
          <p className="text-ios-systemGray text-sm font-medium">
            Notifications about your donations and claims will appear here.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivityView;
