import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { userAPI } from '../utils/api/client';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    setUser(data.user);
    
    // Set the token in the API client for admin backend calls
    if (data.session?.access_token) {
      userAPI.setUserToken(data.session.access_token);
    }
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
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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
