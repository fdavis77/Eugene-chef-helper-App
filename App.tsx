import React, { useState, useEffect } from 'react';
import MenuInspiration from './components/MenuInspiration';
import ChefBot from './components/ChefBot';
import HaccpCossh from './components/HaccpCossh';
import SousChefVision from './components/SousChefVision';
import SeasonalCalendar from './components/SeasonalCalendar';
import Settings from './components/Settings';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Onboarding from './components/onboarding/Onboarding';
import SplashScreen from './components/SplashScreen';
import { NavTab } from './constants';
import { initDB, getNotes, saveNote, deleteNoteFromDB } from './utils/db';
import type { TemperatureLog, CalendarDay, Note, HaccpLog, Ingredient, EmailClient } from './types';


// Custom hook for managing state with Local Storage persistence
function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    // Fix: Corrected malformed catch block which was causing multiple cascading errors.
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

  const [foodLogs, setFoodLogs] = usePersistentState<TemperatureLog[]>('foodLogs', []);
  const [haccpLogs, setHaccpLogs] = usePersistentState<HaccpLog[]>('haccpLogs', []);
  const [notes, setNotes] = useState<Note[]>([]);
  const [plannedItems, setPlannedItems] = usePersistentState<Record<string, CalendarDay>>('plannedItems', {});
  const [masterOrderPlan, setMasterOrderPlan] = usePersistentState<Ingredient[]>('masterOrderPlan', []);
  const [emailClient, setEmailClient] = usePersistentState<EmailClient>('emailClient', 'default');

  const [recentlyDeletedLog, setRecentlyDeletedLog] = useState<HaccpLog | null>(null);
  
  // DB initialization and initial load for notes
  useEffect(() => {
    const loadData = async () => {
        await initDB();
        const dbNotes = await getNotes();
        setNotes(dbNotes);
        // Simulate app loading time
        setTimeout(() => setIsLoading(false), 1500); 
    };
    loadData();
  }, []);

  // Effect to handle the "Undo" timeout declaratively.
  useEffect(() => {
    if (recentlyDeletedLog) {
      const timerId = window.setTimeout(() => {
        setRecentlyDeletedLog(null);
      }, 5000); // 5-second window to undo

      return () => {
        clearTimeout(timerId);
      };
    }
  }, [recentlyDeletedLog]);


  const handleAddFoodLog = (logData: Omit<TemperatureLog, 'id' | 'timestamp'>) => {
    setFoodLogs(prevLogs => [
      {
        ...logData,
        id: Date.now(),
        timestamp: new Date().toISOString(),
      },
      ...prevLogs,
    ]);
  };

  const handleAddHaccpLog = (logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => {
    const now = new Date();
    setHaccpLogs(prev => [
      {
        ...logData,
        id: Date.now(),
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].substring(0, 5),
        checkedBy: '',
        correctiveAction: '',
      },
      ...prev,
    ].sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()));
  };
  
  const handleUpdateHaccpLog = (updatedLog: HaccpLog) => {
     setHaccpLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  };
  
  const handleDeleteHaccpLog = (id: number) => {
    const logToDelete = haccpLogs.find(log => log.id === id);
    if (logToDelete) {
      setHaccpLogs(prev => prev.filter(log => log.id !== id));
      setRecentlyDeletedLog(logToDelete);
    }
  };

  const handleRestoreHaccpLog = () => {
    if (recentlyDeletedLog) {
      const logToRestore = recentlyDeletedLog;
      setRecentlyDeletedLog(null);
      setHaccpLogs(prev => [...prev, logToRestore].sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()));
    }
  };


  const handleAddNote = async (noteContent: string, imageUrl?: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      content: noteContent,
      createdAt: new Date().toISOString(),
      imageUrl,
    };
    await saveNote(newNote);
    setNotes(prev => [newNote, ...prev]);
  };
  
  const handleUpdateNote = async (id: string, content: string) => {
    const noteToUpdate = notes.find(n => n.id === id);
    if (noteToUpdate) {
      const updatedNote = { ...noteToUpdate, content };
      await saveNote(updatedNote);
      setNotes(prev => prev.map(note => (note.id === id ? updatedNote : note)));
    }
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNoteFromDB(id);
    setNotes(prev => prev.filter(note => note.id !== id));
  };


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
            notesCount={notes.length}
            plannedItemsCount={Object.keys(plannedItems).length}
            onAddFoodLog={handleAddFoodLog} 
            onAddHaccpLog={handleAddHaccpLog}
            onAddNote={handleAddNote}
            plannedItems={plannedItems}
            onUpdateCalendar={handleUpdateCalendar}
          />
        );
      case NavTab.Planner:
        return (
          <MenuInspiration 
            notes={notes}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            plannedItems={plannedItems}
            onUpdateCalendar={handleUpdateCalendar}
            onRemoveRotaEntry={handleRemoveRotaEntry}
            masterOrderPlan={masterOrderPlan}
            onAddToMasterOrderPlan={handleAddToMasterOrderPlan}
            onClearMasterOrderPlan={handleClearMasterOrderPlan}
            emailClient={emailClient}
          />
        );
      case NavTab.Seasonal:
        return <SeasonalCalendar />;
      case NavTab.Logs:
        return <HaccpCossh 
                  foodLogs={foodLogs} 
                  haccpLogs={haccpLogs}
                  onAddHaccpLog={handleAddHaccpLog}
                  onUpdateHaccpLog={handleUpdateHaccpLog}
                  onDeleteHaccpLog={handleDeleteHaccpLog}
                  recentlyDeletedLog={recentlyDeletedLog}
                  onRestoreHaccpLog={handleRestoreHaccpLog}
                />;
      
      case NavTab.Vision:
        return <SousChefVision onAddNote={handleAddNote} />;
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