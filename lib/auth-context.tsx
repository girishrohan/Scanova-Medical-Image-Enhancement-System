// lib/auth-context.tsx — SCANOVA Authentication Context
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { DEMO_USERS } from "./config";

export type User = {
  username: string;
  authenticated: boolean;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load auth from localStorage on mount
    const authData = localStorage.getItem("scanova-auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.timestamp > Date.now() - 24 * 60 * 60 * 1000) { // 24 hours
          setUser({
            username: parsed.username,
            authenticated: parsed.authenticated,
          });
        }
      } catch {
        localStorage.removeItem("scanova-auth");
      }
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const validPassword = DEMO_USERS[username as keyof typeof DEMO_USERS];
    if (validPassword === password) {
      const newUser = { username, authenticated: true };
      setUser(newUser);
      localStorage.setItem("scanova-auth", JSON.stringify({
        ...newUser,
        timestamp: Date.now(),
      }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("scanova-auth");
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user?.authenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// Helper functions for standalone use
export function getAuth(): User | null {
  if (typeof window === "undefined") return null;
  const authData = localStorage.getItem("scanova-auth");
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      if (parsed.timestamp > Date.now() - 24 * 60 * 60 * 1000) {
        return { username: parsed.username, authenticated: parsed.authenticated };
      }
    } catch {
      localStorage.removeItem("scanova-auth");
    }
  }
  return null;
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("scanova-auth");
}