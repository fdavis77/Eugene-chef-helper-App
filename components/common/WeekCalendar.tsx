import React, { useState } from 'react';
import { Icon } from './Icon';
import type { CalendarDay } from '../../types';

interface WeekCalendarProps {
  currentDate: Date;
  onSetDate: (date: Date) => void;
  events: Record<string, CalendarDay>;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  onDropNote: (date: string, noteContent: string) => void;
}

const WeekCalendar: React.FC<WeekCalendarProps> = ({ currentDate, onSetDate, events, selectedDate, onDateSelect, onDropNote }) => {
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    onSetDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    onSetDate(newDate);
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

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    // Handle Sunday as day 0
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to make Monday the first day
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      days.push(weekDay);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);
  const weekDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevWeek} className="p-2 rounded-full hover:bg-gray-700">
          <Icon name="chevron-left" className="w-5 h-5" />
        </button>
        <h4 className="font-semibold text-lg text-gray-300">
            {weekDays[0].toLocaleString('default', { month: 'long', day: 'numeric' })} - {weekDays[6].toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h4>
        <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-gray-700">
          <Icon name="chevron-right" className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dateStr = day.toISOString().split('T')[0];
          const dayData = events[dateStr];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <div key={dateStr} className="flex flex-col">
              <div className="text-center text-sm text-gray-400 font-medium mb-2">
                <p>{weekDayNames[index]}</p>
                <p className={`text-lg ${isToday ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>{day.getDate()}</p>
              </div>
              <div
                onClick={() => onDateSelect(dateStr)}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
                className={`min-h-[150px] p-2 border rounded-md cursor-pointer transition-colors duration-200 flex flex-col flex-grow ${
                  isSelected ? 'bg-blue-500/50 border-blue-400' : 
                  isToday ? 'bg-gray-700/50 border-gray-600' : 'border-gray-700 hover:bg-gray-700/50'
                } ${draggedOverDate === dateStr ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
              >
                {dayData?.menuItem && (
                  <div className="text-xs bg-blue-500/80 text-white p-1.5 rounded-md mb-2">
                    {dayData.menuItem}
                  </div>
                )}
                <div className="space-y-1 mt-auto">
                    {(dayData?.rota || []).map((entry, i) => (
                        <div key={i} className="text-xs bg-gray-600/70 text-gray-300 p-1 rounded truncate">
                            {entry}
                        </div>
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekCalendar;