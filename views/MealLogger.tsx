import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowUp, Check } from 'lucide-react';
import { Meal } from '../types';
import { createMealChatSession } from '../services/geminiService';
import MicrophoneButton from '../components/MicrophoneButton';

interface MealLoggerProps {
  onLogMeal: (meal: Meal) => void;
}

export const MealLogger: React.FC<MealLoggerProps> = ({ onLogMeal }) => {
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

  useEffect(() => {
    try {
      chatRef.current = createMealChatSession();
    } catch (e) {
      console.error("Failed to init chat", e);
    }
  }, []);

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
      const responseText = response.text;
      
      try {
        const parsed = JSON.parse(responseText);
        
        if (parsed.conversationalResponse) {
           setMessages(prev => [...prev, { role: 'model', text: parsed.conversationalResponse }]);
        }

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