
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star, MessageSquare } from 'lucide-react';

interface RatingModalProps {
  listingTitle: string;
  onSubmit: (rating: number, feedback: string) => void;
  onSkip: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ listingTitle, onSubmit, onSkip }) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feedback, setFeedback] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[160] flex items-end justify-center"
      onClick={onSkip}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50"
      />

      {/* Modal */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-ios-lightBg dark:bg-ios-darkBg rounded-t-[2rem] overflow-hidden"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-black/10 dark:bg-white/10" />
        </div>

        {/* Close */}
        <button
          onClick={onSkip}
          className="absolute top-3 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center z-20"
        >
          <X size={16} className="text-ios-systemGray" />
        </button>

        <div className="px-6 pt-2 pb-10 space-y-5">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <Star size={24} className="text-amber-500" />
            </div>
            <h3 className="text-xl font-black">Rate your experience</h3>
            <p className="text-ios-systemGray text-sm font-medium mt-1">{listingTitle} — optional</p>
          </div>

          {/* Stars */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={36}
                  className={`transition-colors ${
                    star <= (hoveredStar || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm font-bold text-amber-500">
              {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Excellent!'}
            </p>
          )}

          {/* Feedback */}
          <div className="relative">
            <MessageSquare size={14} className="absolute left-3.5 top-3.5 text-ios-systemGray/50" />
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Any feedback? (optional)"
              rows={3}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm text-[13px] font-semibold placeholder:text-ios-systemGray/40 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={() => rating > 0 && onSubmit(rating, feedback)}
              disabled={rating === 0}
              className={`w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.97] transition-all ${
                rating > 0
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              Submit Rating
            </button>
            <button
              onClick={onSkip}
              className="w-full py-3 rounded-2xl bg-black/5 dark:bg-white/5 text-ios-systemGray font-bold text-[13px] active:scale-[0.97] transition-transform"
            >
              Skip
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RatingModal;
