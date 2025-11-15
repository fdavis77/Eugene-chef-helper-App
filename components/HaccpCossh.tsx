import React, { useState, useEffect } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
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

interface ListHaccpLogsData {
  listHaccpLogs: HaccpLog[];
}

const LogEntryModal: React.FC<{
  log: Partial<HaccpLog>;
  onClose: () => void;
  onSave: (log: Partial<HaccpLog>) => void;
  onDelete: (id: string) => void;
}> = ({ log, onClose, onSave, onDelete }) => {
  const [currentLog, setCurrentLog] = useState(log);
  const isNew = !log.id;

  const handleSave = () => {
    if (currentLog.label && currentLog.temperature) {
      onSave(currentLog);
    }
  };
  
  const getTempColorClass = (tempStr: string, type?: 'Fridge' | 'Freezer') => {
      const temp = parseFloat(tempStr);
      if (isNaN(temp)) return 'border-medium focus:ring-black';
      if (type === 'Fridge' && (temp > 8 || temp < 1)) return 'border-red-500 ring-1 ring-red-500 focus:ring-red-500';
      if (type === 'Freezer' && temp > -18) return 'border-red-500 ring-1 ring-red-500 focus:ring-red-500';
      return 'border-green-500 focus:ring-green-500';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
        <Card>
          <h3 className="text-lg font-bold text-dark mb-4">{isNew ? 'Add' : 'Edit'} {log.type} Log</h3>
          <div className="space-y-4">
            <input type="text" placeholder="Equipment Name (e.g., Main Walk-in)" value={currentLog.label} onChange={e => setCurrentLog({...currentLog, label: e.target.value})} className="w-full bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition" autoFocus/>
            <div className="grid grid-cols-2 gap-4">
              <input type="time" value={currentLog.time} onChange={e => setCurrentLog({...currentLog, time: e.target.value})} className="w-full bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition" />
              <input type="text" placeholder="Temp (°C)" value={currentLog.temperature} onChange={e => setCurrentLog({...currentLog, temperature: e.target.value})} className={`w-full bg-light border rounded-md p-2 focus:ring-1 focus:outline-none transition ${getTempColorClass(currentLog.temperature || '', currentLog.type)}`} />
            </div>
            <input type="text" placeholder="Checked By (Initials)" value={currentLog.checkedBy} onChange={e => setCurrentLog({...currentLog, checkedBy: e.target.value})} className="w-full bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition" />
            <textarea placeholder="Corrective Action (if any)" value={currentLog.correctiveAction} onChange={e => setCurrentLog({...currentLog, correctiveAction: e.target.value})} className="w-full bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition" rows={2}/>
          </div>
          <div className="mt-6 flex justify-between items-center">
            <div>
              {!isNew && (
                <button onClick={() => onDelete(log.id!)} className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-50">
                   <Icon name="delete" className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="bg-medium text-dark font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition">Cancel</button>
              <button onClick={handleSave} className="bg-black text-white font-bold py-2 px-4 rounded-md hover:bg-gray-800 transition">Save</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};


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
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<Partial<HaccpLog> | null>(null);
    
    const today = new Date().toISOString().split('T')[0];

    const { data, loading, refetch } = useQuery<ListHaccpLogsData>(LIST_HACCP_LOGS_QUERY, {
        variables: { startDate: today, endDate: today },
        notifyOnNetworkStatusChange: true,
    });
    const haccpLogs: HaccpLog[] = (data?.listHaccpLogs || []).slice().sort((a, b) => a.time.localeCompare(b.time));

    const [createHaccpLog] = useMutation(CREATE_HACCP_LOG_MUTATION);
    const [updateHaccpLog] = useMutation(UPDATE_HACCP_LOG_MUTATION);
    const [deleteHaccpLog] = useMutation(DELETE_HACCP_LOG_MUTATION);

    useEffect(() => {
        if (recentlyDeletedLog) {
            const timerId = window.setTimeout(() => setRecentlyDeletedLog(null), 5000);
            return () => clearTimeout(timerId);
        }
    }, [recentlyDeletedLog]);

    const openAddModal = (type: 'Fridge' | 'Freezer') => {
        const now = new Date();
        setEditingLog({
            type: type,
            label: '',
            temperature: '',
            date: today,
            time: now.toTimeString().split(' ')[0].substring(0, 5),
            checkedBy: '',
            correctiveAction: '',
        });
        setIsLogModalOpen(true);
    };

    const openEditModal = (log: HaccpLog) => {
        setEditingLog(log);
        setIsLogModalOpen(true);
    };

    const handleSaveLog = async (log: Partial<HaccpLog>) => {
        const { id, ...logData } = log;
        try {
            if (id) {
                await updateHaccpLog({ variables: { id, ...logData } });
            } else {
                await createHaccpLog({ variables: logData });
            }
            refetch();
        } catch (e) {
            console.error("Failed to save log:", e);
            setError("Could not save log entry.");
        } finally {
            setIsLogModalOpen(false);
            setEditingLog(null);
        }
    };
    
    const handleDeleteHaccpLog = async (id: string) => {
        const logToDelete = haccpLogs.find(log => log.id === id);
        if (logToDelete) {
            setRecentlyDeletedLog(logToDelete);
            await deleteHaccpLog({ 
                variables: { id },
                refetchQueries: [{ query: LIST_HACCP_LOGS_QUERY, variables: { startDate: today, endDate: today } }],
            });
        }
        setIsLogModalOpen(false);
        setEditingLog(null);
    };
    
    const handleRestoreHaccpLog = async () => {
        if (recentlyDeletedLog) {
            const { id, ...logToRestore } = recentlyDeletedLog;
            await createHaccpLog({
                variables: logToRestore,
                refetchQueries: [{ query: LIST_HACCP_LOGS_QUERY, variables: { startDate: today, endDate: today } }],
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
            const result = await getSafetyAudit({ foodLogs: [], haccpLogs });
            setAuditReport(result);
        } catch (err) {
            setError('Failed to run AI Safety Audit. Please try again.');
        } finally {
            setIsLoadingAudit(false);
        }
    };
    
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
    
    const formattedToday = new Date(today.replace(/-/g, '/')).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-6">
            <TemperatureLogHistory
                isVisible={isHistoryVisible}
                logs={[]} // Placeholder until food logs are migrated
                onClose={() => setIsHistoryVisible(false)}
            />
            {isLogModalOpen && editingLog && (
              <LogEntryModal 
                log={editingLog}
                onClose={() => setIsLogModalOpen(false)}
                onSave={handleSaveLog}
                onDelete={handleDeleteHaccpLog}
              />
            )}
            
            {renderTabs()}

            {activeTab === 'equipment' && (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <h3 className="text-xl font-bold text-dark mb-2 sm:mb-0">
                            Logs for {formattedToday}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => openAddModal('Fridge')} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition text-sm flex items-center gap-2">
                                <Icon name="add" className="h-4 w-4"/> Log Fridge
                            </button>
                             <button onClick={() => openAddModal('Freezer')} className="bg-cyan-500 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-600 transition text-sm flex items-center gap-2">
                                <Icon name="add" className="h-4 w-4"/> Log Freezer
                            </button>
                        </div>
                    </div>
                    {loading ? (
                        <div className="text-center py-16"><Loader /></div>
                    ) : haccpLogs.length > 0 ? (
                        <div className="space-y-3">
                            {haccpLogs.map(log => (
                                <div key={log.id} onClick={() => openEditModal(log)} className="bg-light p-3 rounded-lg border border-medium hover:border-black cursor-pointer transition">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${log.type === 'Fridge' ? 'bg-blue-100 text-blue-800' : 'bg-cyan-100 text-cyan-800'}`}>{log.type}</span>
                                            <p className="font-bold text-dark mt-1">{log.label}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-dark">{log.temperature}°C</p>
                                            <p className="text-xs text-muted">{log.time} by {log.checkedBy}</p>
                                        </div>
                                    </div>
                                    {log.correctiveAction && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-yellow-300">
                                            <p className="text-xs text-yellow-700"><span className="font-semibold">Action:</span> {log.correctiveAction}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted">
                            <p>No equipment logs recorded for today.</p>
                            <p className="text-sm">Click a button above to add a new log.</p>
                        </div>
                    )}
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