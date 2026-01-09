export interface UserProfile {
  name: string;
  age: number;
  height: number; // cm
  currentWeight: number; // kg
  targetWeight: number; // kg
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dietaryPreferences: string;
  isOnboarded: boolean;
  theme: 'light' | 'dark';
  reminders: {
    enabled: boolean;
    time: string; // HH:MM format
  };
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
  aiAnalysis?: string; // Short tip from AI
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface DailyLog {
  date: string;
  meals: Meal[];
  weight?: number;
}

export interface AppState {
  profile: UserProfile;
  logs: Record<string, DailyLog>; // Keyed by YYYY-MM-DD
  weightHistory: WeightEntry[];
  streak: number;
}

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  age: 30,
  height: 170,
  currentWeight: 70,
  targetWeight: 65,
  gender: 'female',
  activityLevel: 'moderate',
  dietaryPreferences: '',
  isOnboarded: false,
  theme: 'light',
  reminders: {
    enabled: false,
    time: '08:00'
  }
};