
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Apple, DollarSign } from 'lucide-react';

const springConfig = { type: "spring" as const, stiffness: 500, damping: 30, mass: 0.8 };

interface DonateFABProps {
  onSelectType: (type: 'food' | 'money') => void;
}

const DonateFAB: React.FC<DonateFABProps> = ({ onSelectType }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (type: 'food' | 'money') => {
    onSelectType(type);
    setIsOpen(false);
  };

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for FAB menu */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40" 
            />
            
            <div className="absolute bottom-20 flex flex-col gap-5 items-center z-50">
              {/* Money Donation Button */}
              <motion.button
                initial={{ opacity: 0, y: 30, scale: 0.4 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.4 }}
                transition={{ ...springConfig, delay: 0.05 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleSelect('money')}
                className="w-13 h-13 rounded-full bg-ios-blue text-white shadow-2xl flex items-center justify-center relative group"
              >
                <DollarSign size={24} />
                <motion.span 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute right-16 glass-panel px-4 py-2 rounded-2xl text-[11px] font-black whitespace-nowrap text-ios-blue border border-ios-blue/20 shadow-xl"
                >
                  DONATE FUNDS
                </motion.span>
              </motion.button>

              {/* Food Donation Button */}
              <motion.button
                initial={{ opacity: 0, y: 30, scale: 0.4 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.4 }}
                transition={springConfig}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleSelect('food')}
                className="w-13 h-13 rounded-full bg-ios-systemGreen text-white shadow-2xl flex items-center justify-center relative group"
              >
                <Apple size={24} />
                <motion.span 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute right-16 glass-panel px-4 py-2 rounded-2xl text-[11px] font-black whitespace-nowrap text-ios-systemGreen border border-ios-systemGreen/20 shadow-xl"
                >
                  DONATE FOOD
                </motion.span>
              </motion.button>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.9 }}
        transition={springConfig}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_15px_30px_-5px_rgba(0,122,255,0.4)] z-[60] transition-all duration-300 transform ${
          isOpen 
          ? 'bg-ios-darkCard dark:bg-white text-white dark:text-black rotate-45' 
          : 'bg-ios-blue text-white scale-110'
        }`}
      >
        <Plus size={36} />
      </motion.button>
    </div>
  );
};

export default DonateFAB;
