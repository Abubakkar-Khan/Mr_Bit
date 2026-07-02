import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans selection:bg-white/10 selection:text-white">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8 md:p-12 relative">
        <div className="max-w-[1200px] mx-auto w-full animate-fade-in">
          <Outlet />
        </div>
      </main>

      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#18181b',
            },
          },
        }}
      />
    </div>
  );
}
