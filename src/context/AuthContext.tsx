import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AppUser, UserRole } from '../../types';
import { supabase } from '../utils/supabaseClient';

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  isAuthLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapRole = (value: unknown): UserRole => (value === 'donor' ? 'donor' : 'receiver');

const fetchProfile = async (userId: string, email: string | undefined): Promise<AppUser | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.username,
    email: data.email || email || '',
    role: mapRole(data.role),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const activeSession = data.session;
      setSession(activeSession);

      if (activeSession?.user) {
        const profile = await fetchProfile(activeSession.user.id, activeSession.user.email);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    };

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setUser(null);
        setIsAuthLoading(false);
        return;
      }

      void fetchProfile(nextSession.user.id, nextSession.user.email).then((profile) => {
        setUser(profile);
        setIsAuthLoading(false);
      });
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { success: false, error: error?.message || 'Invalid email or password' };
    }

    const profile = await fetchProfile(data.user.id, data.user.email);
    if (!profile) {
      return { success: false, error: 'Profile not found for this account.' };
    }

    setUser(profile);
    return { success: true };
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: name,
          role,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const authUser = data.user;
    if (!authUser) {
      return {
        success: false,
        error: 'Signup completed, but user session is pending verification. Please check your email settings.',
      };
    }

    const profileUpsert = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        username: name,
        email,
        role,
      });

    if (profileUpsert.error) {
      return { success: false, error: profileUpsert.error.message };
    }

    setUser({
      id: authUser.id,
      name,
      email,
      role,
    });

    return { success: true };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthLoading,
      signIn,
      signUp,
      signOut,
    }),
    [user, session, isAuthLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
