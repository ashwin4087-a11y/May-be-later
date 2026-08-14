export default function Dashboard() {
  return (
    <main className="max-w-[1024px] px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col gap-16 overflow-y-auto">
      {/* Header Area */}
      <div className="flex justify-between items-center w-full">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input className="w-full bg-card-background border border-outline-variant rounded-md py-2 pl-10 pr-4 font-body-md text-body-md text-on-surface focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-colors" placeholder="Search archive..." type="text" />
        </div>
        <button className="bg-primary text-on-primary px-6 py-2 rounded-md font-body-md text-body-md font-medium hover:opacity-90 transition-opacity shadow-sm flex-shrink-0">
          New Archive
        </button>
      </div>
      
      {/* Welcome Section */}
      <section className="flex flex-col gap-stack-md pt-4">
        <h1 className="font-display-lg text-display-lg md:font-display-lg md:text-display-lg text-primary tracking-tight">Good morning, Archivist.</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">Your personal library is calm and ready. Here is an overview of your recent captures and areas needing attention.</p>
      </section>
      
      {/* Statistics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter py-stack-lg border-y border-subtle">
        <div className="flex flex-col gap-stack-sm">
          <span className="font-display-md text-display-md text-primary">0</span>
          <span className="font-label-technical text-label-technical text-on-surface-variant uppercase tracking-wider">Total Screenshots</span>
        </div>
        <div className="flex flex-col gap-stack-sm">
          <span className="font-display-md text-display-md text-tertiary">0</span>
          <span className="font-label-technical text-label-technical text-on-surface-variant uppercase tracking-wider">Forgotten Items</span>
        </div>
        <div className="flex flex-col gap-stack-sm">
          <span className="font-display-md text-display-md text-on-surface-variant">0</span>
          <span className="font-label-technical text-label-technical text-on-surface-variant uppercase tracking-wider">Duplicates Detected</span>
        </div>
      </section>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: Collections */}
        <div className="lg:col-span-8 flex flex-col gap-stack-lg">
          <div className="flex justify-between items-end border-b border-subtle pb-4">
            <h2 className="font-headline-sm text-headline-sm text-primary">Collections</h2>
            <a className="font-label-technical text-label-technical text-secondary hover:text-primary transition-colors uppercase tracking-wider" href="#">View All</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
            <div className="bg-card-background rounded-lg p-6 shadow-subtle border border-subtle flex flex-col gap-stack-md group cursor-pointer hover:-translate-y-1 hover:border-tertiary transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center text-primary mb-4 group-hover:scale-110 group-hover:bg-tertiary/20 group-hover:text-tertiary transition-all">
                <span className="material-symbols-outlined">web</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-primary">Web Design Inspiration</h3>
              <p className="font-label-technical text-label-technical text-on-surface-variant">0 items · Last updated never</p>
            </div>
            <div className="bg-card-background rounded-lg p-6 shadow-subtle border border-subtle flex flex-col gap-stack-md group cursor-pointer hover:-translate-y-1 hover:border-tertiary transition-all duration-300">
              <div className="w-12 h-12 rounded-full bg-tertiary-container/10 flex items-center justify-center text-tertiary-container mb-4 group-hover:scale-110 group-hover:bg-tertiary/20 group-hover:text-tertiary transition-all">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-primary">Receipts & Invoices</h3>
              <p className="font-label-technical text-label-technical text-on-surface-variant">0 items · Last updated never</p>
            </div>
          </div>
        </div>
        
        {/* Right Column: Needs Attention */}
        <div className="lg:col-span-4 flex flex-col gap-stack-lg">
          <div className="flex justify-between items-end border-b border-subtle pb-4">
            <h2 className="font-headline-sm text-headline-sm text-tertiary-container flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              Needs Attention
            </h2>
          </div>
          
          <div className="bg-card-background rounded-lg p-6 text-center shadow-subtle border border-subtle flex flex-col items-center justify-center gap-4">
            <p className="font-body-md text-on-surface-variant">No items need your attention right now.</p>
          </div>
        </div>
      </div>
      
      {/* Global CTA */}
      <section className="flex flex-col items-center justify-center py-stack-lg mt-8 bg-page-background rounded-xl border border-subtle hover:border-tertiary/50 transition-colors p-12 text-center">
        <h2 className="font-display-md text-display-md text-primary mb-4">Ready to add more?</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-8">Drag and drop screenshots here or select files from your device to begin cataloging.</p>
        <button className="bg-primary text-on-primary px-8 py-4 rounded font-body-lg text-body-lg font-medium hover:opacity-90 transition-opacity shadow-subtle flex items-center gap-3">
          <span className="material-symbols-outlined text-tertiary">upload</span>
          Import Screenshots
        </button>
      </section>
    </main>
  );
}
