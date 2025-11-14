import { GoogleGenAI, Type } from "@google/genai";
import type { Ingredient, Recipe } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMenuInspiration = async (prompt: string, unitSystem: 'metric' | 'imperial'): Promise<Recipe> => {
  const fullPrompt = `You are a world-class chef creating an innovative menu. Based on the following concept, provide a detailed recipe. The user has requested ingredient measurements in ${unitSystem === 'imperial' ? 'USA (imperial, e.g., cups, oz, lbs)' : 'UK/EU (metric, e.g., grams, ml, kg)'} units. Concept: "${prompt}"`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
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
      }
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
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as Ingredient[];
    } catch (e) {
        console.error("Failed to parse ingredient list JSON:", e);
        throw new Error("Could not parse ingredient list from AI response.");
    }
};

export const getHaccpInfo = async (query: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
            systemInstruction: "You are a food safety expert specializing in HACCP and COSHH regulations for professional kitchens. Provide clear, accurate, and practical information based on the user's query. Format the response for readability using headings and bullet points where appropriate.",
        },
    });
    return response.text;
};

export const getSeasonalProduce = async (season: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a list of prime seasonal produce for a chef for the season of ${season}. Categorize the list into Fruits, Vegetables, and Proteins. Be comprehensive and include some unique or interesting options alongside the classics. Format the response cleanly.`,
    });
    return response.text;
};

export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
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