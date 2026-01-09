import React, { useState, useEffect, useMemo } from 'react';
import { Grade, DailyLog } from '../types';
import { Card } from '../components/ui/Card';

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
      // Append T00:00:00 to force local time parsing for date strings
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

  return (
     <div className="pb-24 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Mental Wellbeing</h1>

      {/* Input Card */}
      <Card>
        <div className="flex items-center justify-between mb-4">
           <label className="text-sm font-medium text-slate-700 dark:text-slate-300">How do you feel?</label>
           <div className="relative">
             <input 
               type="date" 
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm py-1 px-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 border-none"
             />
           </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {(['A', 'B', 'C', 'D', 'F'] as Grade[]).map((g) => (
            <button
              key={g}
              onClick={() => handleGradeSelect(g)}
              className={`h-12 rounded-xl font-bold text-lg transition-all transform active:scale-95 border-2 
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

      {/* History List */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-white px-1">Recent Logs</h3>
        {(Object.values(logs) as DailyLog[])
          .filter(l => l.moodGrade)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10) // Show last 10
          .map((log) => (
          <div key={log.date} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors">
            <div className="flex items-center gap-3">
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${getGradeColor(log.moodGrade)}`}>
                 {log.moodGrade}
               </div>
               <span className="text-slate-600 dark:text-slate-300 font-medium">
                 {/* Appending T00:00:00 ensures string is parsed as local time, preventing UTC shift to previous day */}
                 {new Date(log.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
               </span>
            </div>
            <button 
              onClick={() => setSelectedDate(log.date)}
              className="text-xs text-slate-400 hover:text-emerald-500"
            >
              Edit
            </button>
          </div>
        ))}
        {(Object.values(logs) as DailyLog[]).filter(l => l.moodGrade).length === 0 && (
           <div className="text-center py-8 text-slate-400 dark:text-slate-500">
             No mood grades logged yet.
           </div>
        )}
      </div>

     </div>
  );
};