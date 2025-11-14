import React from 'react';
import { Icon } from './Icon';
import type { CalendarDay } from '../../types';

interface CalendarProps {
  currentDate: Date;
  onSetDate: (date: Date) => void;
  events: Record<string, CalendarDay>; // YYYY-MM-DD: event name
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ currentDate, onSetDate, events, selectedDate, onDateSelect }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    onSetDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onSetDate(new Date(year, month + 1, 1));
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
        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-700">
          <Icon name="chevron-left" className="w-5 h-5" />
        </button>
        <h4 className="font-semibold text-lg text-gray-300">
          {currentDate.toLocaleString('default', { month: 'long' })} {year}
        </h4>
        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-700">
          <Icon name="chevron-right" className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
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
              className={`h-20 p-1.5 border rounded-md cursor-pointer transition-colors duration-200 flex flex-col ${
                isSelected ? 'bg-blue-500/50 border-blue-400' : 
                isToday ? 'bg-gray-700/50 border-gray-600' : 'border-gray-700 hover:bg-gray-700/50'
              }`}
            >
              <span className={`font-medium ${isToday ? 'text-blue-400' : 'text-gray-300'}`}>{day}</span>
              {dayData?.menuItem && (
                <div className="mt-1 text-xs bg-blue-500/80 text-white p-1 rounded-md truncate">
                  {dayData.menuItem}
                </div>
              )}
              {(dayData?.rota?.length ?? 0) > 0 && (
                <div className="text-xs text-gray-400 flex items-center gap-1 mt-auto">
                    <Icon name="users" className="h-3 w-3" />
                    <span>{dayData!.rota!.length} Staff</span>
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