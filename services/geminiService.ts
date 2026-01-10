import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserProfile, DailyLog, Meal, AppState } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Constants ---

export const AVAILABLE_VOICES = [
  { id: 'Puck', label: 'Puck (Male)', style: 'Soft' },
  { id: 'Charon', label: 'Charon (Male)', style: 'Deep' },
  { id: 'Kore', label: 'Kore (Female)', style: 'Calm' },
  { id: 'Fenrir', label: 'Fenrir (Male)', style: 'Rough' },
  { id: 'Zephyr', label: 'Zephyr (Female)', style: 'Bright' },
];

// --- Helpers ---

// Audio Decoding Helper (from System Instructions)
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

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

export const createMealChatSession = () => {
  if (!apiKey) throw new Error("API Key missing");

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are a friendly, conversational nutritionist AI. 
      Your goal is to help the user log their meal by understanding what they ate, when they ate it, and estimating the nutrition.
      
      1. **Conversational Style**: Be brief, encouraging, and human-like. 
      2. **Estimation**: Always estimate the nutrition for the *entire* meal.
      3. **Time Extraction**: If the user mentions a time (e.g., "I had eggs at 8am" or "Lunch at noon"), extract it in 24-hour format (HH:MM). If no time is mentioned, return null for time.
      4. **Output Format**: You must ALWAYS return a JSON object with two parts:
         - 'conversationalResponse': Your message to the user.
         - 'mealData': The structured nutrition data. If you don't have enough info to estimate yet, this can be null.
      
      The 'mealData' should include a 'short_tip' (max 10 words).`,
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
              time: { type: Type.STRING, description: "Time of meal in HH:MM format (24h) if explicitly mentioned, else null", nullable: true },
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

export const createCoachChatSession = (profile: UserProfile) => {
  if (!apiKey) throw new Error("API Key missing");

  const currentLbs = Math.round(profile.currentWeight * 2.20462);
  const targetLbs = Math.round(profile.targetWeight * 2.20462);

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are "Take Care", a supportive, empathetic, and knowledgeable health coach.
      
      User Context:
      - Name: ${profile.name}
      - Goal: ${currentLbs} lbs to ${targetLbs} lbs
      - Dietary Prefs: ${profile.dietaryPreferences}
      
      Your Role:
      1. Discuss the user's daily insights, mood, and diet progress.
      2. Be encouraging but realistic.
      3. Keep responses concise (under 3 sentences usually) unless explaining a complex topic.
      4. Ask follow-up questions to keep the conversation engaging.
      5. Use Imperial units (lbs) for weight discussions.
      `,
    }
  });
};

// --- Content Generation ---

export const getDailyCoachMessage = async (profile: UserProfile, todayLog: DailyLog, allLogs: Record<string, DailyLog>) => {
  if (!apiKey) return "Keep tracking your meals to reach your goals!";

  const targets = calculateTargets(profile);
  const age = calculateAge(profile.birthDate);
  const consumed = todayLog.meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Get recent mood history (last 3 entries)
  const recentMoods = Object.values(allLogs)
    .filter(l => l.moodGrade)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map(l => `${l.date}: ${l.moodGrade}`)
    .join(', ');

  const currentLbs = Math.round(profile.currentWeight * 2.20462);
  const targetLbs = Math.round(profile.targetWeight * 2.20462);

  const context = `
    User Profile: ${age} years old, ${currentLbs} lbs, Goal: ${targetLbs} lbs.
    Target Calories: ${targets.calories}.
    Today Consumed: ${consumed.calories} kcal, P: ${consumed.protein}g, C: ${consumed.carbs}g, F: ${consumed.fat}g.
    Recent Mood Grades (A is best, F is worst): ${recentMoods || "No mood logged recently"}.
    Current Time: ${new Date().toLocaleTimeString()}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Give a brief, encouraging coaching message (max 2-3 sentences) based on the user's progress and mood. 
      If mood is low, be extra supportive. If they are under-eating, encourage a healthy snack. 
      ALWAYS end with a short, engaging question to spark conversation. Use pounds (lbs) for weight if mentioned.`,
      config: {
        systemInstruction: `You are a friendly diet coach context: ${context}`,
      }
    });
    return response.text || "Stay consistent! How are you feeling right now?";
  } catch (e) {
    return "Great job tracking today! How are you feeling?";
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<AudioBuffer | null> => {
  if (!apiKey || !text) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      outputAudioContext,
      24000,
      1,
    );
    return audioBuffer;

  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
};