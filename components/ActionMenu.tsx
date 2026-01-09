import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Smile, Scale, X } from 'lucide-react';

interface ActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in-up border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Quick Log</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <Link 
            to="/log" 
            onClick={onClose}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors group"
          >
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-full group-hover:scale-110 transition-transform">
              <Utensils className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Food</span>
          </Link>

          <Link 
            to="/weight" 
            onClick={onClose}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
          >
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full group-hover:scale-110 transition-transform">
              <Scale className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Weight</span>
          </Link>

          <Link 
            to="/mood" 
            onClick={onClose}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors group"
          >
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full group-hover:scale-110 transition-transform">
              <Smile className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Mood</span>
          </Link>
        </div>
      </div>
    </div>
  );
};