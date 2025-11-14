import React, { useState, useEffect } from 'react';
import { getMenuInspiration, getIngredientList } from '../services/geminiService';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';
import Calendar from './common/Calendar';
import type { Ingredient, Recipe, CalendarDay } from '../types';

interface MenuInspirationProps {
  notes: string[];
  plannedItems: Record<string, CalendarDay>;
  onUpdateCalendar: (date: string, data: CalendarDay) => void;
  onRemoveRotaEntry: (date: string, index: number) => void;
}

const EditDayModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dayData: CalendarDay;
  onUpdate: (date: string, data: CalendarDay) => void;
  onRemoveRota: (date: string, index: number) => void;
}> = ({ isOpen, onClose, date, dayData, onUpdate, onRemoveRota }) => {
    const [menuItem, setMenuItem] = useState(dayData?.menuItem || '');
    const [rota, setRota] = useState(dayData?.rota || []);
    const [newRotaEntry, setNewRotaEntry] = useState('');

    useEffect(() => {
        setMenuItem(dayData?.menuItem || '');
        setRota(dayData?.rota || []);
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

    const handleSave = () => {
        onUpdate(date, { menuItem, rota });
        onClose();
    };
    
    const formattedDate = new Date(date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <Card>
                    <h3 className="text-lg font-semibold text-blue-400 mb-2">Edit Plan for {formattedDate}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Menu Item</label>
                            <input
                                type="text"
                                value={menuItem}
                                onChange={e => setMenuItem(e.target.value)}
                                placeholder="e.g., Pan-Seared Scallops"
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Staff Rota</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 mb-2">
                                {rota.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-md">
                                        <span className="text-gray-300">{entry}</span>
                                        <button onClick={() => handleRemoveRota(index)} className="text-red-400 hover:text-red-300 p-1">
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
                                    className="flex-grow bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                                />
                                <button onClick={handleAddRota} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition">Add</button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700 transition">Cancel</button>
                        <button onClick={handleSave} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition">Save Changes</button>
                    </div>
                </Card>
            </div>
        </div>
    );
};


const MenuInspiration: React.FC<MenuInspirationProps> = ({ notes, plannedItems, onUpdateCalendar, onRemoveRotaEntry }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState<boolean>(false);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      onUpdateCalendar(selectedCalendarDate, { ...dayData, menuItem: recipe.title });
    }
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

  return (
    <>
      <EditDayModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        date={selectedCalendarDate!}
        dayData={plannedItems[selectedCalendarDate!] || {}}
        onUpdate={onUpdateCalendar}
        onRemoveRota={onRemoveRotaEntry}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-blue-400 mb-4 flex items-center">
                <Icon name="idea" className="h-6 w-6 mr-2" />
                Menu & Recipe Inspiration
            </h2>
            <p className="text-gray-400 mb-4">Describe a dish concept, key ingredient, or culinary theme to generate a unique recipe.</p>
            
            <div className="mb-4">
                <label className="text-gray-400 font-medium mr-4 block sm:inline mb-2 sm:mb-0">Measurement System:</label>
                <div className="inline-flex rounded-md shadow-sm bg-gray-900/50 p-1" role="group">
                    <button
                        type="button"
                        onClick={() => setUnitSystem('metric')}
                        className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors duration-200 focus:z-10 focus:ring-2 focus:ring-blue-500 ${
                            unitSystem === 'metric' ? "bg-blue-500 text-white" : 'text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        UK/EU (Metric)
                    </button>
                    <button
                        type="button"
                        onClick={() => setUnitSystem('imperial')}
                        className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors duration-200 focus:z-10 focus:ring-2 focus:ring-blue-500 ${
                            unitSystem === 'imperial' ? "bg-blue-500 text-white" : 'text-gray-300 hover:bg-gray-700'
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
                className="flex-grow bg-gray-800 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                rows={2}
              />
              <button
                onClick={handleGetInspiration}
                disabled={isLoadingRecipe}
                className="bg-blue-500 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-600 transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
              >
                {isLoadingRecipe ? <Loader /> : 'Get Inspired'}
              </button>
            </div>
            {error && <p className="text-red-400 mt-4">{error}</p>}
          </Card>

          {isLoadingRecipe && (
            <Card>
              <div className="flex flex-col items-center justify-center p-8">
                <Loader />
                <p className="mt-4 text-gray-400">Crafting your recipe...</p>
              </div>
            </Card>
          )}

          {recipe && (
            <>
              <Card className="flex flex-col">
                <div className="flex-grow">
                    <h3 className="text-xl font-bold text-blue-300 mb-2">{recipe.title}</h3>
                    <p className="text-gray-400 italic mb-4">{recipe.description}</p>
                    
                    <div className="flex space-x-6 mb-6 text-sm">
                        <div>
                            <p className="font-bold text-gray-300">Yields:</p>
                            <p className="text-gray-400">{recipe.yields}</p>
                        </div>
                        <div>
                            <p className="font-bold text-gray-300">Prep time:</p>
                            <p className="text-gray-400">{recipe.prepTime}</p>
                        </div>
                        <div>
                            <p className="font-bold text-gray-300">Cook time:</p>
                            <p className="text-gray-400">{recipe.cookTime}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-1">Ingredients</h4>
                            <ul className="list-disc list-inside space-y-1 text-gray-400 pl-2">
                                {recipe.ingredients.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-1">Instructions</h4>
                            <ol className="list-decimal list-inside space-y-3 text-gray-400 pl-2">
                                {recipe.instructions.map((step, index) => <li key={index}>{step}</li>)}
                            </ol>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleGetIngredients}
                      disabled={isLoadingIngredients}
                      className="w-full bg-blue-500 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-600 transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
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
                        className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 transition duration-300 flex items-center justify-center"
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
                        <p className="mt-4 text-gray-400">Analyzing recipe for ingredients...</p>
                    </div>
                  </Card>
              )}

              {ingredients.length > 0 && (
                <Card>
                  <h3 className="text-lg font-semibold text-blue-400 mb-4">Ordering List</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-700 text-gray-300">
                          <tr>
                            <th className="p-3">Ingredient</th>
                            <th className="p-3">Quantity</th>
                            <th className="p-3">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {ingredients.map((ing, index) => (
                            <tr key={index} className="hover:bg-gray-700/50">
                              <td className="p-3">{ing.name}</td>
                              <td className="p-3">{ing.quantity}</td>
                              <td className="p-3">{ing.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-blue-400 mb-4">Menu & Rota Planner</h3>
            <Calendar
              currentDate={calendarDate}
              onSetDate={setCalendarDate}
              events={plannedItems}
              selectedDate={selectedCalendarDate}
              onDateSelect={setSelectedCalendarDate}
            />
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-400">Plan for {formattedSelectedDate() || '...'}</h3>
              {selectedCalendarDate && (
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="bg-gray-700 text-gray-300 hover:bg-gray-600 px-3 py-1 rounded-md text-sm font-medium flex items-center transition-colors"
                >
                  <Icon name="edit" className="h-4 w-4 mr-2" />
                  Edit Plan
                </button>
              )}
            </div>
            {selectedCalendarDate ? (
                <div>
                    <h4 className="font-semibold text-gray-400">Menu Item:</h4>
                    <p className="text-gray-300 mb-3 pl-2">{plannedItems[selectedCalendarDate]?.menuItem || 'Not set'}</p>
                    <h4 className="font-semibold text-gray-400">Staff Rota:</h4>
                    <div className="space-y-2 mt-1 max-h-24 overflow-y-auto pr-2">
                        {(plannedItems[selectedCalendarDate]?.rota?.length ?? 0) > 0 ? (
                            plannedItems[selectedCalendarDate]!.rota!.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-md">
                                    <span className="text-gray-300">{entry}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 pl-2">No staff assigned for this day.</p>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-gray-500">Select a day on the calendar to view and edit the plan.</p>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
              <Icon name="notebook" className="h-5 w-5 mr-2" />
              Chef's Notes
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {notes.length > 0 ? (
                notes.map((note, index) => (
                  <div key={index} className="bg-gray-900/50 p-3 rounded-md border-l-4 border-blue-500">
                    <p className="text-gray-300">{note}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
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