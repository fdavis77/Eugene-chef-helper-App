import React, { useState } from 'react';
import { Icon } from './Icon';
import type { CalendarDay } from '../../types';

interface CalendarProps {
  currentDate: Date;
  onSetDate: (date: Date) => void;
  events: Record<string, CalendarDay>; // YYYY-MM-DD: event name
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  onDropNote: (date: string, noteContent: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ currentDate, onSetDate, events, selectedDate, onDateSelect, onDropNote }) => {
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    onSetDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onSetDate(new Date(year, month + 1, 1));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    setDraggedOverDate(date);
  };

  const handleDragLeave = () => {
    setDraggedOverDate(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    setDraggedOverDate(null);
    const noteContent = e.dataTransfer.getData('text/plain');
    if (noteContent) {
      onDropNote(date, noteContent);
    }
  };


  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const getCalendarGrid = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Adjust for Sunday-starting weeks (getDay() returns 0 for Sunday)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const grid = [];
    let day = 1;

    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDayOfMonth) {
          week.push(null);
        } else if (day > daysInMonth) {
          week.push(null);
        } else {
          week.push(day);
          day++;
        }
      }
      grid.push(week);
      if (day > daysInMonth) break;
    }
    return grid;
  };

  const calendarGrid = getCalendarGrid();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-light">
          <Icon name="chevron-left" className="w-5 h-5 text-muted" />
        </button>
        <h4 className="font-semibold text-lg text-dark">
          {currentDate.toLocaleString('default', { month: 'long' })} {year}
        </h4>
        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-light">
          <Icon name="chevron-right" className="w-5 h-5 text-muted" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-2">
        {weekDays.map(day => <div key={day}>{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.flat().map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="h-20"></div>;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayData = events[dateStr];

          return (
            <div
              key={dateStr}
              onClick={() => onDateSelect(dateStr)}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dateStr)}
              className={`h-20 p-1.5 border rounded-md cursor-pointer transition-colors duration-200 flex flex-col ${
                isSelected ? 'bg-black border-black text-white' : 
                isToday ? 'bg-medium border-gray-300' : 'border-medium hover:bg-light'
              } ${draggedOverDate === dateStr ? 'ring-2 ring-primary ring-inset' : ''}`}
            >
              <span className={`font-medium ${isToday && !isSelected ? 'text-primary' : ''}`}>{day}</span>
              {dayData?.menuItem && (
                <div className={`mt-1 text-xs p-1 rounded-md truncate ${isSelected ? 'bg-white/20 text-white' : 'bg-primary text-white'}`}>
                  {dayData.menuItem}
                </div>
              )}
              {(dayData?.rota?.length ?? 0) > 0 && (
                <div className={`flex items-center gap-1 mt-auto text-xs ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                    <Icon name="users" className="h-3 w-3" />
                    <span>{dayData!.rota!.length}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;