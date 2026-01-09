import React from 'react';
import { Moon, Sun, Bell, Download } from 'lucide-react';
import { UserProfile } from '../types';
import { Card } from '../components/ui/Card';

interface SettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  onReset: () => void;
  installPrompt: any;
  onInstall: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ profile, onUpdateProfile, onReset, installPrompt, onInstall }) => {
  
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
          <Card className="bg-emerald-600 text-white border-none relative overflow-hidden group cursor-pointer animate-fade-in-up" onClick={onInstall}>
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
};