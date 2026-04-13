import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AppUser, UserRole } from '../../types';
import { supabase } from '../utils/supabaseClient';

const API_BASE_URL = (() => {
  const runtimeWindow = globalThis.window;
  if (runtimeWindow === undefined) {
    return 'http://127.0.0.1:8000';
  }

  const fromEnv = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
  if (fromEnv) {
    return fromEnv;
  }

  const protocol = runtimeWindow.location.protocol;
  const host = runtimeWindow.location.hostname || '127.0.0.1';
  return `${protocol}//${host}:8000`;
})();

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

const toFriendlyAuthError = (raw: string | undefined, fallback: string): string => {
  const message = (raw || '').toLowerCase();

  if (!message) {
    return fallback;
  }
  if (message.includes('already') || message.includes('exists') || message.includes('registered') || message.includes('security purposes')) {
    return 'Account already exists. Please sign in instead.';
  }
  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
    return 'Invalid email or password.';
  }
  if (message.includes('email not confirmed')) {
    return 'Email confirmation is required for this account.';
  }
  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'Could not complete signup automatically. Please try again.';
  }

  return raw || fallback;
};

async function postJson<T>(path: string, payload: unknown): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { status: response.status, error: (body as { detail?: string }).detail || `Request failed (${response.status})` };
    }

    return { status: response.status, data: body as T };
  } catch {
    return { status: 0, error: 'Backend is not reachable. Please ensure API server is running.' };
  }
}

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
      return { success: false, error: toFriendlyAuthError(error?.message, 'Invalid email or password') };
    }

    let profile = await fetchProfile(data.user.id, data.user.email);
    if (!profile) {
      await postJson('/api/auth/login', { email, password });
      profile = await fetchProfile(data.user.id, data.user.email);
    }

    if (!profile) {
      return { success: false, error: 'Account profile is missing. Please retry once.' };
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
    const registerResult = await postJson<{ id: string; name: string; email: string; role: UserRole }>('/api/auth/register', {
      name,
      email,
      password,
      role,
    });

    if (registerResult.error) {
      const lowered = registerResult.error.toLowerCase();
      if (lowered.includes('already')) {
        return signIn(email, password);
      }
      return { success: false, error: toFriendlyAuthError(registerResult.error, 'Signup failed') };
    }

    return signIn(email, password);
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
