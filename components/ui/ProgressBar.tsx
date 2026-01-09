import React from 'react';

export const ProgressBar: React.FC<{ current: number; max: number; color?: string; label: string; unit: string }> = ({ current, max, color = 'bg-emerald-500', label, unit }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm font-medium mb-1">
        <span className="text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">{current} / {max} {unit}</span>
      </div>
      <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500 ease-out`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};