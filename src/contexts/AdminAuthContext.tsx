import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { User } from '@supabase/supabase-js';

type AdminAuthContextType = {
    adminUser: User | null;
    loading: boolean;
    signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
    signOutAdmin: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const [adminUser, setAdminUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing admin session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                // Check if this is an admin user (has email matching admin)
                if (session.user.email === 'support@tamilkadavulmurugan.com') {
                    setAdminUser(session.user);
                }
            }
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user && session.user.email === 'support@tamilkadavulmurugan.com') {
                setAdminUser(session.user);
            } else if (_event === 'SIGNED_OUT') {
                setAdminUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) return { error };

            if (data.user && data.user.email === 'support@tamilkadavulmurugan.com') {
                setAdminUser(data.user);
                return { error: null };
            } else {
                // Not an admin user
                await supabase.auth.signOut();
                return { error: { message: 'Unauthorized: Not an admin account' } };
            }
        } catch (error: any) {
            return { error };
        }
    };

    const signOutAdmin = async () => {
        await supabase.auth.signOut();
        setAdminUser(null);
    };

    return (
        <AdminAuthContext.Provider value={{ adminUser, loading, signInWithEmail, signOutAdmin }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
}
