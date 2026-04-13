import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { AppPopupPayload } from '../utils/popup';

interface AppPopupModalProps {
  popup: AppPopupPayload | null;
  onClose: () => void;
}

const toneToClasses = (tone: AppPopupPayload['tone']) => {
  if (tone === 'error') {
    return {
      badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      button: 'bg-red-500 hover:bg-red-600',
      label: 'Error',
    };
  }

  if (tone === 'success') {
    return {
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      button: 'bg-emerald-500 hover:bg-emerald-600',
      label: 'Success',
    };
  }

  return {
    badge: 'bg-ios-blue/10 text-ios-blue border-ios-blue/20',
    button: 'bg-ios-blue hover:bg-ios-blue/90',
    label: 'Notice',
  };
};

const AppPopupModal: React.FC<AppPopupModalProps> = ({ popup, onClose }) => {
  const classes = toneToClasses(popup?.tone);

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1400] flex items-center justify-center px-5"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/55" />
          <motion.div
            initial={{ scale: 0.96, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-ios-darkCard p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${classes.badge}`}>
              {popup.title || classes.label}
            </div>
            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-black dark:text-white">
              {popup.message}
            </p>

            <button
              type="button"
              onClick={onClose}
              className={`mt-5 h-11 w-full rounded-2xl text-sm font-black text-white transition-colors ${classes.button}`}
            >
              OK
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppPopupModal;
