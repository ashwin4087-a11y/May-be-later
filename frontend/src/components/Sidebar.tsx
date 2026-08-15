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
    { name: 'Collections', path: '/collections', icon: 'folder_special' },
    { name: 'Needs Review', path: '/review', icon: 'fact_check' },
    { name: 'Duplicates', path: '/duplicates', icon: 'file_copy' },
    { name: 'Import', path: '/import', icon: 'move_to_inbox' },
  ];

  const filterItems = [
    { name: 'All Items', path: '/all', icon: 'inventory_2' },
    { name: 'Favorites', path: '/favorites', icon: 'star' },
    { name: 'Unorganized', path: '/unorganized', icon: 'notification_important' },
  ];

  const NavLink = ({ name, path, icon }: { name: string, path: string, icon: string }) => {
    const isActive = location.pathname === path;
    if (isActive) {
      return (
        <Link to={path} className="bg-secondary-container dark:bg-tertiary-container text-on-secondary-container dark:text-on-tertiary-container font-semibold rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-surface-variant dark:hover:bg-surface-container-highest transition-colors duration-200">
          <span className="material-symbols-outlined">{icon}</span>
          {name}
        </Link>
      );
    }
    return (
      <Link to={path} className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed hover:bg-surface-variant dark:hover:bg-surface-container-highest transition-colors duration-200 px-4 py-3 rounded-lg flex items-center gap-3">
        <span className="material-symbols-outlined">{icon}</span>
        {name}
      </Link>
    );
  };

  return (
    <aside className="w-[280px] h-screen fixed left-0 top-0 bg-page-background dark:bg-surface-container-lowest flex flex-col z-50">
      <div className="h-20 flex items-center px-6 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <Logo className="w-full h-full" />
          </div>
          <span className="font-display-md text-display-md font-bold text-primary dark:text-primary-fixed tracking-tight">Maybe Later</span>
        </div>
      </div>
      
      <nav className="flex-grow py-6 flex flex-col gap-2 px-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.name} {...item} />
          ))}
        </div>
        
        <div className="my-4 border-t border-subtle"></div>
        
        <div className="flex flex-col gap-1">
          {filterItems.map((item) => (
            <NavLink key={item.name} {...item} />
          ))}
        </div>
        
        <div className="mt-auto pt-4 border-t border-subtle">
          <Link to="/settings" className="text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed hover:bg-surface-variant dark:hover:bg-surface-container-highest transition-colors duration-200 px-4 py-3 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </div>
      </nav>
      
      <div 
        onClick={handleLogout}
        className="p-4 border-t border-subtle flex items-center gap-3 cursor-pointer hover:bg-surface-variant dark:hover:bg-surface-container-highest transition-colors duration-200"
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
