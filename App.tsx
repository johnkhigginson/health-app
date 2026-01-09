import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { 
  Activity, Plus, Scale, 
  Utensils, Flame, Brain, ArrowRight, Settings, Check, ChevronRight, ChevronLeft,
  Moon, Sun, Bell, Trophy, Send, MessageSquare, ArrowUp, Download, Smile, Calendar
} from 'lucide-react';
import { AppState, DEFAULT_PROFILE, Meal, UserProfile, DailyLog, WeightEntry, Grade } from './types';
import { createMealChatSession, calculateTargets, getDailyCoachMessage } from './services/geminiService';
import MicrophoneButton from './components/MicrophoneButton';

// --- Utility Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors duration-300 ${className}`}>
    {children}
  </div>
);

const ProgressBar: React.FC<{ current: number; max: number; color?: string; label: string; unit: string }> = ({ current, max, color = 'bg-emerald-500', label, unit }) => {
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

const LoadingSpinner = () => (
  <div className="flex justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
  </div>
);

const KG_TO_LBS = 2.20462;

// --- Helpers for Wellbeing ---

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

// --- Views ---

// 1. Onboarding View
const Onboarding: React.FC<{ onComplete: (profile: UserProfile) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserProfile>(DEFAULT_PROFILE);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);
  
  const finish = () => {
    onComplete({ ...formData, isOnboarded: true });
  };

  // Helper to sync dark mode during onboarding if changed in future
  useEffect(() => {
    if (formData.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [formData.theme]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-300">
      <Card className="max-w-md w-full animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Let's get to know you</h1>
          <p className="text-slate-500 dark:text-slate-400">Step {step} of 3</p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input 
                type="text" 
                className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="What should we call you?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Age</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.age}
                  onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                <select 
                  className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Height (ft)</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={Math.floor((formData.height / 2.54) / 12)}
                  onChange={(e) => {
                    const ft = parseInt(e.target.value) || 0;
                    const inch = Math.round((formData.height / 2.54) % 12);
                    handleChange('height', ((ft * 12) + inch) * 2.54);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Height (in)</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={Math.round((formData.height / 2.54) % 12)}
                  onChange={(e) => {
                    const inch = parseInt(e.target.value) || 0;
                    const ft = Math.floor((formData.height / 2.54) / 12);
                    handleChange('height', ((ft * 12) + inch) * 2.54);
                  }}
                />
              </div>
            </div>
            <button 
              onClick={nextStep}
              disabled={!formData.name}
              className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Weight (lbs)</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={Math.round(formData.currentWeight * KG_TO_LBS)}
                  onChange={(e) => {
                    const lbs = parseFloat(e.target.value) || 0;
                    handleChange('currentWeight', lbs / KG_TO_LBS);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Goal Weight (lbs)</label>
                <input 
                  type="number" 
                  className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={Math.round(formData.targetWeight * KG_TO_LBS)}
                  onChange={(e) => {
                    const lbs = parseFloat(e.target.value) || 0;
                    handleChange('targetWeight', lbs / KG_TO_LBS);
                  }}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Activity Level</label>
              <select 
                className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.activityLevel}
                onChange={(e) => handleChange('activityLevel', e.target.value)}
              >
                <option value="sedentary">Sedentary (Desk Job)</option>
                <option value="light">Lightly Active</option>
                <option value="moderate">Moderately Active</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>

            <div className="flex gap-4 mt-6">
              <button 
                onClick={prevStep}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button 
                onClick={nextStep}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dietary Preferences</label>
              <textarea 
                className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-32 resize-none"
                value={formData.dietaryPreferences}
                onChange={(e) => handleChange('dietaryPreferences', e.target.value)}
                placeholder="e.g. Vegetarian, Keto, allergic to peanuts..."
              />
            </div>
            
            <div className="flex gap-4 mt-6">
               <button 
                onClick={prevStep}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button 
                onClick={finish}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                Finish <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// 2. Dashboard View
const Dashboard: React.FC<{ state: AppState }> = ({ state }) => {
  const [coachMessage, setCoachMessage] = useState<string>("");
  const [isLoadingCoach, setIsLoadingCoach] = useState(false);

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

// 3. Meal Logger View (Conversational)
const MealLogger: React.FC<{ onLogMeal: (meal: Meal) => void }> = ({ onLogMeal }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Hi! What did you have to eat? I can help you estimate the nutrition.' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [draftMeal, setDraftMeal] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    short_tip: string;
  } | null>(null);
  
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [redirect, setRedirect] = useState(false);

  // Initialize Chat Session
  useEffect(() => {
    try {
      chatRef.current = createMealChatSession();
    } catch (e) {
      console.error("Failed to init chat", e);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current || isProcessing) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsProcessing(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userText });
      const responseText = response.text; // This contains the JSON string
      
      try {
        const parsed = JSON.parse(responseText);
        
        // Add model conversational response
        if (parsed.conversationalResponse) {
           setMessages(prev => [...prev, { role: 'model', text: parsed.conversationalResponse }]);
        }

        // Update draft meal if provided
        if (parsed.mealData) {
          setDraftMeal(parsed.mealData);
        }

      } catch (jsonError) {
        console.error("Failed to parse JSON response", jsonError);
        setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble calculating that right now, but I heard you." }]);
      }

    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I lost connection. Please try again." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveMeal = () => {
    if (draftMeal) {
       const newMeal: Meal = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        name: draftMeal.name,
        description: "Logged via chat",
        calories: draftMeal.calories,
        protein: draftMeal.protein,
        carbs: draftMeal.carbs,
        fat: draftMeal.fat,
        aiAnalysis: draftMeal.short_tip,
      };
      onLogMeal(newMeal);
      setRedirect(true);
    }
  };

  if (redirect) return <Navigate to="/" />;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-none p-4 pb-0">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Log Meal</h1>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div 
               className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed
                 ${msg.role === 'user' 
                   ? 'bg-emerald-600 text-white rounded-br-none' 
                   : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                 }`}
             >
               {msg.text}
             </div>
          </div>
        ))}
        {isProcessing && (
           <div className="flex justify-start">
             <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Draft Meal Area */}
      <div className="flex-none bg-slate-50 dark:bg-slate-900 p-4 pt-2">
        
        {/* Draft Meal Card (Floating) */}
        {draftMeal && (
          <div className="mb-4 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-emerald-100 dark:border-emerald-900 p-4 flex justify-between items-center ring-1 ring-emerald-500/10">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{draftMeal.name}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex gap-2">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{draftMeal.calories} kcal</span>
                  <span>{draftMeal.protein}g P</span>
                  <span>{draftMeal.carbs}g C</span>
                  <span>{draftMeal.fat}g F</span>
                </div>
              </div>
              <button 
                onClick={handleSaveMeal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 shadow-md shadow-emerald-600/20"
              >
                Save <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input Field */}
        <div className="flex items-end gap-2 relative">
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center p-1 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Describe your meal..."
              className="w-full bg-transparent border-none focus:ring-0 resize-none p-3 h-12 max-h-32 text-slate-800 dark:text-white placeholder:text-slate-400"
              rows={1}
            />
            <div className="p-1">
               <MicrophoneButton onTranscript={(text) => setInput(prev => prev + (prev ? ' ' : '') + text)} isProcessing={isProcessing} />
            </div>
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="p-3 bg-emerald-600 disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full shadow-md hover:bg-emerald-700 transition"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 4. Weight Tracker View
const WeightTracker: React.FC<{ 
  history: WeightEntry[], 
  onLogWeight: (w: number) => void 
}> = ({ history, onLogWeight }) => {
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

// 5. Wellbeing (Mental Health) View
const WellbeingView: React.FC<{ 
  logs: Record<string, DailyLog>,
  onLogGrade: (date: string, grade: Grade) => void
}> = ({ logs, onLogGrade }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  // Sync state with existing log if date changes
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
    
    // Helper to check date ranges
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
      const logDate = new Date(log.date);
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
               <span className="text-slate-600 dark:text-slate-300 font-medium">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
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

// 6. Settings View
const SettingsView: React.FC<{ 
  profile: UserProfile, 
  onUpdateProfile: (p: UserProfile) => void,
  onReset: () => void,
  installPrompt: any,
  onInstall: () => void
}> = ({ profile, onUpdateProfile, onReset, installPrompt, onInstall }) => {
  
  const handleToggleTheme = () => {
    const newTheme = profile.theme === 'light' ? 'dark' : 'light';
    onUpdateProfile({ ...profile, theme: newTheme });
  };

  const handleReminderToggle = async () => {
    const newVal = !profile.reminders.enabled;
    if (newVal) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert("Please allow notifications in your browser settings to use this feature.");
          return;
        }
      }
    }
    onUpdateProfile({ 
      ...profile, 
      reminders: { ...profile.reminders, enabled: newVal } 
    });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateProfile({ 
      ...profile, 
      reminders: { ...profile.reminders, time: e.target.value } 
    });
  };

  return (
    <div className="pb-24">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Settings</h1>
      
      <div className="space-y-4">
        
        {/* PWA Install Button (Conditional) */}
        {installPrompt && (
          <Card className="bg-emerald-600 text-white border-none relative overflow-hidden group cursor-pointer animate-fade-in-up">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex gap-3 items-center">
                 <div className="p-2 bg-white/20 rounded-lg">
                   <Download className="w-6 h-6 text-white" />
                 </div>
                 <div>
                   <h3 className="font-bold text-white text-lg">Install App</h3>
                   <p className="text-emerald-100 text-sm">Add to home screen for better access</p>
                 </div>
              </div>
              <button 
                onClick={onInstall} 
                className="bg-white text-emerald-600 px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-50 transition"
              >
                Install
              </button>
            </div>
          </Card>
        )}

        {/* Appearance */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${profile.theme === 'dark' ? 'bg-indigo-900 text-indigo-300' : 'bg-orange-100 text-orange-500'}`}>
              {profile.theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">Dark Mode</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Easier on the eyes</p>
            </div>
          </div>
          <button 
            onClick={handleToggleTheme}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${profile.theme === 'dark' ? 'bg-emerald-600' : 'bg-slate-200'}`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition duration-200 ${profile.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </Card>

        {/* Reminders */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white">Daily Reminder</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Get notified to log meals</p>
              </div>
            </div>
            <button 
              onClick={handleReminderToggle}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${profile.reminders.enabled ? 'bg-emerald-600' : 'bg-slate-200'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition duration-200 ${profile.reminders.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          
          {profile.reminders.enabled && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 animate-fade-in-up">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notification Time</label>
              <input 
                type="time" 
                value={profile.reminders.time}
                onChange={handleTimeChange}
                className="w-full p-3 bg-white text-slate-900 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}
        </Card>

        {/* Data Management */}
        <Card>
          <p className="text-slate-600 dark:text-slate-300 mb-4">Want to reset your profile?</p>
          <button 
            onClick={onReset}
            className="w-full border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            Reset App Data
          </button>
        </Card>
      </div>
    </div>
  );
}

// 7. Navigation Bar
const NavBar: React.FC = () => {
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
        <Link to="/log" className="bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 transition flex items-center justify-center ring-4 ring-slate-50 dark:ring-slate-900">
          <Plus className="w-6 h-6" />
        </Link>
      </div>
      <NavItem to="/mood" icon={Smile} label="Mood" />
      <NavItem to="/weight" icon={Scale} label="Weight" />
    </nav>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('nutriflow_state');
    return saved ? JSON.parse(saved) : {
      profile: DEFAULT_PROFILE,
      logs: {},
      weightHistory: [],
      streak: 0
    };
  });

  // PWA Install Prompt Logic
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  useEffect(() => {
    localStorage.setItem('nutriflow_state', JSON.stringify(state));
  }, [state]);

  // Handle Dark Mode Class
  useEffect(() => {
    if (state.profile.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.profile.theme]);

  // Calculate Streak on Load/Update
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const logDates = Object.keys(state.logs).sort();
    
    if (logDates.length === 0) return;

    let currentStreak = 0;
    // Check if we logged today
    const loggedToday = state.logs[today]?.meals.length > 0;
    
    // Simple logic: if logged today, start count at 1. If not, start 0.
    // Then check backwards. 
    // This is a simplified streak calculation
    if (loggedToday) {
      currentStreak = 1;
      let checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1);
      
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (state.logs[dateStr] && state.logs[dateStr].meals.length > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
        // If not logged today, check if logged yesterday to maintain streak displayed
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        if (state.logs[yStr] && state.logs[yStr].meals.length > 0) {
             // Streak is valid, but current count is calculated from yesterday
             currentStreak = 0; // Reset visual counter? Or keep pending? 
             // Common app pattern: show previous streak until broken by end of day.
             // For simplicity here, we stick to calculated streak.
        }
    }
    
    if (currentStreak !== state.streak) {
      setState(prev => ({...prev, streak: currentStreak}));
    }
  }, [state.logs]);


  const handleOnboardingComplete = (profile: UserProfile) => {
    setState(prev => ({ ...prev, profile }));
  };

  const handleUpdateProfile = (profile: UserProfile) => {
    setState(prev => ({ ...prev, profile }));
  };

  const handleLogMeal = (meal: Meal) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const existingLog = prev.logs[today] || { date: today, meals: [] };
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [today]: {
            ...existingLog,
            meals: [...existingLog.meals, meal]
          }
        }
      };
    });
  };

  const handleLogWeight = (weight: number) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const existingLog = prev.logs[today] || { date: today, meals: [] };
      const updatedLog = { ...existingLog, weight };
      
      const existingEntryIndex = prev.weightHistory.findIndex(w => w.date === today);
      let newHistory = [...prev.weightHistory];
      if (existingEntryIndex >= 0) {
        newHistory[existingEntryIndex] = { date: today, weight };
      } else {
        newHistory.push({ date: today, weight });
      }

      return {
        ...prev,
        profile: { ...prev.profile, currentWeight: weight },
        logs: { ...prev.logs, [today]: updatedLog },
        weightHistory: newHistory
      };
    });
  };

  const handleLogGrade = (date: string, grade: Grade) => {
    setState(prev => {
      const existingLog = prev.logs[date] || { date: date, meals: [] };
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: { ...existingLog, moodGrade: grade }
        }
      };
    });
  };

  if (!state.profile.isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <HashRouter>
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden relative transition-colors duration-300">
        <div className="p-4 h-full overflow-y-auto custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard state={state} />} />
            <Route path="/log" element={<MealLogger onLogMeal={handleLogMeal} />} />
            <Route path="/weight" element={<WeightTracker history={state.weightHistory} onLogWeight={handleLogWeight} />} />
            <Route path="/mood" element={<WellbeingView logs={state.logs} onLogGrade={handleLogGrade} />} />
            <Route path="/settings" element={
              <SettingsView 
                profile={state.profile} 
                onUpdateProfile={handleUpdateProfile}
                onReset={() => setState({ ...state, profile: { ...DEFAULT_PROFILE, isOnboarded: false } })}
                installPrompt={installPrompt}
                onInstall={handleInstallClick}
              />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        <NavBar />
      </div>
    </HashRouter>
  );
};

export default App;