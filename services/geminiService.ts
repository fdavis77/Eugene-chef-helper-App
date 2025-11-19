import { GoogleGenAI, Type } from "@google/genai";
import type { Ingredient, Recipe, SeasonalProduce, HaccpLog, TemperatureLog } from '../types';

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the recipe." },
    description: { type: Type.STRING, description: "A brief, enticing description of the dish." },
    yields: { type: Type.STRING, description: "How many servings the recipe makes." },
    prepTime: { type: Type.STRING, description: "Preparation time, e.g., '20 minutes'." },
    cookTime: { type: Type.STRING, description: "Cooking time, e.g., '45 minutes'." },
    ingredients: {
      type: Type.ARRAY,
      description: "A list of all ingredients.",
      items: { type: Type.STRING }
    },
    instructions: {
      type: Type.ARRAY,
      description: "Step-by-step instructions for preparing the dish.",
      items: { type: Type.STRING }
    }
  },
  required: ["title", "description", "yields", "prepTime", "cookTime", "ingredients", "instructions"]
};


export const getMenuInspiration = async (prompt: string, unitSystem: 'metric' | 'imperial'): Promise<Recipe> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const fullPrompt = `You are a world-class chef creating an innovative menu. Based on the following concept, provide a detailed recipe. The user has requested ingredient measurements in ${unitSystem === 'imperial' ? 'USA (imperial, e.g., cups, oz, lbs)' : 'UK/EU (metric, e.g., grams, ml, kg)'} units. Concept: "${prompt}"`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: recipeSchema
    }
  });

  try {
    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as Recipe;
  } catch (e) {
    console.error("Failed to parse recipe JSON:", e);
    throw new Error("Could not parse recipe from AI response.");
  }
};

export const getIngredientList = async (recipe: string): Promise<Ingredient[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze the following recipe and extract the ingredients into a structured list. Recipe:\n\n${recipe}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: {
                            type: Type.STRING,
                            description: 'The name of the ingredient.',
                        },
                        quantity: {
                            type: Type.STRING,
                            description: 'The quantity of the ingredient (e.g., "2", "1/2").',
                        },
                        unit: {
                            type: Type.STRING,
                            description: 'The unit of measurement (e.g., "cups", "grams", "cloves").',
                        },
                    },
                    required: ["name", "quantity", "unit"],
                },
            },
        },
    });

    try {
        const text = response.text;
        // Robustly extract the JSON array: look for the first '[' and the last ']'
        const startIndex = text.indexOf('[');
        const endIndex = text.lastIndexOf(']');

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            const jsonString = text.substring(startIndex, endIndex + 1);
            return JSON.parse(jsonString) as Ingredient[];
        }

        // Fallback: simple markdown strip if brackets aren't clearly found
        const cleanedText = text.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanedText) as Ingredient[];
    } catch (e) {
        console.error("Failed to parse ingredient list JSON:", e);
        throw new Error("Could not parse ingredient list from AI response.");
    }
};

export const getHaccpInfo = async (query: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
            systemInstruction: "You are a food safety expert specializing in HACCP and COSHH regulations for professional kitchens. Provide clear, accurate, and practical information based on the user's query. Format the response for readability using headings and bullet points where appropriate.",
        },
    });
    return response.text;
};

export const getSafetyAudit = async ({ foodLogs, haccpLogs }: { foodLogs: TemperatureLog[]; haccpLogs: HaccpLog[] }): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const logsData = `
    FOOD PROBE LOGS:
    ${foodLogs.length > 0 ? JSON.stringify(foodLogs.slice(-20), null, 2) : 'No recent food probe logs recorded.'}

    FRIDGE/FREEZER HACCP LOGS:
    ${haccpLogs.length > 0 ? JSON.stringify(haccpLogs.slice(-20), null, 2) : 'No recent fridge/freezer logs recorded.'}
  `;
    const prompt = `As a meticulous food safety auditor, analyze the following recent temperature logs from a professional kitchen. 
    - Identify any readings that are outside of safe temperature zones (Fridges should be at or below 4°C/40°F; Freezers at or below -18°C/0°F; Hot food should be held above 63°C/145°F).
    - Look for patterns, like a specific fridge consistently running warm.
    - Check for missing logs or incomplete data (e.g., missing initials, no corrective action for a high temperature).
    - Provide a concise report in Markdown format with clear headings for "Key Findings" and "Recommendations".
    - If there are no issues, state that the logs appear to be in compliance.

    Log Data:
    ${logsData}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are a food safety expert specializing in HACCP compliance for professional kitchens. Your analysis must be sharp, accurate, and focused on preventing health risks. Format your response clearly using Markdown for headings and bullet points.",
        },
    });

    return response.text;
};

export const getSeasonalProduce = async (month: string, country: string): Promise<SeasonalProduce> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a list of prime seasonal produce for a chef in ${country} for the month of ${month}. Include some unique or interesting options alongside the classics.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    Fruits: {
                        type: Type.ARRAY,
                        description: "A list of seasonal fruits.",
                        items: { type: Type.STRING }
                    },
                    Vegetables: {
                        type: Type.ARRAY,
                        description: "A list of seasonal vegetables.",
                        items: { type: Type.STRING }
                    },
                    Proteins: {
                        type: Type.ARRAY,
                        description: "A list of seasonal proteins (fish, meat, game).",
                        items: { type: Type.STRING }
                    }
                },
                required: ["Fruits", "Vegetables", "Proteins"]
            }
        }
    });
    
    try {
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as SeasonalProduce;
    } catch (e) {
        console.error("Failed to parse seasonal produce JSON:", e);
        throw new Error("Could not parse seasonal produce from AI response.");
    }
};

export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };
  const textPart = {
    text: prompt,
  };
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [textPart, imagePart] },
    config: {
      systemInstruction: "You are a culinary expert AI assistant. Analyze the user's image and provide insightful, accurate, and helpful information relevant to a professional chef. Be concise and clear in your analysis."
    }
  });

  return response.text;
};

export const getRecipeFromImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<Recipe> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };
  const textPart = {
    text: `Based on the image and the following prompt, generate a detailed recipe suitable for a professional chef. Prompt: "${prompt}"`,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [textPart, imagePart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
      systemInstruction: "You are a creative chef AI. Based on the user's image and prompt, create a unique and complete recipe. Provide a title, description, yield, timings, ingredients, and step-by-step instructions.",
    },
  });

  try {
    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as Recipe;
  } catch (e) {
    console.error("Failed to parse recipe from image JSON:", e);
    throw new Error("Could not parse recipe from AI response.");
  }
};