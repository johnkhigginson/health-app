import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Settings, Lightbulb, Flame, Scale, Download, X, ChevronRight, ChevronLeft, MessageSquare, Share, TrendingDown, TrendingUp } from 'lucide-react';
import { AppState, Meal } from '../types';
import { calculateTargets } from '../services/geminiService';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EditMealModal } from '../components/EditMealModal';

const KG_TO_LBS = 2.20462;

interface DashboardProps {
  state: AppState;
  onEditMeal: (meal: Meal) => void;
  onDeleteMeal: (id: string) => void;
  installPrompt: any;
  onInstall: () => void;
  isIOS: boolean;
  isStandalone: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onEditMeal, onDeleteMeal, installPrompt, onInstall, isIOS, isStandalone }) => {
  const navigate = useNavigate();
  
  // Dashboard State
  const [dismissInstall, setDismissInstall] = React.useState(false);
  const [editingMeal, setEditingMeal] = React.useState<Meal | null>(null);

  // Initialize selectedDate to today
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Calculate strict 'today' string for comparison
  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const isToday = selectedDate === today;

  const changeDate = (offset: number) => {
    const date = new Date(selectedDate + 'T00:00:00'); // Force local time
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const currentLog = state.logs[selectedDate] || { date: selectedDate, meals: [], weight: undefined };
  
  const targets = useMemo(() => calculateTargets(state.profile), [state.profile]);

  const consumed = useMemo(() => currentLog.meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [currentLog.meals]);

  // Overall Weight Change Calculation (Independent of selected date)
  const overallChange = useMemo(() => {
    if (state.weightHistory.length === 0) return 0;
    
    // Sort to find the very first entry
    const sorted = [...state.weightHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startWeight = sorted[0].weight;
    const currentWeight = state.profile.currentWeight;
    
    return (currentWeight - startWeight) * KG_TO_LBS;
  }, [state.weightHistory, state.profile.currentWeight]);

  const handleOpenCoachChat = () => {
    navigate('/coach');
  };

  const showInstallBanner = !isStandalone && !dismissInstall && (installPrompt || isIOS);

  const displayDateString = useMemo(() => {
    return new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }, [selectedDate]);

  return (
    <div className="pb-24 space-y-6">
      
      {/* Install Prompt Banner */}
      {showInstallBanner && (
        <Card className="flex flex-col gap-3 animate-fade-in-up border-emerald-500/30 dark:border-emerald-500/50 ring-1 ring-emerald-500/20">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                 <Download className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-base text-slate-800 dark:text-white">Install App</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-xs">Faster, full-screen, works offline</p>
               </div>
             </div>
             <button 
               onClick={() => setDismissInstall(true)}
               className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
             >
               <X className="w-4 h-4 text-slate-400" />
             </button>
           </div>
           
           {isIOS ? (
             <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 text-xs leading-relaxed border border-slate-100 dark:border-slate-700/50">
               <p className="font-semibold mb-2 text-slate-700 dark:text-slate-300">To install on iPhone/iPad:</p>
               <div className="flex items-center gap-2 mb-1 text-slate-600 dark:text-slate-400">
                 <span className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-600 rounded-full shadow-sm">1</span>
                 <span>Tap the <strong>Share</strong> button <Share className="w-3 h-3 inline mx-1" /></span>
               </div>
               <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                 <span className="w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-600 rounded-full shadow-sm">2</span>
                 <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
               </div>
             </div>
           ) : (
             <button 
               onClick={onInstall} 
               className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2"
             >
               <Download className="w-4 h-4" /> Install Now
             </button>
           )}
        </Card>
      )}

      {/* Header with Date Navigation */}
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Hello, {state.profile.name}</h1>
          
          <div className="flex items-center gap-1 mt-1">
             <button 
               onClick={() => changeDate(-1)} 
               className="p-1 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
             >
               <ChevronLeft className="w-5 h-5" />
             </button>
             
             <span className="text-slate-500 dark:text-slate-400 text-sm font-medium min-w-[140px] text-center">
                {displayDateString}
             </span>

             <button 
               onClick={() => changeDate(1)} 
               disabled={isToday}
               className={`p-1 rounded-full transition ${isToday ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
             >
               <ChevronRight className="w-5 h-5" />
             </button>
          </div>
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

      {/* Coach Card */}
      <Card 
        className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-lg shadow-emerald-600/20 cursor-pointer group relative overflow-hidden"
        onClick={handleOpenCoachChat}
      >
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <MessageSquare className="w-5 h-5 text-white/80" />
        </div>

        <div className="flex gap-4 items-center">
          <div className="bg-white/20 p-3 rounded-xl flex-shrink-0 backdrop-blur-sm">
            <Lightbulb className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
             <h3 className="font-bold text-lg mb-1">Health Coach</h3>
             <p className="text-emerald-50 text-sm font-medium">Tap to chat with your personal wellness assistant.</p>
          </div>
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
            <ChevronRight className="w-5 h-5 text-white" />
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
        
        <Card className="p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <Scale className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(state.profile.currentWeight * KG_TO_LBS)}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current lbs</span>
          
          {Math.abs(overallChange) > 0.5 && (
            <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full 
              ${overallChange < 0 
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' 
                : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              }`}>
               {overallChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
               <span>{Math.abs(overallChange).toFixed(1)} lbs</span>
            </div>
          )}
        </Card>
      </div>

      {/* Macros */}
      <Card>
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">
          {isToday ? "Today's Nutrition" : "Daily Nutrition"}
        </h3>
        <ProgressBar label="Calories" current={consumed.calories} max={targets.calories} unit="kcal" color="bg-orange-400" />
        <ProgressBar label="Protein" current={consumed.protein} max={targets.protein} unit="g" color="bg-blue-400" />
        <ProgressBar label="Carbs" current={consumed.carbs} max={targets.carbs} unit="g" color="bg-emerald-400" />
        <ProgressBar label="Fat" current={consumed.fat} max={targets.fat} unit="g" color="bg-yellow-400" />
      </Card>

      {/* Meals List */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-bold text-slate-800 dark:text-white">
            {isToday ? "Recent Meals" : "Meals"}
          </h3>
          {isToday && (
            <Link to="/log" className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline">Log Meal</Link>
          )}
        </div>
        <div className="space-y-3">
          {currentLog.meals.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              {isToday ? "No meals logged today yet." : "No meals logged for this day."}
            </div>
          ) : (
            currentLog.meals.slice().reverse().map(meal => (
              <button 
                key={meal.id} 
                onClick={() => setEditingMeal(meal)}
                className="w-full text-left bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                     {meal.name}
                  </h4>
                  <div className="flex gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-orange-500 font-medium">{meal.calories} kcal</span>
                    <span>{meal.protein}g P</span>
                    <span>{meal.carbs}g C</span>
                    <span>{meal.fat}g F</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
                      {new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </span>
                   <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <EditMealModal 
        isOpen={!!editingMeal} 
        onClose={() => setEditingMeal(null)}
        initialMeal={editingMeal}
        onSave={(updated) => {
          if (editingMeal) {
            onEditMeal(updated);
            setEditingMeal(null);
          }
        }}
        onDelete={(id) => {
          if (editingMeal) {
            onDeleteMeal(id);
            setEditingMeal(null);
          }
        }}
      />
    </div>
  );
};