import React, { useState, useMemo } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import { getHaccpInfo, getSafetyAudit, getStockTakeSummary } from '../services/geminiService';
import type { HaccpLog, TemperatureLog, OpeningClosingCheck, CoolingLog, CosshLog, ProbeCalibrationLog, StockTake, StockItem, RecentlyDeletedItem } from '../types';
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
    stockTakes: StockTake[];
    onAddStockTake: (stockTake: Omit<StockTake, 'id'>) => void;
    onUpdateStockTake: (stockTake: StockTake) => void;
    onDeleteStockTake: (id: number) => void;
    onDeleteStockItem: (stockTakeId: number, itemId: number) => void;
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
    { id: 'stockTake', label: 'Stock Take' },
    { id: 'monthlyReport', label: 'Monthly Report'},
    { id: 'audit', label: 'AI Safety Audit' },
    { id: 'guidance', label: 'Guidance' },
];

const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
        alert("No data to download.");
        return;
    }

    const headers = Object.keys(data[0]);
    
    let csv = data.map(row => 
        headers.map(fieldName => {
            let cellData = row[fieldName];
             if (cellData === null || cellData === undefined) {
                cellData = '';
            } else if (typeof cellData === 'object') {
                cellData = JSON.stringify(cellData).replace(/"/g, '""');
            }
            const stringData = String(cellData).replace(/"/g, '""');
            return `"${stringData}"`;
        }).join(',')
    );

    csv.unshift(headers.join(','));
    const csvString = csv.join('\r\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};


const HaccpCossh: React.FC<HaccpCosshProps> = (props) => {
    const { 
        foodLogs, haccpLogs, onAddHaccpLog, onUpdateHaccpLog, onDeleteHaccpLog,
        openingClosingLogs, onAddOpeningClosingLog, onUpdateOpeningClosingLog, onDeleteOpeningClosingLog,
        coolingLogs, onAddCoolingLog, onUpdateCoolingLog, onDeleteCoolingLog,
        cosshLogs, onAddCosshLog, onUpdateCosshLog, onDeleteCosshLog,
        probeCalibrationLogs, onAddProbeCalibrationLog, onUpdateProbeCalibrationLog, onDeleteProbeCalibrationLog,
        stockTakes, onAddStockTake, onUpdateStockTake, onDeleteStockTake, onDeleteStockItem,
        recentlyDeletedItem, onRestoreLog
    } = props;
    
    const [query, setQuery] = useState('');
    const [guidance, setGuidance] = useState('');
    const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
    const [auditReport, setAuditReport] = useState('');
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState(TABS[0].id);

    // State for Stock Take
    const [selectedStockTakeDate, setSelectedStockTakeDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [newStockItem, setNewStockItem] = useState<Omit<StockItem, 'id'>>({ name: '', category: '', quantityOnHand: 0, unit: '', unitPrice: 0 });
    const [stockSummary, setStockSummary] = useState('');
    const [isLoadingStockSummary, setIsLoadingStockSummary] = useState(false);

    // State for Monthly Report
    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());


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
    
    // RENDER FUNCTIONS FOR EACH TAB
    const renderContent = () => {
        switch (activeTab) {
            case 'dailyChecks': return renderDailyChecks();
            case 'fridgeFreezer': return renderFridgeFreezerLogs();
            case 'foodProbe': return renderFoodLogsTable();
            case 'cooling': return renderCoolingLogs();
            case 'calibration': return renderProbeCalibration();
            case 'cossh': return renderCosshRegister();
            case 'stockTake': return renderStockTake();
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

      return (
        <Card>
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-dark">Daily Opening & Closing Checks</h3>
              <div className="flex gap-2">
                  <button onClick={() => downloadCSV(openingClosingLogs, 'daily_checks')} className="bg-medium text-dark font-bold py-2 px-4 rounded-full hover:bg-gray-300 transition text-sm flex items-center"><Icon name="download" className="h-4 w-4 mr-2" />CSV</button>
                  <button onClick={() => handleAddCheck('Opening')} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Opening</button>
                  <button onClick={() => handleAddCheck('Closing')} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Closing</button>
              </div>
          </div>
          <p className="text-muted mb-4 text-sm">Log checklists for opening and closing procedures.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-light text-muted uppercase">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Kitchen Clean</th>
                      <th className="p-3">Equipment OK</th>
                      <th className="p-3">Temps OK</th>
                      <th className="p-3">Staff Fit</th>
                      <th className="p-3">Waste Managed</th>
                      <th className="p-3">Pest Control</th>
                      <th className="p-3">Comments</th>
                      <th className="p-3">Signed</th>
                      <th className="p-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-medium">
                  {openingClosingLogs.map(log => (
                    <tr key={log.id}>
                      <td className="p-1"><input type="date" value={log.date} onChange={e => onUpdateOpeningClosingLog({...log, date: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                      <td className="p-1"><input type="time" value={log.time} onChange={e => onUpdateOpeningClosingLog({...log, time: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                      <td className="p-1">
                        <select value={log.type} onChange={e => onUpdateOpeningClosingLog({...log, type: e.target.value as 'Opening' | 'Closing'})} className="w-full bg-white border rounded-md p-2">
                            <option value="Opening">Opening</option>
                            <option value="Closing">Closing</option>
                        </select>
                      </td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.kitchenClean} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, kitchenClean: e.target.checked}})} className="h-5 w-5 rounded"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.equipmentWorking} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, equipmentWorking: e.target.checked}})} className="h-5 w-5 rounded"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.temperaturesCorrect} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, temperaturesCorrect: e.target.checked}})} className="h-5 w-5 rounded"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.staffFitForWork} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, staffFitForWork: e.target.checked}})} className="h-5 w-5 rounded"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.wasteManaged} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, wasteManaged: e.target.checked}})} className="h-5 w-5 rounded"/></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={log.checks.pestControl} onChange={e => onUpdateOpeningClosingLog({...log, checks: {...log.checks, pestControl: e.target.checked}})} className="h-5 w-5 rounded"/></td>
                      <td className="p-1"><input type="text" value={log.comments} onChange={e => onUpdateOpeningClosingLog({...log, comments: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                      <td className="p-1"><input type="text" value={log.signedBy} onChange={e => onUpdateOpeningClosingLog({...log, signedBy: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                      <td className="p-1 text-center"><button onClick={() => onDeleteOpeningClosingLog(log.id)} className="text-red-500 hover:text-red-700 p-2"><Icon name="delete" className="h-5 w-5" /></button></td>
                    </tr>
                  ))}
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
    ) => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-dark">{title}</h3>
                <div className="flex gap-2">
                     <button onClick={() => downloadCSV(logs, title.toLowerCase().replace(/ /g, '_'))} className="bg-medium text-dark font-bold py-2 px-4 rounded-full hover:bg-gray-300 transition text-sm flex items-center"><Icon name="download" className="h-4 w-4 mr-2" />CSV</button>
                    <button
                        onClick={() => onAddHaccpLog({ type: logType, label: '', temperature: '' })}
                        className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition duration-300 flex items-center text-sm"
                    >
                        <Icon name="add" className="h-5 w-5 mr-2" />
                        Log Now
                    </button>
                </div>
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
                                            onChange={(e) => onUpdateHaccpLog({ ...log, [field]: e.target.value })}
                                            className={`w-full bg-white border rounded-md p-2 focus:ring-1 focus:outline-none transition text-dark border-medium focus:ring-black`}
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
    
    const renderFoodLogsTable = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-dark">Food Probe Logs</h3>
                <button
                    onClick={() => downloadCSV(foodLogs, 'food_probe_logs')}
                    disabled={foodLogs.length === 0}
                    className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition duration-300 flex items-center text-sm disabled:bg-gray-400"
                >
                    <Icon name="download" className="h-5 w-5 mr-2" />
                    Download CSV
                </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] border rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-light text-muted uppercase sticky top-0">
                        <tr>
                            <th className="p-3">Item</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Temp (°C)</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-medium">
                        {foodLogs.length > 0 ? (
                            foodLogs.map(log => {
                                const logDate = new Date(log.timestamp);
                                return (
                                    <tr key={log.id} className="hover:bg-light">
                                        <td className="p-3 font-medium text-dark">{log.item}</td>
                                        <td className="p-3 text-muted">{log.type}</td>
                                        <td className="p-3 font-semibold text-primary">{log.temperature}</td>
                                        <td className="p-3 text-muted">{logDate.toLocaleDateString()}</td>
                                        <td className="p-3 text-muted">{logDate.toLocaleTimeString()}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-muted">
                                    Food temperature logs recorded via the Chef Bot will appear here.
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
      return (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-dark">Blast Chiller / Cooling Logs</h3>
            <div className="flex gap-2">
                <button onClick={() => downloadCSV(coolingLogs, 'cooling_logs')} className="bg-medium text-dark font-bold py-2 px-4 rounded-full hover:bg-gray-300 transition text-sm flex items-center"><Icon name="download" className="h-4 w-4 mr-2" />CSV</button>
                <button onClick={handleAdd} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Log</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-light text-muted uppercase">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Food Item</th>
                  <th className="p-3">Start Time/Temp</th>
                  <th className="p-3">90 Min Time/Temp</th>
                  <th className="p-3">Safe?</th>
                  <th className="p-3">Final Time/Temp</th>
                  <th className="p-3">Total Time</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Signed</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-medium">
                {coolingLogs.map(log => (
                  <tr key={log.id}>
                    <td className="p-1"><input type="date" value={log.date} onChange={e => onUpdateCoolingLog({...log, date: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                    <td className="p-1"><input type="text" value={log.foodItem} onChange={e => onUpdateCoolingLog({...log, foodItem: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                    <td className="p-1 flex gap-1"><input type="time" value={log.startTime} onChange={e => onUpdateCoolingLog({...log, startTime: e.target.value})} className="w-full bg-white border rounded-md p-2"/><input type="text" value={log.startTemp} onChange={e => onUpdateCoolingLog({...log, startTemp: e.target.value})} className="w-20 bg-white border rounded-md p-2"/></td>
                    <td className="p-1 flex gap-1"><input type="time" value={log.time90Min} onChange={e => onUpdateCoolingLog({...log, time90Min: e.target.value})} className="w-full bg-white border rounded-md p-2"/><input type="text" value={log.temp90Min} onChange={e => onUpdateCoolingLog({...log, temp90Min: e.target.value})} className="w-20 bg-white border rounded-md p-2"/></td>
                    <td className="p-1 text-center"><input type="checkbox" checked={log.isSafeAfter90Min} onChange={e => onUpdateCoolingLog({...log, isSafeAfter90Min: e.target.checked})} className="h-5 w-5 rounded"/></td>
                    <td className="p-1 flex gap-1"><input type="time" value={log.finalTime} onChange={e => onUpdateCoolingLog({...log, finalTime: e.target.value})} className="w-full bg-white border rounded-md p-2"/><input type="text" value={log.finalTemp} onChange={e => onUpdateCoolingLog({...log, finalTemp: e.target.value})} className="w-20 bg-white border rounded-md p-2"/></td>
                    <td className="p-1"><input type="text" value={log.totalTime} onChange={e => onUpdateCoolingLog({...log, totalTime: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                    <td className="p-1"><input type="text" value={log.correctiveAction} onChange={e => onUpdateCoolingLog({...log, correctiveAction: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                    <td className="p-1"><input type="text" value={log.signedBy} onChange={e => onUpdateCoolingLog({...log, signedBy: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                    <td className="p-1 text-center"><button onClick={() => onDeleteCoolingLog(log.id)} className="text-red-500 hover:text-red-700 p-2"><Icon name="delete" className="h-5 w-5" /></button></td>
                  </tr>
                ))}
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
        return (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-dark">Monthly Temperature Probe Calibration</h3>
                    <div className="flex gap-2">
                        <button onClick={() => downloadCSV(probeCalibrationLogs, 'probe_calibration_logs')} className="bg-medium text-dark font-bold py-2 px-4 rounded-full hover:bg-gray-300 transition text-sm flex items-center"><Icon name="download" className="h-4 w-4 mr-2" />CSV</button>
                        <button onClick={handleAdd} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Log</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-light text-muted uppercase">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Probe ID</th>
                                <th className="p-3">Ice Point (°C)</th>
                                <th className="p-3">Boiling Point (°C)</th>
                                <th className="p-3">Result</th>
                                <th className="p-3">Comments</th>
                                <th className="p-3">By</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-medium">
                          {probeCalibrationLogs.map(log => (
                            <tr key={log.id}>
                              <td className="p-1"><input type="date" value={log.date} onChange={e => onUpdateProbeCalibrationLog({...log, date: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                              <td className="p-1"><input type="text" value={log.probeId} onChange={e => onUpdateProbeCalibrationLog({...log, probeId: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                              <td className="p-1"><input type="text" value={log.icePointReading} onChange={e => onUpdateProbeCalibrationLog({...log, icePointReading: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                              <td className="p-1"><input type="text" value={log.boilingPointReading} onChange={e => onUpdateProbeCalibrationLog({...log, boilingPointReading: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                              <td className="p-1">
                                <select value={log.result} onChange={e => onUpdateProbeCalibrationLog({...log, result: e.target.value as 'Pass' | 'Fail'})} className="w-full bg-white border rounded-md p-2">
                                  <option value="Pass">Pass</option>
                                  <option value="Fail">Fail</option>
                                </select>
                              </td>
                              <td className="p-1"><input type="text" value={log.comments} onChange={e => onUpdateProbeCalibrationLog({...log, comments: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                              <td className="p-1"><input type="text" value={log.calibratedBy} onChange={e => onUpdateProbeCalibrationLog({...log, calibratedBy: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                              <td className="p-1 text-center"><button onClick={() => onDeleteProbeCalibrationLog(log.id)} className="text-red-500 hover:text-red-700 p-2"><Icon name="delete" className="h-5 w-5" /></button></td>
                            </tr>
                          ))}
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
        return (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-dark">COSHH Register</h3>
                     <div className="flex gap-2">
                        <button onClick={() => downloadCSV(cosshLogs, 'cossh_register')} className="bg-medium text-dark font-bold py-2 px-4 rounded-full hover:bg-gray-300 transition text-sm flex items-center"><Icon name="download" className="h-4 w-4 mr-2" />CSV</button>
                        <button onClick={handleAdd} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition text-sm flex items-center"><Icon name="add" className="h-4 w-4 mr-2" />New Substance</button>
                    </div>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-light text-muted uppercase">
                            <tr>
                                <th className="p-3">Substance Name</th>
                                <th className="p-3">Date Received</th>
                                <th className="p-3">Location</th>
                                <th className="p-3">SDS Available?</th>
                                <th className="p-3">Usage Notes</th>
                                <th className="p-3">Disposed Date</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-medium">
                            {cosshLogs.map(log => (
                                <tr key={log.id}>
                                    <td className="p-1"><input type="text" value={log.substanceName} onChange={e => onUpdateCosshLog({...log, substanceName: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                                    <td className="p-1"><input type="date" value={log.dateReceived} onChange={e => onUpdateCosshLog({...log, dateReceived: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                                    <td className="p-1"><input type="text" value={log.location} onChange={e => onUpdateCosshLog({...log, location: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                                    <td className="p-1 text-center"><input type="checkbox" checked={log.safetyDataSheetAvailable} onChange={e => onUpdateCosshLog({...log, safetyDataSheetAvailable: e.target.checked})} className="h-5 w-5 rounded"/></td>
                                    <td className="p-1"><input type="text" value={log.usageNotes} onChange={e => onUpdateCosshLog({...log, usageNotes: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                                    <td className="p-1"><input type="date" value={log.disposedDate || ''} onChange={e => onUpdateCosshLog({...log, disposedDate: e.target.value})} className="w-full bg-white border rounded-md p-2"/></td>
                                    <td className="p-1 text-center"><button onClick={() => onDeleteCosshLog(log.id)} className="text-red-500 hover:text-red-700 p-2"><Icon name="delete" className="h-5 w-5" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>
        );
    };

    const renderStockTake = () => {
      const currentStockTake = useMemo(() => stockTakes.find(st => st.date === selectedStockTakeDate), [stockTakes, selectedStockTakeDate]);

      const totalStockValue = useMemo(() => {
        if (!currentStockTake) return 0;
        return currentStockTake.items.reduce((acc, item) => acc + (item.quantityOnHand * item.unitPrice), 0);
      }, [currentStockTake]);

      const handleStartNewStockTake = () => {
        if (!stockTakes.some(st => st.date === selectedStockTakeDate)) {
          onAddStockTake({ date: selectedStockTakeDate, items: [], conductedBy: '' });
        }
      };
      
      const handleUpdateItem = (item: StockItem, field: keyof StockItem, value: any) => {
        if (!currentStockTake) return;
        const updatedItems = currentStockTake.items.map(i => i.id === item.id ? {...i, [field]: value} : i);
        onUpdateStockTake({...currentStockTake, items: updatedItems});
      };

      const handleAddItem = () => {
        if (!currentStockTake || !newStockItem.name) return;
        const newItemWithId: StockItem = {...newStockItem, id: Date.now()};
        onUpdateStockTake({...currentStockTake, items: [...currentStockTake.items, newItemWithId]});
        setNewStockItem({ name: '', category: '', quantityOnHand: 0, unit: '', unitPrice: 0 });
      };

      const handleGetSummary = async () => {
        if (!currentStockTake) return;
        setIsLoadingStockSummary(true);
        setStockSummary('');
        try {
            const result = await getStockTakeSummary(currentStockTake, totalStockValue);
            setStockSummary(result);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingStockSummary(false);
        }
      };

      return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-dark">Monthly Stock Take</h3>
                        <p className="text-muted text-sm">Conduct and review monthly stock takes for financial tracking.</p>
                    </div>
                    <input
                        type="month"
                        value={selectedStockTakeDate}
                        onChange={e => setSelectedStockTakeDate(e.target.value)}
                        className="bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition"
                    />
                </div>
            </Card>

            {!currentStockTake ? (
                <Card className="text-center">
                    <p className="text-muted mb-4">No stock take found for {selectedStockTakeDate}.</p>
                    <button onClick={handleStartNewStockTake} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition text-sm">
                        Start Stock Take for {selectedStockTakeDate}
                    </button>
                </Card>
            ) : (
                <>
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                             <h4 className="font-semibold">Total Stock Value: <span className="text-primary text-xl font-bold">${totalStockValue.toFixed(2)}</span></h4>
                             <div className="flex gap-2">
                                <button onClick={() => downloadCSV(currentStockTake.items.map(i => ({...i, totalValue: (i.quantityOnHand * i.unitPrice).toFixed(2)})), `stock_take_${currentStockTake.date}`)} className="bg-medium text-dark font-bold py-2 px-4 rounded-full hover:bg-gray-300 transition text-sm flex items-center"><Icon name="download" className="h-4 w-4 mr-2" />CSV</button>
                                <button onClick={handleGetSummary} disabled={isLoadingStockSummary} className="bg-black text-white font-bold py-2 px-4 rounded-full hover:bg-gray-800 transition text-sm flex items-center disabled:bg-gray-500">
                                    {isLoadingStockSummary ? <Loader/> : <Icon name="sparkles" className="h-4 w-4 mr-2" />}
                                    {isLoadingStockSummary ? 'Analyzing...' : 'Get AI Financial Summary'}
                                </button>
                            </div>
                        </div>
                        {(isLoadingStockSummary || stockSummary) && (
                            <div className="mt-6 border-t border-medium pt-4">
                                <h3 className="text-md font-semibold text-dark mb-2">AI Summary</h3>
                                {isLoadingStockSummary ? (
                                    <div className="flex flex-col items-center justify-center p-8"><Loader /><p className="mt-4 text-muted">Analyzing stock data...</p></div>
                                ) : (
                                stockSummary && <MarkdownRenderer content={stockSummary} containerClassName="text-sm" />
                                )}
                            </div>
                        )}
                    </Card>
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-light text-muted uppercase">
                                    <tr>
                                        <th className="p-2">Item Name</th>
                                        <th className="p-2">Category</th>
                                        <th className="p-2">Qty on Hand</th>
                                        <th className="p-2">Unit</th>
                                        <th className="p-2">Price/Unit</th>
                                        <th className="p-2">Total Value</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-medium">
                                    {currentStockTake.items.map(item => (
                                        <tr key={item.id}>
                                            <td className="p-1"><input type="text" value={item.name} onChange={e => handleUpdateItem(item, 'name', e.target.value)} className="w-full bg-white border rounded p-2"/></td>
                                            <td className="p-1"><input type="text" value={item.category} onChange={e => handleUpdateItem(item, 'category', e.target.value)} className="w-full bg-white border rounded p-2"/></td>
                                            <td className="p-1"><input type="number" value={item.quantityOnHand} onChange={e => handleUpdateItem(item, 'quantityOnHand', parseFloat(e.target.value) || 0)} className="w-24 bg-white border rounded p-2"/></td>
                                            <td className="p-1"><input type="text" value={item.unit} onChange={e => handleUpdateItem(item, 'unit', e.target.value)} className="w-24 bg-white border rounded p-2"/></td>
                                            <td className="p-1"><input type="number" value={item.unitPrice} onChange={e => handleUpdateItem(item, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-24 bg-white border rounded p-2"/></td>
                                            <td className="p-2 font-semibold">${(item.quantityOnHand * item.unitPrice).toFixed(2)}</td>
                                            <td className="p-1 text-center"><button onClick={() => onDeleteStockItem(currentStockTake.id, item.id)} className="text-red-500 hover:text-red-700 p-1"><Icon name="delete" className="h-4 w-4"/></button></td>
                                        </tr>
                                    ))}
                                    {/* New Item Row */}
                                    <tr>
                                        <td className="p-1"><input type="text" value={newStockItem.name} onChange={e => setNewStockItem({...newStockItem, name: e.target.value})} placeholder="New Item" className="w-full bg-light border rounded p-2"/></td>
                                        <td className="p-1"><input type="text" value={newStockItem.category} onChange={e => setNewStockItem({...newStockItem, category: e.target.value})} placeholder="Category" className="w-full bg-light border rounded p-2"/></td>
                                        <td className="p-1"><input type="number" value={newStockItem.quantityOnHand} onChange={e => setNewStockItem({...newStockItem, quantityOnHand: parseFloat(e.target.value) || 0})} className="w-24 bg-light border rounded p-2"/></td>
                                        <td className="p-1"><input type="text" value={newStockItem.unit} onChange={e => setNewStockItem({...newStockItem, unit: e.target.value})} placeholder="Unit" className="w-24 bg-light border rounded p-2"/></td>
                                        <td className="p-1"><input type="number" value={newStockItem.unitPrice} onChange={e => setNewStockItem({...newStockItem, unitPrice: parseFloat(e.target.value) || 0})} placeholder="Price" className="w-24 bg-light border rounded p-2"/></td>
                                        <td colSpan={2} className="p-1"><button onClick={handleAddItem} className="w-full bg-black text-white font-bold py-2 px-4 rounded-md hover:bg-gray-800">Add</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
      )
    };
    
    const renderMonthlyReport = () => {
        const handleDownload = () => {
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
                alert(`No logs found for ${datePrefix}.`);
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

            downloadCSV(reportData, `monthly_report_${datePrefix}`);
        };

        return (
             <Card>
                <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                    <Icon name="download" className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-dark">Monthly Compliance Report</h2>
                        <p className="text-muted mt-1 mb-4 text-sm">Compile all logs from a specific month into a single downloadable CSV file for audits and review.</p>
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} className="bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition">
                                {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                            </select>
                            <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className="bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition">
                                {Array.from({length: 5}, (_, i) => <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>)}
                            </select>
                            <button onClick={handleDownload} className="bg-black text-white font-bold py-2 px-5 rounded-full hover:bg-gray-800 transition">
                                Generate & Download Report
                            </button>
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
    );
    
    const renderGuidance = () => (
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
    );

    const getUndoMessage = () => {
        if (!recentlyDeletedItem) return '';
        switch(recentlyDeletedItem.type) {
            case 'HaccpLog': return `Log for "${(recentlyDeletedItem.item as HaccpLog).label}" deleted.`;
            case 'OpeningClosingCheck': return `Daily check for ${new Date((recentlyDeletedItem.item as OpeningClosingCheck).date).toLocaleDateString()} deleted.`;
            case 'CoolingLog': return `Cooling log for "${(recentlyDeletedItem.item as CoolingLog).foodItem}" deleted.`;
            case 'CosshLog': return `COSHH entry for "${(recentlyDeletedItem.item as CosshLog).substanceName}" deleted.`;
            case 'ProbeCalibrationLog': return `Calibration log for probe "${(recentlyDeletedItem.item as ProbeCalibrationLog).probeId}" deleted.`;
            case 'StockItem': return `Stock item "${(recentlyDeletedItem.item as StockItem).name}" deleted.`;
            default: return 'Item deleted.';
        }
    }

    return (
        <div className="space-y-6">
            <div className="mb-6 border-b border-medium">
                <div className="overflow-x-auto">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap pb-4 px-2 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-muted hover:text-dark'}`}>
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