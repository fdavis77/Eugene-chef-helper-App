import React, { useState } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import { getHaccpInfo } from '../services/geminiService';
import type { HaccpLog, TemperatureLog } from '../types';
import TemperatureLogHistory from './TemperatureLogHistory';

const initialFridgeLogs: HaccpLog[] = [
    { id: 1, label: 'Main Walk-in', date: '2024-07-21', time: '08:05', temperature: '3.5', checkedBy: 'JD', correctiveAction: '' },
    { id: 2, label: 'Prep Fridge 1', date: '2024-07-21', time: '14:30', temperature: '4.0', checkedBy: 'AS', correctiveAction: 'Door seal checked.' },
];

const initialFreezerLogs: HaccpLog[] = [
    { id: 1, label: 'Bar Freezer', date: '2024-07-21', time: '08:06', temperature: '-18.2', checkedBy: 'JD', correctiveAction: '' },
    { id: 2, label: 'Walk-in Freezer', date: '2024-07-21', time: '14:32', temperature: '-19.0', checkedBy: 'AS', correctiveAction: '' },
];

interface HaccpCosshProps {
    allLogs: TemperatureLog[];
}

const HaccpCossh: React.FC<HaccpCosshProps> = ({ allLogs }) => {
    const [fridgeLogs, setFridgeLogs] = useState<HaccpLog[]>(initialFridgeLogs);
    const [freezerLogs, setFreezerLogs] = useState<HaccpLog[]>(initialFreezerLogs);
    const [query, setQuery] = useState('');
    const [guidance, setGuidance] = useState('');
    const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
    const [error, setError] = useState('');
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);

    const foodLogs = allLogs.filter(log => log.type === 'Food');

    const handleGetGuidance = async () => {
        if (!query.trim()) {
            setError('Please enter a question to get guidance.');
            return;
        }
        setIsLoadingGuidance(true);
        setError('');
        setGuidance('');
        try {
            const result = await getHaccpInfo(query);
            setGuidance(result);
        } catch (err) {
            setError('Failed to get guidance. Please try again.');
            console.error(err);
        } finally {
            setIsLoadingGuidance(false);
        }
    };

    const handleInputChange = (
        logType: 'fridge' | 'freezer',
        id: number,
        field: keyof Omit<HaccpLog, 'id'>,
        value: string
    ) => {
        const updater = logType === 'fridge' ? setFridgeLogs : setFreezerLogs;
        updater(prevLogs =>
            prevLogs.map(log =>
                log.id === id ? { ...log, [field]: value } : log
            )
        );
    };

    const handleAddRow = (logType: 'fridge' | 'freezer') => {
        const updater = logType === 'fridge' ? setFridgeLogs : setFreezerLogs;
        const newId = Date.now();
        const now = new Date();
        const newRow: HaccpLog = {
            id: newId,
            label: '',
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0].substring(0, 5),
            temperature: '',
            checkedBy: '',
            correctiveAction: '',
        };
        updater(prevLogs => [...prevLogs, newRow]);
    };

    const handleDeleteRow = (logType: 'fridge' | 'freezer', id: number) => {
        const updater = logType === 'fridge' ? setFridgeLogs : setFreezerLogs;
        updater(prevLogs => prevLogs.filter(log => log.id !== id));
    };

    const renderEditableLogTable = (
        title: string,
        logType: 'fridge' | 'freezer',
        logs: HaccpLog[]
    ) => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-400">{title}</h3>
                <button
                    onClick={() => handleAddRow(logType)}
                    className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300 flex items-center"
                >
                    <Icon name="add" className="h-5 w-5 mr-2" />
                    Add Entry
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-700 text-gray-300 uppercase">
                        <tr>
                            <th className="p-3">Label/ID</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Time</th>
                            <th className="p-3">Temp (°C)</th>
                            <th className="p-3">Initials</th>
                            <th className="p-3">Corrective Action</th>
                            <th className="p-3 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-700/50">
                                {(['label', 'date', 'time', 'temperature', 'checkedBy', 'correctiveAction'] as const).map(field => (
                                    <td key={field} className="p-1">
                                        <input
                                            type={field === 'date' ? 'date' : field === 'time' ? 'time' : 'text'}
                                            value={log[field]}
                                            onChange={(e) => handleInputChange(logType, log.id, field, e.target.value)}
                                            className="w-full bg-transparent border border-gray-600 rounded-md p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                                        />
                                    </td>
                                ))}
                                <td className="p-1 text-center">
                                    <button
                                        onClick={() => handleDeleteRow(logType, log.id)}
                                        className="text-red-400 hover:text-red-300 p-2 rounded-md"
                                        aria-label="Delete log entry"
                                    >
                                        <Icon name="delete" className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderFoodProbeLogTable = (logs: TemperatureLog[]) => (
        <Card>
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-blue-400">Food Probe / Cooking / Reheating / Cooling Log</h3>
                <button
                    onClick={() => setIsHistoryVisible(true)}
                    className="bg-gray-700 text-gray-300 hover:bg-gray-600 px-3 py-1 rounded-md text-sm font-medium flex items-center transition-colors"
                >
                    <Icon name="history" className="h-4 w-4 mr-2" />
                    View History
                </button>
            </div>
              <div className="overflow-y-auto max-h-64">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-700 text-gray-300 uppercase sticky top-0">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Time</th>
                            <th className="p-3">Item</th>
                            <th className="p-3">Temperature</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {logs.length > 0 ? (
                            [...logs].reverse().map(log => {
                                const logDate = new Date(log.timestamp);
                                return (
                                    <tr key={log.id} className="hover:bg-gray-700/50">
                                        <td className="p-3">{logDate.toLocaleDateString()}</td>
                                        <td className="p-3">{logDate.toLocaleTimeString()}</td>
                                        <td className="p-3">{log.item}</td>
                                        <td className="p-3">{log.temperature}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-gray-500">
                                    Food temperature logs recorded via the Chef Bot will appear here.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
              </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <TemperatureLogHistory
                isVisible={isHistoryVisible}
                logs={allLogs}
                onClose={() => setIsHistoryVisible(false)}
            />
            <Card>
                <h2 className="text-xl font-semibold text-blue-400 mb-2 flex items-center">
                    <Icon name="book" className="h-6 w-6 mr-2" />
                    HACCP Digital Logbook & Guidance
                </h2>
                <p className="text-gray-400">Maintain daily temperature records and get expert guidance on food safety regulations.</p>
            </Card>

            <Card>
                <h2 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                    <Icon name="help" className="h-6 w-6 mr-2" />
                    HACCP & COSHH Guidance
                </h2>
                <p className="text-gray-400 mb-4">Ask any question about food safety, HACCP principles, or COSHH regulations to get expert guidance.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., What are the 7 principles of HACCP?"
                        className="flex-grow bg-gray-800 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                        rows={2}
                    />
                    <button
                        onClick={handleGetGuidance}
                        disabled={isLoadingGuidance}
                        className="bg-blue-500 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-600 transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
                    >
                        {isLoadingGuidance ? <Loader /> : 'Get Guidance'}
                    </button>
                </div>
                {error && <p className="text-red-400 mt-4">{error}</p>}
            </Card>

            {(isLoadingGuidance || guidance) && (
                <Card>
                    <h3 className="text-lg font-semibold text-blue-400 mb-4">Guidance Result</h3>
                    {isLoadingGuidance ? (
                        <div className="flex flex-col items-center justify-center p-8">
                            <Loader />
                            <p className="mt-4 text-gray-400">Consulting food safety expert...</p>
                        </div>
                    ) : (
                        guidance && <pre className="whitespace-pre-wrap font-sans bg-gray-800 p-4 rounded-md text-gray-300">{guidance}</pre>
                    )}
                </Card>
            )}

            {renderEditableLogTable('Fridge Temperature Log', 'fridge', fridgeLogs)}
            {renderEditableLogTable('Freezer Temperature Log', 'freezer', freezerLogs)}
            {renderFoodProbeLogTable(foodLogs)}
        </div>
    );
};

export default HaccpCossh;