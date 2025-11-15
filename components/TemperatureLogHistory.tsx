import React, { useState, useMemo } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import type { TemperatureLog } from '../types';

interface TemperatureLogHistoryProps {
  isVisible: boolean;
  logs: TemperatureLog[];
  onClose: () => void;
}

type FilterType = 'All' | 'Food' | 'Fridge' | 'Freezer';

const TemperatureLogHistory: React.FC<TemperatureLogHistoryProps> = ({ isVisible, logs, onClose }) => {
  const [filterDate, setFilterDate] = useState<string>('');

  const filteredLogs = useMemo(() => {
    return [...logs]
      .reverse()
      .filter(log => {
        const dateMatch = !filterDate || log.timestamp.startsWith(filterDate);
        return dateMatch;
      });
  }, [logs, filterDate]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl"
        onClick={e => e.stopPropagation()}
      >
        <Card className="max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-400 flex items-center">
              <Icon name="history" className="h-6 w-6 mr-2" />
              Food Probe Log History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-grow">
                 <label htmlFor="date-filter" className="text-sm font-medium text-gray-400 mb-1 block">Filter by Date</label>
                 <input
                    id="date-filter"
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
            </div>
          </div>
          
          {/* Log List */}
          <div className="flex-grow overflow-y-auto space-y-3 pr-2 bg-gray-900/50 p-2 rounded-md">
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <div key={log.id} className="bg-gray-800 p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                        <span className="font-semibold">{log.item}</span>
                        <span className="text-sm text-gray-400 ml-2">({log.type})</span>
                    </div>
                    <span className="text-lg font-semibold text-cyan-400">{log.temperature}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-1">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-500">
                <p>No logs found matching your criteria.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TemperatureLogHistory;