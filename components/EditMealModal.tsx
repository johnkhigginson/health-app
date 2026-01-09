import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Flame, Droplet, Wheat, Dumbbell } from 'lucide-react';
import { Meal } from '../types';

interface EditMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: Meal) => void;
  onDelete?: (id: string) => void;
  initialMeal: Meal | null;
}

export const EditMealModal: React.FC<EditMealModalProps> = ({ isOpen, onClose, onSave, onDelete, initialMeal }) => {
  const [formData, setFormData] = useState<Meal | null>(null);

  useEffect(() => {
    if (initialMeal) {
      setFormData(initialMeal);
    }
  }, [initialMeal]);

  if (!isOpen || !formData) return null;

  const handleChange = (field: keyof Meal, value: any) => {
    setFormData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const MacroInput: React.FC<{ 
    icon: any; 
    label: string; 
    value: number; 
    onChange: (v: number) => void; 
    color: string 
  }> = ({ icon: Icon, label, value, onChange, color }) => (
    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <input 
        type="number" 
        value={value || ''}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-lg font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Edit Meal</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Meal Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-700 text-lg font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Oatmeal with Berries"
            />
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-2 gap-4">
             <MacroInput 
               icon={Flame} 
               label="Calories" 
               value={formData.calories} 
               onChange={(v) => handleChange('calories', v)} 
               color="text-orange-500" 
             />
             <MacroInput 
               icon={Dumbbell} 
               label="Protein (g)" 
               value={formData.protein} 
               onChange={(v) => handleChange('protein', v)} 
               color="text-blue-500" 
             />
             <MacroInput 
               icon={Wheat} 
               label="Carbs (g)" 
               value={formData.carbs} 
               onChange={(v) => handleChange('carbs', v)} 
               color="text-emerald-500" 
             />
             <MacroInput 
               icon={Droplet} 
               label="Fat (g)" 
               value={formData.fat} 
               onChange={(v) => handleChange('fat', v)} 
               color="text-yellow-500" 
             />
          </div>

          {/* Time Check (ReadOnly visual for now or editable if needed) */}
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
             <span>Logged time</span>
             <span>{new Date(formData.timestamp).toLocaleString()}</span>
          </div>

          <div className="flex gap-3 pt-2">
            {onDelete && (
              <button 
                onClick={() => {
                  if(window.confirm("Delete this meal?")) {
                    onDelete(formData.id);
                    onClose();
                  }
                }}
                className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => {
                onSave(formData);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold p-4 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};