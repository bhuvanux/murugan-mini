import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { userAPI } from '../utils/api/client';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, token: string, metadata?: { full_name?: string; city?: string }) => Promise<{ error: any }>;
  signInWithMock: (phone: string, metadata?: { full_name?: string; city?: string }) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Also set the token in the API client
      if (session?.access_token) {
        userAPI.setUserToken(session.access_token);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      // Update API client token
      if (session?.access_token) {
        userAPI.setUserToken(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  };

  const verifyOtp = async (phone: string, token: string, metadata?: { full_name?: string; city?: string }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) return { error };

    if (data.user && metadata) {
      // Update user metadata if provided (Signup flow)
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: metadata.full_name,
          city: metadata.city,
        }
      });
      if (updateError) console.error('Error updating user metadata:', updateError);
    }

    setUser(data.user);

    // Set the token in the API client for admin backend calls
    if (data.session?.access_token) {
      userAPI.setUserToken(data.session.access_token);
    }

    return { error: null };
  };

  const signInWithMock = (phone: string, metadata?: { full_name?: string; city?: string }) => {
    // MOCK USER OBJECT
    const mockUser: User = {
      id: 'mock-user-id-' + Math.random().toString(36).substr(2, 9),
      app_metadata: {},
      user_metadata: {
        full_name: metadata?.full_name || 'Mock User',
        city: metadata?.city || 'Mock City',
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      phone: phone,
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    setUser(mockUser);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);

    // Clear token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, sendOtp, verifyOtp, signInWithMock, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
