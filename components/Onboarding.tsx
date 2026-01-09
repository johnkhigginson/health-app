import React, { useState, useEffect } from 'react';
import { Activity, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { UserProfile, DEFAULT_PROFILE } from '../types';
import { Card } from './ui/Card';

const KG_TO_LBS = 2.20462;

export const Onboarding: React.FC<{ onComplete: (profile: UserProfile) => void }> = ({ onComplete }) => {
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