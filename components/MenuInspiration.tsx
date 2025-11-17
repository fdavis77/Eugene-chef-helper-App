import React, { useState, useEffect, useRef } from 'react';
import { getMenuInspiration, getIngredientList } from '../services/geminiService';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';
import Calendar from './common/Calendar';
import AgendaCalendar from './common/AgendaCalendar';
import MasterOrderListModal from './MasterOrderListModal';
import RecipeFolderModal from './RecipeFolderModal';
import { MarkdownRenderer } from './common/MarkdownRenderer';
import { stripMarkdown } from '../utils/text';
import type { Ingredient, Recipe, CalendarDay, Note, CalendarView, EmailClient } from '../types';

interface MenuInspirationProps {
  notes: Note[];
  onUpdateNote: (id: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  plannedItems: Record<string, CalendarDay>;
  onUpdateCalendar: (date: string, data: CalendarDay) => void;
  onRemoveRotaEntry: (date: string, index: number) => void;
  masterOrderPlan: Ingredient[];
  onAddToMasterOrderPlan: (items: Ingredient[]) => void;
  onClearMasterOrderPlan: () => void;
  emailClient: EmailClient;
  visionRecipes: Recipe[];
}

const EditDayModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dayData: CalendarDay;
  onUpdate: (date: string, data: CalendarDay) => void;
}> = ({ isOpen, onClose, date, dayData, onUpdate }) => {
    const [menuItem, setMenuItem] = useState(dayData?.menuItem || '');
    const [rota, setRota] = useState(dayData?.rota || []);
    const [newRotaEntry, setNewRotaEntry] = useState('');
    const [orderingList, setOrderingList] = useState(dayData?.orderingList || []);
    const [newOrderItem, setNewOrderItem] = useState({ name: '', quantity: '', unit: '' });

    useEffect(() => {
        setMenuItem(dayData?.menuItem || '');
        setRota(dayData?.rota || []);
        setOrderingList(dayData?.orderingList || []);
    }, [dayData]);

    if (!isOpen) return null;

    const handleAddRota = () => {
        if (newRotaEntry.trim()) {
            setRota(prev => [...prev, newRotaEntry.trim()]);
            setNewRotaEntry('');
        }
    };

    const handleRemoveRota = (indexToRemove: number) => {
        setRota(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    const handleAddOrderItem = () => {
        if (newOrderItem.name.trim() && newOrderItem.quantity.trim()) {
            setOrderingList(prev => [...prev, newOrderItem]);
            setNewOrderItem({ name: '', quantity: '', unit: '' });
        }
    };
    
    const handleRemoveOrderItem = (indexToRemove: number) => {
        setOrderingList(prev => prev.filter((_, index) => index !== indexToRemove));
    };


    const handleSave = () => {
        onUpdate(date, { menuItem, rota, orderingList });
        onClose();
    };
    
    const formattedDate = new Date(date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
                <Card className="max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-bold text-dark mb-4">Edit Plan for {formattedDate}</h3>
                    <div className="space-y-6">
                        {/* Menu Item */}
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1">Menu Item</label>
                            <input
                                type="text"
                                value={menuItem}
                                onChange={e => setMenuItem(e.target.value)}
                                placeholder="e.g., Pan-Seared Scallops"
                                className="w-full bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition"
                            />
                        </div>
                        
                        {/* Staff Rota */}
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1">Staff Rota</label>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 mb-2">
                                {rota.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between bg-light p-2 rounded-md">
                                        <span className="text-dark">{entry}</span>
                                        <button onClick={() => handleRemoveRota(index)} className="text-red-500 hover:text-red-700 p-1">
                                            <Icon name="delete" className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newRotaEntry}
                                    onChange={e => setNewRotaEntry(e.target.value)}
                                    placeholder="Add new rota entry..."
                                    className="flex-grow bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition"
                                />
                                <button onClick={handleAddRota} className="bg-black text-white font-bold py-2 px-4 rounded-md hover:bg-gray-800 transition">Add</button>
                            </div>
                        </div>

                        {/* Ordering List */}
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1 flex items-center">
                                <Icon name="clipboard-list" className="h-5 w-5 mr-2" />
                                Ordering List
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 mb-2">
                                {orderingList.map((item, index) => (
                                    <div key={index} className="grid grid-cols-3 gap-2 items-center bg-light p-2 rounded-md">
                                        <span className="text-dark col-span-2">{item.name}</span>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted">{item.quantity} {item.unit}</span>
                                            <button onClick={() => handleRemoveOrderItem(index)} className="text-red-500 hover:text-red-700 p-1">
                                                <Icon name="delete" className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <input type="text" value={newOrderItem.name} onChange={e => setNewOrderItem({...newOrderItem, name: e.target.value})} placeholder="Item Name" className="sm:col-span-2 bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition" />
                                <input type="text" value={newOrderItem.quantity} onChange={e => setNewOrderItem({...newOrderItem, quantity: e.target.value})} placeholder="Qty" className="bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition" />
                                <input type="text" value={newOrderItem.unit} onChange={e => setNewOrderItem({...newOrderItem, unit: e.target.value})} placeholder="Unit" className="bg-light border border-medium rounded-md p-2 focus:ring-2 focus:ring-black focus:outline-none transition" />
                                <button onClick={handleAddOrderItem} className="sm:col-span-4 bg-black text-white font-bold py-2 px-4 rounded-md hover:bg-gray-800 transition">Add Item</button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={onClose} className="bg-medium text-dark font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition">Cancel</button>
                        <button onClick={handleSave} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition">Save Changes</button>
                    </div>
                </Card>
            </div>
        </div>
    );
};


const MenuInspiration: React.FC<MenuInspirationProps> = ({ notes, onUpdateNote, onDeleteNote, plannedItems, onUpdateCalendar, onRemoveRotaEntry, masterOrderPlan, onAddToMasterOrderPlan, onClearMasterOrderPlan, emailClient, visionRecipes }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState<boolean>(false);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [isListCopied, setIsListCopied] = useState(false);
  const [isAddedToPlan, setIsAddedToPlan] = useState(false);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRecipeFolderOpen, setIsRecipeFolderOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<{ id: string, content: string } | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>('Month');
  const isInitialMount = useRef(true);

  // Effect to automatically re-fetch the recipe when the unit system changes.
  useEffect(() => {
      // Do not run on the initial render of the component.
      if (isInitialMount.current) {
          isInitialMount.current = false;
          return;
      }

      // Only re-fetch if there's an existing recipe and a prompt to work with.
      // This prevents firing an API call if the user just toggles the units before generating anything.
      if (recipe && prompt) {
          const refetchWithNewUnits = async () => {
              setIsLoadingRecipe(true);
              setError('');
              setIngredients([]); // Clear the old ingredient list as it's now invalid.
              try {
                  // Call the service with the current prompt and the *new* unit system.
                  const newRecipe = await getMenuInspiration(prompt, unitSystem);
                  setRecipe(newRecipe);
              } catch (err) {
                  setError('Failed to refresh recipe with new units. Please try again.');
                  console.error(err);
              } finally {
                  setIsLoadingRecipe(false);
              }
          };
          
          refetchWithNewUnits();
      }
      // This effect should ONLY be triggered by a change in the unit system.
      // We disable the exhaustive-deps warning because we explicitly want to avoid
      // re-running this effect when `prompt` or `recipe` change, which would cause an infinite loop.
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitSystem]);

  const handleGetInspiration = async () => {
    if (!prompt.trim()) {
      setError('Please enter a concept for your dish.');
      return;
    }
    setError('');
    setRecipe(null);
    setIngredients([]);
    setIsLoadingRecipe(true);
    try {
      const generatedRecipe = await getMenuInspiration(prompt, unitSystem);
      setRecipe(generatedRecipe);
    } catch (err) {
      setError('Failed to get menu inspiration. Please try again.');
      console.error(err);
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleGetIngredients = async () => {
    if (!recipe) return;
    setError('');
    setIsLoadingIngredients(true);
    setIsAddedToPlan(false); // Reset confirmation state
    try {
      const recipeString = [
        `Title: ${recipe.title}`,
        `Description: ${recipe.description}`,
        "\nIngredients:",
        ...recipe.ingredients,
        "\nInstructions:",
        ...recipe.instructions,
      ].join('\n');
      const generatedIngredients = await getIngredientList(recipeString);
      setIngredients(generatedIngredients);
    } catch (err) {
      setError('Failed to generate ingredient list. Please try again.');
      console.error(err);
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const handleAddRecipeToCalendar = () => {
    if (recipe && selectedCalendarDate) {
      const dayData = plannedItems[selectedCalendarDate] || {};
      onUpdateCalendar(selectedCalendarDate, { 
          ...dayData, 
          menuItem: recipe.title,
          // Automatically add the generated ingredients to the ordering list
          orderingList: [...(dayData.orderingList || []), ...ingredients]
      });
    }
  };
  
  const handleEditNote = (note: Note) => {
    setEditingNote({ id: note.id, content: note.content });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
  };

  const handleSaveNote = () => {
    if (editingNote) {
      onUpdateNote(editingNote.id, editingNote.content);
      setEditingNote(null);
    }
  };

  const handleConvertToRecipe = (content: string) => {
    setPrompt(stripMarkdown(content));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleNoteDragStart = (e: React.DragEvent<HTMLDivElement>, noteContent: string) => {
    e.dataTransfer.setData('text/plain', stripMarkdown(noteContent));
  };

  const handleDropNoteOnCalendar = (date: string, noteContent: string) => {
    const dayData = plannedItems[date] || {};
    onUpdateCalendar(date, { ...dayData, menuItem: noteContent });
  };


  const formattedSelectedDate = () => {
    if (!selectedCalendarDate) return '';
    const date = new Date(selectedCalendarDate);
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });
  };

  const handleDownloadSingleCSV = () => {
    if (ingredients.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Ingredient,Quantity,Unit\n";
    ingredients.forEach(item => {
      const row = [`"${item.name.replace(/"/g, '""')}"`, item.quantity, item.unit].join(',');
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${recipe?.title.replace(/\s+/g, '_') || 'recipe'}_order_list.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySingleList = () => {
      if (ingredients.length === 0) return;
      const text = "Ingredient\tQuantity\tUnit\n" + ingredients.map(item => `${item.name}\t${item.quantity}\t${item.unit}`).join('\n');
      navigator.clipboard.writeText(text);
      setIsListCopied(true);
      setTimeout(() => setIsListCopied(false), 2000);
  };

  const handleAddToPlan = () => {
    if(ingredients.length > 0) {
      onAddToMasterOrderPlan(ingredients);
      setIsAddedToPlan(true);
      setTimeout(() => setIsAddedToPlan(false), 2000);
    }
  };

  const renderCalendar = () => {
    switch(calendarView) {
      case 'Month':
        return <Calendar 
                  currentDate={calendarDate}
                  onSetDate={setCalendarDate}
                  events={plannedItems}
                  selectedDate={selectedCalendarDate}
                  onDateSelect={setSelectedCalendarDate}
                  onDropNote={handleDropNoteOnCalendar}
                />;
      case 'Agenda':
        return <AgendaCalendar
                  events={plannedItems}
                  onDateSelect={setSelectedCalendarDate}
                />;
      default:
        return null;
    }
  }

  return (
    <>
      <EditDayModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        date={selectedCalendarDate!}
        dayData={plannedItems[selectedCalendarDate!] || {}}
        onUpdate={onUpdateCalendar}
      />
      <MasterOrderListModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        plannedItems={plannedItems}
        masterOrderPlan={masterOrderPlan}
        onClearMasterOrderPlan={onClearMasterOrderPlan}
        emailClient={emailClient}
      />
      <RecipeFolderModal
        isOpen={isRecipeFolderOpen}
        onClose={() => setIsRecipeFolderOpen(false)}
        recipes={visionRecipes}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-bold text-dark mb-4 flex items-center">
                <Icon name="idea" className="h-6 w-6 mr-2" />
                Menu & Recipe Inspiration
            </h2>
            <p className="text-muted mb-4">Describe a dish concept, key ingredient, or culinary theme to generate a unique recipe.</p>
            
            <div className="mb-4">
                <label className="text-muted font-medium mr-4 block sm:inline mb-2 sm:mb-0">Measurement System:</label>
                <div className="inline-flex rounded-md shadow-sm bg-medium p-1" role="group">
                    <button
                        type="button"
                        onClick={() => setUnitSystem('metric')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:z-10 focus:ring-2 focus:ring-black ${
                            unitSystem === 'metric' ? "bg-black text-white" : 'text-muted hover:bg-gray-200'
                        }`}
                    >
                        UK/EU (Metric)
                    </button>
                    <button
                        type="button"
                        onClick={() => setUnitSystem('imperial')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:z-10 focus:ring-2 focus:ring-black ${
                            unitSystem === 'imperial' ? "bg-black text-white" : 'text-muted hover:bg-gray-200'
                        }`}
                    >
                        USA (Imperial)
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A modern spring lamb dish with foraged herbs"
                className="flex-grow bg-light border-medium text-dark placeholder:text-muted focus:ring-black border rounded-md p-3 focus:ring-2 focus:outline-none transition"
                rows={2}
              />
              <button
                onClick={handleGetInspiration}
                disabled={isLoadingRecipe}
                className="bg-black text-white font-bold py-3 px-6 rounded-md hover:bg-gray-800 transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
              >
                {isLoadingRecipe ? <Loader /> : 'Get Inspired'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </Card>

          {isLoadingRecipe && (
            <Card>
              <div className="flex flex-col items-center justify-center p-8">
                <Loader />
                <p className="mt-4 text-muted">Crafting your recipe...</p>
              </div>
            </Card>
          )}

          {recipe && (
            <>
              <Card className="flex flex-col">
                <div className="flex-grow">
                    <h3 className="text-xl font-bold text-dark mb-2">{recipe.title}</h3>
                    <p className="text-muted italic mb-4">{recipe.description}</p>
                    
                    <div className="flex space-x-6 mb-6 text-sm">
                        <div>
                            <p className="font-bold text-dark">Yields:</p>
                            <p className="text-muted">{recipe.yields}</p>
                        </div>
                        <div>
                            <p className="font-bold text-dark">Prep time:</p>
                            <p className="text-muted">{recipe.prepTime}</p>
                        </div>
                        <div>
                            <p className="font-bold text-dark">Cook time:</p>
                            <p className="text-muted">{recipe.cookTime}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-dark mb-2 border-b border-medium pb-1">Ingredients</h4>
                            <ul className="list-disc list-inside space-y-1 text-muted pl-2">
                                {recipe.ingredients.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-dark mb-2 border-b border-medium pb-1">Instructions</h4>
                            <ol className="list-decimal list-inside space-y-3 text-muted pl-2">
                                {recipe.instructions.map((step, index) => <li key={index}>{step}</li>)}
                            </ol>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleGetIngredients}
                      disabled={isLoadingIngredients}
                      className="w-full bg-black text-white font-bold py-3 px-6 rounded-md hover:bg-gray-800 transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
                    >
                      {isLoadingIngredients ? <Loader /> : (
                          <>
                              <Icon name="list" className="h-5 w-5 mr-2" />
                              Generate Ordering List
                          </>
                      )}
                    </button>
                    {selectedCalendarDate && (
                      <button
                        onClick={handleAddRecipeToCalendar}
                        disabled={ingredients.length === 0}
                        className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 transition duration-300 flex items-center justify-center disabled:bg-gray-500 disabled:cursor-not-allowed"
                        title={ingredients.length === 0 ? "Generate ordering list first" : ""}
                      >
                        Add to Plan for {formattedSelectedDate()}
                      </button>
                    )}
                </div>
              </Card>

              {isLoadingIngredients && (
                  <Card>
                      <div className="flex flex-col items-center justify-center p-8">
                        <Loader />
                        <p className="mt-4 text-muted">Analyzing recipe for ingredients...</p>
                    </div>
                  </Card>
              )}

              {ingredients.length > 0 && (
                <Card>
                  <h3 className="text-lg font-semibold text-dark mb-4">Ordering List for "{recipe.title}"</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-light text-muted">
                          <tr>
                            <th className="p-3">Ingredient</th>
                            <th className="p-3">Quantity</th>
                            <th className="p-3">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-medium">
                          {ingredients.map((ing, index) => (
                            <tr key={index} className="hover:bg-light">
                              <td className="p-3">{ing.name}</td>
                              <td className="p-3">{ing.quantity}</td>
                              <td className="p-3">{ing.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4 justify-end">
                      <button
                        onClick={handleAddToPlan}
                        disabled={isAddedToPlan}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition flex items-center disabled:bg-green-800/50"
                      >
                         <Icon name={isAddedToPlan ? 'check' : 'add'} className="h-5 w-5 mr-2" />
                         {isAddedToPlan ? 'Added!' : 'Add to Master Order Plan'}
                      </button>
                      <button
                        onClick={handleCopySingleList}
                        className="bg-medium text-dark font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition flex items-center"
                      >
                        <Icon name={isListCopied ? 'check' : 'copy'} className="h-5 w-5 mr-2" />
                        {isListCopied ? 'Copied!' : 'Copy List'}
                      </button>
                      <button
                        onClick={handleDownloadSingleCSV}
                        className="bg-medium text-dark font-bold py-2 px-4 rounded-md hover:bg-gray-300 transition flex items-center"
                      >
                        <Icon name="download" className="h-5 w-5 mr-2" />
                        Download as CSV
                      </button>
                    </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-dark">Ordering Hub</h3>
                  <p className="text-muted text-sm">Consolidate your ordering lists.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                      onClick={() => setIsOrderModalOpen(true)}
                      className="w-full bg-black text-white font-bold py-2 px-4 rounded-md hover:bg-gray-800 transition duration-300 flex items-center justify-center text-sm"
                  >
                      <Icon name="clipboard-list" className="h-4 w-4 mr-2" />
                      Master List
                  </button>
                   <button 
                      onClick={() => setIsRecipeFolderOpen(true)}
                      className="w-full bg-black text-white font-bold py-2 px-4 rounded-md hover:bg-gray-800 transition duration-300 flex items-center justify-center text-sm"
                  >
                      <Icon name="book" className="h-4 w-4 mr-2" />
                      Recipe Folder
                  </button>
                </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <h3 className="text-lg font-semibold text-dark mb-2 sm:mb-0">Menu & Rota Planner</h3>
              <div className="inline-flex rounded-md shadow-sm bg-medium p-1" role="group">
                {(['Month', 'Agenda'] as CalendarView[]).map(view => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setCalendarView(view)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus:z-10 focus:ring-2 focus:ring-black first:rounded-md last:rounded-md flex items-center gap-2 ${
                      calendarView === view ? "bg-black text-white" : 'text-muted hover:text-dark'
                    }`}
                  >
                    <Icon name={view === 'Month' ? 'calendar-days' : 'list'} className="h-4 w-4" />
                    {view}
                  </button>
                ))}
              </div>
            </div>
            {renderCalendar()}
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-dark">Plan for {formattedSelectedDate() || '...'}</h3>
              {selectedCalendarDate && (
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="bg-medium text-dark hover:bg-gray-300 px-3 py-1 rounded-md text-sm font-medium flex items-center transition-colors"
                >
                  <Icon name="edit" className="h-4 w-4 mr-2" />
                  Edit Plan
                </button>
              )}
            </div>
            {selectedCalendarDate ? (
                <div>
                    <h4 className="font-semibold text-muted">Menu Item:</h4>
                    <p className="text-dark mb-3 pl-2">{plannedItems[selectedCalendarDate]?.menuItem || 'Not set'}</p>
                    <h4 className="font-semibold text-muted">Staff Rota:</h4>
                    <div className="space-y-2 mt-1 max-h-24 overflow-y-auto pr-2">
                        {(plannedItems[selectedCalendarDate]?.rota?.length ?? 0) > 0 ? (
                            plannedItems[selectedCalendarDate]!.rota!.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between bg-light p-2 rounded-md">
                                    <span className="text-dark">{entry}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted pl-2">No staff assigned for this day.</p>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-muted">Select a day on the calendar to view and edit the plan.</p>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-dark mb-4 flex items-center">
              <Icon name="notebook" className="h-5 w-5 mr-2" />
              Chef's Notes
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div 
                    key={note.id} 
                    className="bg-light p-3 rounded-lg border border-medium cursor-grab active:cursor-grabbing"
                    draggable="true"
                    onDragStart={(e) => handleNoteDragStart(e, note.content)}
                  >
                    {note.imageUrl && (
                      <img src={note.imageUrl} alt="Note attachment" className="mb-3 rounded-md max-h-48 w-full object-cover" />
                    )}
                    {editingNote?.id === note.id ? (
                      <div>
                        <textarea
                          value={editingNote.content}
                          onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                          className="w-full bg-white border border-medium rounded-md p-2 mb-2 focus:ring-2 focus:ring-black focus:outline-none transition"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={handleCancelEdit} title="Cancel" className="text-muted hover:text-dark p-2 rounded-full transition-colors">
                            <Icon name="x-circle" className="h-5 w-5" />
                          </button>
                          <button onClick={handleSaveNote} title="Save Note" className="text-green-500 hover:text-green-700 p-2 rounded-full transition-colors">
                            <Icon name="check" className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-4 group">
                        <div className="flex-grow">
                            <MarkdownRenderer
                              content={note.content}
                              containerClassName="text-dark space-y-2"
                            />
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleConvertToRecipe(note.content)} title="Convert to Recipe" className="text-primary hover:text-primary-dark p-2 rounded-full transition-colors">
                            <Icon name="idea" className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleEditNote(note)} title="Edit Note" className="text-muted hover:text-dark p-2 rounded-full transition-colors">
                            <Icon name="edit" className="h-5 w-5" />
                          </button>
                          <button onClick={() => onDeleteNote(note.id)} title="Delete Note" className="text-red-500 hover:text-red-400 p-2 rounded-full transition-colors">
                            <Icon name="delete" className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted">
                    <p>Notes added via the Chef Bot will appear here.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default MenuInspiration;
