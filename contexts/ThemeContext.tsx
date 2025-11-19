import React, { createContext, useContext, useMemo } from 'react';
import { themes } from '../utils/themes';
import type { Theme, ThemeName } from '../types';
import { usePersistentState } from '../hooks/usePersistentState';

interface ThemeContextType {
  themeName: ThemeName;
  setTheme: (theme: ThemeName) => void;
  activeTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isValidThemeName = (name: any): name is ThemeName => {
    return name === 'dark' || name === 'light' || name === 'evergreen';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedTheme, setTheme] = usePersistentState<ThemeName>('themeName', 'light');

  // Validate theme from localStorage, default to 'light' if it's invalid (e.g., from a previous session)
  const themeName = isValidThemeName(storedTheme) ? storedTheme : 'light';

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