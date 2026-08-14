import React from 'react';
import Sidebar from './Sidebar';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="flex-grow w-full ml-[280px]">
        {children}
      </div>
    </>
  );
}
