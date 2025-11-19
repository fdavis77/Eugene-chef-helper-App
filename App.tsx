
import React, { useState, useEffect, useCallback } from 'react';
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
import type { TemperatureLog, CalendarDay, Note, HaccpLog, Ingredient, EmailClient, ProfileData, OpeningClosingCheck, CoolingLog, CosshLog, ProbeCalibrationLog, Recipe, RecentlyDeletedItem, LogType, ChatMessage } from './types';
import { useTheme } from './contexts/ThemeContext';
import { usePersistentState } from './hooks/usePersistentState';


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
  const [savedRecipes, setSavedRecipes] = usePersistentState<Recipe[]>('savedRecipes', []);
  const [wellnessJournal, setWellnessJournal] = usePersistentState<ChatMessage[]>('wellnessJournal', []);

  const [notes, setNotes] = useState<Note[]>([]);
  const [plannedItems, setPlannedItems] = usePersistentState<Record<string, CalendarDay>>('plannedItems', {});
  const [masterOrderPlan, setMasterOrderPlan] = usePersistentState<Ingredient[]>('masterOrderPlan', []);
  const [emailClient, setEmailClient] = usePersistentState<EmailClient>('emailClient', 'default');
  const [profileData, setProfileData] = usePersistentState<ProfileData>('profileData', {});
  const { themeName, setTheme, activeTheme } = useTheme();


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


  const handleAddFoodLog = useCallback((logData: Omit<TemperatureLog, 'id' | 'timestamp'>) => {
    setFoodLogs(prevLogs => [
      {
        ...logData,
        id: Date.now(),
        timestamp: new Date().toISOString(),
      },
      ...prevLogs,
    ]);
  }, [setFoodLogs]);

  const handleAddHaccpLog = useCallback((logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => {
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
  }, [setHaccpLogs]);
  
  const handleUpdateHaccpLog = useCallback((updatedLog: HaccpLog) => {
     setHaccpLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  }, [setHaccpLogs]);

  // --- GENERIC DELETE & RESTORE ---
  const createDeleteHandler = useCallback(<T extends HaccpLog | OpeningClosingCheck | CoolingLog | CosshLog | ProbeCalibrationLog>(
    logType: LogType,
    state: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => (id: number) => {
    const itemToDelete = state.find(item => item.id === id);
    if (itemToDelete) {
      setter(prev => prev.filter(item => item.id !== id));
      setRecentlyDeletedItem({ type: logType, item: itemToDelete });
    }
  }, []);

  const handleDeleteHaccpLog = useCallback(createDeleteHandler('HaccpLog', haccpLogs, setHaccpLogs), [createDeleteHandler, haccpLogs, setHaccpLogs]);
  const handleDeleteOpeningClosingLog = useCallback(createDeleteHandler('OpeningClosingCheck', openingClosingLogs, setOpeningClosingLogs), [createDeleteHandler, openingClosingLogs, setOpeningClosingLogs]);
  const handleDeleteCoolingLog = useCallback(createDeleteHandler('CoolingLog', coolingLogs, setCoolingLogs), [createDeleteHandler, coolingLogs, setCoolingLogs]);
  const handleDeleteCosshLog = useCallback(createDeleteHandler('CosshLog', cosshLogs, setCosshLogs), [createDeleteHandler, cosshLogs, setCosshLogs]);
  const handleDeleteProbeCalibrationLog = useCallback(createDeleteHandler('ProbeCalibrationLog', probeCalibrationLogs, setProbeCalibrationLogs), [createDeleteHandler, probeCalibrationLogs, setProbeCalibrationLogs]);
  
  const handleRestoreLog = useCallback(() => {
    if (!recentlyDeletedItem) return;

    const { type, item } = recentlyDeletedItem;
    
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
    }
    setRecentlyDeletedItem(null);
  }, [recentlyDeletedItem, setCoolingLogs, setCosshLogs, setHaccpLogs, setOpeningClosingLogs, setProbeCalibrationLogs]);

  // Handlers for new log types
  const handleAddOpeningClosingLog = useCallback((logData: Omit<OpeningClosingCheck, 'id'>) => setOpeningClosingLogs(prev => [{ ...logData, id: Date.now() }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())), [setOpeningClosingLogs]);
  const handleUpdateOpeningClosingLog = useCallback((updatedLog: OpeningClosingCheck) => setOpeningClosingLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log)), [setOpeningClosingLogs]);
  const handleAddCoolingLog = useCallback((logData: Omit<CoolingLog, 'id'>) => setCoolingLogs(prev => [{ ...logData, id: Date.now() }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())), [setCoolingLogs]);
  const handleUpdateCoolingLog = useCallback((updatedLog: CoolingLog) => setCoolingLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log)), [setCoolingLogs]);
  const handleAddCosshLog = useCallback((logData: Omit<CosshLog, 'id'>) => setCosshLogs(prev => [{ ...logData, id: Date.now() }, ...prev].sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime())), [setCosshLogs]);
  const handleUpdateCosshLog = useCallback((updatedLog: CosshLog) => setCosshLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log)), [setCosshLogs]);
  const handleAddProbeCalibrationLog = useCallback((logData: Omit<ProbeCalibrationLog, 'id'>) => setProbeCalibrationLogs(prev => [{ ...logData, id: Date.now() }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())), [setProbeCalibrationLogs]);
  const handleUpdateProbeCalibrationLog = useCallback((updatedLog: ProbeCalibrationLog) => setProbeCalibrationLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log)), [setProbeCalibrationLogs]);

  const handleSaveRecipe = useCallback((recipe: Recipe) => {
    setSavedRecipes(prev => {
        // Check if it already exists by ID
        const existingIndex = prev.findIndex(r => r.id === recipe.id);
        
        if (existingIndex >= 0) {
            // Update existing
            const newRecipes = [...prev];
            newRecipes[existingIndex] = recipe;
            return newRecipes;
        } else {
            // Add new, ensure ID
            const newRecipe = { ...recipe, id: recipe.id || Date.now().toString() };
            return [newRecipe, ...prev];
        }
    });
  }, [setSavedRecipes]);

  const handleDeleteRecipe = useCallback((id: string) => {
      setSavedRecipes(prev => prev.filter(r => r.id !== id));
  }, [setSavedRecipes]);


  const handleAddNote = useCallback(async (noteContent: string, imageUrl?: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      content: noteContent,
      createdAt: new Date().toISOString(),
      imageUrl,
    };
    await saveNote(newNote);
    setNotes(prev => [newNote, ...prev]);
  }, []);
  
  const handleUpdateNote = useCallback(async (id: string, content: string) => {
    const noteToUpdate = notes.find(n => n.id === id);
    if (noteToUpdate) {
      const updatedNote = { ...noteToUpdate, content };
      await saveNote(updatedNote);
      setNotes(prev => prev.map(note => (note.id === id ? updatedNote : note)));
    }
  }, [notes]);

  const handleDeleteNote = useCallback(async (id: string) => {
    await deleteNoteFromDB(id);
    setNotes(prev => prev.filter(note => note.id !== id));
  }, []);


  const handleUpdateCalendar = useCallback((date: string, data: CalendarDay) => {
    setPlannedItems(prev => ({ ...prev, [date]: data }));
  }, [setPlannedItems]);

  const handleRemoveRotaEntry = useCallback((date: string, indexToRemove: number) => {
    setPlannedItems(prev => {
      const dayData = prev[date];
      if (!dayData?.rota) return prev;
      const newRota = dayData.rota.filter((_, index) => index !== indexToRemove);
      return {
        ...prev,
        [date]: { ...dayData, rota: newRota },
      };
    });
  }, [setPlannedItems]);
  
  const handleAddToMasterOrderPlan = useCallback((itemsToAdd: Ingredient[]) => {
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
  }, [setMasterOrderPlan]);

  const handleClearMasterOrderPlan = useCallback(() => {
    setMasterOrderPlan([]);
  }, [setMasterOrderPlan]);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setIsSettingsOpen(false);
  }, [setIsAuthenticated]);

  const handleUpdateProfile = useCallback((data: Partial<ProfileData>) => {
    setProfileData(prev => ({ ...prev, ...data }));
  }, [setProfileData]);

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
            haccpLogs={haccpLogs}
            openingClosingLogs={openingClosingLogs}
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
            savedRecipes={savedRecipes}
            onSaveRecipe={handleSaveRecipe}
            onDeleteRecipe={handleDeleteRecipe}
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
                  recentlyDeletedItem={recentlyDeletedItem}
                  onRestoreLog={handleRestoreLog}
                />;
      
      case NavTab.Vision:
        return <SousChefVision onAddNote={handleAddNote} onSaveRecipe={handleSaveRecipe} />;
      
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
    <div className={`min-h-screen font-sans ${activeTheme.classes.appBg} ${activeTheme.classes.textColor}`}>
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
          currentTheme={themeName}
          onSetTheme={setTheme}
      />
    </div>
  );
};

export default App;
