
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, ChevronRight, Apple, Clock, Flame, Filter, Sparkles } from 'lucide-react';
import { DonationItem } from '../types';

const springConfig = { type: "spring" as const, stiffness: 400, damping: 35, mass: 0.8 };

const MOCK_DONATIONS: DonationItem[] = [
  {
    id: '1',
    title: 'Artisan Bread Basket',
    description: 'A mix of rustic sourdough loaves and crispy baguettes, baked fresh at 5 AM today.',
    donor: 'Wild Flour Bakery',
    distance: '0.4 mi',
    timeLeft: '1h 20m',
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: '2',
    title: 'Veggie Power Bowl',
    description: 'Healthy grain bowls with roasted sweet potato, kale, and chickpeas. Organic ingredients only.',
    donor: 'Green Leaf Cafe',
    distance: '1.2 mi',
    timeLeft: '3h 45m',
    category: 'Prepared',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: '3',
    title: 'Honeycrisp Apples',
    description: 'Crunchy, sweet organic apples. Perfect for a healthy community snack.',
    donor: 'Market Fresh',
    distance: '2.5 mi',
    timeLeft: '50m',
    category: 'Produce',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e470124239e?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: '4',
    title: 'Gourmet Pastry Box',
    description: 'Croissants, muffins and cinnamon rolls. A premium treat rescued from today\'s surplus.',
    donor: 'Sugar & Spice',
    distance: '0.8 mi',
    timeLeft: '2h 10m',
    category: 'Bakery',
    imageUrl: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&q=80&w=600',
  }
];

const CATEGORIES = ['All', 'Produce', 'Bakery', 'Prepared', 'Dairy'];

const HomeFeed: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredItems = activeCategory === 'All' 
    ? MOCK_DONATIONS 
    : MOCK_DONATIONS.filter(i => i.category === activeCategory);

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth">
      {/* Header Spacer for Dynamic Island */}
      <div className="sticky top-0 left-0 right-0 z-[100] h-20 flex justify-center items-start pt-4 pointer-events-none">
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...springConfig, delay: 0.5 }}
          className="bg-black text-white px-5 py-2.5 rounded-[2rem] flex items-center gap-3 shadow-2xl pointer-events-auto border border-white/10"
        >
          <div className="w-5 h-5 bg-ios-systemGreen rounded-full flex items-center justify-center">
            <Sparkles size={12} className="text-white fill-white" />
          </div>
          <span className="text-[11px] font-black tracking-tight uppercase">12.4kg food saved</span>
          <div className="w-1.5 h-1.5 bg-ios-systemGreen rounded-full animate-pulse" />
        </motion.div>
      </div>

      <div className="px-6 pb-40">
        {/* Title Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="mt-2 mb-6"
        >
          <h1 className="text-4xl font-black tracking-tight mb-1">Discover</h1>
          <p className="text-ios-systemGray font-bold opacity-70">Rescuing food, together.</p>
        </motion.div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-systemGray transition-colors group-focus-within:text-ios-blue" size={18} />
            <input 
              type="text" 
              placeholder="Bakeries, cafes, markets..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-semibold placeholder:text-ios-systemGray/40"
            />
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 glass-panel rounded-2xl flex items-center justify-center text-ios-blue shadow-sm"
          >
            <Filter size={20} />
          </motion.button>
        </div>

        {/* Horizontal Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6 mb-8 py-1">
          {CATEGORIES.map((cat) => (
            <motion.button 
              key={cat}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-[13px] font-black whitespace-nowrap transition-all shadow-sm ${
                activeCategory === cat 
                ? 'bg-ios-blue text-white shadow-ios-blue/20' 
                : 'bg-white dark:bg-ios-darkCard text-ios-systemGray hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {cat.toUpperCase()}
            </motion.button>
          ))}
        </div>

        {/* List Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-black">Rescued Near You</h2>
            <button className="text-ios-blue text-sm font-black flex items-center gap-0.5">
              SEE ALL <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ ...springConfig, delay: idx * 0.03 }}
                >
                  <DonationWidget item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const DonationWidget: React.FC<{ item: DonationItem }> = ({ item }) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    className="group bg-white dark:bg-ios-darkCard rounded-[2.5rem] overflow-hidden shadow-[0_15px_45px_-15px_rgba(0,0,0,0.1)] dark:shadow-none border border-black/[0.03] dark:border-white/[0.05]"
  >
    <div className="relative h-56 overflow-hidden">
      <motion.img 
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.8 }}
        src={item.imageUrl} 
        alt={item.title} 
        className="w-full h-full object-cover" 
        loading="lazy"
      />
      <div className="absolute top-5 right-5 glass-panel px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-ios-blue">
        {item.category}
      </div>
      <div className="absolute bottom-5 left-5 glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 shadow-xl border border-white/20">
        <Clock size={14} className="text-ios-systemGreen" />
        <span className="text-[11px] font-black uppercase tracking-tighter">{item.timeLeft}</span>
      </div>
    </div>
    <div className="p-7">
      <div className="mb-4">
        <h3 className="text-2xl font-black leading-tight mb-1.5 tracking-tight">{item.title}</h3>
        <div className="flex items-center gap-2 text-ios-systemGray text-sm font-bold opacity-80">
           <MapPin size={16} className="text-ios-blue" />
           {item.donor} • {item.distance}
        </div>
      </div>
      <p className="text-ios-systemGray text-[15px] mb-7 line-clamp-2 leading-relaxed font-semibold opacity-70">
        {item.description}
      </p>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.96 }}
        className="w-full bg-ios-blue text-white py-4.5 rounded-[1.25rem] text-[15px] font-black shadow-[0_12px_24px_-8px_rgba(0,122,255,0.4)] transition-all uppercase tracking-widest"
      >
        Claim Now
      </motion.button>
    </div>
  </motion.div>
);

export default HomeFeed;
