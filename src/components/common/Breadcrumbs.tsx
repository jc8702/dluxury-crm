import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function Breadcrumbs() {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(p => p);

  if (paths.length === 0) return null;

  return (
    <nav className="flex items-center text-sm text-muted-foreground font-medium hidden sm:flex">
      {paths.map((path, index) => {
        const isLast = index === paths.length - 1;
        const to = `/${paths.slice(0, index + 1).join('/')}`;
        // capitalize first letter and replace hyphens
        const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');

        return (
          <React.Fragment key={path}>
            {index > 0 && <ChevronRight size={14} className="mx-2 opacity-50" />}
            {isLast ? (
              <span className="text-foreground font-bold">{label}</span>
            ) : (
              <Link to={to} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
