import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { userAPI } from '../utils/api/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  sendOtp: (phone: string, metadata?: { city?: string; device?: string; carrier?: string }) => Promise<{ data?: any; error: any }>;
  verifyOtp: (phone: string, token: string, metadata?: { name?: string; full_name?: string; city?: string; device?: string }) => Promise<{ data?: any; error: any }>;
  signInWithMock: (phone: string, metadata?: { name?: string; full_name?: string; city?: string; device?: string }) => void;
  signOut: () => Promise<void>;
  updateProfile: (metadata: { name?: string; full_name?: string; city?: string; email?: string; avatar_url?: string }) => Promise<{ error: any }>;
  checkUserExists: (phone: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for real Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        if (session.access_token) {
          userAPI.setUserToken(session.access_token);
        }
        setLoading(false);
      } else {
        // 2. If no real session, check for mock session in localStorage
        const savedMockSession = localStorage.getItem('murugan_mock_session');
        if (savedMockSession) {
          try {
            const mockUser = JSON.parse(savedMockSession);
            setUser(mockUser);
            console.log('Restored mock session for:', mockUser.phone);
          } catch (e) {
            console.error('Failed to parse mock session:', e);
            localStorage.removeItem('murugan_mock_session');
          }
        }
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        if (session.access_token) {
          userAPI.setUserToken(session.access_token);
        }
        // If we log in with real supabase, clear mock session
        localStorage.removeItem('murugan_mock_session');
      } else {
        // If supabase says null, but we have a mock session, don't clear user yet
        // unless it's a SIGN_OUT event
        if (_event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if user exists in database by phone number
  const checkUserExists = async (phone: string): Promise<boolean> => {
    try {
      // Clean phone number (remove spaces)
      const cleanPhone = phone.trim().replace(/ /g, '');
      console.log('[Auth] Checking existence for:', cleanPhone);

      const { data, error } = await supabase
        .from('users')
        .select('phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error) {
        console.warn('[Auth] Error checking user, assuming new:', error);
        return false;
      }

      const exists = !!data;
      console.log(`[Auth] User exists? ${exists}`);
      return exists;
    } catch (error) {
      console.error('[Auth] Error checking user existence:', error);
      return false;
    }
  };

  const sendOtp = async (phone: string, metadata?: { city?: string; device?: string; carrier?: string }) => {
    try {
      console.log('[AuthContext] Processing sendOtp for:', phone);

      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          phone,
          city: metadata?.city,
          device_id: metadata?.device,
          carrier: metadata?.carrier,
          metadata: metadata
        }
      });

      console.log('[AuthContext] OTP send response:', { data, error });
      return { data, error };
    } catch (error: any) {
      console.error('[AuthContext] Send OTP error:', error);
      return { data: null, error };
    }
  };

  const verifyOtp = async (phone: string, token: string, metadata?: any) => {
    try {
      console.log('[AuthContext] Verifying OTP for:', phone, 'Token:', token, 'Metadata:', metadata);

      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          phone,
          code: token,
          city: metadata?.city,
          device_id: metadata?.device,
          metadata: metadata
        }
      });

      console.log('[AuthContext] Raw verify response:', { data, error });

      if (error) {
        console.error('[AuthContext] OTP verification error:', error);
        return { data: null, error };
      }

      if (data && data.success === false) {
        console.warn('[AuthContext] OTP verification failed:', data.error);
        return { data: null, error: data.error || 'Invalid OTP. Please try again.' };
      }

      if (data && data.success !== false) {
        console.log('[AuthContext] ✅ OTP verification successful:', data);

        // Set user from successful verification
        if (data.user) {
          // Ensure user has proper role for dashboard access
          const authenticatedUser = {
            ...data.user,
            role: 'authenticated', // Explicitly set role
            aud: 'authenticated'
          };

          setUser(authenticatedUser);
          // PERSIST SESSION: Save to localStorage so it survives app restarts
          localStorage.setItem('murugan_mock_session', JSON.stringify(authenticatedUser));
          console.log('[AuthContext] User set and persisted with role:', authenticatedUser.role);

          if (data.session?.access_token) {
            userAPI.setUserToken(data.session.access_token);
          }
        }
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('[AuthContext] OTP verification exception:', error);
      return { data: null, error };
    }
  };

  const signInWithMock = async (phone: string, metadata?: { name?: string; full_name?: string; city?: string; device?: string }) => {
    const mockUser: User = {
      id: 'mock-user-id-' + Math.random().toString(36).substr(2, 9),
      app_metadata: {},
      user_metadata: {
        name: metadata?.name || metadata?.full_name || 'Mock User',
        full_name: metadata?.full_name || metadata?.name || 'Mock User',
        city: metadata?.city || 'Mock City',
        device: metadata?.device || 'Unknown',
      },
      aud: 'authenticated',
      role: 'authenticated', // Explicitly set role for dashboard access
      created_at: new Date().toISOString(),
      phone: phone,
      updated_at: new Date().toISOString(),
      email: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      factors: [],
    };

    setUser(mockUser);
    localStorage.setItem('murugan_mock_session', JSON.stringify(mockUser));
    console.log('[AuthContext] Mock user created with role:', mockUser.role);

    // [FIX] Robust Profile Sync
    try {
      const currentDevice = metadata?.device || navigator.userAgent;
      console.log('[AuthContext] Syncing profile for:', phone);

      // Step 1: Ensure row exists
      await supabase
        .from('users')
        .upsert({
          phone: phone,
          last_login_at: new Date().toISOString()
        }, { onConflict: 'phone' });

      // Step 2: Partial updates to preserve existing name/city
      const updates: any = {};
      if (metadata?.name || metadata?.full_name) {
        updates.name = metadata.name || metadata.full_name;
        updates.full_name = metadata.full_name || metadata.name;
      }
      if (metadata?.city && metadata.city !== 'Unknown') {
        updates.city = metadata.city;
      }
      if (currentDevice) {
        updates.device = currentDevice;
      }

      updates.metadata = {
        mock_user_id: mockUser.id,
        last_sync: new Date().toISOString()
      };

      if (Object.keys(updates).length > 0) {
        await supabase.from('users').update(updates).eq('phone', phone);
      }

      console.log('[AuthContext] ✅ Profile sync complete');
    } catch (dbError) {
      console.error('[AuthContext] Profile sync catch:', dbError);
    }
  };

  const signOut = async () => {
    if (user) {
      // Log session end
      await supabase.from('auth_events').insert({
        user_id: user.id.startsWith('mock-') ? null : user.id,
        event_type: 'auth_session_ended',
        metadata: { phone: user.phone }
      });
    }

    await supabase.auth.signOut();

    // CRITICAL: Clear ALL user-specific localStorage data to prevent data bleeding
    const userSpecificKeys = [
      'murugan_mock_session',
      'user_favorites',
      'music_playlists',
      'last_selected_city',
      'murugan_anonymous_user_id',
      'murugan_swipe_hint_seen',
      'api_cache',
      'lastSyncTimestamp',
      'murugan_user_id'
    ];

    // Remove all known user-specific keys
    userSpecificKeys.forEach(key => localStorage.removeItem(key));

    // Clear any dynamic cache keys (cache_*, *_timestamp, banner caches)
    Object.keys(localStorage).forEach(key => {
      if (
        key.startsWith('cache_') ||
        key.endsWith('_timestamp') ||
        key.includes('banner_cache')
      ) {
        localStorage.removeItem(key);
      }
    });

    // Clear API cache if available
    try {
      const { apiCache } = await import('../utils/api/cache');
      apiCache.clear();
    } catch (e) {
      console.warn('[Auth] Could not clear API cache:', e);
    }

    setUser(null);
    userAPI.setUserToken(null);

    console.log('[Auth] ✅ User logged out, all user-specific data cleared');
  };

  const updateProfile = async (metadata: { name?: string; full_name?: string; city?: string; email?: string; avatar_url?: string }) => {
    if (!user) return { error: { message: 'No user logged in' } };

    if (user.id.startsWith('mock-')) {
      try {
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            ...metadata
          },
        };
        setUser(updatedUser);
        localStorage.setItem('murugan_mock_session', JSON.stringify(updatedUser));

        // Sync to database
        const updates: any = {};
        if (metadata.name || metadata.full_name) updates.name = metadata.name || metadata.full_name;
        if (metadata.city) updates.city = metadata.city;

        await supabase
          .from('users')
          .update(updates)
          .eq('phone', user.phone);

        return { error: null };
      } catch (error) {
        return { error };
      }
    }

    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });

    if (!error && data.user) {
      setUser(data.user);
      console.log('[AuthContext] Local user state updated immediately');

      if (user.phone) {
        // ✅ Explicitly sync to public.users table to ensure persistence
        try {
          const updates: any = {};
          if (metadata.name || metadata.full_name) {
            updates.name = metadata.name || metadata.full_name;
            updates.full_name = metadata.full_name || metadata.name;
          }
          if (metadata.city) updates.city = metadata.city;
          if (metadata.email) updates.email = metadata.email;

          await supabase
            .from('users')
            .update(updates)
            .eq('phone', user.phone);

          console.log('[AuthContext] ✅ Synced detailed profile to public.users');
        } catch (syncErr) {
          console.error('[AuthContext] ⚠️ Failed to sync public.users:', syncErr);
        }
      }
    }

    return { error };
  };

  const refreshProfile = async () => {
    const { data: { user: textUser }, error } = await supabase.auth.getUser();
    if (!error && textUser) {
      setUser(textUser);
      if (textUser.role === 'authenticated') {
        // ensure consistency
        if (textUser.id.startsWith('mock-')) return;
        // maybe sync mock? no.
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      sendOtp,
      verifyOtp,
      signInWithMock,
      signOut,
      updateProfile,
      checkUserExists,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
