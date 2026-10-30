import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User | undefined>;
  register: (userData: { name: string; email: string; mobile: string; password: string }) => Promise<User | undefined>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('eyekart_token');
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('eyekart_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Validate existing token on mount
  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = localStorage.getItem('eyekart_token');
      if (storedToken) {
        try {
          const freshUser = await api.getCurrentUser();
          setUser(freshUser);
          localStorage.setItem('eyekart_user', JSON.stringify(freshUser));
        } catch (err) {
          console.warn("Session expired or invalid token:", err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const response = await api.login(credentials);
    if (response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('eyekart_token', response.token);
      localStorage.setItem('eyekart_user', JSON.stringify(response.user));
      return response.user;
    }
  };

  const register = async (userData: { name: string; email: string; mobile: string; password: string }) => {
    const response = await api.register(userData);
    if (response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('eyekart_token', response.token);
      localStorage.setItem('eyekart_user', JSON.stringify(response.user));
      return response.user;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('eyekart_token');
    localStorage.removeItem('eyekart_user');
    // Note: Do NOT remove 'eyekart_cart' to preserve cart as required by Step 28.
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
