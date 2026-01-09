import { useState, useEffect } from 'react';
import { AppState, DEFAULT_PROFILE, Meal, UserProfile, Grade } from '../types';

const STATE_KEY = 'nutriflow_state';

export const useAppState = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Robust Merge: Ensure new profile fields from DEFAULT_PROFILE exist 
        // even if the saved state is from an older version.
        return {
          ...parsed,
          profile: { ...DEFAULT_PROFILE, ...parsed.profile },
          logs: parsed.logs || {},
          weightHistory: parsed.weightHistory || [],
          streak: parsed.streak || 0
        };
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
    return {
      profile: DEFAULT_PROFILE,
      logs: {},
      weightHistory: [],
      streak: 0
    };
  });

  useEffect(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state]);

  // Streak Calculation
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const logDates = Object.keys(state.logs).sort();
    
    if (logDates.length === 0) return;

    let currentStreak = 0;
    const loggedToday = state.logs[today]?.meals.length > 0;
    
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
        // Allow streak to persist if logged yesterday
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        if (state.logs[yStr] && state.logs[yStr].meals.length > 0) {
           // We don't update the number, but we don't reset it to 0 either for now
           // For simplicity, we just check actively logged days in this logic
        }
    }
    
    if (currentStreak !== state.streak) {
      setState(prev => ({...prev, streak: currentStreak}));
    }
  }, [state.logs]);

  const updateProfile = (profile: UserProfile) => {
    setState(prev => ({ ...prev, profile }));
  };

  const logMeal = (meal: Meal) => {
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

  const logWeight = (weight: number) => {
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

  const logMood = (date: string, grade: Grade) => {
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
  
  const resetApp = () => {
      if (window.confirm("Are you sure you want to delete all data? This cannot be undone.")) {
        setState({
            profile: { ...DEFAULT_PROFILE, isOnboarded: false },
            logs: {},
            weightHistory: [],
            streak: 0
        });
      }
  };

  return {
      state,
      updateProfile,
      logMeal,
      logWeight,
      logMood,
      resetApp
  };
};