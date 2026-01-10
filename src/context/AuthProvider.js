// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  login as apiLogin,
  verifyAuth,
  fetchJobData,
  authenticatedFetch,
} from "../service/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAutoLogin = async () => {
    try {
      const result = await apiLogin();
      if (result.success) {
        setAuthToken(result.token);
        setIsAuthenticated(true);
        localStorage.setItem("auth_token", result.token);
        console.log("Auto-login successful");
      } else {
        console.error("Auto-login failed:", result.error);
        // Keep trying periodically if auto-login fails
        setTimeout(handleAutoLogin, 5000); // Retry every 5 seconds
      }
    } catch (error) {
      console.error("Auto-login error:", error);
      // Keep trying periodically if auto-login fails
      setTimeout(handleAutoLogin, 5000); // Retry every 5 seconds
    }
  };

  const checkAuthStatus = async () => {
    try {
      // First, check if we have a stored token
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        setAuthToken(storedToken);
        console.log("Found stored token, verifying with backend...");
      }

      const isAuth = await verifyAuth();
      console.log("Auth status:", isAuth);

      if (isAuth) {
        setIsAuthenticated(true);
        // If we didn't have the token in state but backend says we're auth'd,
        // we might be relying on cookies
        if (!storedToken) {
          console.log("Authenticated via cookies");
        }
      } else {
        // Not authenticated - clean up any stale tokens
        setIsAuthenticated(false);
        setAuthToken(null);
        localStorage.removeItem("auth_token");
        console.log("Not authenticated - cleaned up tokens");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // On error, assume not authenticated and clean up
      setIsAuthenticated(false);
      setAuthToken(null);
      localStorage.removeItem("auth_token");
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const result = await apiLogin();

      if (result.success) {
        setAuthToken(result.token);
        setIsAuthenticated(true);
        setShowLoginModal(false); // Hide modal on successful login
        // Store token in localStorage as fallback for axios interceptor
        localStorage.setItem("auth_token", result.token);
        return { success: true, message: result.message };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthToken(null);
    setShowLoginModal(true); // Show modal immediately after logout
    // Clear any stored tokens
    localStorage.removeItem("auth_token");
  };

  // Use the authenticatedFetch from API service
  const makeAuthenticatedRequest = async (url, options = {}) => {
    try {
      const response = await authenticatedFetch(url, options);

      // If we get 401, user session expired
      if (response.status === 401) {
        setIsAuthenticated(false);
        setAuthToken(null);
        localStorage.removeItem("auth_token");
        throw new Error("Session expired. Please login again.");
      }

      return response;
    } catch (error) {
      // Handle session expiry
      if (
        error.message.includes("Authentication required") ||
        error.message.includes("session expired")
      ) {
        setIsAuthenticated(false);
        setAuthToken(null);
        localStorage.removeItem("auth_token");
      }
      throw error;
    }
  };

  // Convenient method to fetch job data
  const getJobData = async () => {
    try {
      const result = await fetchJobData();
      return result;
    } catch (error) {
      // Handle auth errors
      if (error.message.includes("Authentication required")) {
        setIsAuthenticated(false);
        setAuthToken(null);
      }
      throw error;
    }
  };
  // Check if user is already authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Show login modal if not authenticated and not loading
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Automatically attempt login without user interaction
      handleAutoLogin();
    }
  }, [handleAutoLogin, loading, isAuthenticated]);

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
