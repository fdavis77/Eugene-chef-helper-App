import React, { useState } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import { getHaccpInfo, getSafetyAudit } from '../services/geminiService';
import type { HaccpLog, TemperatureLog } from '../types';
import TemperatureLogHistory from './TemperatureLogHistory';
import { MarkdownRenderer } from './common/MarkdownRenderer';

interface HaccpCosshProps {
    foodLogs: TemperatureLog[];
    haccpLogs: HaccpLog[];
    onAddHaccpLog: (logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => void;
    onUpdateHaccpLog: (log: HaccpLog) => void;
    onDeleteHaccpLog: (id: number) => void;
    recentlyDeletedLog: HaccpLog | null;
    onRestoreHaccpLog: () => void;
}

const HaccpCossh: React.FC<HaccpCosshProps> = ({ foodLogs, haccpLogs, onAddHaccpLog, onUpdateHaccpLog, onDeleteHaccpLog, recentlyDeletedLog, onRestoreHaccpLog }) => {
    const [query, setQuery] = useState('');
    const [guidance, setGuidance] = useState('');
    const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
    const [auditReport, setAuditReport] = useState('');
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [error, setError] = useState('');
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('equipment');

    const fridgeLogs = haccpLogs.filter(log => log.type === 'Fridge');
    const freezerLogs = haccpLogs.filter(log => log.type === 'Freezer');

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
        } catch (err)
        {
            setError('Failed to get guidance. Please try again.');
            console.error(err);
        } finally {
            setIsLoadingGuidance(false);
        }
    };
    
    const handleRunAudit = async () => {
        setIsLoadingAudit(true);
        setError('');
        setAuditReport('');
        try {
            const result = await getSafetyAudit({ foodLogs, haccpLogs });
            setAuditReport(result);
        } catch (err) {
            setError('Failed to run AI Safety Audit. Please try again.');
            console.error(err);
        } finally {
            setIsLoadingAudit(false);
        }
    };

    const handleInputChange = (
        log: HaccpLog,
        field: keyof Omit<HaccpLog, 'id' | 'type'>,
        value: string
    ) => {
        onUpdateHaccpLog({ ...log, [field]: value });
    };

    const handleLogNow = (type: 'Fridge' | 'Freezer') => {
        onAddHaccpLog({
            type,
            label: '',
            temperature: '',
        });
    };

    const getTempColorClass = (tempStr: string, type: 'Fridge' | 'Freezer') => {
        const temp = parseFloat(tempStr);
        const defaultClass = 'border-medium focus:ring-black';
        if (isNaN(temp)) return defaultClass;

        if (type === 'Fridge') {
            if (temp > 8) return 'border-red-500 ring-1 ring-red-500 focus:ring-red-500';
            if (temp > 4) return 'border-yellow-500 ring-1 ring-yellow-500 focus:ring-yellow-500';
            return 'border-green-500 focus:ring-green-500';
        } else { // Freezer
            if (temp > -15) return 'border-red-500 ring-1 ring-red-500 focus:ring-red-500';
            if (temp > -18) return 'border-yellow-500 ring-1 ring-yellow-500 focus:ring-yellow-500';
            return 'border-green-500 focus:ring-green-500';
        }
    };

    const renderEditableLogTable = (
        title: string,
        logType: 'Fridge' | 'Freezer',
        logs: HaccpLog[]
    ) => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-dark">{title}</h3>
                <button
                    onClick={() => handleLogNow(logType)}
                    className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition duration-300 flex items-center text-sm"
                >
                    <Icon name="add" className="h-5 w-5 mr-2" />
                    Log Now
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-light text-muted uppercase">
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
                    <tbody className="divide-y divide-medium">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-light">
                                {(['label', 'date', 'time', 'temperature', 'checkedBy', 'correctiveAction'] as const).map(field => (
                                    <td key={field} className="p-1">
                                        <input
                                            type={field === 'date' ? 'date' : field === 'time' ? 'time' : 'text'}
                                            value={log[field]}
                                            onChange={(e) => handleInputChange(log, field, e.target.value)}
                                            className={`w-full bg-white border rounded-md p-2 focus:ring-1 focus:outline-none transition text-dark ${
                                                field === 'temperature' ? getTempColorClass(log.temperature, logType) : 'border-medium focus:ring-black'
                                            }`}
                                        />
                                    </td>
                                ))}
                                <td className="p-1 text-center">
                                    <button
                                        onClick={() => onDeleteHaccpLog(log.id)}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-md"
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
        </div>
    );

    const renderFoodProbeLogList = (logs: TemperatureLog[]) => (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-dark">Recent Food Probe Logs</h3>
                <button
                    onClick={() => setIsHistoryVisible(true)}
                    className="bg-medium text-dark hover:bg-gray-300 px-3 py-1 rounded-full text-sm font-semibold flex items-center transition-colors"
                >
                    <Icon name="history" className="h-4 w-4 mr-2" />
                    View History
                </button>
            </div>
              <div className="space-y-3">
                {logs.length > 0 ? (
                    [...logs].slice(0, 5).map(log => {
                        const logDate = new Date(log.timestamp);
                        return (
                             <div key={log.id} className="bg-light p-3 rounded-lg border border-medium">
                                <div className="flex justify-between items-center font-semibold">
                                    <span className="text-dark">{log.item} ({log.type})</span>
                                    <span className="text-lg text-primary">{log.temperature}°C</span>
                                </div>
                                <p className="text-xs text-muted text-right">{logDate.toLocaleTimeString()}</p>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center p-8 text-muted rounded-lg bg-light">
                        <p>Food temperature logs recorded via the Chef Bot will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderTabs = () => (
        <div className="mb-6 border-b border-medium">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button onClick={() => setActiveTab('equipment')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'equipment' ? 'border-black text-black' : 'border-transparent text-muted hover:text-dark'}`}>
                    Equipment Logs
                </button>
                <button onClick={() => setActiveTab('food')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'food' ? 'border-black text-black' : 'border-transparent text-muted hover:text-dark'}`}>
                    Food Logs
                </button>
                <button onClick={() => setActiveTab('audit')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'audit' ? 'border-black text-black' : 'border-transparent text-muted hover:text-dark'}`}>
                    AI Safety Audit
                </button>
                <button onClick={() => setActiveTab('guidance')} className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'guidance' ? 'border-black text-black' : 'border-transparent text-muted hover:text-dark'}`}>
                    Guidance
                </button>
            </nav>
        </div>
    );

    return (
        <div className="space-y-6">
            <TemperatureLogHistory
                isVisible={isHistoryVisible}
                logs={foodLogs}
                onClose={() => setIsHistoryVisible(false)}
            />
            
            {renderTabs()}

            {activeTab === 'equipment' && (
                <Card>
                    <div className="space-y-6">
                        {renderEditableLogTable('Fridge Temperature Log', 'Fridge', fridgeLogs)}
                        {renderEditableLogTable('Freezer Temperature Log', 'Freezer', freezerLogs)}
                    </div>
                </Card>
            )}

            {activeTab === 'food' && (
                <Card>
                    {renderFoodProbeLogList(foodLogs)}
                </Card>
            )}

            {activeTab === 'audit' && (
                <Card>
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 text-primary p-2 rounded-lg">
                           <Icon name="shield-check" className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-dark">AI Safety Audit</h2>
                            <p className="text-muted mt-1 mb-4 text-sm">Analyze all recent temperature logs to identify trends, potential risks, and compliance gaps.</p>
                            <button
                                onClick={handleRunAudit}
                                disabled={isLoadingAudit}
                                className="bg-black text-white font-bold py-2 px-5 rounded-full hover:bg-gray-800 transition duration-300 disabled:bg-gray-400 flex items-center justify-center"
                            >
                                {isLoadingAudit ? <Loader /> : 'Run AI Safety Audit'}
                            </button>
                        </div>
                    </div>

                    {(isLoadingAudit || auditReport) && (
                         <div className="mt-6 border-t border-medium pt-4">
                            <h3 className="text-md font-semibold text-dark mb-2">Audit Report</h3>
                            {isLoadingAudit ? (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <Loader />
                                    <p className="mt-4 text-muted">Analyzing your log data...</p>
                                </div>
                            ) : (
                               auditReport && <MarkdownRenderer content={auditReport} containerClassName="text-sm" />
                            )}
                        </div>
                    )}
                </Card>
            )}

            {activeTab === 'guidance' && (
                 <Card>
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 text-primary p-2 rounded-lg">
                            <Icon name="help" className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-dark">HACCP & COSHH Guidance</h2>
                            <p className="text-muted mt-1 mb-4 text-sm">Ask any question about food safety, HACCP principles, or COSHH regulations to get expert guidance.</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <textarea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="e.g., What are the 7 principles of HACCP?"
                                    className="flex-grow bg-light border-medium text-dark placeholder:text-muted focus:ring-black border rounded-full p-3 pl-5 focus:ring-2 focus:outline-none transition"
                                    rows={1}
                                />
                                <button
                                    onClick={handleGetGuidance}
                                    disabled={isLoadingGuidance}
                                    className="bg-black text-white font-bold py-3 px-5 rounded-full hover:bg-gray-800 transition duration-300 disabled:bg-gray-400 flex items-center justify-center"
                                >
                                    {isLoadingGuidance ? <Loader /> : 'Get Guidance'}
                                </button>
                            </div>
                            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
                        </div>
                    </div>

                    {(isLoadingGuidance || guidance) && (
                        <div className="mt-6 border-t border-medium pt-4">
                            <h3 className="text-md font-semibold text-dark mb-2">Guidance Result</h3>
                            {isLoadingGuidance ? (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <Loader />
                                    <p className="mt-4 text-muted">Consulting food safety expert...</p>
                                </div>
                            ) : (
                                guidance && <MarkdownRenderer content={guidance} containerClassName="text-sm" />
                            )}
                        </div>
                    )}
                </Card>
            )}
            
            {/* Undo Toast */}
            {recentlyDeletedLog && (
                <div className="fixed bottom-24 right-6 z-50">
                    <div className="bg-dark text-white font-semibold py-3 px-5 rounded-lg shadow-2xl flex items-center justify-between gap-4 animate-fade-in-up">
                        <span>Log for "{recentlyDeletedLog.label}" deleted.</span>
                        <button 
                            onClick={onRestoreHaccpLog} 
                            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-bold"
                        >
                            <Icon name="undo" className="h-5 w-5"/>
                            Undo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HaccpCossh;