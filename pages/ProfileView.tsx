
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Heart, LogOut, Sun, Moon, Package, HandHeart, Star, Camera } from 'lucide-react';
import { AppUser, FoodListing } from '../types';
import { showAppPopup } from '../utils/popup';

const PROFILE_PHOTO_KEY_PREFIX = 'sustain_profile_photo_';

interface ProfileViewProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  currentUser: AppUser;
  listings: FoodListing[];
  onLogout: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ darkMode, onToggleTheme, currentUser, listings, onLogout }) => {
  const profilePhotoKey = useMemo(() => `${PROFILE_PHOTO_KEY_PREFIX}${currentUser.id}`, [currentUser.id]);
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(profilePhotoKey);
    setProfilePhotoDataUrl(saved && saved.length > 0 ? saved : null);
  }, [profilePhotoKey]);

  const donorListings = listings.filter(l => l.donorEmail === currentUser.email);
  const foodsPosted = donorListings.length;
  const normalizedEmail = currentUser.email.trim().toLowerCase();
  const foodsClaimed = listings.filter((l) => (l.claimedBy || '').trim().toLowerCase() === normalizedEmail).length;
  const donorRatings = donorListings
    .map(l => l.donor?.rating)
    .filter((rating): rating is number => typeof rating === 'number');
  const donorAverageRating = donorRatings.length
    ? donorRatings.reduce((sum, rating) => sum + rating, 0) / donorRatings.length
    : null;

  const handleProfilePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      showAppPopup({
        title: 'Invalid file',
        message: 'Please select an image file.',
        tone: 'error',
      });
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showAppPopup({
        title: 'File too large',
        message: 'Please choose an image under 2 MB.',
        tone: 'error',
      });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        return;
      }
      localStorage.setItem(profilePhotoKey, result);
      setProfilePhotoDataUrl(result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar px-6 pt-16 pb-40">
      {/* Profile Hero */}
      <div className="flex flex-col items-center mb-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-4"
        >
          <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-ios-darkCard shadow-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
            {profilePhotoDataUrl ? (
              <img src={profilePhotoDataUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-4xl font-black">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <label className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-ios-blue text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-ios-darkCard cursor-pointer">
            <Camera size={16} />
            <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} />
          </label>
          <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-ios-darkCard ${
            currentUser.role === 'donor' ? 'bg-emerald-500 text-white' : 'bg-ios-blue text-white'
          }`}>
            {currentUser.role === 'donor' ? <Heart size={18} /> : <HandHeart size={18} />}
          </div>
        </motion.div>
        <h2 className="text-2xl font-black">{currentUser.name}</h2>
        <p className="text-ios-systemGray text-sm font-semibold">{currentUser.email}</p>
        <div className={`px-3 py-1 rounded-full text-xs font-bold mt-2 ${
          currentUser.role === 'donor'
            ? 'bg-emerald-500/10 text-emerald-600'
            : 'bg-ios-blue/10 text-ios-blue'
        }`}>
          {currentUser.role === 'donor' ? '🌱 Donor' : '🤝 Receiver'}
        </div>
        <p className="text-[11px] text-ios-systemGray font-semibold mt-2">Tap the camera icon to upload profile photo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="glass-panel rounded-2xl p-5 text-center shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
            <Package size={20} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black">{foodsPosted}</p>
          <p className="text-[11px] font-bold text-ios-systemGray uppercase tracking-wide">Foods Posted</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 text-center shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-ios-blue/10 flex items-center justify-center mx-auto mb-2">
            <HandHeart size={20} className="text-ios-blue" />
          </div>
          <p className="text-2xl font-black">{foodsClaimed}</p>
          <p className="text-[11px] font-bold text-ios-systemGray uppercase tracking-wide">Foods Claimed</p>
        </div>
      </div>

      {currentUser.role === 'donor' && (
        <div className="glass-panel rounded-2xl p-5 mb-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-ios-systemGray uppercase tracking-wide mb-1">Donor Rating</p>
              <p className="text-2xl font-black">
                {donorAverageRating === null ? '--' : donorAverageRating.toFixed(2)}
                <span className="text-sm font-bold text-ios-systemGray ml-1">/ 5</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star size={20} className="text-amber-500 fill-amber-500" />
            </div>
          </div>
        </div>
      )}

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
        </Section>

        <Section title="Account">
          <div className="p-4 bg-white/50 dark:bg-transparent">
            <div className="flex items-center gap-4">
              <div className="text-ios-blue opacity-80"><User size={18} /></div>
              <div>
                <span className="font-bold text-sm block">{currentUser.name}</span>
                <span className="text-[11px] text-ios-systemGray font-medium">{currentUser.email}</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="System">
          <motion.button
            whileTap={{ backgroundColor: "rgba(255,59,48,0.05)" }}
            onClick={onLogout}
            className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-transparent"
          >
            <div className="flex items-center gap-4">
              <div className="text-ios-systemRed opacity-80"><LogOut size={18} /></div>
              <span className="font-bold text-sm text-ios-systemRed">Log Out</span>
            </div>
          </motion.button>
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

export default ProfileView;
