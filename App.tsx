import React, { useState, useEffect } from 'react';
import MenuInspiration from './components/MenuInspiration';
import ChefBot from './components/ChefBot';
import HaccpCossh from './components/HaccpCossh';
import SousChefVision from './components/SousChefVision';
import Settings from './components/Settings';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Onboarding from './components/onboarding/Onboarding';
import SplashScreen from './components/SplashScreen';
import { NavTab } from './constants';
import type { CalendarDay, Ingredient, EmailClient } from './types';

// Custom hook for managing state with Local Storage persistence
function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage for key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error writing to localStorage for key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = usePersistentState('isAuthenticated', false);

  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.Home);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Note and HACCP log state is now managed by individual components via Apollo Client.
  // The global state management for these features has been removed.

  const [plannedItems, setPlannedItems] = usePersistentState<Record<string, CalendarDay>>('plannedItems', {});
  const [masterOrderPlan, setMasterOrderPlan] = usePersistentState<Ingredient[]>('masterOrderPlan', []);
  const [emailClient, setEmailClient] = usePersistentState<EmailClient>('emailClient', 'default');

  useEffect(() => {
    // Simulate app loading time
    setTimeout(() => setIsLoading(false), 1500);
  }, []);

  const handleUpdateCalendar = (date: string, data: CalendarDay) => {
    setPlannedItems(prev => ({ ...prev, [date]: data }));
  };

  const handleRemoveRotaEntry = (date: string, indexToRemove: number) => {
    setPlannedItems(prev => {
      const dayData = prev[date];
      if (!dayData?.rota) return prev;
      const newRota = dayData.rota.filter((_, index) => index !== indexToRemove);
      return {
        ...prev,
        [date]: { ...dayData, rota: newRota },
      };
    });
  };
  
  const handleAddToMasterOrderPlan = (itemsToAdd: Ingredient[]) => {
    setMasterOrderPlan(prevPlan => {
      const planCopy = [...prevPlan];
      itemsToAdd.forEach(itemToAdd => {
        const existingItemIndex = planCopy.findIndex(
          item => item.name.toLowerCase() === itemToAdd.name.toLowerCase() && item.unit.toLowerCase() === itemToAdd.unit.toLowerCase()
        );
        if (existingItemIndex > -1) {
          const existingItem = planCopy[existingItemIndex];
          const newQuantity = parseFloat(existingItem.quantity) + parseFloat(itemToAdd.quantity);
          if (!isNaN(newQuantity)) {
            planCopy[existingItemIndex] = { ...existingItem, quantity: String(newQuantity) };
          }
        } else {
          planCopy.push(itemToAdd);
        }
      });
      return planCopy;
    });
  };

  const handleClearMasterOrderPlan = () => {
    setMasterOrderPlan([]);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsSettingsOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case NavTab.Home:
        return (
          <ChefBot
            plannedItemsCount={Object.keys(plannedItems).length}
            plannedItems={plannedItems}
            onUpdateCalendar={handleUpdateCalendar}
          />
        );
      case NavTab.Planner:
        return (
          <MenuInspiration
            plannedItems={plannedItems}
            onUpdateCalendar={handleUpdateCalendar}
            onRemoveRotaEntry={handleRemoveRotaEntry}
            masterOrderPlan={masterOrderPlan}
            onAddToMasterOrderPlan={handleAddToMasterOrderPlan}
            onClearMasterOrderPlan={handleClearMasterOrderPlan}
            emailClient={emailClient}
          />
        );
      case NavTab.Logs:
        return <HaccpCossh />;
      
      case NavTab.Vision:
        return <SousChefVision />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Onboarding onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen font-sans bg-light">
      <TopBar onSettingsClick={() => setIsSettingsOpen(true)} />
      <main className="p-4 sm:p-6 md:p-8 pb-28">
        {renderContent()}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <Settings 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onLogout={handleLogout}
      />
    </div>
  );
};

export default App;