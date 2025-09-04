import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Determine initial theme synchronously to avoid FOUC and invisible content
  const initialTheme: Theme = useMemo(() => {
    // Force dark mode only
    return 'dark';
  }, []);

  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    // Always enforce dark mode
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    // Do not persist any theme other than dark
  }, [theme]);

  // No-op: permanently dark
  const toggleTheme = () => setTheme('dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
