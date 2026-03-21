import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/integrations/api/client';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const userData = await apiClient.getCurrentUser();
          if (userData?.data) {
            setUser(userData.data);
            setIsEmailVerified(userData.data.emailVerified || false);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true);
      const response = await apiClient.signUp(email, password, displayName);
      
      if (response.data?.token) {
        localStorage.setItem('authToken', response.data.token);
        const userData = await apiClient.getCurrentUser();
        if (userData?.data) {
          setUser(userData.data);
          setIsEmailVerified(userData.data.emailVerified || false);
        }
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiClient.signIn(email, password);
      
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        const userData = await apiClient.getCurrentUser();
        if (userData?.data) {
          setUser(userData.data);
          setIsEmailVerified(userData.data.emailVerified || false);
        }
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await apiClient.signOut();
      setUser(null);
      setIsEmailVerified(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isEmailVerified,
    signUp,
    signIn,
    signOut,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
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
