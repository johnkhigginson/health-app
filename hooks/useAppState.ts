import { useState, useEffect } from 'react';
import { AppState, DEFAULT_PROFILE, Meal, UserProfile, Grade } from '../types';

const STATE_KEY = 'nutriflow_state';

// Helper to get YYYY-MM-DD in local time
const getLocalDateKey = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useAppState = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Robust Merge
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
    const today = getLocalDateKey();
    const logDates = Object.keys(state.logs).sort();
    
    if (logDates.length === 0) return;

    let currentStreak = 0;
    const loggedToday = state.logs[today]?.meals.length > 0;
    
    if (loggedToday) {
      currentStreak = 1;
      let checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1);
      
      while (true) {
        const dateStr = getLocalDateKey(checkDate);
        if (state.logs[dateStr] && state.logs[dateStr].meals.length > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = getLocalDateKey(yesterday);
        if (state.logs[yStr] && state.logs[yStr].meals.length > 0) {
           let streak = 0;
           let check = new Date();
           check.setDate(check.getDate() - 1); // Start from yesterday
           while(true) {
             const dStr = getLocalDateKey(check);
             if (state.logs[dStr] && state.logs[dStr].meals.length > 0) {
               streak++;
               check.setDate(check.getDate() - 1);
             } else {
               break;
             }
           }
           currentStreak = streak;
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
    const dateKey = getLocalDateKey(new Date(meal.timestamp));
    setState(prev => {
      const existingLog = prev.logs[dateKey] || { date: dateKey, meals: [] };
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [dateKey]: {
            ...existingLog,
            meals: [...existingLog.meals, { ...meal, id: meal.id || Date.now().toString() }]
          }
        }
      };
    });
  };

  const editMeal = (updatedMeal: Meal, originalTimestamp: string) => {
    const oldDateKey = getLocalDateKey(new Date(originalTimestamp));
    const newDateKey = getLocalDateKey(new Date(updatedMeal.timestamp));

    setState(prev => {
      // If date hasn't changed, simple update
      if (oldDateKey === newDateKey) {
        const log = prev.logs[oldDateKey];
        if (!log) return prev;
        const updatedMeals = log.meals.map(m => m.id === updatedMeal.id ? updatedMeal : m);
        return {
          ...prev,
          logs: {
            ...prev.logs,
            [oldDateKey]: { ...log, meals: updatedMeals }
          }
        };
      } 
      // Date changed: Move meal
      else {
         const oldLog = prev.logs[oldDateKey];
         const newLog = prev.logs[newDateKey] || { date: newDateKey, meals: [] };

         // Remove from old
         const newOldMeals = oldLog ? oldLog.meals.filter(m => m.id !== updatedMeal.id) : [];
         
         // Add to new
         const newNewMeals = [...newLog.meals, updatedMeal];

         return {
            ...prev,
            logs: {
              ...prev.logs,
              ...(oldLog ? { [oldDateKey]: { ...oldLog, meals: newOldMeals } } : {}),
              [newDateKey]: { ...newLog, meals: newNewMeals }
            }
         };
      }
    });
  };

  const deleteMeal = (mealId: string, timestamp: string) => {
    const dateKey = getLocalDateKey(new Date(timestamp));
    setState(prev => {
      const log = prev.logs[dateKey];
      if (!log) return prev;

      const filteredMeals = log.meals.filter(m => m.id !== mealId);
      
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [dateKey]: { ...log, meals: filteredMeals }
        }
      };
    });
  };

  const logWeight = (weight: number, dateStr?: string) => {
    const dateKey = dateStr || getLocalDateKey();
    setState(prev => {
      const existingLog = prev.logs[dateKey] || { date: dateKey, meals: [] };
      const updatedLog = { ...existingLog, weight };
      const existingEntryIndex = prev.weightHistory.findIndex(w => w.date === dateKey);
      let newHistory = [...prev.weightHistory];
      if (existingEntryIndex >= 0) {
        newHistory[existingEntryIndex] = { date: dateKey, weight };
      } else {
        newHistory.push({ date: dateKey, weight });
      }
      newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const isNewest = newHistory[newHistory.length - 1].date === dateKey;
      const newCurrentWeight = isNewest ? weight : prev.profile.currentWeight;
      return {
        ...prev,
        profile: { ...prev.profile, currentWeight: newCurrentWeight },
        logs: { ...prev.logs, [dateKey]: updatedLog },
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

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed.profile || !parsed.logs) {
         alert("Invalid backup file format.");
         return false;
      }
      const newState: AppState = {
        ...parsed,
        profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        logs: parsed.logs || {},
        weightHistory: parsed.weightHistory || [],
        streak: parsed.streak || 0
      };
      setState(newState);
      return true;
    } catch (e) {
      console.error("Import failed", e);
      alert("Failed to import data. File might be corrupted.");
      return false;
    }
  };

  return {
      state,
      updateProfile,
      logMeal,
      editMeal,
      deleteMeal,
      logWeight,
      logMood,
      importData,
      resetApp
  };
};