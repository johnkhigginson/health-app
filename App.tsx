import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppState } from './hooks/useAppState';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './views/Dashboard';
import { MealLogger } from './views/MealLogger';
import { WeightTracker } from './views/WeightTracker';
import { WellbeingView } from './views/WellbeingView';
import { SettingsView } from './views/SettingsView';
import { CoachChat } from './views/CoachChat';
import { NavBar } from './components/NavBar';
import { ActionMenu } from './components/ActionMenu';
import { usePageTracking } from './services/analytics';

// Component to handle page view tracking
const PageTracker = () => {
  usePageTracking();
  return null;
};

const App: React.FC = () => {
  const { 
    state, 
    updateProfile, 
    logMeal, 
    editMeal,
    deleteMeal,
    logWeight, 
    logMood,
    importData,
    resetApp 
  } = useAppState();

  // Action Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // PWA Install Prompt Logic
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Detect Standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check for deferred prompt captured in index.tsx
    // @ts-ignore
    if (window.deferredPrompt) {
      // @ts-ignore
      setInstallPrompt(window.deferredPrompt);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      // @ts-ignore
      window.deferredPrompt = e;
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
        // @ts-ignore
        window.deferredPrompt = null;
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
      <PageTracker />
      {/* 
        Layout Update: 
        - Mobile: Full width/height (100dvh)
        - Desktop (sm+): Centered card-like app
      */}
      <div className="w-full h-[100dvh] sm:h-[calc(100dvh-2rem)] sm:my-4 sm:max-w-md sm:mx-auto sm:rounded-3xl sm:shadow-2xl sm:overflow-hidden bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300 flex flex-col">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-safe">
          <div className="p-4">
            <Routes>
              <Route path="/" element={
                <Dashboard 
                  state={state} 
                  onEditMeal={editMeal}
                  onDeleteMeal={deleteMeal}
                  installPrompt={installPrompt} 
                  onInstall={handleInstallClick} 
                  isIOS={isIOS}
                  isStandalone={isStandalone}
                />
              } />
              <Route path="/log" element={<MealLogger onLogMeal={logMeal} />} />
              <Route path="/coach" element={<CoachChat />} />
              <Route path="/weight" element={<WeightTracker history={state.weightHistory} onLogWeight={logWeight} />} />
              <Route path="/mood" element={<WellbeingView logs={state.logs} onLogGrade={logMood} />} />
              <Route path="/settings" element={
                <SettingsView 
                  state={state} 
                  onUpdateProfile={updateProfile}
                  onImport={importData}
                  onReset={resetApp}
                  installPrompt={installPrompt}
                  onInstall={handleInstallClick}
                  isIOS={isIOS}
                  isStandalone={isStandalone}
                />
              } />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
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