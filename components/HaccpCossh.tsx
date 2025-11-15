import React, { useState, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import { getHaccpInfo, getSafetyAudit } from '../services/geminiService';
import type { HaccpLog } from '../types';
import TemperatureLogHistory from './TemperatureLogHistory';
import { MarkdownRenderer } from './common/MarkdownRenderer';

// GraphQL Operations for HACCP Logs
const LIST_HACCP_LOGS_QUERY = gql`
  query ListHaccpLogs($startDate: Date, $endDate: Date) {
    listHaccpLogs(startDate: $startDate, endDate: $endDate) {
      id
      type
      label
      date
      time
      temperature
      checkedBy
      correctiveAction
    }
  }
`;

const CREATE_HACCP_LOG_MUTATION = gql`
  mutation CreateHaccpLog(
    $type: String!
    $label: String!
    $date: Date!
    $time: Time!
    $temperature: String!
    $checkedBy: String
    $correctiveAction: String
  ) {
    createHaccpLog(
      type: $type
      label: $label
      date: $date
      time: $time
      temperature: $temperature
      checkedBy: $checkedBy
      correctiveAction: $correctiveAction
    ) {
      id
      type
      label
      date
      time
      temperature
      checkedBy
      correctiveAction
    }
  }
`;

const UPDATE_HACCP_LOG_MUTATION = gql`
  mutation UpdateHaccpLog(
    $id: ID!
    $label: String
    $time: Time
    $temperature: String
    $checkedBy: String
    $correctiveAction: String
  ) {
    updateHaccpLog(
      id: $id
      label: $label
      time: $time
      temperature: $temperature
      checkedBy: $checkedBy
      correctiveAction: $correctiveAction
    ) {
      id
    }
  }
`;

const DELETE_HACCP_LOG_MUTATION = gql`
  mutation DeleteHaccpLog($id: ID!) {
    deleteHaccpLog(id: $id) {
      id
    }
  }
`;

const HaccpCossh: React.FC = () => {
    const [query, setQuery] = useState('');
    const [guidance, setGuidance] = useState('');
    const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
    const [auditReport, setAuditReport] = useState('');
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [error, setError] = useState('');
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('equipment');
    const [recentlyDeletedLog, setRecentlyDeletedLog] = useState<HaccpLog | null>(null);
    
    // State for weekly calendar view
    const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const getWeekDays = (startDate: Date): Date[] => {
        const start = new Date(startDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const firstDay = new Date(start.setDate(diff));
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(firstDay);
            d.setDate(firstDay.getDate() + i);
            return d;
        });
    };
    
    const weekDays = getWeekDays(currentWeekDate);
    const weekStart = weekDays[0].toISOString().split('T')[0];
    const weekEnd = weekDays[6].toISOString().split('T')[0];

    // Fetch HACCP logs for the current week using Apollo Client
    const { data, loading, refetch } = useQuery(LIST_HACCP_LOGS_QUERY, {
        variables: { startDate: weekStart, endDate: weekEnd },
        notifyOnNetworkStatusChange: true,
    });
    const haccpLogs: HaccpLog[] = data?.listHaccpLogs || [];

    // Define mutations
    const [createHaccpLog] = useMutation(CREATE_HACCP_LOG_MUTATION);
    const [updateHaccpLog] = useMutation(UPDATE_HACCP_LOG_MUTATION);
    const [deleteHaccpLog] = useMutation(DELETE_HACCP_LOG_MUTATION);

    // Effect to handle the "Undo" timeout
    useEffect(() => {
        if (recentlyDeletedLog) {
            const timerId = window.setTimeout(() => setRecentlyDeletedLog(null), 5000);
            return () => clearTimeout(timerId);
        }
    }, [recentlyDeletedLog]);

    const handlePrevWeek = () => {
        const newDate = new Date(currentWeekDate);
        newDate.setDate(currentWeekDate.getDate() - 7);
        setCurrentWeekDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentWeekDate);
        newDate.setDate(currentWeekDate.getDate() + 7);
        setCurrentWeekDate(newDate);
    };
    
    const handleAddHaccpLog = async (type: 'Fridge' | 'Freezer', date: string) => {
        const now = new Date();
        await createHaccpLog({
            variables: {
                type,
                label: '',
                temperature: '',
                date,
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                checkedBy: '',
                correctiveAction: '',
            },
            refetchQueries: [{ query: LIST_HACCP_LOGS_QUERY, variables: { startDate: weekStart, endDate: weekEnd } }],
        });
    };
    
    const handleUpdateHaccpLog = (updatedLog: HaccpLog) => {
        const { id, label, time, temperature, checkedBy, correctiveAction } = updatedLog;
        updateHaccpLog({ variables: { id, label, time, temperature, checkedBy, correctiveAction } });
    };
    
    const handleDeleteHaccpLog = async (id: string) => {
        const logToDelete = haccpLogs.find(log => log.id === id);
        if (logToDelete) {
            setRecentlyDeletedLog(logToDelete);
            await deleteHaccpLog({ 
                variables: { id },
                refetchQueries: [{ query: LIST_HACCP_LOGS_QUERY, variables: { startDate: weekStart, endDate: weekEnd } }],
            });
        }
    };
    
    const handleRestoreHaccpLog = async () => {
        if (recentlyDeletedLog) {
            const { id, ...logToRestore } = recentlyDeletedLog;
            await createHaccpLog({
                variables: logToRestore,
                refetchQueries: [{ query: LIST_HACCP_LOGS_QUERY, variables: { startDate: weekStart, endDate: weekEnd } }],
            });
            setRecentlyDeletedLog(null);
        }
    };

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
        } finally {
            setIsLoadingGuidance(false);
        }
    };
    
    const handleRunAudit = async () => {
        setIsLoadingAudit(true);
        setError('');
        setAuditReport('');
        try {
            // NOTE: The audit will run on logs currently loaded in the component.
            // For a full audit, this would need to fetch all logs from the backend.
            const result = await getSafetyAudit({ foodLogs: [], haccpLogs });
            setAuditReport(result);
        } catch (err) {
            setError('Failed to run AI Safety Audit. Please try again.');
        } finally {
            setIsLoadingAudit(false);
        }
    };

    const handleInputChange = (
        log: HaccpLog,
        field: keyof Omit<HaccpLog, 'id' | 'type' | 'date'>,
        value: string
    ) => {
        handleUpdateHaccpLog({ ...log, [field]: value });
    };

    const getTempColorClass = (tempStr: string, type: 'Fridge' | 'Freezer') => {
        const temp = parseFloat(tempStr);
        if (isNaN(temp)) return 'border-medium focus:ring-black';
        if (type === 'Fridge' && (temp > 8 || temp < 1)) return 'border-red-500 ring-1 ring-red-500 focus:ring-red-500';
        if (type === 'Freezer' && temp > -18) return 'border-red-500 ring-1 ring-red-500 focus:ring-red-500';
        return 'border-green-500 focus:ring-green-500';
    };
    
    const selectedDayFridgeLogs = haccpLogs.filter(log => log.type === 'Fridge' && log.date === selectedDate);
    const selectedDayFreezerLogs = haccpLogs.filter(log => log.type === 'Freezer' && log.date === selectedDate);
    
    // Other render functions (renderEditableLogTable, etc.) remain largely the same,
    // just using the new state and handlers. I will paste the full component for completeness.

    const renderEditableLogTable = (
        title: string,
        logType: 'Fridge' | 'Freezer',
        logs: HaccpLog[]
    ) => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-dark">{title}</h3>
                <button
                    onClick={() => handleAddHaccpLog(logType, selectedDate)}
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
                            <th className="p-3">Time</th>
                            <th className="p-3">Temp (°C)</th>
                            <th className="p-3">Initials</th>
                            <th className="p-3">Corrective Action</th>
                            <th className="p-3 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-medium">
                        {logs.length > 0 ? logs.map(log => (
                            <tr key={log.id} className="hover:bg-light">
                                {(['label', 'time', 'temperature', 'checkedBy', 'correctiveAction'] as const).map(field => (
                                    <td key={field} className="p-1">
                                        <input
                                            type={field === 'time' ? 'time' : 'text'}
                                            defaultValue={log[field]} // Use defaultValue for uncontrolled-like behavior on each field
                                            onBlur={(e) => handleInputChange(log, field, e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                            className={`w-full bg-white border rounded-md p-2 focus:ring-1 focus:outline-none transition text-dark ${
                                                field === 'temperature' ? getTempColorClass(log.temperature, logType) : 'border-medium focus:ring-black'
                                            }`}
                                        />
                                    </td>
                                ))}
                                <td className="p-1 text-center">
                                    <button
                                        onClick={() => handleDeleteHaccpLog(log.id)}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-md"
                                        aria-label="Delete log entry"
                                    >
                                        <Icon name="delete" className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-muted">
                                    No {logType} logs for this day.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const renderFoodProbeLogList = () => (
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
          <div className="text-center p-8 text-muted rounded-lg bg-light">
              <p>Food probe logs added via the Chef Bot will appear here once connected to the database.</p>
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
    
    const formattedSelectedDate = new Date(selectedDate);
    const tzOffset = formattedSelectedDate.getTimezoneOffset() * 60000;
    const localDate = new Date(formattedSelectedDate.getTime() + tzOffset);

    return (
        <div className="space-y-6">
            <TemperatureLogHistory
                isVisible={isHistoryVisible}
                logs={[]} // Placeholder until food logs are migrated
                onClose={() => setIsHistoryVisible(false)}
            />
            
            {renderTabs()}

            {activeTab === 'equipment' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={handlePrevWeek} className="p-2 rounded-full hover:bg-light">
                        <Icon name="chevron-left" className="w-5 h-5 text-muted" />
                        </button>
                        <h2 className="font-semibold text-lg text-dark text-center">
                        Week of {weekDays[0].toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                        </h2>
                        <button onClick={handleNextWeek} className="p-2 rounded-full hover:bg-light">
                        <Icon name="chevron-right" className="w-5 h-5 text-muted" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-2 mb-6">
                        {weekDays.map(day => {
                            const dateStr = day.toISOString().split('T')[0];
                            const isSelected = selectedDate === dateStr;
                            const hasLogs = haccpLogs.some(log => log.date === dateStr);
                            return (
                                <button
                                key={dateStr}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`p-2 text-center rounded-lg transition-colors ${
                                    isSelected ? 'bg-black text-white' : 'bg-light hover:bg-medium'
                                }`}
                                >
                                <p className="text-xs font-semibold">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                                <p className="text-lg font-bold">{day.getDate()}</p>
                                {hasLogs && <div className="mx-auto mt-1 w-2 h-2 bg-primary rounded-full"></div>}
                                </button>
                            );
                        })}
                    </div>

                    <div className="border-t border-medium pt-4 mt-4">
                         <h3 className="text-xl font-bold text-dark mb-4">
                            Logs for {localDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h3>
                        {loading ? <div className="text-center py-8"><Loader /></div> : (
                            <div className="space-y-6">
                                {renderEditableLogTable('Fridge Temperature Log', 'Fridge', selectedDayFridgeLogs)}
                                {renderEditableLogTable('Freezer Temperature Log', 'Freezer', selectedDayFreezerLogs)}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {activeTab === 'food' && (
                <Card>
                    {renderFoodProbeLogList()}
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
            
            {recentlyDeletedLog && (
                <div className="fixed bottom-24 right-6 z-50">
                    <div className="bg-dark text-white font-semibold py-3 px-5 rounded-lg shadow-2xl flex items-center justify-between gap-4 animate-fade-in-up">
                        <span>Log for "{recentlyDeletedLog.label}" deleted.</span>
                        <button 
                            onClick={handleRestoreHaccpLog} 
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
