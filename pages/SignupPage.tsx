
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, UserPlus, Heart, Search } from 'lucide-react';
import { UserRole } from '../types';

interface SignupPageProps {
  onSignup: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  onGoToLogin: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onGoToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('donor');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);
    const result = await onSignup(name.trim(), email.trim(), password, role);
    if (!result.success) {
      setError(result.error || 'Signup failed');
    }
    setIsLoading(false);
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto flex flex-col items-center justify-center px-8 bg-ios-lightBg dark:bg-ios-darkBg text-black dark:text-white">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
        className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/30"
      >
        <UserPlus size={36} className="text-white" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h1 className="text-3xl font-black tracking-tight mb-1">Create Account</h1>
        <p className="text-ios-systemGray font-semibold text-sm">Join the Sustain community</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* Role */}
        <div>
          <p className="text-[11px] font-black text-ios-systemGray uppercase tracking-widest mb-2 px-1">Create Account As</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('donor')}
              className={`h-12 rounded-xl border text-sm font-black flex items-center justify-center gap-2 transition-all ${
                role === 'donor'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25'
                  : 'bg-white dark:bg-ios-darkCard border-black/10 dark:border-white/10 text-ios-systemGray'
              }`}
            >
              <Heart size={16} className={role === 'donor' ? 'fill-white/30' : ''} />
              Donor
            </button>
            <button
              type="button"
              onClick={() => setRole('receiver')}
              className={`h-12 rounded-xl border text-sm font-black flex items-center justify-center gap-2 transition-all ${
                role === 'receiver'
                  ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                  : 'bg-white dark:bg-ios-darkCard border-black/10 dark:border-white/10 text-ios-systemGray'
              }`}
            >
              <Search size={16} />
              Receiver
            </button>
          </div>
          <p className="text-[11px] text-ios-systemGray font-semibold mt-2 px-1">
            Donor can donate and receive. Receiver can only claim and pickup.
          </p>
        </div>

        {/* Name */}
        <div className="relative">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-systemGray" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full h-14 pl-12 pr-5 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-semibold placeholder:text-ios-systemGray/40 text-[15px]"
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-systemGray" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full h-14 pl-12 pr-5 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-semibold placeholder:text-ios-systemGray/40 text-[15px]"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-systemGray" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 4 characters)"
            className="w-full h-14 pl-12 pr-5 rounded-2xl bg-white dark:bg-ios-darkCard border-none shadow-sm focus:ring-2 focus:ring-ios-blue transition-all font-semibold placeholder:text-ios-systemGray/40 text-[15px]"
          />
        </div>

        {/* Error */}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-ios-systemRed text-sm font-semibold text-center">
            {error}
          </motion.p>
        )}

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="submit"
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-400 text-white font-black text-[15px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 disabled:opacity-60"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <>
              <UserPlus size={18} />
              Create Account
            </>
          )}
        </motion.button>
      </form>

      {/* Login Link */}
      <div className="mt-8 text-center">
        <p className="text-ios-systemGray text-sm font-medium">
          Already have an account?{' '}
          <button onClick={onGoToLogin} className="text-ios-blue font-bold">
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
