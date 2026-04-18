import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <header className="flex items-center justify-between py-6 px-10 border-b border-white/5 bg-[#0D2137]/50 backdrop-blur-md sticky top-0 z-40">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 font-medium">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
};

export default Header;
