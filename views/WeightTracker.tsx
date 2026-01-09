import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WeightEntry } from '../types';
import { Card } from '../components/ui/Card';

const KG_TO_LBS = 2.20462;

interface WeightTrackerProps {
  history: WeightEntry[];
  onLogWeight: (w: number) => void;
}

export const WeightTracker: React.FC<WeightTrackerProps> = ({ history, onLogWeight }) => {
  const [weight, setWeight] = useState('');
  
  const handleSave = () => {
    const w = parseFloat(weight);
    if (w > 0) {
      // Input is in lbs, convert to kg for storage
      onLogWeight(w / KG_TO_LBS);
      setWeight('');
    }
  };

  const chartData = useMemo(() => {
    // Sort by date and convert weight to lbs for display
    return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(h => ({
      ...h,
      weight: Math.round(h.weight * KG_TO_LBS),
      displayDate: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));
  }, [history]);

  return (
    <div className="pb-24 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Weight Tracker</h1>

      <Card>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Log today's weight</label>
        <div className="flex gap-4">
          <input 
            type="number" 
            className="flex-1 p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="lbs"
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

      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-white px-1">History</h3>
        {[...history].reverse().slice(0, 5).map((entry, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors">
            <span className="text-slate-600 dark:text-slate-300">{new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <span className="font-bold text-slate-800 dark:text-white">{Math.round(entry.weight * KG_TO_LBS)} lbs</span>
          </div>
        ))}
      </div>
    </div>
  );
};