import React, { useState, useRef, useEffect } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import { getHaccpInfo, getSafetyAudit } from '../services/geminiService';
import { useTheme } from '../contexts/ThemeContext';
import type { HaccpLog, TemperatureLog, OpeningClosingCheck, CoolingLog, CosshLog, ProbeCalibrationLog, RecentlyDeletedItem } from '../types';
import { MarkdownRenderer } from './common/MarkdownRenderer';

interface HaccpCosshProps {
    foodLogs: TemperatureLog[];
    haccpLogs: HaccpLog[];
    onAddHaccpLog: (logData: Omit<HaccpLog, 'id' | 'date' | 'time' | 'checkedBy' | 'correctiveAction'>) => void;
    onUpdateHaccpLog: (log: HaccpLog) => void;
    onDeleteHaccpLog: (id: number) => void;
    openingClosingLogs: OpeningClosingCheck[];
    onAddOpeningClosingLog: (logData: Omit<OpeningClosingCheck, 'id'>) => void;
    onUpdateOpeningClosingLog: (log: OpeningClosingCheck) => void;
    onDeleteOpeningClosingLog: (id: number) => void;
    coolingLogs: CoolingLog[];
    onAddCoolingLog: (logData: Omit<CoolingLog, 'id'>) => void;
    onUpdateCoolingLog: (log: CoolingLog) => void;
    onDeleteCoolingLog: (id: number) => void;
    cosshLogs: CosshLog[];
    onAddCosshLog: (logData: Omit<CosshLog, 'id'>) => void;
    onUpdateCosshLog: (log: CosshLog) => void;
    onDeleteCosshLog: (id: number) => void;
    probeCalibrationLogs: ProbeCalibrationLog[];
    onAddProbeCalibrationLog: (logData: Omit<ProbeCalibrationLog, 'id'>) => void;
    onUpdateProbeCalibrationLog: (log: ProbeCalibrationLog) => void;
    onDeleteProbeCalibrationLog: (id: number) => void;
    recentlyDeletedItem: RecentlyDeletedItem | null;
    onRestoreLog: () => void;
}

const TABS = [
    { id: 'dailyChecks', label: 'Daily Checks' },
    { id: 'fridgeFreezer', label: 'Fridge & Freezer' },
    { id: 'foodProbe', label: 'Food Probe' },
    { id: 'cooling', label: 'Cooling Logs' },
    { id: 'calibration', label: 'Probe Calibration' },
    { id: 'cossh', label: 'COSHH Register' },
    { id: 'monthlyReport', label: 'Monthly Report'},
    { id: 'audit', label: 'AI Safety Audit' },
    { id: 'guidance', label: 'Guidance' },
];

type ExportFormat = 'csv' | 'excel' | 'clipboard';

const exportData = (data: any[], filename: string, format: ExportFormat) => {
    if (data.length === 0) {
        alert("No data to export.");
        return;
    }

    const headers = Object.keys(data[0]);
    
    // Helper to format a cell for CSV/Excel
    const formatCell = (cell: any) => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'object') return JSON.stringify(cell).replace(/"/g, '""');
        return String(cell).replace(/"/g, '""');
    };

    // Helper to format for Clipboard (TSV)
    const formatCellTSV = (cell: any) => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'object') return JSON.stringify(cell);
        // Remove newlines and tabs to prevent breaking the grid paste
        return String(cell).replace(/[\t\n\r]/g, ' ');
    };

    if (format === 'clipboard') {
        const tsvRows = data.map(row => 
            headers.map(fieldName => formatCellTSV(row[fieldName])).join('\t')
        );
        const tsvString = [headers.join('\t'), ...tsvRows].join('\n');
        
        navigator.clipboard.writeText(tsvString).then(() => {
            alert("Data copied to clipboard! Ready to paste into Google Sheets or Excel.");
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert("Failed to copy to clipboard.");
        });
        return;
    }

    const csvRows = data.map(row => 
        headers.map(fieldName => `"${formatCell(row[fieldName])}"`).join(',')
    );

    const csvContent = [headers.join(','), ...csvRows].join('\r\n');
    
    // Add BOM for Excel compatibility if requested
    const blobData = format === 'excel' ? '\uFEFF' + csvContent : csvContent;
    const blob = new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ExportMenu: React.FC<{ onExport: (format: ExportFormat) => void, activeTheme: any }> = ({ onExport, activeTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`bg-medium ${activeTheme.classes.textColor} font-bold py-2 px-4 rounded-full hover:bg-gray-300 transition text-sm flex items-center`}
                title="Export Data"
            >
                <Icon name="download" className="h-4 w-4 mr-2" />
                Export
                <Icon name="chevron-right" className={`h-3 w-3 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-lg shadow-xl border z-20 ${activeTheme.classes.cardBg} ${activeTheme.classes.cardBorder} overflow-hidden`}>
                    <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${activeTheme.classes.textMuted} bg-black/5 border-b ${activeTheme.classes.inputBorder}`}>
                        Download Options
                    </div>
                    <button onClick={() => { onExport('csv'); setIsOpen(false); }} className={`w-full text-left px-4 py-3 text-sm hover:bg-black/5 ${activeTheme.classes.textColor} flex items-center gap-2`}>
                        <span className="font-mono text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">CSV</span>
                        Standard CSV
                    </button>
                    <button onClick={() => { onExport('excel'); setIsOpen(false); }} className={`w-full text-left px-4 py-3 text-sm hover:bg-black/5 ${activeTheme.classes.textColor} flex items-center gap-2 border-t ${activeTheme.classes.inputBorder}`}>
                         <span className="font-mono text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">XLS</span>
                         Excel Compatible
                    </button>
                    <button onClick={() => { onExport('clipboard'); setIsOpen(false); }} className={`w-full text-left px-4 py-3 text-sm hover:bg-black/5 ${activeTheme.classes.textColor} flex items-center gap-2 border-t ${activeTheme.classes.inputBorder}`}>
                        <Icon name="copy" className="h-3 w-3" />
                        Copy for Sheets
                    </button>
                </div>
            )}
        </div>
    );
};


const HaccpCossh: React.FC<HaccpCosshProps> = (props) => {
    const { 
        foodLogs, haccpLogs, onAddHaccpLog, onUpdateHaccpLog, onDeleteHaccpLog,
        openingClosingLogs, onAddOpeningClosingLog, onUpdateOpeningClosingLog, onDeleteOpeningClosingLog,
        coolingLogs, onAddCoolingLog, onUpdateCoolingLog, onDeleteCoolingLog,
        cosshLogs, onAddCosshLog, onUpdateCosshLog, onDeleteCosshLog,
        probeCalibrationLogs, onAddProbeCalibrationLog, onUpdateProbeCalibrationLog, onDeleteProbeCalibrationLog,
        recentlyDeletedItem, onRestoreLog
    } = props;
    
    const [query, setQuery] = useState('');
    const [guidance, setGuidance] = useState('');
    const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
    const [auditReport, setAuditReport] = useState('');
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const { activeTheme } = useTheme();

    // State for Monthly Report
    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    
    const inputClasses = `w-full border rounded-md p-2 focus:ring-primary focus:ring-1 focus:outline-none ${activeTheme.classes.inputBg} ${activeTheme.classes.inputText} ${activeTheme.classes.inputBorder}`;
    const thClasses = `p-3 ${activeTheme.classes.textMuted} uppercase`;
    const tableHeaderClasses = `${activeTheme.classes.inputBg}`;


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

    const handleNumericInputChange = (value: string) => {
        // Allow numbers, decimals, and negative signs
        return value.replace(/[^0-9.-]/g, '');
    };
    
    // RENDER FUNCTIONS FOR EACH TAB
    const renderContent = () => {
        switch (activeTab) {
            case 'dailyChecks': return renderDailyChecks();
            case 'fridgeFreezer': return renderFridgeFreezerLogs();
            case 'foodProbe': return renderFoodLogsTable();
            case 'cooling': return renderCoolingLogs();
            case 'calibration': return renderProbeCalibration();
            case 'cossh': return renderCosshRegister();
            case 'monthlyReport': return renderMonthlyReport();
            case 'audit': return renderAudit();
            case 'guidance': return renderGuidance();
            default: return null;
        }
    };

    const renderDailyChecks = () => {
      const handleAddCheck = (type: 'Opening' | 'Closing') => {
        const now = new Date();
        onAddOpeningClosingLog({
          date: now.toISOString().split('T')[0],
          type,
          time: now.toTimeString().split(' ')[0].substring(0, 5),
          checks: { kitchenClean: false, equipmentWorking: false, temperaturesCorrect: false, staffFitForWork: false, wasteManaged: false, pestControl: false },
          comments: '',
          signedBy: ''
        });
      };

      const EmptyState = () => (
        <tr>
            <td colSpan={12} className="text-center p-8 text-muted">
                <Icon name="clipboard-check" className="h-10 w-10 mx-auto text-gray-400" />
                <h4 className={`mt-2 text-md font-semibold ${activeTheme.classes.textColor}`}>No Daily Checks Logged</h4>
                <p className="text-sm">Click 'New Opening' or 'New Closing' to add the first log.</p>
            </td>
        </tr>
      );

      return (
        <Card>
          <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>Daily Opening & Closing Checks</h3>
              <div className="flex gap-2 items-center">
                  <ExportMenu onExport={(format) => exportData(openingClosingLogs, 'daily_checks', format)} activeTheme={activeTheme} />
                  <button onClick={() => handleAddCheck('Opening')} className="bg-primary text-white font-bold py-2 px-4 rounded-full hover:bg-primary-dark transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Opening</button>
                  <button onClick={() => handleAddCheck('Closing')} className="bg-primary text-white font-bold py-2 px-4 rounded-full hover:bg-primary-dark transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Closing</button>
              </div>
          </div>
          <p className={`${activeTheme.classes.textMuted} mb-4 text-sm`}>Log checklists for opening and closing procedures.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className={tableHeaderClasses}>
                    <tr>
                      <th className={thClasses}>Date</th>
                      <th className={thClasses}>Time</th>
                      <th className={thClasses}>Type</th>
                      <th className={thClasses}>Kitchen Clean</th>
                      <th className={thClasses}>Equipment OK</th>
                      <th className={thClasses}>Temps OK</th>
                      <th className={thClasses}>Staff Fit</th>
                      <th className={thClasses}>Waste Managed</th>
                      <th className={thClasses}>Pest Control</th>
                      <th className={thClasses}>Comments</th>
                      <th className={thClasses}>Signed</th>
                      <th className={thClasses}></th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${activeTheme.classes.inputBorder}`}>
                  {openingClosingLogs.length > 0 ? openingClosingLogs.map(log => (
                    <tr key={log.id}>
                      <td className="p-1"><input type="date" value={log.date} onChange={e => onUpdateOpeningClosingLog({...log, date: e.target.value})} className={inputClasses}/></td>
                      <td className="p-1"><input type="time" value={log.time} onChange={e => onUpdateOpeningClosingLog({...log, time: e.target.value})} className={inputClasses}/></td>
                      <td className="p-1">
                        <select value={log.type} onChange={e => onUpdateOpeningClosingLog({...log, type: e.target.value as 'Opening' | 'Closing'})} className={inputClasses}>
                            <option value="Opening">Opening</option>
                            <option value="Closing">Closing</option>
                        </select>
                      </td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.kitchenClean} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, kitchenClean: e.target.checked}})} className="h-5 w-5 rounded text-primary focus:ring-primary"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.equipmentWorking} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, equipmentWorking: e.target.checked}})} className="h-5 w-5 rounded text-primary focus:ring-primary"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.temperaturesCorrect} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, temperaturesCorrect: e.target.checked}})} className="h-5 w-5 rounded text-primary focus:ring-primary"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.staffFitForWork} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, staffFitForWork: e.target.checked}})} className="h-5 w-5 rounded text-primary focus:ring-primary"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.wasteManaged} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, wasteManaged: e.target.checked}})} className="h-5 w-5 rounded text-primary focus:ring-primary"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.pestControl} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, pestControl: e.target.checked}})} className="h-5 w-5 rounded text-primary focus:ring-primary"/></td>
                      <td className="p-1"><input type="text" value={log.comments} onChange={e => onUpdateOpeningClosingLog({...log, comments: e.target.value})} className={inputClasses}/></td>
                      <td className="p-1"><input type="text" value={log.signedBy} onChange={e => onUpdateOpeningClosingLog({...log, signedBy: e.target.value})} className={inputClasses}/></td>
                      <td className="p-1 text-center"><button onClick={() => onDeleteOpeningClosingLog(log.id)} className="text-red-500 hover:text-red-700 p-2" aria-label={`Delete daily check for ${log.date}`}><Icon name="delete" className="h-5 w-5" /></button></td>
                    </tr>
                  )) : <EmptyState />}
                </tbody>
            </table>
          </div>
        </Card>
      );
    };

    const renderFridgeFreezerLogs = () => (
        <Card>
            <div className="space-y-6">
                {renderEditableLogTable('Fridge Temperature Log', 'Fridge', fridgeLogs)}
                {renderEditableLogTable('Freezer Temperature Log', 'Freezer', freezerLogs)}
            </div>
        </Card>
    );
    
    const renderEditableLogTable = (
        title: string,
        logType: 'Fridge' | 'Freezer',
        logs: HaccpLog[]
    ) => {
        const EmptyState = () => (
            <tr>
                <td colSpan={7} className="text-center p-8 text-muted">
                    <p>No {title.toLowerCase()} recorded yet.</p>
                    <p className="text-sm">Click 'Log Now' or use the Chef Bot to add an entry.</p>
                </td>
            </tr>
        );

        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>{title}</h3>
                    <div className="flex gap-2 items-center">
                         <ExportMenu onExport={(format) => exportData(logs, title.toLowerCase().replace(/ /g, '_'), format)} activeTheme={activeTheme} />
                        <button
                            onClick={() => onAddHaccpLog({ type: logType, label: '', temperature: '' })}
                            className="bg-primary text-white font-bold py-2 px-4 rounded-full hover:bg-primary-dark transition duration-300 flex items-center text-sm"
                        >
                            <Icon name="add" className="h-5 w-5 mr-2" />
                            Log Now
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={tableHeaderClasses}>
                            <tr>
                                <th className={thClasses}>Label/ID</th>
                                <th className={thClasses}>Date</th>
                                <th className={thClasses}>Time</th>
                                <th className={thClasses}>Temp (°C)</th>
                                <th className={thClasses}>Initials</th>
                                <th className={thClasses}>Corrective Action</th>
                                <th className={`${thClasses} w-12`}></th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${activeTheme.classes.inputBorder}`}>
                            {logs.length > 0 ? logs.map(log => (
                                <tr key={log.id}>
                                    <td className="p-1"><input type="text" value={log.label} onChange={(e) => onUpdateHaccpLog({ ...log, label: e.target.value })} className={inputClasses} /></td>
                                    <td className="p-1"><input type="date" value={log.date} onChange={(e) => onUpdateHaccpLog({ ...log, date: e.target.value })} className={inputClasses} /></td>
                                    <td className="p-1"><input type="time" value={log.time} onChange={(e) => onUpdateHaccpLog({ ...log, time: e.target.value })} className={inputClasses} /></td>
                                    <td className="p-1"><input type="text" value={log.temperature} onChange={(e) => onUpdateHaccpLog({ ...log, temperature: handleNumericInputChange(e.target.value) })} className={inputClasses} /></td>
                                    <td className="p-1"><input type="text" value={log.checkedBy} onChange={(e) => onUpdateHaccpLog({ ...log, checkedBy: e.target.value })} className={inputClasses} /></td>
                                    <td className="p-1"><input type="text" value={log.correctiveAction} onChange={(e) => onUpdateHaccpLog({ ...log, correctiveAction: e.target.value })} className={inputClasses} /></td>
                                    <td className="p-1 text-center">
                                        <button
                                            onClick={() => onDeleteHaccpLog(log.id)}
                                            className="text-red-500 hover:text-red-700 p-2 rounded-md"
                                            aria-label={`Delete log for ${log.label}`}
                                        >
                                            <Icon name="delete" className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            )) : <EmptyState />}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    };
    
    const renderFoodLogsTable = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>Food Probe Logs</h3>
                <ExportMenu onExport={(format) => exportData(foodLogs, 'food_probe_logs', format)} activeTheme={activeTheme} />
            </div>
            <div className={`overflow-y-auto max-h-[60vh] border rounded-lg ${activeTheme.classes.inputBorder}`}>
                <table className="w-full text-left text-sm">
                    <thead className={`${tableHeaderClasses} sticky top-0`}>
                        <tr>
                            <th className={thClasses}>Item</th>
                            <th className={thClasses}>Type</th>
                            <th className={thClasses}>Temp (°C)</th>
                            <th className={thClasses}>Date</th>
                            <th className={thClasses}>Time</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${activeTheme.classes.inputBorder}`}>
                        {foodLogs.length > 0 ? (
                            foodLogs.map(log => {
                                const logDate = new Date(log.timestamp);
                                return (
                                    <tr key={log.id}>
                                        <td className={`p-3 font-medium ${activeTheme.classes.textColor}`}>{log.item}</td>
                                        <td className={`p-3 ${activeTheme.classes.textMuted}`}>{log.type}</td>
                                        <td className="p-3 font-semibold text-primary">{log.temperature}</td>
                                        <td className={`p-3 ${activeTheme.classes.textMuted}`}>{logDate.toLocaleDateString()}</td>
                                        <td className={`p-3 ${activeTheme.classes.textMuted}`}>{logDate.toLocaleTimeString()}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-muted">
                                    <Icon name="thermometer" className="h-10 w-10 mx-auto text-gray-400" />
                                    <h4 className={`mt-2 text-md font-semibold ${activeTheme.classes.textColor}`}>No Food Probe Logs</h4>
                                    <p className="text-sm">Food temperature logs recorded via the Chef Bot will appear here.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderCoolingLogs = () => {
      const handleAdd = () => {
        const now = new Date();
        onAddCoolingLog({
          date: now.toISOString().split('T')[0],
          foodItem: '',
          startTime: now.toTimeString().split(' ')[0].substring(0, 5),
          startTemp: '',
          time90Min: '',
          temp90Min: '',
          isSafeAfter90Min: false,
          finalTime: '',
          finalTemp: '',
          totalTime: '',
          correctiveAction: '',
          signedBy: ''
        });
      };
      
      const EmptyState = () => (
        <tr>
            <td colSpan={10} className="text-center p-8 text-muted">
                <Icon name="thermometer" className="h-10 w-10 mx-auto text-gray-400" />
                <h4 className={`mt-2 text-md font-semibold ${activeTheme.classes.textColor}`}>No Cooling Logs</h4>
                <p className="text-sm">Click 'New Log' to add your first cooling record.</p>
            </td>
        </tr>
      );

      return (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>Blast Chiller / Cooling Logs</h3>
            <div className="flex gap-2 items-center">
                <ExportMenu onExport={(format) => exportData(coolingLogs, 'cooling_logs', format)} activeTheme={activeTheme} />
                <button onClick={handleAdd} className="bg-primary text-white font-bold py-2 px-4 rounded-full hover:bg-primary-dark transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Log</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className={tableHeaderClasses}>
                <tr>
                  <th className={thClasses}>Date</th>
                  <th className={thClasses}>Food Item</th>
                  <th className={thClasses}>Start Time/Temp</th>
                  <th className={thClasses}>90 Min Time/Temp</th>
                  <th className={thClasses}>Safe?</th>
                  <th className={thClasses}>Final Time/Temp</th>
                  <th className={thClasses}>Total Time</th>
                  <th className={thClasses}>Action</th>
                  <th className={thClasses}>Signed</th>
                  <th className={thClasses}></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${activeTheme.classes.inputBorder}`}>
                {coolingLogs.length > 0 ? coolingLogs.map(log => (
                  <tr key={log.id}>
                    <td className="p-1"><input type="date" value={log.date} onChange={e => onUpdateCoolingLog({...log, date: e.target.value})} className={inputClasses}/></td>
                    <td className="p-1"><input type="text" value={log.foodItem} onChange={e => onUpdateCoolingLog({...log, foodItem: e.target.value})} className={inputClasses}/></td>
                    <td className="p-1 flex gap-1"><input type="time" value={log.startTime} onChange={e => onUpdateCoolingLog({...log, startTime: e.target.value})} className={inputClasses}/><input type="text" value={log.startTemp} onChange={e => onUpdateCoolingLog({...log, startTemp: handleNumericInputChange(e.target.value)})} className={`w-20 ${inputClasses}`}/></td>
                    <td className="p-1 flex gap-1"><input type="time" value={log.time90Min} onChange={e => onUpdateCoolingLog({...log, time90Min: e.target.value})} className={inputClasses}/><input type="text" value={log.temp90Min} onChange={e => onUpdateCoolingLog({...log, temp90Min: handleNumericInputChange(e.target.value)})} className={`w-20 ${inputClasses}`}/></td>
                    <td className="p-1 text-center"><input type="checkbox" checked={log.isSafeAfter90Min} onChange={e => onUpdateCoolingLog({...log, isSafeAfter90Min: e.target.checked})} className="h-5 w-5 rounded text-primary focus:ring-primary"/></td>
                    <td className="p-1 flex gap-1"><input type="time" value={log.finalTime} onChange={e => onUpdateCoolingLog({...log, finalTime: e.target.value})} className={inputClasses}/><input type="text" value={log.finalTemp} onChange={e => onUpdateCoolingLog({...log, finalTemp: handleNumericInputChange(e.target.value)})} className={`w-20 ${inputClasses}`}/></td>
                    <td className="p-1"><input type="text" value={log.totalTime} onChange={e => onUpdateCoolingLog({...log, totalTime: e.target.value})} className={inputClasses}/></td>
                    <td className="p-1"><input type="text" value={log.correctiveAction} onChange={e => onUpdateCoolingLog({...log, correctiveAction: e.target.value})} className={inputClasses}/></td>
                    <td className="p-1"><input type="text" value={log.signedBy} onChange={e => onUpdateCoolingLog({...log, signedBy: e.target.value})} className={inputClasses}/></td>
                    <td className="p-1 text-center"><button onClick={() => onDeleteCoolingLog(log.id)} className="text-red-500 hover:text-red-700 p-2" aria-label={`Delete cooling log for ${log.foodItem}`}><Icon name="delete" className="h-5 w-5" /></button></td>
                  </tr>
                )) : <EmptyState />}
              </tbody>
            </table>
          </div>
        </Card>
      );
    };

    const renderProbeCalibration = () => {
        const handleAdd = () => {
            onAddProbeCalibrationLog({
                date: new Date().toISOString().split('T')[0],
                probeId: '',
                icePointReading: '',
                boilingPointReading: '',
                result: 'Pass',
                comments: '',
                calibratedBy: ''
            });
        };

        const EmptyState = () => (
            <tr>
                <td colSpan={8} className="text-center p-8 text-muted">
                    <Icon name="thermometer" className="h-10 w-10 mx-auto text-gray-400" />
                    <h4 className={`mt-2 text-md font-semibold ${activeTheme.classes.textColor}`}>No Probe Calibrations Logged</h4>
                    <p className="text-sm">Click 'New Log' to add a calibration record.</p>
                </td>
            </tr>
        );

        return (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>Monthly Temperature Probe Calibration</h3>
                    <div className="flex gap-2 items-center">
                        <ExportMenu onExport={(format) => exportData(probeCalibrationLogs, 'probe_calibration_logs', format)} activeTheme={activeTheme} />
                        <button onClick={handleAdd} className="bg-primary text-white font-bold py-2 px-4 rounded-full hover:bg-primary-dark transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Log</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={tableHeaderClasses}>
                            <tr>
                                <th className={thClasses}>Date</th>
                                <th className={thClasses}>Probe ID</th>
                                <th className={thClasses}>Ice Point (°C)</th>
                                <th className={thClasses}>Boiling Point (°C)</th>
                                <th className={thClasses}>Result</th>
                                <th className={thClasses}>Comments</th>
                                <th className={thClasses}>By</th>
                                <th className={thClasses}></th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${activeTheme.classes.inputBorder}`}>
                          {probeCalibrationLogs.length > 0 ? probeCalibrationLogs.map(log => (
                            <tr key={log.id}>
                              <td className="p-1"><input type="date" value={log.date} onChange={e => onUpdateProbeCalibrationLog({...log, date: e.target.value})} className={inputClasses}/></td>
                              <td className="p-1"><input type="text" value={log.probeId} onChange={e => onUpdateProbeCalibrationLog({...log, probeId: e.target.value})} className={inputClasses}/></td>
                              <td className="p-1"><input type="text" value={log.icePointReading} onChange={e => onUpdateProbeCalibrationLog({...log, icePointReading: handleNumericInputChange(e.target.value)})} className={inputClasses}/></td>
                              <td className="p-1"><input type="text" value={log.boilingPointReading} onChange={e => onUpdateProbeCalibrationLog({...log, boilingPointReading: handleNumericInputChange(e.target.value)})} className={inputClasses}/></td>
                              <td className="p-1">
                                <select value={log.result} onChange={e => onUpdateProbeCalibrationLog({...log, result: e.target.value as 'Pass' | 'Fail'})} className={inputClasses}>
                                  <option value="Pass">Pass</option>
                                  <option value="Fail">Fail</option>
                                </select>
                              </td>
                              <td className="p-1"><input type="text" value={log.comments} onChange={e => onUpdateProbeCalibrationLog({...log, comments: e.target.value})} className={inputClasses}/></td>
                              <td className="p-1"><input type="text" value={log.calibratedBy} onChange={e => onUpdateProbeCalibrationLog({...log, calibratedBy: e.target.value})} className={inputClasses}/></td>
                              <td className="p-1 text-center"><button onClick={() => onDeleteProbeCalibrationLog(log.id)} className="text-red-500 hover:text-red-700 p-2" aria-label={`Delete calibration log for probe ${log.probeId}`}><Icon name="delete" className="h-5 w-5" /></button></td>
                            </tr>
                          )) : <EmptyState />}
                        </tbody>
                    </table>
                </div>
            </Card>
        );
    };

    const renderCosshRegister = () => {
        const handleAdd = () => {
            onAddCosshLog({
                substanceName: '',
                dateReceived: new Date().toISOString().split('T')[0],
                location: '',
                safetyDataSheetAvailable: false,
                usageNotes: ''
            });
        };
        const EmptyState = () => (
            <tr>
                <td colSpan={7} className="text-center p-8 text-muted">
                    <Icon name="flask" className="h-10 w-10 mx-auto text-gray-400" />
                    <h4 className={`mt-2 text-md font-semibold ${activeTheme.classes.textColor}`}>COSHH Register is Empty</h4>
                    <p className="text-sm">Click 'New Substance' to add an entry.</p>
                </td>
            </tr>
        );

        return (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>COSHH Register</h3>
                     <div className="flex gap-2 items-center">
                        <ExportMenu onExport={(format) => exportData(cosshLogs, 'cossh_register', format)} activeTheme={activeTheme} />
                        <button onClick={handleAdd} className="bg-primary text-white font-bold py-2 px-4 rounded-full hover:bg-primary-dark transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Substance</button>
                    </div>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={tableHeaderClasses}>
                            <tr>
                                <th className={thClasses}>Substance Name</th>
                                <th className={thClasses}>Date Received</th>
                                <th className={thClasses}>Location</th>
                                <th className={thClasses}>SDS Available?</th>
                                <th className={thClasses}>Usage Notes</th>
                                <th className={thClasses}>Disposed Date</th>
                                <th className={thClasses}></th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${activeTheme.classes.inputBorder}`}>
                            {cosshLogs.length > 0 ? cosshLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="p-1"><input type="text" value={log.substanceName} onChange={e => onUpdateCosshLog({...log, substanceName: e.target.value})} className={inputClasses}/></td>
                                    <td className="p-1"><input type="date" value={log.dateReceived} onChange={e => onUpdateCosshLog({...log, dateReceived: e.target.value})} className={inputClasses}/></td>
                                    <td className="p-1"><input type="text" value={log.location} onChange={e => onUpdateCosshLog({...log, location: e.target.value})} className={inputClasses}/></td>
                                    <td className="p-1 text-center"><input type="checkbox" checked={log.safetyDataSheetAvailable} onChange={e => onUpdateCosshLog({...log, safetyDataSheetAvailable: e.target.checked})} className="h-5 w-5 rounded text-primary focus:ring-primary"/></td>
                                    <td className="p-1"><input type="text" value={log.usageNotes} onChange={e => onUpdateCosshLog({...log, usageNotes: e.target.value})} className={inputClasses}/></td>
                                    <td className="p-1"><input type="date" value={log.disposedDate || ''} onChange={e => onUpdateCosshLog({...log, disposedDate: e.target.value})} className={inputClasses}/></td>
                                    <td className="p-1 text-center"><button onClick={() => onDeleteCosshLog(log.id)} className="text-red-500 hover:text-red-700 p-2" aria-label={`Delete COSHH entry for ${log.substanceName}`}><Icon name="delete" className="h-5 w-5" /></button></td>
                                </tr>
                            )) : <EmptyState />}
                        </tbody>
                    </table>
                 </div>
            </Card>
        );
    };

    const renderMonthlyReport = () => {
        const handleDownload = (format: ExportFormat) => {
            const monthStr = String(reportMonth).padStart(2, '0');
            const datePrefix = `${reportYear}-${monthStr}`;

            const allLogs: any[] = [];
            
            openingClosingLogs.filter(log => log.date.startsWith(datePrefix)).forEach(log => allLogs.push({ logType: 'Daily Check', ...log }));
            haccpLogs.filter(log => log.date.startsWith(datePrefix)).forEach(log => allLogs.push({ logType: 'Fridge/Freezer', ...log }));
            foodLogs.filter(log => log.timestamp.startsWith(datePrefix)).forEach(log => allLogs.push({ logType: 'Food Probe', ...log, date: log.timestamp.split('T')[0], time: log.timestamp.split('T')[1].substring(0,5) }));
            coolingLogs.filter(log => log.date.startsWith(datePrefix)).forEach(log => allLogs.push({ logType: 'Cooling', ...log }));
            probeCalibrationLogs.filter(log => log.date.startsWith(datePrefix)).forEach(log => allLogs.push({ logType: 'Probe Calibration', ...log }));
            cosshLogs.filter(log => log.dateReceived.startsWith(datePrefix)).forEach(log => allLogs.push({ logType: 'COSHH', ...log }));

            if(allLogs.length === 0) {
                alert(`No logs found for ${new Date(reportYear, reportMonth - 1).toLocaleString('default', { month: 'long' })} ${reportYear}.`);
                return;
            }
            
            // Normalize data for consistent CSV columns
            const reportData = allLogs.map(log => ({
                'Log Type': log.logType,
                'Date': log.date || log.timestamp.split('T')[0],
                'Time': log.time || '',
                'Details': log.item || log.label || log.foodItem || log.probeId || log.substanceName || `Type: ${log.type}`,
                'Temperature': log.temperature || log.startTemp || log.icePointReading || '',
                'Comments': log.comments || log.correctiveAction || log.usageNotes || '',
                'Signed By': log.signedBy || log.checkedBy || log.calibratedBy || '',
            }));

            exportData(reportData, `monthly_report_${datePrefix}`, format);
        };

        return (
             <Card>
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                    <Icon name="download" className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>Monthly Compliance Report</h2>
                        <p className={`${activeTheme.classes.textMuted} mt-1 mb-4 text-sm`}>Compile all logs from a specific month into a single downloadable file for audits and review.</p>
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} className={`${inputClasses} p-2`}>
                                {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                            </select>
                            <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className={`${inputClasses} p-2`}>
                                {Array.from({length: 5}, (_, i) => <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>)}
                            </select>
                            <div>
                                <ExportMenu onExport={handleDownload} activeTheme={activeTheme} />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    const renderAudit = () => (
        <Card>
            <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                   <Icon name="shield-check" className="h-6 w-6" />
                </div>
                <div>
                    <h2 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>AI Safety Audit</h2>
                    <p className={`${activeTheme.classes.textMuted} mt-1 mb-4 text-sm`}>Analyze all recent temperature logs to identify trends, potential risks, and compliance gaps.</p>
                    <button
                        onClick={handleRunAudit}
                        disabled={isLoadingAudit}
                        className="bg-primary text-white font-bold py-2 px-5 rounded-full hover:bg-primary-dark transition duration-300 disabled:bg-gray-400 flex items-center justify-center"
                    >
                        {isLoadingAudit ? <Loader /> : 'Run AI Safety Audit'}
                    </button>
                </div>
            </div>
            {(isLoadingAudit || auditReport) && (
                 <div className={`mt-6 border-t pt-4 ${activeTheme.classes.inputBorder}`}>
                    <h3 className={`text-md font-semibold ${activeTheme.classes.textColor} mb-2`}>Audit Report</h3>
                    {isLoadingAudit ? (
                        <div className="flex flex-col items-center justify-center p-8">
                            <Loader />
                            <p className={`mt-4 ${activeTheme.classes.textMuted}`}>Analyzing your log data...</p>
                        </div>
                    ) : (
                       auditReport && <MarkdownRenderer content={auditReport} containerClassName="text-sm" />
                    )}
                </div>
            )}
            {error && !isLoadingAudit && <p className="text-red-500 mt-4">{error}</p>}
        </Card>
    );
    
    const renderGuidance = () => (
         <Card>
            <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                    <Icon name="help" className="h-6 w-6" />
                </div>
                <div>
                    <h2 className={`text-lg font-semibold ${activeTheme.classes.textHeading}`}>HACCP & COSHH Guidance</h2>
                    <p className={`${activeTheme.classes.textMuted} mt-1 mb-4 text-sm`}>Ask any question about food safety, HACCP principles, or COSHH regulations to get expert guidance.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., What are the 7 principles of HACCP?"
                            className={`flex-grow border rounded-full p-3 pl-5 focus:ring-2 focus:outline-none transition ${activeTheme.classes.inputBg} ${activeTheme.classes.inputText} ${activeTheme.classes.inputBorder} ${activeTheme.classes.placeholderText}`}
                            rows={1}
                        />
                        <button
                            onClick={handleGetGuidance}
                            disabled={isLoadingGuidance}
                            className="bg-primary text-white font-bold py-3 px-5 rounded-full hover:bg-primary-dark transition duration-300 disabled:bg-gray-400 flex items-center justify-center"
                        >
                            {isLoadingGuidance ? <Loader /> : 'Get Guidance'}
                        </button>
                    </div>
                    {error && !isLoadingGuidance && <p className="text-red-500 mt-2 text-sm">{error}</p>}
                </div>
            </div>
            {(isLoadingGuidance || guidance) && (
                <div className={`mt-6 border-t pt-4 ${activeTheme.classes.inputBorder}`}>
                    <h3 className={`text-md font-semibold ${activeTheme.classes.textColor} mb-2`}>Guidance Result</h3>
                    {isLoadingGuidance ? (
                        <div className="flex flex-col items-center justify-center p-8">
                            <Loader />
                            <p className={`mt-4 ${activeTheme.classes.textMuted}`}>Consulting food safety expert...</p>
                        </div>
                    ) : (
                        guidance && <MarkdownRenderer content={guidance} containerClassName="text-sm" />
                    )}
                </div>
            )}
        </Card>
    );

    const getUndoMessage = () => {
        if (!recentlyDeletedItem) return '';
        switch(recentlyDeletedItem.type) {
            case 'HaccpLog': return `Log for "${(recentlyDeletedItem.item as HaccpLog).label}" deleted.`;
            case 'OpeningClosingCheck': return `Daily check for ${new Date((recentlyDeletedItem.item as OpeningClosingCheck).date).toLocaleDateString()} deleted.`;
            case 'CoolingLog': return `Cooling log for "${(recentlyDeletedItem.item as CoolingLog).foodItem}" deleted.`;
            case 'CosshLog': return `COSHH entry for "${(recentlyDeletedItem.item as CosshLog).substanceName}" deleted.`;
            case 'ProbeCalibrationLog': return `Calibration log for probe "${(recentlyDeletedItem.item as ProbeCalibrationLog).probeId}" deleted.`;
            default: return 'Item deleted.';
        }
    }

    return (
        <div className="space-y-6">
            <div className={`mb-6 border-b ${activeTheme.classes.inputBorder}`}>
                <div className="overflow-x-auto">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap pb-4 px-2 border-b-2 font-medium text-sm ${activeTab === tab.id ? `border-primary ${activeTheme.classes.textColor}` : `border-transparent ${activeTheme.classes.textMuted} hover:${activeTheme.classes.textColor}`}`}>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {renderContent()}
            
            {/* Undo Toast */}
            {recentlyDeletedItem && (
                <div className="fixed bottom-24 right-6 z-50">
                    <div className="bg-dark text-white font-semibold py-3 px-5 rounded-lg shadow-2xl flex items-center justify-between gap-4 animate-fade-in-up">
                        <span>{getUndoMessage()}</span>
                        <button 
                            onClick={onRestoreLog} 
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