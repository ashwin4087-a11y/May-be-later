import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import PageShell from '../components/PageShell';
import PageHeader from '../components/PageHeader';

interface Stats {
  screenshots: number;
  collections: number;
  duplicates: number;
  favorites: number;
}

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);

      const [ss, cols, dups, favs] = await Promise.all([
        supabase.from('screenshots').select('*', { count: 'exact', head: true }).eq('is_duplicate', false),
        supabase.from('collections').select('*', { count: 'exact', head: true }),
        supabase.from('screenshots').select('*', { count: 'exact', head: true }).eq('is_duplicate', true),
        supabase.from('screenshots').select('*', { count: 'exact', head: true }).eq('is_favorite', true).eq('is_duplicate', false),
      ]);

      setStats({
        screenshots: ss.count ?? 0,
        collections: cols.count ?? 0,
        duplicates: dups.count ?? 0,
        favorites: favs.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  const handleSignOut = async () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      return;
    }
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate('/');
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Archivist';

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Account and archive overview."
      />

      {/* Account */}
      <section className="flex flex-col">
        <h2 className="section-label">Account</h2>
        <div className="surface-card p-6 md:p-8 flex flex-col gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-surface-container border border-outline-variant/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-[30px] text-on-surface-variant">account_circle</span>
            </div>
            <div>
              <p className="font-headline-sm text-[18px] text-primary">{displayName}</p>
              <p className="font-body-md text-[14px] text-on-surface-variant mt-1">{user?.email ?? '—'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Archive stats */}
      <section className="flex flex-col">
        <h2 className="section-label">Your Archive</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
          {[
            { label: 'Screenshots', value: stats?.screenshots, icon: 'photo_library', link: '/all' },
            { label: 'Collections', value: stats?.collections, icon: 'folder_special', link: '/collections' },
            { label: 'Favorites', value: stats?.favorites, icon: 'star', link: '/favorites' },
            { label: 'Duplicates', value: stats?.duplicates, icon: 'file_copy', link: '/duplicates' },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className="kpi-card hover:border-secondary/60 transition-colors group"
            >
              <span className="material-symbols-outlined text-[24px] text-secondary group-hover:text-primary transition-colors">{item.icon}</span>
              <span className="font-display-md text-[32px] text-primary leading-none">
                {loading ? '—' : item.value}
              </span>
              <span className="font-label-technical text-[11px] text-on-surface-variant uppercase tracking-wider">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="flex flex-col">
        <h2 className="section-label">Manage</h2>
        <div className="surface-card divide-y divide-outline-variant/30 overflow-hidden">
          <Link
            to="/review"
            className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-secondary text-[22px]">fact_check</span>
            <span className="font-body-md text-on-surface flex-1">Review unclassified screenshots</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
          </Link>
          <Link
            to="/unorganized"
            className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-secondary text-[22px]">notification_important</span>
            <span className="font-body-md text-on-surface flex-1">View unorganized screenshots</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
          </Link>
          <Link
            to="/search"
            className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-secondary text-[22px]">search</span>
            <span className="font-body-md text-on-surface flex-1">Search archive</span>
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">chevron_right</span>
          </Link>
        </div>
      </section>

      {/* Sign out */}
      <section className="flex flex-col">
        <h2 className="section-label">Session</h2>
        <div className="surface-card p-6 md:p-8 flex flex-col gap-4">
          {confirmSignOut ? (
            <div className="flex flex-col gap-4">
              <p className="font-body-md text-[14px] text-on-surface-variant">
                Sign out of Maybe Later on this device?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSignOut(false)}
                  disabled={signingOut}
                  className="flex-1 py-2.5 rounded-lg border border-outline-variant font-body-md text-[14px] text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex-1 py-2.5 rounded-lg bg-error text-on-error font-body-md text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-lg border border-error/30 text-error font-body-md text-[14px] hover:bg-error/5 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign Out
            </button>
          )}
        </div>
      </section>
    </PageShell>
  );
}
