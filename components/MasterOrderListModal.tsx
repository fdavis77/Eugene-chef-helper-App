import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { useTheme } from '../contexts/ThemeContext';
import type { CalendarDay, Ingredient, EmailClient } from '../types';

interface MasterOrderListModalProps {
  isOpen: boolean;
  onClose: () => void;
  plannedItems: Record<string, CalendarDay>;
  masterOrderPlan: Ingredient[];
  onClearMasterOrderPlan: () => void;
  emailClient: EmailClient;
}

const MasterOrderListModal: React.FC<MasterOrderListModalProps> = ({ isOpen, onClose, plannedItems, masterOrderPlan, onClearMasterOrderPlan, emailClient }) => {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [masterList, setMasterList] = useState<Ingredient[]>([]);
  const [newItem, setNewItem] = useState<Ingredient>({ name: '', quantity: '', unit: '' });
  const [copied, setCopied] = useState(false);
  const { activeTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      const combinedList: Ingredient[] = [...masterOrderPlan];

      Object.entries(plannedItems).forEach(([dateStr, dayData]: [string, CalendarDay]) => {
        const date = new Date(dateStr);
        if (date >= start && date <= end && dayData.orderingList) {
          combinedList.push(...dayData.orderingList);
        }
      });
      
      const aggregated: Record<string, { quantity: number; unit: string; name: string }> = {};

      combinedList.forEach(item => {
        const name = item.name.trim();
        const unit = item.unit.trim() || 'unit'; // Default unit if empty
        const key = `${name.toLowerCase()}_${unit.toLowerCase()}`;
        
        if (!aggregated[key]) {
          aggregated[key] = { quantity: 0, unit: unit, name: name };
        }
        
        const quantity = parseFloat(item.quantity);
        if (!isNaN(quantity)) {
          aggregated[key].quantity += quantity;
        }
      });

      const newList: Ingredient[] = Object.values(aggregated).map(value => {
        return {
          name: value.name,
          quantity: String(value.quantity),
          unit: value.unit,
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
      setMasterList(newList);
    }
  }, [isOpen, plannedItems, startDate, endDate, masterOrderPlan]);
  
  if (!isOpen) return null;
  
  const inputClasses = `w-full border rounded-md p-2 focus:ring-2 focus:ring-primary focus:outline-none transition ${activeTheme.classes.inputBg} ${activeTheme.classes.inputText} ${activeTheme.classes.inputBorder} ${activeTheme.classes.placeholderText}`;

  const handleAddNewItem = () => {
    if (newItem.name.trim() && newItem.quantity.trim()) {
      setMasterList(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
      setNewItem({ name: '', quantity: '', unit: '' });
    }
  };

  const handleCopyToClipboard = () => {
    const text = "Ingredient\tQuantity\tUnit\n" + masterList.map(item => `${item.name}\t${item.quantity}\t${item.unit}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,Ingredient,Quantity,Unit\n";
    masterList.forEach(item => {
      const row = [item.name, item.quantity, item.unit].join(',');
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `order_list_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEmailOrder = () => {
    const subject = `Supplier Order: ${startDate} to ${endDate}`;
    const body = "Please find our order below:\n\n" + masterList.map(item => `- ${item.name}: ${item.quantity} ${item.unit}`).join('\n');
    
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    let url: string;
    switch (emailClient) {
      case 'gmail':
        url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodedSubject}&body=${encodedBody}`;
        window.open(url, '_blank');
        break;
      case 'outlook':
        url = `https://outlook.live.com/owa/?path=/mail/action/compose&su=${encodedSubject}&body=${encodedBody}`;
        window.open(url, '_blank');
        break;
      default:
        window.location.href = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
        break;
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      {/* Wrapper ensures fixed height (90vh) and full width */}
      <div className={`w-full max-w-4xl h-[90vh] rounded-2xl ${activeTheme.classes.appBg} ${activeTheme.classes.textColor}`} onClick={e => e.stopPropagation()}>
        {/* Card fills the wrapper and sets up flex column layout */}
        <Card className="h-full flex flex-col">
          <h3 className={`text-xl font-bold ${activeTheme.classes.textHeading} mb-4 flex-shrink-0`}>Generate Master Order List</h3>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-4 flex-shrink-0">
            <div>
              <label className={`block text-sm font-medium ${activeTheme.classes.textMuted} mb-1`}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClasses}/>
            </div>
            <div>
              <label className={`block text-sm font-medium ${activeTheme.classes.textMuted} mb-1`}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClasses}/>
            </div>
             <button onClick={onClearMasterOrderPlan} className="self-end bg-yellow-500 text-white text-xs font-bold py-2 px-3 rounded-md hover:bg-yellow-600 transition">
                Clear Manually Added Items
            </button>
          </div>
          
          {/* List container grows to fill all available space */}
          <div className={`flex-grow overflow-y-auto mb-4 border-t border-b py-4 ${activeTheme.classes.inputBorder}`}>
            {masterList.length > 0 ? (
                <table className="w-full text-left">
                <thead className={`sticky top-0 ${activeTheme.classes.cardBg} ${activeTheme.classes.textMuted} z-10`}>
                    <tr>
                    <th className="p-3">Ingredient</th>
                    <th className="p-3">Total Quantity</th>
                    <th className="p-3">Unit</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${activeTheme.classes.inputBorder}`}>
                    {masterList.map((item, index) => (
                    <tr key={index} className="hover:bg-light">
                        <td className="p-3">{item.name}</td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3">{item.unit}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            ) : (
                <div className="flex items-center justify-center h-full text-muted">
                    <p>No items in the list for this date range.</p>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6 flex-shrink-0">
            <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Add Manual Item" className={`sm:col-span-2 ${inputClasses}`} />
            <input type="text" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} placeholder="Qty" className={inputClasses} />
            <input type="text" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} placeholder="Unit" className={inputClasses} />
            <button onClick={handleAddNewItem} className="sm:col-span-4 bg-primary text-white font-bold py-2 px-4 rounded-md hover:bg-primary-dark transition">Add Item</button>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
            <div className="flex flex-wrap gap-2">
                <button onClick={handleCopyToClipboard} className={`bg-medium ${activeTheme.classes.textColor} font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition flex items-center`}>
                    <Icon name={copied ? 'check' : 'copy'} className="h-5 w-5 mr-2" />
                    {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={handleExportCSV} className={`bg-medium ${activeTheme.classes.textColor} font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition flex items-center`}>
                    <Icon name="download" className="h-5 w-5 mr-2" />
                    CSV
                </button>
                 <button onClick={handleEmailOrder} className={`bg-medium ${activeTheme.classes.textColor} font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition flex items-center`}>
                    <Icon name="mail" className="h-5 w-5 mr-2" />
                    Email
                </button>
            </div>
            <button onClick={onClose} className="bg-red-500 text-white font-bold py-2 px-4 rounded-md hover:bg-red-600 transition">Close</button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MasterOrderListModal;