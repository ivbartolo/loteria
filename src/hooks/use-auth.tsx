import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { auth } from '@/integrations/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Auth context type
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github' | 'discord') => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const session = await auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange(async (user) => {
      setUser(user);
      const session = await auth.getSession();
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await auth.signIn(email, password);
      if (error) throw error;

      // Update user state
      await refreshUser();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await auth.signUp(email, password);
      if (error) throw error;

      // Update user state
      await refreshUser();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with OAuth provider
  const signInWithProvider = async (provider: 'google' | 'github' | 'discord') => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await auth.signInWithProvider(provider);
      if (error) throw error;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
      
      const currentSession = await auth.getSession();
      setSession(currentSession);
    } catch (err) {
      setError(err as Error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Hook to check if user is authenticated
export function useRequireAuth() {
  const { user, loading } = useAuth();
  
  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}


