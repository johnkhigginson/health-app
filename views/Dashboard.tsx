import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Settings, Brain, Flame, Scale, Download, X, ChevronRight, Volume2, MessageSquare, Square, Share } from 'lucide-react';
import { AppState, Meal } from '../types';
import { calculateTargets, getDailyCoachMessage, generateSpeech } from '../services/geminiService';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EditMealModal } from '../components/EditMealModal';
import { useAppState } from '../hooks/useAppState';

const KG_TO_LBS = 2.20462;

interface DashboardProps {
  state: AppState;
  installPrompt: any;
  onInstall: () => void;
  isIOS: boolean;
  isStandalone: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, installPrompt, onInstall, isIOS, isStandalone }) => {
  const { editMeal, deleteMeal } = useAppState();
  const navigate = useNavigate();
  
  // Dashboard State
  const [coachMessage, setCoachMessage] = useState<string>("");
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [dismissInstall, setDismissInstall] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);

  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Use local date for 'today' to ensure dashboard shows current day in user's timezone
  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

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
      // Pass full logs to analyze trends/mood
      const msg = await getDailyCoachMessage(state.profile, todayLog, state.logs);
      setCoachMessage(msg);
      setIsLoadingCoach(false);
    };
    fetchCoach();
    
    // Cleanup audio on unmount
    return () => {
      stopAudio();
    };
  }, []); 

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  };

  const handlePlayMessage = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening chat
    
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (!coachMessage) return;

    setIsGeneratingAudio(true);
    try {
      // Use the user's selected voice, default to Kore if not set (though default is in profile)
      const buffer = await generateSpeech(coachMessage, state.profile.voice || 'Kore');
      if (buffer) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = ctx;
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlaying(false);
        
        sourceNodeRef.current = source;
        source.start(0);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback failed", err);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleOpenCoachChat = () => {
    if (!coachMessage) return;
    // Navigate to coach view, passing the current message as context
    navigate('/coach', { state: { initialContext: coachMessage } });
  };

  const showInstallBanner = !isStandalone && !dismissInstall && (installPrompt || isIOS);

  return (
    <div className="pb-24 space-y-6">
      
      {/* Install Prompt Banner - High Priority */}
      {showInstallBanner && (
        <div className="bg-slate-900 dark:bg-emerald-900/40 text-white p-4 rounded-2xl shadow-xl flex flex-col gap-3 animate-fade-in-up border border-slate-800 dark:border-emerald-800/50">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                 <Download className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-base">Install App</h3>
                 <p className="text-slate-300 text-xs">Faster, full-screen, works offline</p>
               </div>
             </div>
             <button 
               onClick={() => setDismissInstall(true)}
               className="p-2 hover:bg-white/10 rounded-full transition"
             >
               <X className="w-4 h-4 text-slate-400" />
             </button>
           </div>
           
           {/* Dynamic Content based on Platform */}
           {isIOS ? (
             <div className="bg-white/5 rounded-xl p-3 text-xs leading-relaxed border border-white/5">
               <p className="font-semibold mb-2 text-emerald-400">To install on iPhone/iPad:</p>
               <div className="flex items-center gap-2 mb-1">
                 <span className="w-5 h-5 flex items-center justify-center bg-white/10 rounded-full">1</span>
                 <span>Tap the <strong>Share</strong> button <Share className="w-3 h-3 inline mx-1" /></span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-5 h-5 flex items-center justify-center bg-white/10 rounded-full">2</span>
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
        </div>
      )}

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

      {/* Coach Card - Interactive */}
      <Card 
        className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-lg shadow-emerald-600/20 cursor-pointer group relative overflow-hidden"
        onClick={handleOpenCoachChat}
      >
        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
           <MessageSquare className="w-5 h-5 text-white/80" />
        </div>

        <div className="flex gap-4 items-start">
          <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
               <h3 className="font-semibold text-lg mb-1">Daily Insight</h3>
            </div>
            {isLoadingCoach ? (
              <div className="animate-pulse h-4 w-48 bg-white/30 rounded"></div>
            ) : (
              <div className="space-y-3">
                <p className="text-emerald-50 text-sm leading-relaxed">{coachMessage}</p>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePlayMessage}
                    disabled={isGeneratingAudio}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm disabled:opacity-50"
                  >
                    {isGeneratingAudio ? (
                       <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                    ) : isPlaying ? (
                       <Square className="w-3 h-3 fill-current" />
                    ) : (
                       <Volume2 className="w-3 h-3" />
                    )}
                    {isPlaying ? "Stop" : "Listen"}
                  </button>
                  <span className="text-[10px] text-white/60">Tap card to chat</span>
                </div>
              </div>
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
        onSave={editMeal}
        onDelete={(id) => {
          if (editingMeal) {
            deleteMeal(id, editingMeal.timestamp);
            setEditingMeal(null);
          }
        }}
      />
    </div>
  );
};