import React, { useState } from 'react';
import { Moon, Sun, Bell, Download, Mic, Play, Square, FileDown, FileUp, ChevronDown, ChevronUp, Share, Check, FileSpreadsheet, Calculator, Loader2 } from 'lucide-react';
import { AppState, UserProfile } from '../types';
import { Card } from '../components/ui/Card';
import { AVAILABLE_VOICES, generateSpeech, generateDietPlan } from '../services/geminiService';

interface SettingsViewProps {
  state: AppState;
  onUpdateProfile: (p: UserProfile) => void;
  onImport: (json: string) => boolean;
  onReset: () => void;
  installPrompt: any;
  onInstall: () => void;
  isIOS: boolean;
  isStandalone: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ state, onUpdateProfile, onImport, onReset, installPrompt, onInstall, isIOS, isStandalone }) => {
  const profile = state.profile;
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
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

  const handleVoiceChange = (voiceId: string) => {
    onUpdateProfile({ ...profile, voice: voiceId });
  };

  const previewVoice = async (voiceId: string) => {
    if (playingVoice) return;
    setPlayingVoice(voiceId);
    try {
      const buffer = await generateSpeech("Hello, I am your health coach.", voiceId);
      if (buffer) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setPlayingVoice(null);
        source.start(0);
      } else {
        setPlayingVoice(null);
      }
    } catch (e) {
      console.error(e);
      setPlayingVoice(null);
    }
  };

  const handleRecalculatePlan = async () => {
    if(window.confirm("Recalculate your nutrition targets based on your current profile?")) {
        setIsRecalculating(true);
        const plan = await generateDietPlan(profile);
        setIsRecalculating(false);
        if (plan) {
            onUpdateProfile({ ...profile, macros: plan });
            alert("Nutrition plan updated!");
        } else {
            alert("Failed to connect to AI. Please try again later.");
        }
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `take-care-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    // 1. Headers
    const headers = ['Date', 'Time', 'Meal Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Weight (lbs)', 'Mood'];
    const rows = [headers.join(',')];

    // 2. Sort dates (Ascending for time-series charts in Excel)
    const sortedDates = Object.keys(state.logs).sort();

    sortedDates.forEach(date => {
      const log = state.logs[date];
      // Store in kg, display in lbs
      const weightLbs = log.weight ? (log.weight * 2.20462).toFixed(1) : '';
      const mood = log.moodGrade || '';
      
      if (log.meals && log.meals.length > 0) {
        log.meals.forEach(meal => {
           const dateObj = new Date(meal.timestamp);
           const time = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
           // CSV Injection protection and quoting
           const safeName = `"${(meal.name || '').replace(/"/g, '""')}"`;
           rows.push([
             date,
             time,
             safeName,
             meal.calories,
             meal.protein,
             meal.carbs,
             meal.fat,
             weightLbs,
             mood
           ].join(','));
        });
      } else if (weightLbs || mood) {
        // Entry with no meals but has weight/mood
        rows.push([
          date,
          '',
          '',
          '',
          '',
          '',
          '',
          weightLbs,
          mood
        ].join(','));
      }
    });

    const csvString = rows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `take-care-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    document.getElementById('import-file')?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if(window.confirm("This will overwrite your current data. Are you sure you want to proceed?")) {
           const success = onImport(content);
           if (success) alert("Data imported successfully!");
        }
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div className="pb-24">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Settings</h1>
      
      <div className="space-y-4">
        
        {/* PWA Install Button (Shown if not installed) */}
        {!isStandalone && (installPrompt || isIOS) && (
          <Card className="flex flex-col gap-3 animate-fade-in-up border-emerald-500/30 dark:border-emerald-500/50 ring-1 ring-emerald-500/20">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                   <Download className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-800 dark:text-white text-lg">Install App</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-sm">Better experience & full screen</p>
                 </div>
            </div>
              
              {isIOS ? (
                 <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 text-xs leading-relaxed border border-slate-100 dark:border-slate-700/50 space-y-2">
                   <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        1. Tap Share <Share className="w-3 h-3" />
                   </div>
                   <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        2. Tap <strong>"Add to Home Screen"</strong>
                   </div>
                 </div>
              ) : (
                <button 
                  onClick={onInstall}
                  className="w-full bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700 transition"
                >
                  Install Now
                </button>
              )}
          </Card>
        )}

        {/* Nutrition Plan Management */}
        <Card>
           <h3 className="font-semibold text-slate-800 dark:text-white mb-2">Nutrition Plan</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Your targets are calculated based on your profile (Age, Weight, Activity, etc).
           </p>
           
           <button 
             onClick={handleRecalculatePlan}
             disabled={isRecalculating}
             className="w-full border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition flex items-center justify-center gap-2"
           >
             {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
             Recalculate Targets with AI
           </button>
        </Card>

        {/* Coach Voice Accordion */}
        <Card onClick={() => setIsVoiceSettingsOpen(!isVoiceSettingsOpen)} className="cursor-pointer transition-all">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">Coach Voice</h3>
                  <div className="flex items-center gap-2">
                     <p className="text-xs text-slate-500 dark:text-slate-400">Choose how your AI sounds</p>
                     <span className="text-xs bg-emerald-100 text-emerald-700 px-2 rounded-full">{profile.voice}</span>
                  </div>
                </div>
             </div>
             {isVoiceSettingsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
           </div>
           
           {isVoiceSettingsOpen && (
             <div className="grid gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
               {AVAILABLE_VOICES.map((voice) => (
                 <div 
                   key={voice.id}
                   onClick={() => handleVoiceChange(voice.id)}
                   className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                     profile.voice === voice.id 
                       ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500' 
                       : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                   }`}
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        profile.voice === voice.id ? 'border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                     }`}>
                        {profile.voice === voice.id && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                     </div>
                     <div>
                        <span className="text-sm font-medium text-slate-800 dark:text-white block">{voice.label}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{voice.style}</span>
                     </div>
                   </div>
                   
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       previewVoice(voice.id);
                     }}
                     className="p-2 text-slate-400 hover:text-emerald-600 transition"
                   >
                     {playingVoice === voice.id ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4" />}
                   </button>
                 </div>
               ))}
             </div>
           )}
        </Card>

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

        {/* Data Backup */}
        <Card>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Data Backup</h3>
            <div className="grid grid-cols-3 gap-3">
              <button 
                 onClick={handleExportCSV}
                 className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                 <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 text-center">Export CSV</span>
              </button>
              
              <button 
                 onClick={handleExportJSON}
                 className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                 <FileDown className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 text-center">Backup JSON</span>
              </button>

              <button 
                 onClick={handleImportClick}
                 className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                 <FileUp className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                 <span className="text-xs font-medium text-slate-600 dark:text-slate-300 text-center">Import JSON</span>
              </button>
              <input 
                 id="import-file" 
                 type="file" 
                 accept=".json" 
                 className="hidden" 
                 onChange={handleFileChange}
              />
            </div>
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
};