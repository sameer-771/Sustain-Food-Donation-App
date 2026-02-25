
import React from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Heart, MapPin, ChevronRight, LogOut, Settings, Sun, Moon } from 'lucide-react';

interface ProfileViewProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ darkMode, onToggleTheme }) => {
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar px-6 pt-16 pb-40">
      {/* Profile Hero */}
      <div className="flex flex-col items-center mb-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-4"
        >
          <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-ios-darkCard shadow-2xl">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-ios-blue text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-ios-darkCard">
            <Settings size={18} />
          </div>
        </motion.div>
        <h2 className="text-2xl font-black">Julian Martinez</h2>
        <div className="bg-ios-blue/10 text-ios-blue px-3 py-1 rounded-full text-xs font-bold mt-1">
          Level 4 Community Hero
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        <Section title="Preferences">
          <motion.button
            whileTap={{ backgroundColor: "rgba(0,122,255,0.05)" }}
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-transparent"
          >
            <div className="flex items-center gap-4">
              <div className="text-ios-blue opacity-80">
                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <span className="font-bold text-sm">Appearance</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-ios-systemGray uppercase">
                {darkMode ? 'Dark' : 'Light'}
              </span>
              <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${darkMode ? 'bg-ios-blue' : 'bg-gray-300'}`}>
                <motion.div 
                  animate={{ x: darkMode ? 24 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </div>
            </div>
          </motion.button>
          <SettingsItem icon={<Bell size={18} />} label="Notifications" badge="2" />
        </Section>

        <Section title="Account Settings">
          <SettingsItem icon={<User size={18} />} label="Personal Information" />
          <SettingsItem icon={<Shield size={18} />} label="Security & Privacy" />
          <SettingsItem icon={<MapPin size={18} />} label="My Addresses" />
        </Section>

        <Section title="Community Impact">
          <SettingsItem icon={<Heart size={18} />} label="Favorite Vendors" badge="12" />
        </Section>

        <Section title="System">
          <SettingsItem icon={<LogOut size={18} />} label="Log Out" color="text-ios-systemRed" hideArrow />
        </Section>
      </div>

      <div className="mt-12 text-center opacity-30">
        <p className="text-[10px] font-black text-ios-systemGray uppercase tracking-widest">Sustain App v2.4.0 • Built for Good</p>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h3 className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest px-4 mb-2 opacity-50">{title}</h3>
    <div className="glass-panel rounded-[2rem] overflow-hidden shadow-sm border border-black/5 divide-y divide-black/5 dark:divide-white/5">
      {children}
    </div>
  </div>
);

const SettingsItem: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  color?: string, 
  hideArrow?: boolean,
  badge?: string 
}> = ({ icon, label, color = "text-ios-blue", hideArrow, badge }) => (
  <motion.button
    whileTap={{ backgroundColor: "rgba(0,122,255,0.05)" }}
    className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-transparent"
  >
    <div className="flex items-center gap-4">
      <div className={`${color} opacity-80`}>{icon}</div>
      <span className="font-bold text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {badge && <span className="bg-ios-blue text-white text-[10px] font-black px-2 py-0.5 rounded-full">{badge}</span>}
      {!hideArrow && <ChevronRight size={18} className="text-ios-systemGray" />}
    </div>
  </motion.button>
);

export default ProfileView;
