import React, { useState } from 'react';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Loader } from './common/Loader';
import { getIngredientList } from '../services/geminiService';
import type { Recipe, Ingredient } from '../types';

interface RecipeFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
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


const RecipeFolderModal: React.FC<RecipeFolderModalProps> = ({ isOpen, onClose, recipes }) => {
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);
  const [loadingIngredients, setLoadingIngredients] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
        <Card className="max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-dark flex items-center">
              <Icon name="book" className="h-6 w-6 mr-2" />
              Recipe Folder
            </h3>
            <button onClick={onClose} className="text-muted hover:text-dark">
                <Icon name="x-circle" className="h-8 w-8" />
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto space-y-3 pr-2">
            {recipes.length > 0 ? recipes.map((recipe, index) => (
              <div key={`${recipe.title}-${index}`} className="border border-medium rounded-lg overflow-hidden">
                <button 
                  onClick={() => handleToggleRecipe(recipe.title)}
                  className="w-full p-4 flex justify-between items-center text-left bg-light hover:bg-medium transition"
                >
                  <span className="font-semibold text-dark">{recipe.title}</span>
                  <Icon name={activeRecipe === recipe.title ? 'chevron-left' : 'chevron-right'} className={`h-5 w-5 text-muted transition-transform duration-300 ${activeRecipe === recipe.title ? '-rotate-90' : ''}`} />
                </button>
                {activeRecipe === recipe.title && (
                  <div className="p-4 space-y-4">
                    {recipe.imageUrl && <img src={recipe.imageUrl} alt={recipe.title} className="rounded-md w-full max-h-64 object-cover mb-4" />}
                    <p className="text-muted italic">{recipe.description}</p>
                     <div className="flex space-x-6 text-sm">
                        <div><p className="font-bold text-dark">Yields:</p><p className="text-muted">{recipe.yields}</p></div>
                        <div><p className="font-bold text-dark">Prep time:</p><p className="text-muted">{recipe.prepTime}</p></div>
                        <div><p className="font-bold text-dark">Cook time:</p><p className="text-muted">{recipe.cookTime}</p></div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-dark mb-2 border-b border-medium pb-1">Ingredients</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted pl-2">
                            {recipe.ingredients.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-dark mb-2 border-b border-medium pb-1">Instructions</h4>
                        <ol className="list-decimal list-inside space-y-3 text-muted pl-2">
                            {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                    </div>
                     <div className="flex justify-end pt-4 border-t">
                        <button 
                            onClick={() => handleDownload(recipe)}
                            disabled={loadingIngredients === recipe.title}
                            className="bg-black text-white font-bold py-2 px-4 rounded-md hover:bg-gray-800 transition flex items-center disabled:bg-gray-500"
                        >
                            {loadingIngredients === recipe.title ? <Loader /> : <Icon name="download" className="h-5 w-5 mr-2" />}
                            {loadingIngredients === recipe.title ? 'Generating...' : 'Download Ingredients (CSV)'}
                        </button>
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-16 text-muted">
                <p>Recipes saved from the Vision tab will appear here.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RecipeFolderModal;
