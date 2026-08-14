import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="bg-surface-container min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop antialiased w-full">
      <main className="w-full max-w-[480px]">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2">
            <div className="w-[28px] h-[28px] rounded-full overflow-hidden">
              <Logo className="w-full h-full" />
            </div>
            <h1 className="font-headline-sm text-headline-sm text-primary tracking-tight">Maybe Later</h1>
          </div>
        </div>
        
        <div className="bg-card-background rounded-xl p-8 md:p-12 shadow-subtle border border-primary/10">
          <header className="mb-10 text-center">
            <h2 className="font-display-md text-display-md text-primary mb-4">Begin your archive</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">A quiet place for your references, thoughts, and discoveries.</p>
          </header>
          
          <form onSubmit={handleSignup} className="flex flex-col gap-stack-lg">
            {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm">{error}</div>}
            
            <div className="flex flex-col gap-stack-md">
              <div className="relative group">
                <label className="block font-label-technical text-label-technical text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary" htmlFor="fullName">Full Name</label>
                <input 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded py-3 px-4 font-body-md text-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm" 
                  id="fullName" 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe" 
                  required 
                />
              </div>
              
              <div className="relative group">
                <label className="block font-label-technical text-label-technical text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary" htmlFor="email">Email Address</label>
                <input 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded py-3 px-4 font-body-md text-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm" 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  required 
                />
              </div>
              
              <div className="relative group">
                <label className="block font-label-technical text-label-technical text-on-surface-variant mb-2 transition-colors group-focus-within:text-primary" htmlFor="password">Password</label>
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded py-3 pl-4 pr-12 font-body-md text-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm" 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password" 
                    required 
                  />
                  <button 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-on-primary font-body-md text-body-md font-medium py-4 rounded hover:bg-primary/90 transition-colors duration-200 flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Archive'}
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
        
        <div className="text-center mt-8">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Already have an archive? <Link className="text-primary hover:text-primary-container font-medium transition-colors underline decoration-primary/30 underline-offset-4 hover:decoration-primary" to="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
