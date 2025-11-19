
import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import { getIngredientList } from '../services/geminiService';
import { useTheme } from '../contexts/ThemeContext';
import type { Recipe, Ingredient, RecipeCosting } from '../types';

interface RecipeFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  onDeleteRecipe: (id: string) => void;
  onSaveRecipe: (recipe: Recipe) => void;
}

const downloadIngredientsCSV = (ingredients: Ingredient[], title: string) => {
    let csvContent = "data:text/csv;charset=utf-8,Ingredient,Quantity,Unit\n";
    ingredients.forEach(item => {
      const row = [`"${item.name.replace(/"/g, '""')}"`, item.quantity, item.unit].join(',');
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_ingredients.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const RecipeFolderModal: React.FC<RecipeFolderModalProps> = ({ isOpen, onClose, recipes, onDeleteRecipe, onSaveRecipe }) => {
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'costing'>('details');
  const [loadingIngredients, setLoadingIngredients] = useState<string | null>(null);
  const { activeTheme } = useTheme();

  // Costing State
  const [costingData, setCostingData] = useState<RecipeCosting>({
      totalCost: '',
      sellingPrice: '',
      taxRate: '20', // Default 20% VAT
      grossProfitPercent: '',
      foodCostPercent: ''
  });

  // Update local costing state when active recipe changes
  useEffect(() => {
      if (activeRecipe) {
          const recipe = recipes.find(r => r.title === activeRecipe);
          if (recipe && recipe.costing) {
              setCostingData(recipe.costing);
          } else {
              setCostingData({ totalCost: '', sellingPrice: '', taxRate: '20', grossProfitPercent: '', foodCostPercent: '' });
          }
          setActiveTab('details'); // Reset to details view on new recipe
      }
  }, [activeRecipe, recipes]);

  // Calculate GP whenever inputs change
  useEffect(() => {
    const cost = parseFloat(costingData.totalCost);
    const price = parseFloat(costingData.sellingPrice);
    const tax = parseFloat(costingData.taxRate);

    if (!isNaN(cost) && !isNaN(price) && price > 0) {
        const priceExTax = price / (1 + (tax / 100));
        const gp = ((priceExTax - cost) / priceExTax) * 100;
        const foodCost = (cost / priceExTax) * 100;

        setCostingData(prev => ({
            ...prev,
            grossProfitPercent: gp.toFixed(2),
            foodCostPercent: foodCost.toFixed(2)
        }));
    } else {
         setCostingData(prev => ({
            ...prev,
            grossProfitPercent: '',
            foodCostPercent: ''
        }));
    }
  }, [costingData.totalCost, costingData.sellingPrice, costingData.taxRate]);


  if (!isOpen) return null;

  const handleToggleRecipe = (title: string) => {
    setActiveRecipe(prev => prev === title ? null : title);
  };
  
  const handleDownload = async (recipe: Recipe) => {
    setLoadingIngredients(recipe.title);
    try {
      const recipeString = [
        `Title: ${recipe.title}`,
        "\nIngredients:",
        ...recipe.ingredients,
      ].join('\n');
      const ingredients = await getIngredientList(recipeString);
      downloadIngredientsCSV(ingredients, recipe.title);
    } catch (e) {
      console.error("Failed to get and download ingredients", e);
      alert("Could not generate ingredient list for download.");
    } finally {
      setLoadingIngredients(null);
    }
  }

  const handleDelete = (e: React.MouseEvent, recipeId: string | undefined) => {
      e.stopPropagation();
      if (recipeId) {
          if (window.confirm('Are you sure you want to delete this recipe?')) {
            onDeleteRecipe(recipeId);
            if (activeRecipe) setActiveRecipe(null);
          }
      }
  }

  const handleSaveCosting = () => {
      const recipeToUpdate = recipes.find(r => r.title === activeRecipe);
      if (recipeToUpdate) {
          const updatedRecipe = { ...recipeToUpdate, costing: costingData };
          onSaveRecipe(updatedRecipe);
          alert('Costing saved!');
      }
  }

  const inputClasses = `w-full border rounded-md p-2 focus:ring-2 focus:ring-primary focus:outline-none transition ${activeTheme.classes.inputBg} ${activeTheme.classes.inputText} ${activeTheme.classes.inputBorder} ${activeTheme.classes.placeholderText}`;


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`w-full max-w-3xl rounded-2xl ${activeTheme.classes.appBg} ${activeTheme.classes.textColor}`} onClick={e => e.stopPropagation()}>
        <Card className="max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-xl font-bold ${activeTheme.classes.textHeading} flex items-center`}>
              <Icon name="book" className="h-6 w-6 mr-2" />
              Recipe Folder
            </h3>
            <button onClick={onClose} className={`${activeTheme.classes.textMuted} hover:${activeTheme.classes.textColor}`}>
                <Icon name="x-circle" className="h-8 w-8" />
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto space-y-3 pr-2">
            {recipes.length > 0 ? recipes.map((recipe, index) => (
              <div key={`${recipe.title}-${index}`} className={`border rounded-lg overflow-hidden ${activeTheme.classes.inputBorder}`}>
                <button 
                  onClick={() => handleToggleRecipe(recipe.title)}
                  className={`w-full p-4 flex justify-between items-center text-left transition ${activeTheme.classes.inputBg} hover:bg-opacity-80`}
                >
                  <span className={`font-semibold ${activeTheme.classes.textColor}`}>{recipe.title}</span>
                  <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => handleDelete(e, recipe.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Recipe"
                      >
                          <Icon name="delete" className="h-5 w-5" />
                      </button>
                      <Icon name={activeRecipe === recipe.title ? 'chevron-left' : 'chevron-right'} className={`h-5 w-5 ${activeTheme.classes.textMuted} transition-transform duration-300 ${activeRecipe === recipe.title ? '-rotate-90' : ''}`} />
                  </div>
                </button>
                {activeRecipe === recipe.title && (
                  <div className="p-4">
                     {/* Tab Navigation */}
                     <div className="flex border-b mb-4 border-gray-200/20">
                         <button 
                            className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'details' ? `border-b-2 border-primary ${activeTheme.classes.textAccent}` : `${activeTheme.classes.textMuted}`}`}
                            onClick={() => setActiveTab('details')}
                         >
                             Details
                         </button>
                         <button 
                            className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'costing' ? `border-b-2 border-primary ${activeTheme.classes.textAccent}` : `${activeTheme.classes.textMuted}`}`}
                            onClick={() => setActiveTab('costing')}
                         >
                             Food Costing
                         </button>
                     </div>

                     {activeTab === 'details' ? (
                        <div className="space-y-4">
                            {recipe.imageUrl && <img src={recipe.imageUrl} alt={recipe.title} className="rounded-md w-full max-h-64 object-cover mb-4" />}
                            <p className={`${activeTheme.classes.textMuted} italic`}>{recipe.description}</p>
                            <div className="flex space-x-6 text-sm">
                                <div><p className={`font-bold ${activeTheme.classes.textColor}`}>Yields:</p><p className={activeTheme.classes.textMuted}>{recipe.yields}</p></div>
                                <div><p className={`font-bold ${activeTheme.classes.textColor}`}>Prep time:</p><p className={activeTheme.classes.textMuted}>{recipe.prepTime}</p></div>
                                <div><p className={`font-bold ${activeTheme.classes.textColor}`}>Cook time:</p><p className={activeTheme.classes.textMuted}>{recipe.cookTime}</p></div>
                            </div>
                            <div>
                                <h4 className={`font-semibold ${activeTheme.classes.textColor} mb-2 border-b pb-1 ${activeTheme.classes.inputBorder}`}>Ingredients</h4>
                                <ul className={`list-disc list-inside space-y-1 ${activeTheme.classes.textMuted} pl-2`}>
                                    {recipe.ingredients.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h4 className={`font-semibold ${activeTheme.classes.textColor} mb-2 border-b pb-1 ${activeTheme.classes.inputBorder}`}>Instructions</h4>
                                <ol className={`list-decimal list-inside space-y-3 ${activeTheme.classes.textMuted} pl-2`}>
                                    {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                                </ol>
                            </div>
                             <div className={`flex justify-end pt-4 border-t ${activeTheme.classes.inputBorder}`}>
                                <button 
                                    onClick={() => handleDownload(recipe)}
                                    disabled={loadingIngredients === recipe.title}
                                    className="bg-primary text-white font-bold py-2 px-4 rounded-md hover:bg-primary-dark transition flex items-center disabled:bg-gray-500"
                                >
                                    {loadingIngredients === recipe.title ? <Loader /> : <Icon name="download" className="h-5 w-5 mr-2" />}
                                    {loadingIngredients === recipe.title ? 'Generating...' : 'Download Ingredients (CSV)'}
                                </button>
                            </div>
                        </div>
                     ) : (
                        <div className="space-y-6">
                             <p className="text-sm text-muted mb-4">Calculate profitability for <strong>{recipe.title}</strong>. Enter the total cost of ingredients for the full batch/yield.</p>
                             
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div>
                                     <label className="block text-sm font-medium mb-1">Total Batch Cost</label>
                                     <div className="relative">
                                         <span className="absolute left-3 top-2 text-muted">£</span>
                                         <input 
                                            type="number" 
                                            value={costingData.totalCost} 
                                            onChange={(e) => setCostingData({...costingData, totalCost: e.target.value})}
                                            className={`${inputClasses} pl-7`} 
                                            placeholder="0.00"
                                         />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium mb-1">Selling Price (Batch)</label>
                                     <div className="relative">
                                         <span className="absolute left-3 top-2 text-muted">£</span>
                                         <input 
                                            type="number" 
                                            value={costingData.sellingPrice} 
                                            onChange={(e) => setCostingData({...costingData, sellingPrice: e.target.value})}
                                            className={`${inputClasses} pl-7`} 
                                            placeholder="0.00"
                                         />
                                     </div>
                                 </div>
                                  <div>
                                     <label className="block text-sm font-medium mb-1">VAT / Tax (%)</label>
                                     <input 
                                        type="number" 
                                        value={costingData.taxRate} 
                                        onChange={(e) => setCostingData({...costingData, taxRate: e.target.value})}
                                        className={inputClasses} 
                                        placeholder="20"
                                     />
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-medium rounded-lg">
                                 <div className="text-center">
                                     <p className="text-sm text-muted uppercase font-bold">Food Cost</p>
                                     <p className={`text-2xl font-bold ${parseFloat(costingData.foodCostPercent) > 30 ? 'text-red-500' : 'text-green-500'}`}>
                                         {costingData.foodCostPercent ? `${costingData.foodCostPercent}%` : '-'}
                                     </p>
                                 </div>
                                 <div className="text-center">
                                     <p className="text-sm text-muted uppercase font-bold">Gross Profit (GP)</p>
                                     <p className={`text-2xl font-bold ${parseFloat(costingData.grossProfitPercent) < 65 ? 'text-red-500' : 'text-green-500'}`}>
                                          {costingData.grossProfitPercent ? `${costingData.grossProfitPercent}%` : '-'}
                                     </p>
                                 </div>
                             </div>
                             
                             <div className="flex justify-end pt-4">
                                <button 
                                    onClick={handleSaveCosting}
                                    className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition flex items-center"
                                >
                                    <Icon name="save" className="h-5 w-5 mr-2" />
                                    Save Costing
                                </button>
                            </div>
                        </div>
                     )}
                  </div>
                )}
              </div>
            )) : (
              <div className={`text-center py-16 ${activeTheme.classes.textMuted}`}>
                <p>Saved recipes will appear here.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RecipeFolderModal;
