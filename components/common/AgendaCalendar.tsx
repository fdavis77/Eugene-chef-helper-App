import React from 'react';
import { Icon } from './Icon';
import type { CalendarDay } from '../../types';

interface AgendaCalendarProps {
  events: Record<string, CalendarDay>;
  onDateSelect: (date: string) => void;
}

const AgendaCalendar: React.FC<AgendaCalendarProps> = ({ events, onDateSelect }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = Object.entries(events)
    .map(([date, data]: [string, CalendarDay]) => ({ date, ...data }))
    .filter(event => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 30); // Limit to next 30 planned days

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto p-1">
      {upcomingEvents.length > 0 ? (
        upcomingEvents.map(event => {
          const eventDate = new Date(event.date);
          eventDate.setUTCHours(0, 0, 0, 0);
          
          return (
            <div 
              key={event.date}
              onClick={() => onDateSelect(event.date)}
              className="p-3 bg-white rounded-lg border border-medium hover:border-black cursor-pointer transition-colors"
            >
              <p className="font-semibold text-primary">
                {eventDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC'
                })}
              </p>
              {event.menuItem && (
                <p className="text-dark mt-1 pl-2">
                  <span className="font-medium text-muted">Menu:</span> {event.menuItem}
                </p>
              )}
               {(event.rota?.length ?? 0) > 0 && (
                <div className="mt-1 pl-2">
                    <p className="font-medium text-muted flex items-center gap-2">
                        <Icon name="users" className="h-4 w-4" />
                        Staff Rota:
                    </p>
                    <ul className="list-disc list-inside text-dark pl-2">
                        {event.rota?.map((entry, index) => (
                            <li key={index}>{entry}</li>
                        ))}
                    </ul>
                </div>
              )}
              {!event.menuItem && !event.rota?.length && (
                <p className="text-muted mt-1 pl-2">No items planned for this day.</p>
              )}
            </div>
          )
        })
      ) : (
        <div className="text-center py-16 text-muted">
          <p>No upcoming events in the next 30 days.</p>
          <p className="text-sm">Drag a note to the calendar to start planning.</p>
        </div>
      )}
    </div>
  );
};

export default AgendaCalendar;