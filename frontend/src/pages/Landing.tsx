import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function Landing() {
  return (
    <div className="min-h-screen bg-page-background flex flex-col w-full">
      <header className="p-6 flex justify-between items-center max-w-container-max w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <Logo className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-display-md text-primary tracking-tight">Maybe Later</h1>
        </div>
        <div className="space-x-6 flex items-center">
          <Link to="/login" className="font-body-md text-on-surface-variant hover:text-primary transition-colors font-medium">Log In</Link>
          <Link to="/signup" className="px-6 py-2.5 bg-primary text-on-primary rounded font-body-md font-medium hover:opacity-90 transition-opacity shadow-subtle">Create Archive</Link>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-3xl mx-auto -mt-20">
        <h2 className="text-[56px] md:text-[72px] leading-[1.0] font-display-lg text-primary tracking-[-0.02em] mb-6">
          For everything you saved <span className="italic text-tertiary font-serif">for later.</span>
        </h2>
        <p className="text-xl md:text-2xl text-on-surface-variant mb-12 max-w-2xl font-body-lg leading-relaxed">
          A calm, minimal archive for all your screenshots. Import, organize, and rediscover your digital memory.
        </p>
        <Link to="/signup" className="px-10 py-4 bg-primary text-on-primary text-body-lg rounded font-medium hover:opacity-90 transition-all hover:-translate-y-1 shadow-[0_4px_20px_rgba(44,57,71,0.15)] flex items-center gap-3 group">
          Start Your Archive
          <span className="material-symbols-outlined text-tertiary group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </Link>
      </main>
    </div>
  );
}
