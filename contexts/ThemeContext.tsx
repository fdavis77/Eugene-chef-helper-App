import React, { createContext, useState, useContext, useMemo } from 'react';
import { themes } from '../utils/themes';
import type { Theme, ThemeName } from '../types';

interface ThemeContextType {
  themeName: ThemeName;
  setTheme: (theme: ThemeName) => void;
  activeTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setTheme] = useState<ThemeName>('twilight');
  const activeTheme = useMemo(() => themes[themeName], [themeName]);

  return (
    <ThemeContext.Provider value={{ themeName, setTheme, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};