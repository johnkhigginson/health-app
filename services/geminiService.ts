import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, Meal } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Helpers ---

const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 30; // Fallback
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const calculateTargets = (profile: UserProfile) => {
  // Use AI-generated macros if they exist
  if (profile.macros) {
    return profile.macros;
  }

  // Fallback: Mifflin-St Jeor Equation
  const age = calculateAge(profile.birthDate);

  let bmr = 10 * profile.currentWeight + 6.25 * profile.height - 5 * age;
  if (profile.gender === 'male') bmr += 5;
  else if (profile.gender === 'female') bmr -= 161;

  const multiplier = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }[profile.activityLevel] || 1.2;

  const tdee = Math.round(bmr * multiplier);
  
  // Adjustment for weight loss/gain
  const diff = profile.targetWeight - profile.currentWeight;
  let targetCalories = tdee;
  
  if (diff < -1) targetCalories -= 500; // Deficit for weight loss
  else if (diff > 1) targetCalories += 300; // Surplus for gain
  
  // Min safe limits
  if (profile.gender === 'male' && targetCalories < 1500) targetCalories = 1500;
  if (profile.gender === 'female' && targetCalories < 1200) targetCalories = 1200;

  return {
    calories: targetCalories,
    protein: Math.round(profile.currentWeight * 2), // ~2g per kg
    carbs: Math.round((targetCalories * 0.4) / 4), // 40% of cals
    fat: Math.round((targetCalories * 0.3) / 9),   // 30% of cals
  };
};

// --- Diet Plan Generation ---

export const generateDietPlan = async (profile: UserProfile) => {
  if (!apiKey) return null;

  const age = calculateAge(profile.birthDate);
  const prompt = `
    Act as a professional nutritionist. Calculate the daily target Calories, Protein (g), Carbs (g), and Fat (g) for this user to reach their goal.
    
    User Profile:
    - Age: ${age}
    - Gender: ${profile.gender}
    - Height: ${profile.height} cm
    - Current Weight: ${profile.currentWeight} kg
    - Target Weight: ${profile.targetWeight} kg
    - Activity Level: ${profile.activityLevel}
    - Dietary Preferences: ${profile.dietaryPreferences || "None"}
    
    Consider their TDEE and safe weight loss/gain rates. Adjust macros based on preferences (e.g. higher fat for Keto if mentioned).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.INTEGER },
            protein: { type: Type.INTEGER },
            carbs: { type: Type.INTEGER },
            fat: { type: Type.INTEGER },
          },
          required: ["calories", "protein", "carbs", "fat"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (e) {
    console.error("Failed to generate diet plan", e);
    return null;
  }
};

// --- Chat Sessions ---

export const createMealChatSession = (existingMeals: Meal[] = []) => {
  if (!apiKey) throw new Error("API Key missing");

  // 1. OPTIMIZATION: Calculate summary totals to save AI "thinking" tokens
  const totals = existingMeals.reduce(
    (acc, m) => {
      acc.cal += m.calories;
      acc.p += m.protein;
      acc.c += m.carbs;
      acc.f += m.fat;
      return acc;
    },
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  // 2. OPTIMIZATION: Limit context to the last 5 meals and use a dense string format
  const recentMeals = existingMeals.slice(-5).map(m => {
    const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${time}|${m.name}|${m.calories}`;
  }).join('; ');

  const mealContext = existingMeals.length > 0 
    ? `Today: ${totals.cal}cal. History: ${recentMeals}`
    : "No meals today.";

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Role: Nutritionist AI. Context: ${mealContext}
      Goal: Log meal.
      Rules:
      1. Be specific.
      2. Ask if vague. Estimate if clear.
      3. Time: 24h HH:MM (e.g. 08:00, 12:30, 19:00). Null if unsure.
      4. JSON only: { conversationalResponse: string, mealData: { name, calories, protein, carbs, fat, time, short_tip } | null }.
      5. Tip <10 words.`,
      
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conversationalResponse: { type: Type.STRING },
          mealData: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              name: { type: Type.STRING, description: "Concise name" },
              calories: { type: Type.INTEGER },
              protein: { type: Type.INTEGER },
              carbs: { type: Type.INTEGER },
              fat: { type: Type.INTEGER },
              time: { type: Type.STRING, description: "HH:MM format or null", nullable: true },
              short_tip: { type: Type.STRING }
            },
            required: ["name", "calories", "protein", "carbs", "fat", "short_tip"]
          }
        },
        required: ["conversationalResponse"]
      }
    }
  });
};

export const createCoachChatSession = (profile: UserProfile) => {
  if (!apiKey) throw new Error("API Key missing");

  const currentLbs = Math.round(profile.currentWeight * 2.20462);
  const targetLbs = Math.round(profile.targetWeight * 2.20462);

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Role: Health Coach "Take Care".
      User: ${profile.name}, ${currentLbs}->${targetLbs}lbs. Prefs: ${profile.dietaryPreferences}.
      Rules:
      1. Discuss progress/mood.
      2. Encouraging, realistic, concise (<3 sentences).
      3. Ask follow-ups.
      4. Use lbs.`,
    }
  });
};