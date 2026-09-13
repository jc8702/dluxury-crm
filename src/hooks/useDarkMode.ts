import { useTheme } from '../context/ThemeContext';

export interface UseDarkModeReturn {
  isDark: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
}

export function useDarkMode(): UseDarkModeReturn {
  const { theme, toggleTheme, setTheme } = useTheme();
  return {
    isDark: theme === 'dark',
    toggle: toggleTheme,
    setDark: (value: boolean) => setTheme(value ? 'dark' : 'light'),
  };
}

export default useDarkMode;
