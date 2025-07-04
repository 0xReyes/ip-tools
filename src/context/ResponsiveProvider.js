import React, { useState, useEffect, useMemo, useCallback, createContext } from 'react';
// Context for responsive values context
const ResponsiveContext = createContext(null);

// Provider for responsive values
const ResponsiveProvider = ({ children }) => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getResponsiveValue = useCallback((baseValue, scaleFactor = 0.015) => {
    return Math.max(baseValue, windowSize.width * scaleFactor);
  }, [windowSize.width]);

  const getResponsiveFontSize = useCallback((baseSize) => {
    return `${Math.max(baseSize, windowSize.width * 0.015)}px`;
  }, [windowSize.width]);

  const contextValue = useMemo(() => ({
    getResponsiveValue,
    getResponsiveFontSize,
    windowWidth: windowSize.width
  }), [getResponsiveValue, getResponsiveFontSize, windowSize.width]);

  return (
    <ResponsiveContext.Provider value={contextValue}>
      {children}
    </ResponsiveContext.Provider>
  );
};

export { ResponsiveProvider, ResponsiveContext };
