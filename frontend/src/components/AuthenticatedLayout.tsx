import React from 'react';
import Sidebar from './Sidebar';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-grow w-full min-w-0 lg:ml-[280px]">
        {children}
      </div>
    </div>
  );
}
