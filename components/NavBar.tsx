import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Utensils, Plus, Smile, Scale } from 'lucide-react';

interface NavBarProps {
  onMenuClick: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({ onMenuClick }) => {
  const location = useLocation();
  
  const NavItem: React.FC<{ to: string; icon: any; label: string }> = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link to={to} className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
        <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-3 pb-safe flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors duration-300">
      <NavItem to="/" icon={Activity} label="Dashboard" />
      <NavItem to="/log" icon={Utensils} label="Food" />
      <div className="-mt-8">
        <button 
          onClick={onMenuClick}
          className="bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 transition flex items-center justify-center ring-4 ring-slate-50 dark:ring-slate-900 focus:outline-none focus:ring-emerald-500/50"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
      <NavItem to="/mood" icon={Smile} label="Mood" />
      <NavItem to="/weight" icon={Scale} label="Weight" />
    </nav>
  );
};