import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-300 group
        ${isDark
          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-amber-500/30 text-amber-400'
          : 'bg-black/5 border-black/10 hover:bg-black/10 hover:border-primary/30 text-primary'
        } ${className}`}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={isDark ? 'Modo Claro' : 'Modo Escuro'}
    >
      <Sun
        className={`absolute w-4 h-4 transition-all duration-300 ${
          isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
        }`}
      />
      <Moon
        className={`absolute w-4 h-4 transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
        }`}
      />
    </button>
  );
}
