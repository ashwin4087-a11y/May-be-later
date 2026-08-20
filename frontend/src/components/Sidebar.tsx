import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'Gallery', path: '/dashboard', icon: 'grid_view' },
    { name: 'Collections', path: '/collections', icon: 'folder_special', matchPrefix: true },
    { name: 'Search', path: '/search', icon: 'search' },
    { name: 'Review', path: '/review', icon: 'fact_check' },
    { name: 'Duplicates', path: '/duplicates', icon: 'file_copy' },
  ];

  const filterItems = [
    { name: 'All Items', path: '/all', icon: 'inventory_2' },
    { name: 'Favorites', path: '/favorites', icon: 'star' },
    { name: 'Unorganized', path: '/unorganized', icon: 'notification_important' },
  ];

  const NavLink = ({
    name,
    path,
    icon,
    matchPrefix,
    compact,
  }: {
    name: string;
    path: string;
    icon: string;
    matchPrefix?: boolean;
    compact?: boolean;
  }) => {
    const isActive = matchPrefix
      ? location.pathname.startsWith(path)
      : location.pathname === path;

    const baseClass = compact
      ? 'px-3 py-2 rounded-lg flex items-center gap-2 text-sm whitespace-nowrap shrink-0'
      : 'px-4 py-3 rounded-lg flex items-center gap-3';

    if (isActive) {
      return (
        <Link
          to={path}
          className={`${baseClass} bg-secondary-container dark:bg-tertiary-container text-on-secondary-container dark:text-on-tertiary-container font-semibold`}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
          {name}
        </Link>
      );
    }
    return (
      <Link
        to={path}
        className={`${baseClass} text-on-surface-variant hover:text-primary hover:bg-surface-variant dark:hover:bg-surface-container-highest transition-colors`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
        {name}
      </Link>
    );
  };

  return (
    <aside className="w-full lg:w-[280px] lg:fixed lg:left-0 lg:top-0 lg:h-screen bg-page-background dark:bg-surface-container-lowest flex flex-col z-50 shrink-0 border-b lg:border-b-0 border-subtle">
      <div className="h-16 lg:h-20 flex items-center px-4 lg:px-6 border-b border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <Logo className="w-full h-full" />
          </div>
          <span className="font-display-md text-display-md font-bold text-primary dark:text-primary-fixed tracking-tight">
            Maybe Later
          </span>
        </div>
      </div>

      {/* Mobile: horizontal scroll nav */}
      <nav className="lg:hidden flex gap-1 px-3 py-2 overflow-x-auto border-b border-subtle">
        {navItems.map((item) => (
          <NavLink key={item.name} {...item} compact />
        ))}
        {filterItems.map((item) => (
          <NavLink key={item.name} {...item} compact />
        ))}
        <NavLink name="Settings" path="/settings" icon="settings" compact />
      </nav>

      {/* Desktop: vertical nav */}
      <nav className="hidden lg:flex flex-grow py-6 flex-col gap-2 px-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.name} {...item} />
          ))}
        </div>

        <div className="my-4 border-t border-subtle" />

        <div className="flex flex-col gap-1">
          {filterItems.map((item) => (
            <NavLink key={item.name} {...item} />
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-subtle">
          <NavLink name="Settings" path="/settings" icon="settings" />
        </div>
      </nav>

      <div
        onClick={handleLogout}
        className="hidden lg:flex p-4 border-t border-subtle items-center gap-3 cursor-pointer hover:bg-surface-variant dark:hover:bg-surface-container-highest transition-colors"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant flex-shrink-0 flex items-center justify-center bg-card-background">
          <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-body-md font-medium text-primary truncate">
            {user?.user_metadata?.full_name || user?.email || 'Archivist'}
          </span>
          <span className="font-label-technical text-on-surface-variant text-xs truncate">Log Out</span>
        </div>
      </div>
    </aside>
  );
}
