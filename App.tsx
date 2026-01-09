import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './views/Dashboard';
import { MealLogger } from './views/MealLogger';
import { WeightTracker } from './views/WeightTracker';
import { WellbeingView } from './views/WellbeingView';
import { SettingsView } from './views/SettingsView';
import { NavBar } from './components/NavBar';
import { ActionMenu } from './components/ActionMenu';

const App: React.FC = () => {
  const { 
    state, 
    updateProfile, 
    logMeal, 
    logWeight, 
    logMood, 
    resetApp 
  } = useAppState();

  // Action Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // PWA Install Prompt Logic
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  // Handle Dark Mode Class
  useEffect(() => {
    if (state.profile.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.profile.theme]);

  if (!state.profile.isOnboarded) {
    return <Onboarding onComplete={updateProfile} />;
  }

  return (
    <HashRouter>
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden relative transition-colors duration-300">
        
        {/* Main Content Area */}
        <div className="p-4 h-full overflow-y-auto custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard state={state} installPrompt={installPrompt} onInstall={handleInstallClick} />} />
            <Route path="/log" element={<MealLogger onLogMeal={logMeal} />} />
            <Route path="/weight" element={<WeightTracker history={state.weightHistory} onLogWeight={logWeight} />} />
            <Route path="/mood" element={<WellbeingView logs={state.logs} onLogGrade={logMood} />} />
            <Route path="/settings" element={
              <SettingsView 
                profile={state.profile} 
                onUpdateProfile={updateProfile}
                onReset={resetApp}
                installPrompt={installPrompt}
                onInstall={handleInstallClick}
              />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Action Menu Overlay */}
        <ActionMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        {/* Navigation */}
        <NavBar onMenuClick={() => setIsMenuOpen(true)} />
      </div>
    </HashRouter>
  );
};

export default App;