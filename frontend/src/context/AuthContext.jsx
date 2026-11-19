import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authService from "../services/authService.js";
import { getAccessToken, setAccessToken } from "../services/apiClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Silent session refresh on initial load
  useEffect(() => {
    async function initAuth() {
      try {
        const refreshed = await authService.refreshSession();
        if (refreshed?.accessToken) {
          const profile = await authService.getCurrentUser();
          setUser(profile);
        }
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setIsLoading(true);
    try {
      const data = await authService.login({ email, password });
      setUser(data.user);
      if (data.user?.currentSocietyId) {
        localStorage.setItem("vl_active_society_id", String(data.user.currentSocietyId));
      }
      return data.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      localStorage.removeItem("vl_active_society_id");
    }
  }, []);

  const hasRole = useCallback(
    (...allowedRoles) => {
      if (!user) return false;
      return allowedRoles.includes(user.role);
    },
    [user]
  );

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    hasRole,
    accessToken: getAccessToken(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
