
import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, List, Search, Compass } from 'lucide-react';

const MapView: React.FC = () => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Search Overlay */}
      <div className="absolute top-16 left-6 right-6 z-20">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-panel rounded-2xl h-14 flex items-center px-5 shadow-2xl border-white/30"
        >
          <Search size={20} className="text-ios-systemGray" />
          <input 
            type="text" 
            placeholder="Search nearby food hubs..." 
            className="flex-1 bg-transparent border-none outline-none px-4 text-base font-semibold placeholder:text-ios-systemGray/50" 
          />
        </motion.div>
      </div>

      {/* Map Content - Stylized Mock */}
      <div className="w-full h-full bg-[#f9f9fb] dark:bg-[#0a0a0b] relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&q=80&w=1200')] bg-cover opacity-30 dark:opacity-20 grayscale brightness-75" />
        
        {/* Animated Grid lines for tech feel */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#fff_1px,transparent_1px)]" />

        {/* Dynamic Pins */}
        <MapMarker x="25%" y="35%" label="Wild Flour" color="bg-ios-blue" />
        <MapMarker x="70%" y="25%" label="Community Market" color="bg-ios-systemGreen" />
        <MapMarker x="50%" y="60%" label="Cafe Green" color="bg-ios-systemRed" />
        
        {/* User Location */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute left-[40%] top-[45%] w-6 h-6 z-30"
        >
          <div className="w-full h-full bg-ios-blue rounded-full ring-4 ring-ios-blue/20 animate-pulse" />
          <div className="absolute inset-0 bg-ios-blue rounded-full border-2 border-white shadow-lg" />
        </motion.div>
      </div>

      {/* Map Controls */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
        <MapControl icon={<Navigation size={22} />} />
        <MapControl icon={<Compass size={22} />} />
        <MapControl icon={<List size={22} />} />
      </div>
    </div>
  );
};

const MapMarker: React.FC<{ x: string, y: string, label: string, color: string }> = ({ x, y, label, color }) => (
  <motion.div 
    initial={{ scale: 0, y: 20 }}
    animate={{ scale: 1, y: 0 }}
    whileHover={{ scale: 1.1, y: -5 }}
    style={{ left: x, top: y }}
    className="absolute flex flex-col items-center gap-1.5 cursor-pointer z-10"
  >
    <div className={`p-3.5 rounded-full ${color} text-white shadow-2xl ring-4 ring-white dark:ring-black transition-transform`}>
      <MapPin size={24} className="fill-white/20" />
    </div>
    <div className="glass-panel px-3 py-1 rounded-xl shadow-lg border-white/30 backdrop-blur-md">
      <span className="text-[11px] font-black tracking-tight whitespace-nowrap">{label}</span>
    </div>
  </motion.div>
);

const MapControl: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <motion.button
    whileTap={{ scale: 0.9, backgroundColor: "rgba(0,122,255,0.1)" }}
    className="w-13 h-13 glass-panel rounded-[1.25rem] flex items-center justify-center text-ios-blue shadow-2xl border-white/40"
  >
    {icon}
  </motion.button>
);

export default MapView;
