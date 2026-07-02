import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Images, PlusSquare, Settings, History, Command } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { to: '/', icon: <LayoutDashboard size={16} />, label: 'Overview' },
    { to: '/candidates', icon: <Images size={16} />, label: 'Gallery' },
    { to: '/manual', icon: <PlusSquare size={16} />, label: 'Create' },
    { to: '/automation', icon: <Settings size={16} />, label: 'Settings' },
    { to: '/history', icon: <History size={16} />, label: 'History' },
  ];

  return (
    <div className="w-64 h-screen bg-[#09090b] border-r border-[#27272a] flex flex-col fixed left-0 top-0 z-50">
      <div className="px-6 py-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-white text-black flex items-center justify-center shadow-sm">
          <Command size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white tracking-tight">Mr. Bit</h1>
          <p className="text-[11px] text-[#a1a1aa] font-medium">Automated Studio</p>
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                isActive
                  ? 'bg-[#18181b] text-white font-medium'
                  : 'text-[#a1a1aa] hover:bg-[#18181b]/50 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 mt-auto">
        <div className="flex items-center justify-between p-3 rounded-lg border border-[#27272a] bg-[#18181b]">
          <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
            <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
            System Status
          </div>
          <span className="text-xs font-medium text-white">Online</span>
        </div>
      </div>
    </div>
  );
}
