
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Apple, DollarSign, Camera, CreditCard, ChevronRight, Check } from 'lucide-react';

interface DonationOverlayProps {
  type: 'food' | 'money';
  onClose: () => void;
}

const DonationOverlay: React.FC<DonationOverlayProps> = ({ type, onClose }) => {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('20');

  const isFood = type === 'food';

  const nextStep = () => setStep(prev => prev + 1);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
      className="fixed inset-0 z-[100] bg-ios-lightBg dark:bg-ios-darkBg flex flex-col"
    >
      {/* Header */}
      <div className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-ios-lightBg/80 dark:bg-ios-darkBg/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isFood ? 'bg-ios-systemGreen text-white' : 'bg-ios-blue text-white'}`}>
            {isFood ? <Apple size={20} /> : <DollarSign size={20} />}
          </div>
          <h2 className="text-xl font-black">{isFood ? 'Donate Surplus' : 'Donate Funds'}</h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-ios-systemGray"
        >
          <X size={20} />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-20">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div>
              <h3 className="text-3xl font-black tracking-tight mb-2">
                {isFood ? 'What are you sharing?' : 'How much to share?'}
              </h3>
              <p className="text-ios-systemGray font-semibold leading-relaxed">
                {isFood ? 'Take a photo or describe the items you wish to donate to the community.' : 'Your contribution helps logistics and packaging for fresh rescued food.'}
              </p>
            </div>

            {isFood ? (
              <div className="space-y-6">
                <button className="w-full aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-ios-blue/30 bg-ios-blue/5 flex flex-col items-center justify-center gap-3 group active:bg-ios-blue/10 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-ios-blue text-white flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                    <Camera size={28} />
                  </div>
                  <span className="text-ios-blue font-bold">Snap a Photo</span>
                </button>
                <div className="space-y-4">
                  <label className="text-xs font-black text-ios-systemGray uppercase tracking-widest px-4">Description</label>
                  <textarea 
                    placeholder="e.g. 5 freshly baked sourdough loaves..."
                    className="w-full bg-white dark:bg-ios-darkCard rounded-2xl p-5 border-none focus:ring-2 focus:ring-ios-blue min-h-[120px] font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-3 gap-3">
                  {['5', '10', '20', '50', '100', 'Custom'].map(val => (
                    <button 
                      key={val}
                      onClick={() => val !== 'Custom' && setAmount(val)}
                      className={`h-16 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${
                        amount === val ? 'bg-ios-blue text-white shadow-xl' : 'bg-white dark:bg-ios-darkCard text-ios-systemGray'
                      }`}
                    >
                      {val === 'Custom' ? val : `$${val}`}
                    </button>
                  ))}
                </div>
                <div className="glass-panel p-6 rounded-[2.5rem] space-y-4">
                  <h4 className="font-bold">Summary</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-ios-systemGray font-medium">Rescuing capacity</span>
                    <span className="font-bold text-ios-systemGreen">~{parseInt(amount) * 3}kg saved</span>
                  </div>
                  <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} className="h-full bg-ios-systemGreen" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 text-center pt-20">
            <div className="w-24 h-24 bg-ios-systemGreen rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-ios-systemGreen/30">
              <Check size={48} className="text-white" strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-black">Success!</h3>
            <p className="text-ios-systemGray font-semibold px-10">
              {isFood 
                ? 'Your donation has been listed. Nearby heroes will be notified shortly.'
                : `Thank you for your $${amount} donation. You've just helped save more food!`}
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="p-6 pb-12 sticky bottom-0 bg-gradient-to-t from-ios-lightBg dark:from-ios-darkBg via-ios-lightBg/50 dark:via-ios-darkBg/50 to-transparent">
        {step === 1 ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={nextStep}
            className={`w-full py-5 rounded-[1.5rem] text-white font-black text-lg shadow-2xl flex items-center justify-center gap-2 ${
              isFood ? 'bg-ios-systemGreen shadow-ios-systemGreen/30' : 'bg-ios-blue shadow-ios-blue/30'
            }`}
          >
            {isFood ? 'Post Donation' : 'Complete Donation'}
            <ChevronRight size={20} />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-full py-5 rounded-[1.5rem] bg-ios-darkCard dark:bg-white text-white dark:text-black font-black text-lg shadow-xl"
          >
            Done
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default DonationOverlay;
