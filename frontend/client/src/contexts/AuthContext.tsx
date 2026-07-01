import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  validateLoginInput,
  validateRegisterInput,
  sanitizeUserData,
  validateAuthData,
  clearAuthStorage,
  checkSessionExpiry,
} from '@/lib/auth-middleware';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string, confirmPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'wardcontroll_auth';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas

interface StoredAuth {
  user: User;
  token: string;
  timestamp: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sessao ao carregar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredAuth = JSON.parse(stored);

        // Validar estrutura dos dados
        if (!validateAuthData(parsed)) {
          clearAuthStorage();
          setIsLoading(false);
          return;
        }

        // Verificar se a sessao expirou
        if (checkSessionExpiry(parsed.timestamp, SESSION_TIMEOUT)) {
          clearAuthStorage();
        } else {
          setUser(parsed.user);
        }
      } catch (error) {
        console.error('Erro ao restaurar sessao:', error);
        clearAuthStorage();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const validation = validateLoginInput(email, password);
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Erro ao fazer login');
    }

    const sanitizedUser = sanitizeUserData(data.user);
    const authData: StoredAuth = {
      user: sanitizedUser,
      token: data.token,
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    setUser(sanitizedUser);
  };

  const register = async (email: string, password: string, name: string, confirmPassword?: string) => {
    const validation = validateRegisterInput(
      email,
      password,
      name,
      confirmPassword || password
    );
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Erro ao registrar usuario');
    }

    const sanitizedUser = sanitizeUserData(data.user);
    const authData: StoredAuth = {
      user: sanitizedUser,
      token: data.token,
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    setUser(sanitizedUser);
  };

  const logout = () => {
    clearAuthStorage();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

/**
 * Hook para verificar se o usuario esta autenticado
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
