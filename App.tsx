import React, { useState } from 'react';
import Header from './components/Header';
import MenuInspiration from './components/MenuInspiration';
import ChefBot from './components/ChefBot';
import HaccpCossh from './components/HaccpCossh';
import SeasonalCalendar from './components/SeasonalCalendar';
import SousChefVision from './components/SousChefVision';
import { NavTab } from './constants';
import type { TemperatureLog, CalendarDay } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.ChefBot);
  const [temperatureLogs, setTemperatureLogs] = useState<TemperatureLog[]>([]);
  const [notes, setNotes] = useState<string[]>(['Saffron and fennel for the new fish dish.', 'Experiment with smoked paprika oil.']);
  const [plannedItems, setPlannedItems] = useState<Record<string, CalendarDay>>({
    [new Date().toISOString().split('T')[0]]: { menuItem: 'Staff Dinner', rota: ['John (AM)', 'Sarah (PM)'] },
  });

  const handleAddTemperatureLog = (logData: Omit<TemperatureLog, 'id' | 'timestamp'>) => {
    setTemperatureLogs(prevLogs => [
      ...prevLogs,
      {
        ...logData,
        id: Date.now(),
        timestamp: new Date().toISOString(),
      }
    ]);
  };

  const handleAddNote = (note: string) => {
    setNotes(prev => [note, ...prev]);
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

  const renderContent = () => {
    switch (activeTab) {
      case NavTab.Menu:
        return (
          <MenuInspiration 
            notes={notes}
            plannedItems={plannedItems}
            onUpdateCalendar={handleUpdateCalendar}
            onRemoveRotaEntry={handleRemoveRotaEntry}
          />
        );
      case NavTab.ChefBot:
        return (
          <ChefBot 
            logs={temperatureLogs} 
            onAddLog={handleAddTemperatureLog} 
            onAddNote={handleAddNote}
            plannedItems={plannedItems}
            onUpdateCalendar={handleUpdateCalendar}
          />
        );
      case NavTab.HACCP:
        return <HaccpCossh allLogs={temperatureLogs} />;
      case NavTab.Seasonal:
        return <SeasonalCalendar />;
      case NavTab.Vision:
        return <SousChefVision />;
      default:
        return (
           <ChefBot 
            logs={temperatureLogs} 
            onAddLog={handleAddTemperatureLog} 
            onAddNote={handleAddNote}
            plannedItems={plannedItems}
            onUpdateCalendar={handleUpdateCalendar}
          />
        );
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-200 font-sans">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="p-4 sm:p-6 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;