import React from 'react';
import ThemeToggle from '../ui/ThemeToggle';

export default function TopNavbar() {
  return (
    <div className="flex items-center justify-end px-6 py-3 bg-background/50 backdrop-blur-md border-b border-border/20 sticky top-0 z-40">
      <ThemeToggle />
    </div>
  );
}
