import React from 'react';
import ThemeToggle from '../ui/ThemeToggle';
import Breadcrumbs from '../ui/Breadcrumbs';
import { Menu } from 'lucide-react';

interface TopNavbarProps {
  onMenuClick?: () => void;
}

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-background/50 backdrop-blur-md border-b border-border/20 sticky top-0 z-40">
      <div className="flex items-center lg:hidden mr-4">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-foreground hover:bg-muted rounded-lg">
          <Menu size={24} />
        </button>
      </div>
      <div className="flex-1">
        <Breadcrumbs />
      </div>
      <ThemeToggle />
    </div>
  );
}
