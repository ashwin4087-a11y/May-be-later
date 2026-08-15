export default function Settings() {
  return (
    <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-8 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-subtle pb-6">
        <h1 className="font-display-lg text-[32px] text-primary tracking-tight">Settings</h1>
        <p className="font-body-md text-on-surface-variant leading-relaxed">
          Manage your account and preferences.
        </p>
      </div>
      
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border border-dashed border-outline-variant rounded-lg">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant">settings_suggest</span>
        <p className="font-body-md text-on-surface-variant">Settings are coming soon.</p>
      </div>
    </main>
  );
}
