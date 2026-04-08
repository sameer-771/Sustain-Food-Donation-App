
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Heart } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onGoToSignup: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onGoToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const result = await onLogin(email.trim(), password);
    if (!result.success) {
      setError(result.error || 'Invalid email or password');
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
        className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30"
      >
        <Heart size={36} className="text-white fill-white/30" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-tight mb-1">Welcome Back</h1>
        <p className="text-ios-systemGray font-semibold text-sm">Sign in to Sustain</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
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
            placeholder="Password"
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
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-black text-[15px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 disabled:opacity-60"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <>
              <LogIn size={18} />
              Sign In
            </>
          )}
        </motion.button>
      </form>

      {/* Signup Link */}
      <div className="mt-8 text-center">
        <p className="text-ios-systemGray text-sm font-medium">
          Don't have an account?{' '}
          <button onClick={onGoToSignup} className="text-ios-blue font-bold">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
