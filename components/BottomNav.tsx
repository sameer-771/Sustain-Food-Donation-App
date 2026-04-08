
import React from 'react';
import { motion } from 'framer-motion';
import { Map, Bell, User, Upload, Search } from 'lucide-react';
import { ViewType, UserRole } from '../types';

interface BottomNavProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  userRole: UserRole;
  notificationCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onViewChange, userRole, notificationCount = 0 }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto z-[120]">
      <div className="glass-panel rounded-t-[2rem] px-8 py-3 safe-area-bottom flex items-center justify-between shadow-2xl shadow-black/10">
        <NavIcon
          active={activeView === 'home'}
          onClick={() => onViewChange('home')}
          icon={userRole === 'donor' ? <Upload size={24} /> : <Search size={24} />}
        />

        <NavIcon
          active={activeView === 'map'}
          onClick={() => onViewChange('map')}
          icon={<Map size={24} />}
        />

        <NavIcon
          active={activeView === 'activity'}
          onClick={() => onViewChange('activity')}
          icon={<Bell size={24} />}
          badge={notificationCount}
        />

        <NavIcon
          active={activeView === 'profile'}
          onClick={() => onViewChange('profile')}
          icon={<User size={24} />}
        />
      </div>
    </div>
  );
};

const NavIcon: React.FC<{ active: boolean; icon: React.ReactNode; onClick: () => void; badge?: number }> = ({
  active, icon, onClick, badge = 0
}) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center transition-all duration-300 ${active ? 'text-ios-blue' : 'text-ios-systemGray'
      }`}
  >
    <motion.div
      whileTap={{ scale: 0.8 }}
      animate={active ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
    >
      {icon}
    </motion.div>
    {active && (
      <motion.div
        layoutId="activeDot"
        className="absolute -bottom-1.5 w-1 h-1 bg-ios-blue rounded-full"
      />
    )}
    {/* Notification Badge */}
    {badge > 0 && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-1 -right-2.5 min-w-[16px] h-[16px] bg-ios-systemRed rounded-full flex items-center justify-center px-1"
      >
        <span className="text-[9px] font-black text-white">{badge > 9 ? '9+' : badge}</span>
      </motion.div>
    )}
  </button>
);

export default BottomNav;
