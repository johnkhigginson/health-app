import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, DailyLog, Meal } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to calculate BMR and TDEE
export const calculateTargets = (profile: UserProfile) => {
  // Mifflin-St Jeor Equation
  let bmr = 10 * profile.currentWeight + 6.25 * profile.height - 5 * profile.age;
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

export const createMealChatSession = () => {
  if (!apiKey) throw new Error("API Key missing");

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are a friendly, conversational nutritionist AI. 
      Your goal is to help the user log their meal by understanding what they ate and estimating the nutrition.
      
      1. **Conversational Style**: Be brief, encouraging, and human-like. If the user's description is vague (e.g., "I had a sandwich"), ask clarifying questions (e.g., "What kind of bread and filling?"). 
      2. **Estimation**: Always estimate the nutrition for the *entire* meal described so far in the current session.
      3. **Output Format**: You must ALWAYS return a JSON object with two parts:
         - 'conversationalResponse': Your message to the user.
         - 'mealData': The structured nutrition data. If you don't have enough info to estimate yet, this can be null.
      
      The 'mealData' should include a 'short_tip' (max 10 words) for the log summary.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conversationalResponse: { type: Type.STRING },
          mealData: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              name: { type: Type.STRING, description: "Concise name (e.g. 'Avocado Toast')" },
              calories: { type: Type.INTEGER },
              protein: { type: Type.INTEGER },
              carbs: { type: Type.INTEGER },
              fat: { type: Type.INTEGER },
              short_tip: { type: Type.STRING, description: "A very short nutritional tag (e.g. 'High Protein')" }
            },
            required: ["name", "calories", "protein", "carbs", "fat", "short_tip"]
          }
        },
        required: ["conversationalResponse"]
      }
    }
  });
};

export const getDailyCoachMessage = async (profile: UserProfile, todayLog: DailyLog) => {
  if (!apiKey) return "Keep tracking your meals to reach your goals!";

  const targets = calculateTargets(profile);
  const consumed = todayLog.meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const context = `
    User Profile: ${profile.age}yo, ${profile.currentWeight}kg, Goal: ${profile.targetWeight}kg.
    Target Calories: ${targets.calories}.
    Today Consumed: ${consumed.calories} kcal, P: ${consumed.protein}g, C: ${consumed.carbs}g, F: ${consumed.fat}g.
    Current Time: ${new Date().toLocaleTimeString()}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Give a brief, encouraging coaching message (max 2 sentences) based on the user's progress today. 
      If they are under-eating, encourage a healthy snack. If over, suggest a light evening. 
      Be supportive.`,
      config: {
        systemInstruction: "You are a friendly diet coach.",
      }
    });
    return response.text || "Stay consistent!";
  } catch (e) {
    return "Great job tracking today!";
  }
};