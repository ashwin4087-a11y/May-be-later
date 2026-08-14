import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="bg-page-background min-h-screen flex items-center justify-center p-5 md:p-16 antialiased w-full">
      <main className="w-full max-w-[440px] bg-card-background rounded-[10px] p-[40px] shadow-subtle relative">
        <div className="flex flex-col gap-8">
          <header className="text-center md:text-left flex flex-col gap-4">
            <div className="flex justify-center md:justify-start">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full overflow-hidden">
                  <Logo className="h-full w-full" />
                </div>
                <span className="font-display-lg-mobile md:font-display-lg text-primary text-[24px] tracking-tight">Maybe Later</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-display-lg-mobile md:font-display-lg text-primary">Welcome back</h1>
              <p className="font-body-md text-on-surface-variant">Access your personal archive.</p>
            </div>
          </header>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm">{error}</div>}
            
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-secondary uppercase tracking-widest font-medium" htmlFor="email">Email Address</label>
              <input 
                autoComplete="email" 
                className="font-body-md text-primary placeholder:text-gray-400 bg-surface-container-lowest border border-primary rounded-[8px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all" 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" 
                required 
              />
            </div>
            
            <div className="flex flex-col gap-2 relative">
              <div className="flex justify-between items-baseline">
                <label className="font-label-caps text-secondary uppercase tracking-widest font-medium" htmlFor="password">Password</label>
                <a className="font-body-md text-[13px] text-secondary hover:text-primary transition-colors" href="#">Forgot password?</a>
              </div>
              <input 
                autoComplete="current-password" 
                className="font-body-md text-primary placeholder:text-gray-400 bg-surface-container-lowest border border-primary rounded-[8px] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all" 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required 
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:opacity-90 text-on-primary font-body-md font-medium py-3 rounded-[8px] transition-colors duration-200 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Log In'}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </form>
          
          <footer className="text-center pt-2">
            <p className="font-body-md text-primary">
              Don't have an archive yet? <Link className="text-secondary font-medium hover:underline decoration-secondary/30 underline-offset-4 transition-all" to="/signup">Sign up</Link>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
