import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { WeightEntry } from '../types';
import { Card } from '../components/ui/Card';
import { logEvent } from '../services/analytics';

const KG_TO_LBS = 2.20462;

interface WeightTrackerProps {
  history: WeightEntry[];
  onLogWeight: (w: number, date?: string) => void;
}

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const WeightTracker: React.FC<WeightTrackerProps> = ({ history, onLogWeight }) => {
  const [weight, setWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  
  const handleSave = () => {
    const w = parseFloat(weight);
    if (w > 0) {
      // Input is in lbs, convert to kg for storage, pass selectedDate
      onLogWeight(w / KG_TO_LBS, selectedDate);
      logEvent('log_weight', { unit: 'lbs' });
      setWeight('');
    }
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00'); // Force local time
    current.setDate(current.getDate() + days);
    
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const chartData = useMemo(() => {
    // Sort by date and convert weight to lbs for display
    return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(h => ({
      ...h,
      weight: Math.round(h.weight * KG_TO_LBS),
      // Use local date parsing for display
      displayDate: new Date(h.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [history]);

  // Calculate history with diffs
  const historyWithDiffs = useMemo(() => {
    // Sort ascending first to calculate diffs correctly
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map((entry, index) => {
       let diff = 0;
       if (index > 0) {
         diff = (entry.weight - sorted[index-1].weight) * KG_TO_LBS;
       }
       return { ...entry, diff };
    });
  }, [history]);

  // Group logs by month
  const groupedHistory = useMemo(() => {
    const allEntries = [...historyWithDiffs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort descending for display

    const groups: Record<string, typeof historyWithDiffs> = {};
    
    allEntries.forEach(entry => {
      const date = new Date(entry.date + 'T00:00:00');
      const monthYear = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(entry);
    });

    return groups;
  }, [historyWithDiffs]);

   // Toggle month expansion
  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  // Initialize first group as expanded if nothing is set yet
  useEffect(() => {
    const months = Object.keys(groupedHistory);
    if (months.length > 0 && Object.keys(expandedMonths).length === 0) {
      setExpandedMonths({ [months[0]]: true });
    }
  }, [groupedHistory]);

  // Check if selected date has a weight already
  const existingWeightForDate = useMemo(() => {
    const entry = history.find(h => h.date === selectedDate);
    return entry ? Math.round(entry.weight * KG_TO_LBS) : null;
  }, [selectedDate, history]);

  return (
    <div className="pb-24 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Weight Tracker</h1>

      <Card>
        <div className="flex flex-col gap-4 mb-2">
          <div className="flex justify-between items-center">
            <label className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Log Weight
            </label>
            {existingWeightForDate && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded">
                Update Entry
              </span>
            )}
          </div>
           
           {/* Prominent Date Navigation - Fixed width buttons ensure perfect centering of middle element */}
           <div className="flex items-center bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1">
             <button 
               onClick={() => changeDate(-1)} 
               className="w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all active:scale-95 text-slate-500 dark:text-slate-400 z-20"
             >
               <ChevronLeft className="w-6 h-6" />
             </button>
             
             <div className="flex-1 relative flex flex-col items-center justify-center h-12">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="text-lg font-bold text-slate-800 dark:text-white leading-none">
                   {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="text-xs text-slate-400 font-medium leading-none mt-1">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}
                </div>
             </div>
             
             <button 
               onClick={() => changeDate(1)} 
               className="w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all active:scale-95 text-slate-500 dark:text-slate-400 z-20"
             >
               <ChevronRight className="w-6 h-6" />
             </button>
           </div>
        </div>

        <div className="flex gap-4 mt-4">
          <input 
            type="number" 
            className="flex-1 p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder={existingWeightForDate ? `${existingWeightForDate} lbs` : "lbs"}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <button 
            onClick={handleSave}
            disabled={!weight}
            className="bg-emerald-600 text-white px-6 rounded-xl hover:bg-emerald-700 transition font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </Card>

      {history.length > 0 && (
        <Card className="h-80">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Progress</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="weight" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorWeight)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* History List - Grouped by Month */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-white px-1">History</h3>
        
        {Object.entries(groupedHistory).map(([month, monthLogs]) => (
          <div key={month} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <button 
              onClick={() => toggleMonth(month)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-200">{month}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 bg-white dark:bg-slate-700 px-2 py-1 rounded-full">{monthLogs.length} entries</span>
                {expandedMonths[month] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            
            {expandedMonths[month] && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {monthLogs.map((entry, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                        setSelectedDate(entry.date);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {new Date(entry.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' })}
                    </span>
                    
                    <div className="flex items-center gap-4">
                        {/* Weight Diff Indicator */}
                        {Math.abs(entry.diff) > 0.1 && (
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full 
                                ${entry.diff < 0 
                                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' 
                                    : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`
                                }>
                                {entry.diff < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                <span>{Math.abs(entry.diff).toFixed(1)}</span>
                            </div>
                        )}
                        {Math.abs(entry.diff) <= 0.1 && (
                            <div className="text-slate-300 dark:text-slate-600">
                                <Minus className="w-4 h-4" />
                            </div>
                        )}
                        
                        <span className="font-bold text-slate-800 dark:text-white w-16 text-right">
                          {Math.round(entry.weight * KG_TO_LBS)} lbs
                        </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};