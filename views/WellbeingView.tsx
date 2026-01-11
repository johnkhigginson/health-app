
import React, { useState, useEffect, useMemo } from 'react';
import { Grade, DailyLog } from '../types';
import { Card } from '../components/ui/Card';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { logEvent } from '../services/analytics';

const GRADE_POINTS: Record<Grade, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };

const getGradeColor = (grade?: string) => {
  if (!grade) return 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500';
  const base = grade.charAt(0);
  switch (base) {
    case 'A': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'B': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'C': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
    case 'D': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    case 'F': return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800';
    default: return 'bg-slate-100 text-slate-400';
  }
};

const calculateAverageGrade = (grades: Grade[]): string => {
  if (grades.length === 0) return '—';
  const sum = grades.reduce((acc, g) => acc + GRADE_POINTS[g], 0);
  const avg = sum / grades.length;
  
  if (avg >= 3.85) return 'A';
  if (avg >= 3.5) return 'A-';
  if (avg >= 3.15) return 'B+';
  if (avg >= 2.85) return 'B';
  if (avg >= 2.5) return 'B-';
  if (avg >= 2.15) return 'C+';
  if (avg >= 1.85) return 'C';
  if (avg >= 1.5) return 'C-';
  if (avg >= 1.15) return 'D+';
  if (avg >= 0.85) return 'D';
  if (avg >= 0.5) return 'D-';
  return 'F';
};

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface WellbeingViewProps {
  logs: Record<string, DailyLog>;
  onLogGrade: (date: string, grade: Grade) => void;
}

export const WellbeingView: React.FC<WellbeingViewProps> = ({ logs, onLogGrade }) => {
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  
  // State for collapsible months
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (logs[selectedDate]?.moodGrade) {
      setSelectedGrade(logs[selectedDate].moodGrade!);
    } else {
      setSelectedGrade(null);
    }
  }, [selectedDate, logs]);

  const handleGradeSelect = (g: Grade) => {
    setSelectedGrade(g);
    onLogGrade(selectedDate, g);
    logEvent('log_mood', { grade: g });
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00'); // Force local time
    current.setDate(current.getDate() + days);
    
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const calculateStats = useMemo(() => {
    const allLogs = (Object.values(logs) as DailyLog[]).filter(l => l.moodGrade);
    const now = new Date();
    
    const isSameWeek = (d: Date) => {
       const oneWeekAgo = new Date();
       oneWeekAgo.setDate(now.getDate() - 7);
       return d >= oneWeekAgo && d <= now;
    };
    const isSameMonth = (d: Date) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const isSameYear = (d: Date) => d.getFullYear() === now.getFullYear();

    const weekGrades: Grade[] = [];
    const monthGrades: Grade[] = [];
    const yearGrades: Grade[] = [];

    allLogs.forEach(log => {
      const logDate = new Date(log.date + 'T00:00:00');
      if (log.moodGrade) {
        if (isSameWeek(logDate)) weekGrades.push(log.moodGrade);
        if (isSameMonth(logDate)) monthGrades.push(log.moodGrade);
        if (isSameYear(logDate)) yearGrades.push(log.moodGrade);
      }
    });

    return {
      week: calculateAverageGrade(weekGrades),
      month: calculateAverageGrade(monthGrades),
      year: calculateAverageGrade(yearGrades)
    };
  }, [logs]);

  // Group logs by month
  const groupedLogs = useMemo(() => {
    const allLogs = (Object.values(logs) as DailyLog[])
      .filter(l => l.moodGrade)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const groups: Record<string, DailyLog[]> = {};
    
    allLogs.forEach(log => {
      const date = new Date(log.date + 'T00:00:00');
      const monthYear = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(log);
    });

    return groups;
  }, [logs]);

  // Toggle month expansion
  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  // Initialize first group as expanded if nothing is set yet
  useEffect(() => {
    const months = Object.keys(groupedLogs);
    if (months.length > 0 && Object.keys(expandedMonths).length === 0) {
      setExpandedMonths({ [months[0]]: true });
    }
  }, [groupedLogs]);

  return (
     <div className="pb-24 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Mental Wellbeing</h1>

      {/* Input Card */}
      <Card>
        <div className="flex flex-col gap-4 mb-4">
           <label className="text-base font-semibold text-slate-800 dark:text-slate-200">How do you feel?</label>
           
           {/* Prominent Date Navigation - Fixed width buttons ensure perfect centering */}
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
               onClick={changeDate.bind(null, 1)} 
               className="w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all active:scale-95 text-slate-500 dark:text-slate-400 z-20"
             >
               <ChevronRight className="w-6 h-6" />
             </button>
           </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {(['A', 'B', 'C', 'D', 'F'] as Grade[]).map((g) => (
            <button
              key={g}
              onClick={() => handleGradeSelect(g)}
              className={`h-14 rounded-xl font-bold text-xl transition-all transform active:scale-95 border-2 
                ${selectedGrade === g 
                  ? `${getGradeColor(g).replace('bg-opacity-10', '')} shadow-md ring-2 ring-offset-2 ring-slate-200 dark:ring-slate-800`
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-800'
                }`}
            >
              {g}
            </button>
          ))}
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
         <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-lg mb-2 ${getGradeColor(calculateStats.week)}`}>
              {calculateStats.week}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Week Avg</div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-lg mb-2 ${getGradeColor(calculateStats.month)}`}>
              {calculateStats.month}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Month Avg</div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
            <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-lg mb-2 ${getGradeColor(calculateStats.year)}`}>
              {calculateStats.year}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Year Avg</div>
         </div>
      </div>

      {/* History List - Grouped by Month */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-white px-1">History</h3>
        
        {Object.keys(groupedLogs).length === 0 && (
           <div className="text-center py-8 text-slate-400 dark:text-slate-500">
             No mood grades logged yet.
           </div>
        )}

        {/* Explicitly cast entry type to fix TS unknown errors */}
        {(Object.entries(groupedLogs) as [string, DailyLog[]][]).map(([month, monthLogs]) => (
          <div key={month} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <button 
              onClick={() => toggleMonth(month)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-200">{month}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 bg-white dark:bg-slate-700 px-2 py-1 rounded-full">{monthLogs.length} logs</span>
                {expandedMonths[month] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            
            {expandedMonths[month] && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {monthLogs.map((log) => (
                  <div key={log.date} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getGradeColor(log.moodGrade)}`}>
                         {log.moodGrade}
                       </div>
                       <div className="flex flex-col">
                         <span className="text-slate-700 dark:text-slate-300 font-medium">
                           {new Date(log.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}
                         </span>
                         <span className="text-xs text-slate-400">
                           {new Date(log.date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric' })}
                         </span>
                       </div>
                    </div>
                    <button 
                      onClick={() => setSelectedDate(log.date)}
                      className="text-xs text-slate-400 hover:text-emerald-500 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600 hover:border-emerald-500"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
     </div>
  );
};
