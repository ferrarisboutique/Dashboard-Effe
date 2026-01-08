import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, UserProfile, UserRole, API_BASE_URL, supabaseAnonKey } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAnalyst: boolean;
  isUploader: boolean;
  hasRole: (role: UserRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, this might be first login
        // We'll need admin to create the profile
        console.error('Error fetching profile:', error);
        setProfile(null);
        return null;
      }

      setProfile(data as UserProfile);
      return data as UserProfile;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setProfile(null);
      return null;
    }
  }, []);

  // Log activity
  const logActivity = useCallback(async (action: string, details?: Record<string, unknown>) => {
    if (!user) return;

    try {
      await fetch(`${API_BASE_URL}/auth/log-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          action,
          details,
          user_agent: navigator.userAgent,
        }),
      });
    } catch (err) {
      // Silently fail - logging should not block user actions
      console.error('Failed to log activity:', err);
    }
  }, [user, session]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('Error in initAuth:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return { error };
      }

      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);
        
        // Check if user has a profile (has been granted access)
        if (!userProfile) {
          await supabase.auth.signOut();
          const noAccessError = {
            message: 'Account non autorizzato. Contatta l\'amministratore.',
            name: 'AuthError',
            status: 403,
          } as AuthError;
          setError(noAccessError.message);
          setLoading(false);
          return { error: noAccessError };
        }

        // Log successful login
        await logActivity('login', { email });
      }

      setLoading(false);
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore durante il login';
      setError(errorMessage);
      setLoading(false);
      return { error: { message: errorMessage, name: 'AuthError', status: 500 } as AuthError };
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    
    // Log logout before signing out
    await logActivity('logout');
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Role checks
  const isAdmin = profile?.role === 'admin';
  const isAnalyst = profile?.role === 'analyst';
  const isUploader = profile?.role === 'uploader';

  const hasRole = (role: UserRole) => profile?.role === role;

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    error,
    signIn,
    signOut,
    isAdmin,
    isAnalyst,
    isUploader,
    hasRole,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}



