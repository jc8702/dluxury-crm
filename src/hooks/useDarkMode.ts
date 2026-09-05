import { useTheme } from '../context/ThemeContext';

export interface UseDarkModeReturn {
  isDark: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
}

export function useDarkMode(): UseDarkModeReturn {
  return {
    isDark: false,
    toggle: () => {},
    setDark: (_value: boolean) => {},
  };
}

export default useDarkMode;
