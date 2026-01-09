import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Settings, Brain, Flame, Scale, Download, X } from 'lucide-react';
import { AppState } from '../types';
import { calculateTargets, getDailyCoachMessage } from '../services/geminiService';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';

const KG_TO_LBS = 2.20462;

interface DashboardProps {
  state: AppState;
  installPrompt: any;
  onInstall: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, installPrompt, onInstall }) => {
  const [coachMessage, setCoachMessage] = useState<string>("");
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [dismissInstall, setDismissInstall] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = state.logs[today] || { date: today, meals: [], weight: undefined };
  
  const targets = useMemo(() => calculateTargets(state.profile), [state.profile]);

  const consumed = useMemo(() => todayLog.meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [todayLog]);

  useEffect(() => {
    const fetchCoach = async () => {
      setIsLoadingCoach(true);
      const msg = await getDailyCoachMessage(state.profile, todayLog);
      setCoachMessage(msg);
      setIsLoadingCoach(false);
    };
    fetchCoach();
  }, []); // Run once on mount

  return (
    <div className="pb-24 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Hello, {state.profile.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold">
            <Trophy className="w-3 h-3" />
            <span>{state.streak} Day Streak</span>
          </div>
          <Link to="/settings" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400">
            <Settings className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* Install Prompt Banner */}
      {installPrompt && !dismissInstall && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in-up">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-lg">
               <Download className="w-6 h-6" />
             </div>
             <div>
               <h3 className="font-bold text-sm">Install App</h3>
               <p className="text-emerald-100 text-xs">Add to home screen</p>
             </div>
           </div>
           <div className="flex gap-2">
             <button 
               onClick={onInstall} 
               className="bg-white text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-50 transition"
             >
               Install
             </button>
             <button 
               onClick={() => setDismissInstall(true)}
               className="p-2 hover:bg-emerald-700 rounded-lg transition"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
        </div>
      )}

      {/* Coach Card */}
      <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-lg shadow-emerald-600/20">
        <div className="flex gap-4 items-start">
          <div className="bg-white/20 p-2 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Daily Insight</h3>
            {isLoadingCoach ? (
              <div className="animate-pulse h-4 w-48 bg-white/30 rounded"></div>
            ) : (
              <p className="text-emerald-50 text-sm leading-relaxed">{coachMessage}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center">
          <Flame className="w-8 h-8 text-orange-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800 dark:text-white">{targets.calories - consumed.calories}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kcal Remaining</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center">
          <Scale className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(state.profile.currentWeight * KG_TO_LBS)}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current lbs</span>
        </Card>
      </div>

      {/* Macros */}
      <Card>
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Today's Nutrition</h3>
        <ProgressBar label="Calories" current={consumed.calories} max={targets.calories} unit="kcal" color="bg-orange-400" />
        <ProgressBar label="Protein" current={consumed.protein} max={targets.protein} unit="g" color="bg-blue-400" />
        <ProgressBar label="Carbs" current={consumed.carbs} max={targets.carbs} unit="g" color="bg-emerald-400" />
        <ProgressBar label="Fat" current={consumed.fat} max={targets.fat} unit="g" color="bg-yellow-400" />
      </Card>

      {/* Recent Meals */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-bold text-slate-800 dark:text-white">Recent Meals</h3>
          <Link to="/log" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Log Meal</Link>
        </div>
        <div className="space-y-3">
          {todayLog.meals.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              No meals logged today yet.
            </div>
          ) : (
            todayLog.meals.slice().reverse().map(meal => (
              <div key={meal.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white">{meal.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{meal.calories} kcal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F</p>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
                  {new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};