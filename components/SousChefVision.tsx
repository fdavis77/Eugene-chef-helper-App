import React, { useState, useRef, useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';
import { analyzeImage } from '../services/geminiService';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { Icon } from './common/Icon';
import { MarkdownRenderer } from './common/MarkdownRenderer';

const CREATE_NOTE_MUTATION = gql`
  mutation CreateNote($content: String!, $imageUrl: String) {
    createNote(content: $content, imageUrl: $imageUrl) {
      id
    }
  }
`;

const LIST_NOTES_QUERY = gql`
  query ListNotes {
    listNotes {
      id
      content
      createdAt
      imageUrl
    }
  }
`;

const SousChefVision: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<false | 'prompt' | 'macro'>(false);
  const [error, setError] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [createNote] = useMutation(CREATE_NOTE_MUTATION, {
    refetchQueries: [{ query: LIST_NOTES_QUERY }],
  });

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        setError('Image file is too large. Please select a file under 4MB.');
        return;
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
      setError('');
      setAnalysis('');
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
    setAnalysis('');
    setNoteSaved(false);
    setIsLoading('prompt');

    try {
      const imageBase64 = await toBase64(imageFile);
      const result = await analyzeImage(prompt, imageBase64, imageFile.type);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze image. Please try again.');
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
    setAnalysis('');
    setNoteSaved(false);
    setIsLoading('macro');

    try {
      const imageBase64 = await toBase64(imageFile);
      const macroPrompt = "Analyze the food in this image. Identify all visible ingredients and provide a rough estimate of the total calories for the dish shown. Format the response with headings for 'Ingredients' and 'Calorie Estimate'. **Crucially, list each ingredient and make its name bold using markdown (e.g., **Flour**, **Sugar**).** Do not use any markdown hashtags.";
      const result = await analyzeImage(macroPrompt, imageBase64, imageFile.type);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to get macro analysis. Please try again.');
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
            
            canvas.toBlob(blob => {
                if (blob) {
                    const imageFile = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
                    setImageFile(imageFile);
                    setImageUrl(URL.createObjectURL(imageFile));
                    setAnalysis('');
                    setIsCameraOpen(false);
                }
            }, 'image/jpeg');
        }
    }
  };
  
  const handleSaveToNotes = async () => {
    if (!analysis || !imageFile) return;

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await createNote({ variables: { content: analysis, imageUrl: dataUrl } });
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2000);
      } catch (err) {
        console.error("Error saving note to backend:", err);
        setError("Could not save note.");
      }
    };
    reader.onerror = (error) => {
      console.error("Error converting image to data URL for notes:", error);
      setError("Could not save image to notes.");
    };
  };


  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold text-dark mb-4 flex items-center">
            <Icon name="visibility" className="h-6 w-6 mr-2" />
            Sous-Chef Vision
        </h2>
        <p className="text-muted mb-4">Upload an image or use your camera to identify ingredients, get calorie estimates, or ask your own questions for instant analysis.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center bg-light border-2 border-dashed border-medium rounded-lg p-6 text-center h-full min-h-[250px]">
                {imageUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={imageUrl} alt="Preview" className="max-h-64 w-auto object-contain rounded-md mx-auto"/>
                        <button onClick={handleRemoveImage} className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-light focus:ring-red-500">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <div>
                        <Icon name="image" className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-muted">Drag & drop or</p>
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
                        <p className="text-xs text-muted mt-2">PNG, JPG, WEBP up to 4MB</p>
                    </div>
                )}
            </div>
            {/* Prompt & Action */}
            <div className="flex flex-col">
                 <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Identify potential allergens in this dish, or suggest a wine pairing."
                    className="flex-grow bg-light border-medium text-dark placeholder:text-muted focus:ring-black border rounded-md p-3 focus:ring-2 focus:outline-none transition resize-none"
                    rows={6}
                    aria-label="Prompt for image analysis"
                />
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={!!isLoading || !imageFile || !prompt.trim()}
                        className="w-full bg-black text-white font-bold py-3 px-6 rounded-md hover:bg-gray-800 transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
                        aria-label="Analyze Image with custom prompt"
                    >
                        {isLoading === 'prompt' ? <Loader /> : 'Analyze with Prompt'}
                    </button>
                    <button
                        onClick={handleMacroAnalysis}
                        disabled={!!isLoading || !imageFile}
                        className="w-full bg-teal-500 text-white font-bold py-3 px-6 rounded-md hover:bg-teal-600 transition duration-300 disabled:bg-gray-500 flex items-center justify-center"
                        aria-label="Get Macro Analysis"
                    >
                        {isLoading === 'macro' ? <Loader /> : 
                        (
                            <>
                                <Icon name="chart-pie" className="h-5 w-5 mr-2"/>
                                Get Macro Analysis
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </Card>
      
      {(isLoading || analysis) && (
        <Card>
            <h3 className="text-lg font-semibold text-dark mb-4">Analysis Result</h3>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8">
                    <Loader />
                    <p className="mt-4 text-muted">Analyzing image...</p>
                </div>
            ) : (
                analysis && (
                    <div>
                        <MarkdownRenderer content={analysis} />
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleSaveToNotes}
                                disabled={noteSaved}
                                className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition duration-300 disabled:bg-green-800/50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {noteSaved ? (
                                    <>
                                        <Icon name="check" className="h-5 w-5 mr-2" />
                                        Saved!
                                    </>
                                ) : (
                                    <>
                                        <Icon name="save" className="h-5 w-5 mr-2" />
                                        Save to Notes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )
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
                    className="bg-black text-white font-bold py-3 px-6 rounded-md hover:bg-gray-800 transition duration-300 flex items-center gap-2"
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
