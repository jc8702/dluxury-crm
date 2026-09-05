import React from 'react';
import { Sun } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      disabled
      className={`relative flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-surface text-muted-foreground cursor-not-allowed opacity-50 ${className}`}
      aria-label="Tema fixo (claro)"
      title="Tema claro"
    >
      <Sun className="w-4 h-4" />
    </button>
  );
}
