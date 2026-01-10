// src/context/AuthProvider.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  login as apiLogin,
  verifyAuth,
  fetchJobData,
  authenticatedFetch,
} from "../service/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ✅ memoized + defined BEFORE useEffect
  const handleAutoLogin = useCallback(async () => {
    try {
      const result = await apiLogin();
      if (result?.success) {
        setAuthToken(result.token);
        setIsAuthenticated(true);
        setShowLoginModal(false);
        localStorage.setItem("auth_token", result.token);
      } else {
        setShowLoginModal(true);
      }
    } catch (err) {
      console.error("Auto-login error:", err);
      setShowLoginModal(true);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) setAuthToken(storedToken);

      const isAuth = await verifyAuth();
      if (isAuth) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setAuthToken(null);
        localStorage.removeItem("auth_token");
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setIsAuthenticated(false);
      setAuthToken(null);
      localStorage.removeItem("auth_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      void handleAutoLogin();
    }
  }, [handleAutoLogin, loading, isAuthenticated]);

  const login = async () => {
    try {
      const result = await apiLogin();
      if (result?.success) {
        setAuthToken(result.token);
        setIsAuthenticated(true);
        setShowLoginModal(false);
        localStorage.setItem("auth_token", result.token);
        return { success: true, message: result.message };
      }
      return { success: false, error: result?.error || "Login failed" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthToken(null);
    setShowLoginModal(true);
    localStorage.removeItem("auth_token");
  };

  const makeAuthenticatedRequest = async (url, options = {}) => {
    const response = await authenticatedFetch(url, options);
    if (response.status === 401) {
      setIsAuthenticated(false);
      setAuthToken(null);
      localStorage.removeItem("auth_token");
      throw new Error("Session expired. Please login again.");
    }
    return response;
  };

  const getJobData = async () => fetchJobData();

  const value = {
    isAuthenticated,
    loading,
    login,
    logout,
    authenticatedFetch: makeAuthenticatedRequest,
    getJobData,
    authToken,
    showLoginModal,
    setShowLoginModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
