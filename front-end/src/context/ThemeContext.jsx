import { createContext } from 'react';
import { useTheme } from '../hooks/useTheme';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const value = useTheme();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
