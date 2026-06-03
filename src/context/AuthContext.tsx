import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, hasAuthToken, removeAuthToken } from '../lib/api';
import type { User, SystemUser } from '../types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  authLoading: boolean;
  systemUsers: SystemUser[];
  loadSystemUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  useEffect(() => {
    const init = async () => {
      if (hasAuthToken()) {
        try {
          const res = await api.auth.me();
          setUser(res.user);
        } catch {
          removeAuthToken();
          setUser(null);
        }
      }
      setAuthLoading(false);
    };
    init();
  }, []);

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const loadSystemUsers = async () => {
    if (user?.role === 'admin') {
      try {
        const u = await api.users.list();
        setSystemUsers(u);
      } catch (err) {
        console.error('Error loading system users:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, logout, authLoading, systemUsers, loadSystemUsers }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
