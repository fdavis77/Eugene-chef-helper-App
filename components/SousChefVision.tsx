import React, { useState, useRef, useEffect } from 'react';
import { analyzeImage, getRecipeFromImage } from '../services/geminiService';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';
import { MarkdownRenderer } from './common/MarkdownRenderer';
import { compressImage } from '../utils/image';
import { useTheme } from '../contexts/ThemeContext';
import type { Recipe } from '../types';

interface SousChefVisionProps {
  onAddNote: (content: string, imageUrl?: string) => void;
  onSaveRecipe: (recipe: Recipe) => void;
}

const SousChefVision: React.FC<SousChefVisionProps> = ({ onAddNote, onSaveRecipe }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string | Recipe | null>(null);
  const [isLoading, setIsLoading] = useState<false | 'prompt' | 'macro' | 'recipe'>(false);
  const [error, setError] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [recipeSaved, setRecipeSaved] = useState(false);
  const { activeTheme } = useTheme();


  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isCameraOpen) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch(err => {
                console.error("Error accessing camera: ", err);
                setError("Could not access camera. Please grant permission and try again.");
                setIsCameraOpen(false);
            });
    } else {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }
    return () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };
  }, [isCameraOpen]);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError('');
      try {
        const compressedFile = await compressImage(file);
        setImageFile(compressedFile);
        setImageUrl(URL.createObjectURL(compressedFile));
        setAnalysisResult(null);
      } catch (err) {
        console.error("Image compression failed:", err);
        setError("Could not process image. Please try a different file.");
      }
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !prompt.trim()) {
      setError('Please upload an image and enter a prompt.');
      return;
    }
    setError('');
    setAnalysisResult(null);
    setNoteSaved(false);
    setRecipeSaved(false);
    setIsLoading('prompt');

    try {
      const imageBase64 = await toBase64(imageFile);
      const result = await analyzeImage(prompt, imageBase64, imageFile.type);
      setAnalysisResult(result);
    } catch (err) {
      setError('AI analysis failed. Please check your connection and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMacroAnalysis = async () => {
    if (!imageFile) {
      setError('Please upload an image for macro analysis.');
      return;
    }
    setError('');
    setAnalysisResult(null);
    setNoteSaved(false);
    setRecipeSaved(false);
    setIsLoading('macro');

    try {
      const imageBase64 = await toBase64(imageFile);
      const macroPrompt = "Analyze the food in this image. Identify all visible ingredients and provide a rough estimate of the total calories for the dish shown. Format the response with headings for 'Ingredients' and 'Calorie Estimate'. **Crucially, list each ingredient and make its name bold using markdown (e.g., **Flour**, **Sugar**).** Do not use any markdown hashtags.";
      const result = await analyzeImage(macroPrompt, imageBase64, imageFile.type);
      setAnalysisResult(result);
    } catch (err) {
      setError('Macro analysis failed. Please check your connection and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateRecipe = async () => {
    if (!imageFile) {
        setError('Please upload an image to generate a recipe from.');
        return;
    }
    setError('');
    setAnalysisResult(null);
    setNoteSaved(false);
    setRecipeSaved(false);
    setIsLoading('recipe');

    try {
        const imageBase64 = await toBase64(imageFile);
        const recipePrompt = prompt.trim() || "a creative dish based on the image";
        const result = await getRecipeFromImage(recipePrompt, imageBase64, imageFile.type);
        setAnalysisResult(result);
    } catch (err) {
        setError('Failed to generate recipe from image. The AI may not have been able to create a recipe from this image. Please try again.');
        console.error(err);
    } finally {
        setIsLoading(false);
    }
};

  const openCamera = () => {
    handleRemoveImage();
    setError('');
    setIsCameraOpen(true);
  };
  
  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
        const context = canvas.getContext('2d');
        if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const imageFile = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
                    try {
                        const compressedFile = await compressImage(imageFile);
                        setImageFile(compressedFile);
                        setImageUrl(URL.createObjectURL(compressedFile));
                        setAnalysisResult(null);
                        setIsCameraOpen(false);
                    } catch (err) {
                        setError("Could not process captured image.");
                        setIsCameraOpen(false);
                    }
                }
            }, 'image/jpeg');
        }
    }
  };
  
  const handleSaveToNotes = async () => {
    if (!analysisResult || typeof analysisResult !== 'string' || !imageFile) return;

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onAddNote(analysisResult, dataUrl);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000); // Show confirmation for 2s
    };
    reader.onerror = (error) => {
      console.error("Error converting image to data URL for notes:", error);
      setError("Could not save image to notes.");
    };
  };
  
  const handleSaveRecipe = () => {
    if (!analysisResult || typeof analysisResult === 'string' || !imageUrl) return;
    onSaveRecipe({ ...analysisResult, imageUrl });
    setRecipeSaved(true);
    setTimeout(() => setRecipeSaved(false), 2000);
  }

  const renderResult = () => {
    if (!analysisResult) return null;

    if (typeof analysisResult === 'string') {
        return (
            <div>
                <MarkdownRenderer content={analysisResult} />
                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleSaveToNotes}
                        disabled={noteSaved}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 disabled:bg-green-800/50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {noteSaved ? (
                            <><Icon name="check" className="h-5 w-5 mr-2" />Saved!</>
                        ) : (
                            <><Icon name="save" className="h-5 w-5 mr-2" />Save to Notes</>
                        )}
                    </button>
                </div>
            </div>
        );
    }
    
    // Render Recipe
    const recipe = analysisResult;
    return (
        <div>
            <h3 className={`text-xl font-bold ${activeTheme.classes.textHeading} mb-2`}>{recipe.title}</h3>
            <p className={`${activeTheme.classes.textMuted} italic mb-4`}>{recipe.description}</p>
            <div className="flex space-x-6 mb-6 text-sm">
                <div><p className={`font-bold ${activeTheme.classes.textColor}`}>Yields:</p><p className={activeTheme.classes.textMuted}>{recipe.yields}</p></div>
                <div><p className={`font-bold ${activeTheme.classes.textColor}`}>Prep time:</p><p className={activeTheme.classes.textMuted}>{recipe.prepTime}</p></div>
                <div><p className={`font-bold ${activeTheme.classes.textColor}`}>Cook time:</p><p className={activeTheme.classes.textMuted}>{recipe.cookTime}</p></div>
            </div>
            <div className="space-y-6">
                <div>
                    <h4 className={`font-semibold ${activeTheme.classes.textColor} mb-2 border-b pb-1 ${activeTheme.classes.inputBorder}`}>Ingredients</h4>
                    <ul className={`list-disc list-inside space-y-1 ${activeTheme.classes.textMuted} pl-2`}>
                        {recipe.ingredients.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
                <div>
                    <h4 className={`font-semibold ${activeTheme.classes.textColor} mb-2 border-b pb-1 ${activeTheme.classes.inputBorder}`}>Instructions</h4>
                    <ol className={`list-decimal list-inside space-y-3 ${activeTheme.classes.textMuted} pl-2`}>
                        {recipe.instructions.map((step, index) => <li key={index}>{step}</li>)}
                    </ol>
                </div>
            </div>
            <div className="flex justify-end mt-4">
                <button
                    onClick={handleSaveRecipe}
                    disabled={recipeSaved}
                    className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 disabled:bg-green-800/50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {recipeSaved ? (
                        <><Icon name="check" className="h-5 w-5 mr-2" />Saved!</>
                    ) : (
                        <><Icon name="book" className="h-5 w-5 mr-2" />Save to Recipe Folder</>
                    )}
                </button>
            </div>
        </div>
    );
  }


  return (
    <div className="space-y-6">
      <Card>
        <h2 className={`text-xl font-bold ${activeTheme.classes.textHeading} mb-4 flex items-center`}>
            <Icon name="visibility" className="h-6 w-6 mr-2" />
            Sous-Chef Vision
        </h2>
        <p className={`${activeTheme.classes.textMuted} mb-4`}>Upload an image or use your camera to identify ingredients, get calorie estimates, or ask your own questions for instant analysis.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center h-full min-h-[250px] ${activeTheme.classes.inputBg} ${activeTheme.classes.inputBorder}`}>
                {imageUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={imageUrl} alt="Preview" className="max-h-64 w-auto object-contain rounded-md mx-auto"/>
                        <button onClick={handleRemoveImage} aria-label="Remove uploaded image" className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-light focus:ring-red-500">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <div>
                        <Icon name="image" className="mx-auto h-12 w-12 text-gray-400" />
                        <p className={`mt-2 ${activeTheme.classes.textMuted}`}>Drag & drop or</p>
                         <div className="mt-2 flex justify-center gap-4">
                            <button onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline font-semibold">
                                upload an image
                            </button>
                            <span className="text-gray-400">|</span>
                            <button onClick={openCamera} className="text-primary hover:underline font-semibold flex items-center gap-2">
                                <Icon name="camera" className="h-4 w-4" /> Use Camera
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFileChange}
                            className="hidden"
                            aria-label="Upload image"
                        />
                        <p className={`text-xs ${activeTheme.classes.textMuted} mt-2`}>PNG, JPG, WEBP - Optimized to 1080px width</p>
                    </div>
                )}
            </div>
            {/* Prompt & Action */}
            <div className="flex flex-col">
                 <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Identify potential allergens in this dish, or suggest a wine pairing."
                    className={`flex-grow border rounded-md p-3 focus:ring-2 focus:outline-none transition resize-none ${activeTheme.classes.inputBg} ${activeTheme.classes.inputText} ${activeTheme.classes.inputBorder} ${activeTheme.classes.placeholderText} focus:ring-primary`}
                    rows={6}
                    aria-label="Prompt for image analysis"
                />
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={!!isLoading || !imageFile || !prompt.trim()}
                        className="w-full bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-dark transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
                        aria-label="Analyze Image with custom prompt"
                    >
                        {isLoading === 'prompt' ? <Loader /> : 'Analyze'}
                    </button>
                    <button
                        onClick={handleMacroAnalysis}
                        disabled={!!isLoading || !imageFile}
                        className="w-full bg-teal-500 text-white font-bold py-3 px-6 rounded-md hover:bg-teal-600 transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
                        aria-label="Get Macro Analysis"
                    >
                        {isLoading === 'macro' ? <Loader /> : <Icon name="chart-pie" className="h-5 w-5"/>}
                    </button>
                     <button
                        onClick={handleGenerateRecipe}
                        disabled={!!isLoading || !imageFile}
                        className="w-full bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-dark transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
                        aria-label="Generate Recipe from Image"
                    >
                        {isLoading === 'recipe' ? <Loader /> : <Icon name="sparkles" className="h-5 w-5"/>}
                    </button>
                </div>
            </div>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </Card>
      
      {(isLoading || analysisResult) && (
        <Card>
            <h3 className={`text-lg font-semibold ${activeTheme.classes.textHeading} mb-4`}>Analysis Result</h3>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8">
                    <Loader />
                    <p className={`mt-4 ${activeTheme.classes.textMuted}`}>Analyzing image...</p>
                </div>
            ) : (
                renderResult()
            )}
        </Card>
      )}

      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-4">
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-lg rounded-lg shadow-2xl"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="mt-6 flex gap-4">
                <button 
                    onClick={handleCapture} 
                    className="bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-dark transition duration-300 flex items-center gap-2"
                >
                    <Icon name="camera" className="h-6 w-6"/>
                    Capture
                </button>
                <button 
                    onClick={() => setIsCameraOpen(false)} 
                    className="bg-medium text-dark font-bold py-3 px-6 rounded-md hover:bg-gray-300 transition duration-300"
                >
                    Close
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default SousChefVision;