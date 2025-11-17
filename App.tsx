import React, { useState, useEffect } from 'react';
import MenuInspiration from './components/MenuInspiration';
import ChefBot from './components/ChefBot';
import HaccpCossh from './components/HaccpCossh';
import SousChefVision from './components/SousChefVision';
import SeasonalCalendar from './components/SeasonalCalendar';
import Wellness from './components/Wellness';
import Settings from './components/Settings';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Onboarding from './components/onboarding/Onboarding';
import SplashScreen from './components/SplashScreen';
import { NavTab } from './constants';
import { initDB, getNotes, saveNote, deleteNoteFromDB } from './utils/db';
import type { TemperatureLog, CalendarDay, Note, HaccpLog, Ingredient, EmailClient, ProfileData, OpeningClosingCheck, CoolingLog, CosshLog, ProbeCalibrationLog, Recipe, StockTake, StockItem, RecentlyDeletedItem, LogType, ChatMessage } from './types';


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
  const [openingClosingLogs, setOpeningClosingLogs] = usePersistentState<OpeningClosingCheck[]>('openingClosingLogs', []);
  const [coolingLogs, setCoolingLogs] = usePersistentState<CoolingLog[]>('coolingLogs', []);
  const [cosshLogs, setCosshLogs] = usePersistentState<CosshLog[]>('cosshLogs', []);
  const [probeCalibrationLogs, setProbeCalibrationLogs] = usePersistentState<ProbeCalibrationLog[]>('probeCalibrationLogs', []);
  const [visionRecipes, setVisionRecipes] = usePersistentState<Recipe[]>('visionRecipes', []);
  const [stockTakes, setStockTakes] = usePersistentState<StockTake[]>('stockTakes', []);
  const [wellnessJournal, setWellnessJournal] = usePersistentState<ChatMessage[]>('wellnessJournal', []);

  const [notes, setNotes] = useState<Note[]>([]);
  const [plannedItems, setPlannedItems] = usePersistentState<Record<string, CalendarDay>>('plannedItems', {});
  const [masterOrderPlan, setMasterOrderPlan] = usePersistentState<Ingredient[]>('masterOrderPlan', []);
  const [emailClient, setEmailClient] = usePersistentState<EmailClient>('emailClient', 'default');
  const [profileData, setProfileData] = usePersistentState<ProfileData>('profileData', {});


  const [recentlyDeletedItem, setRecentlyDeletedItem] = useState<RecentlyDeletedItem | null>(null);
  
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
    if (recentlyDeletedItem) {
      const timerId = window.setTimeout(() => {
        setRecentlyDeletedItem(null);
      }, 5000); // 5-second window to undo

      return () => {
        clearTimeout(timerId);
      };
    }
  }, [recentlyDeletedItem]);


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

  // --- GENERIC DELETE & RESTORE ---
  const createDeleteHandler = <T extends { id: number }>(
    logType: LogType,
    state: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => (id: number) => {
    const itemToDelete = state.find(item => item.id === id);
    if (itemToDelete) {
      setter(prev => prev.filter(item => item.id !== id));
      setRecentlyDeletedItem({ type: logType, item: itemToDelete });
    }
  };

  const handleDeleteHaccpLog = createDeleteHandler('HaccpLog', haccpLogs, setHaccpLogs);
  const handleDeleteOpeningClosingLog = createDeleteHandler('OpeningClosingCheck', openingClosingLogs, setOpeningClosingLogs);
  const handleDeleteCoolingLog = createDeleteHandler('CoolingLog', coolingLogs, setCoolingLogs);
  const handleDeleteCosshLog = createDeleteHandler('CosshLog', cosshLogs, setCosshLogs);
  const handleDeleteProbeCalibrationLog = createDeleteHandler('ProbeCalibrationLog', probeCalibrationLogs, setProbeCalibrationLogs);
  
  const handleDeleteStockItem = (stockTakeId: number, itemId: number) => {
    const stockTake = stockTakes.find(st => st.id === stockTakeId);
    if (!stockTake) return;
    const itemToDelete = stockTake.items.find(i => i.id === itemId);
    if (!itemToDelete) return;

    setRecentlyDeletedItem({
      type: 'StockItem',
      item: itemToDelete,
      context: { stockTakeId }
    });

    const updatedStockTake = {
      ...stockTake,
      items: stockTake.items.filter(i => i.id !== itemId)
    };
    handleUpdateStockTake(updatedStockTake);
  };

  const handleRestoreLog = () => {
    if (!recentlyDeletedItem) return;

    const { type, item, context } = recentlyDeletedItem;
    
    switch (type) {
      case 'HaccpLog':
        setHaccpLogs(prev => [...prev, item as HaccpLog].sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()));
        break;
      case 'OpeningClosingCheck':
        setOpeningClosingLogs(prev => [...prev, item as OpeningClosingCheck].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        break;
      case 'CoolingLog':
        setCoolingLogs(prev => [...prev, item as CoolingLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        break;
      case 'CosshLog':
        setCosshLogs(prev => [...prev, item as CosshLog].sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime()));
        break;
      case 'ProbeCalibrationLog':
        setProbeCalibrationLogs(prev => [...prev, item as ProbeCalibrationLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        break;
      case 'StockItem':
        if (context?.stockTakeId) {
          const stockTakeToUpdate = stockTakes.find(st => st.id === context.stockTakeId);
          if (stockTakeToUpdate) {
            const restoredItems = [...stockTakeToUpdate.items, item as StockItem].sort((a, b) => a.name.localeCompare(b.name));
            handleUpdateStockTake({ ...stockTakeToUpdate, items: restoredItems });
          }
        }
        break;
    }
    setRecentlyDeletedItem(null);
  };

  // Handlers for new log types
  const handleAddOpeningClosingLog = (logData: Omit<OpeningClosingCheck, 'id'>) => setOpeningClosingLogs(prev => [{ ...logData, id: Date.now() }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  const handleUpdateOpeningClosingLog = (updatedLog: OpeningClosingCheck) => setOpeningClosingLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  const handleAddCoolingLog = (logData: Omit<CoolingLog, 'id'>) => setCoolingLogs(prev => [{ ...logData, id: Date.now() }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  const handleUpdateCoolingLog = (updatedLog: CoolingLog) => setCoolingLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  const handleAddCosshLog = (logData: Omit<CosshLog, 'id'>) => setCosshLogs(prev => [{ ...logData, id: Date.now() }, ...prev].sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime()));
  const handleUpdateCosshLog = (updatedLog: CosshLog) => setCosshLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  const handleAddProbeCalibrationLog = (logData: Omit<ProbeCalibrationLog, 'id'>) => setProbeCalibrationLogs(prev => [{ ...logData, id: Date.now() }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  const handleUpdateProbeCalibrationLog = (updatedLog: ProbeCalibrationLog) => setProbeCalibrationLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));

  const handleSaveVisionRecipe = (recipe: Recipe) => {
    if (!visionRecipes.find(r => r.title === recipe.title && r.imageUrl === recipe.imageUrl)) {
        setVisionRecipes(prev => [recipe, ...prev]);
    }
  };

    // Handlers for Stock Takes
  const handleAddStockTake = (stockTake: Omit<StockTake, 'id'>) => {
    setStockTakes(prev => [{ ...stockTake, id: Date.now() }, ...prev].sort((a, b) => a.date.localeCompare(b.date)));
  };
  const handleUpdateStockTake = (updatedStockTake: StockTake) => {
    setStockTakes(prev => prev.map(st => st.id === updatedStockTake.id ? updatedStockTake : st));
  };
  const handleDeleteStockTake = (id: number) => {
    setStockTakes(prev => prev.filter(st => st.id !== id));
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

  const handleUpdateProfile = (data: Partial<ProfileData>) => {
    setProfileData(prev => ({ ...prev, ...data }));
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
            visionRecipes={visionRecipes}
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
                  openingClosingLogs={openingClosingLogs}
                  onAddOpeningClosingLog={handleAddOpeningClosingLog}
                  onUpdateOpeningClosingLog={handleUpdateOpeningClosingLog}
                  onDeleteOpeningClosingLog={handleDeleteOpeningClosingLog}
                  coolingLogs={coolingLogs}
                  onAddCoolingLog={handleAddCoolingLog}
                  onUpdateCoolingLog={handleUpdateCoolingLog}
                  onDeleteCoolingLog={handleDeleteCoolingLog}
                  cosshLogs={cosshLogs}
                  onAddCosshLog={handleAddCosshLog}
                  onUpdateCosshLog={handleUpdateCosshLog}
                  onDeleteCosshLog={handleDeleteCosshLog}
                  probeCalibrationLogs={probeCalibrationLogs}
                  onAddProbeCalibrationLog={handleAddProbeCalibrationLog}
                  onUpdateProbeCalibrationLog={handleUpdateProbeCalibrationLog}
                  onDeleteProbeCalibrationLog={handleDeleteProbeCalibrationLog}
                  stockTakes={stockTakes}
                  onAddStockTake={handleAddStockTake}
                  onUpdateStockTake={handleUpdateStockTake}
                  onDeleteStockTake={handleDeleteStockTake}
                  onDeleteStockItem={handleDeleteStockItem}
                  recentlyDeletedItem={recentlyDeletedItem}
                  onRestoreLog={handleRestoreLog}
                />;
      
      case NavTab.Vision:
        return <SousChefVision onAddNote={handleAddNote} onSaveVisionRecipe={handleSaveVisionRecipe} />;
      
      case NavTab.Wellness:
        return <Wellness journalMessages={wellnessJournal} setJournalMessages={setWellnessJournal} />;

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
          profileData={profileData}
          onUpdateProfile={handleUpdateProfile}
      />
    </div>
  );
};

export default App;