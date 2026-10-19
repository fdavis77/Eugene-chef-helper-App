import Anthropic from "@anthropic-ai/sdk";
import type { Ingredient, Recipe, SeasonalProduce, HaccpLog, TemperatureLog } from '../types';

const client = new Anthropic({ apiKey: process.env.API_KEY, dangerouslyAllowBrowser: true });
const MODEL = 'claude-haiku-5-5';

const parseJSON = <T>(text: string): T => {
  const start = text.indexOf('{') !== -1 ? text.indexOf('{') : text.indexOf('[');
  const end = text.lastIndexOf('}') !== -1 ? Math.max(text.lastIndexOf('}'), text.lastIndexOf(']')) : text.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.substring(start, end + 1)) as T; } catch {}
  }
  return JSON.parse(text.replace(/```json\n?|```/g, '').trim()) as T;
};

const ask = async (system: string, user: string): Promise<string> => {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');
  return block.text;
};

export const getMenuInspiration = async (prompt: string, unitSystem: 'metric' | 'imperial'): Promise<Recipe> => {
  const units = unitSystem === 'imperial' ? 'USA imperial (cups, oz, lbs)' : 'UK/EU metric (grams, ml, kg)';
  const system = `You are a world-class chef. Respond ONLY with a valid JSON object matching this schema exactly:
{"title":string,"description":string,"yields":string,"prepTime":string,"cookTime":string,"ingredients":[string],"instructions":[string]}`;
  const text = await ask(system, `Create a detailed recipe for: "${prompt}". Use ${units} measurements.`);
  try { return parseJSON<Recipe>(text); } catch (e) { throw new Error("Could not parse recipe from AI response."); }
};

export const getIngredientList = async (recipe: string): Promise<Ingredient[]> => {
  const system = `You are a culinary assistant. Respond ONLY with a valid JSON array of objects, each with keys: name (string), quantity (string), unit (string). No other text.`;
  const text = await ask(system, `Extract all ingredients from this recipe as a JSON array:\n\n${recipe}`);
  try { return parseJSON<Ingredient[]>(text); } catch (e) { throw new Error("Could not parse ingredient list from AI response."); }
};

export const getHaccpInfo = async (query: string): Promise<string> => {
  return ask(
    "You are a food safety expert specialising in HACCP and COSHH regulations for professional kitchens. Provide clear, accurate, practical information. Format with headings and bullet points where appropriate.",
    query
  );
};

export const getSafetyAudit = async ({ foodLogs, haccpLogs }: { foodLogs: TemperatureLog[]; haccpLogs: HaccpLog[] }): Promise<string> => {
  const logsData = `FOOD PROBE LOGS:\n${foodLogs.length > 0 ? JSON.stringify(foodLogs.slice(-20), null, 2) : 'No recent food probe logs.'}\n\nFRIDGE/FREEZER HACCP LOGS:\n${haccpLogs.length > 0 ? JSON.stringify(haccpLogs.slice(-20), null, 2) : 'No recent fridge/freezer logs.'}`;
  return ask(
    "You are a meticulous food safety auditor for professional kitchens. Format your response in Markdown with clear headings for 'Key Findings' and 'Recommendations'.",
    `Analyse these temperature logs. Identify readings outside safe zones (Fridges ≤4°C/40°F; Freezers ≤-18°C/0°F; Hot food ≥63°C/145°F). Flag patterns, missing logs, and incomplete data. If no issues, confirm compliance.\n\n${logsData}`
  );
};

export const getSeasonalProduce = async (month: string, country: string): Promise<SeasonalProduce> => {
  const system = `You are a culinary expert. Respond ONLY with a valid JSON object matching this schema exactly:
{"Fruits":[string],"Vegetables":[string],"Proteins":[string]}`;
  const text = await ask(system, `List prime seasonal produce for a chef in ${country} for the month of ${month}. Include unique and interesting options alongside classics.`);
  try { return parseJSON<SeasonalProduce>(text); } catch (e) { throw new Error("Could not parse seasonal produce from AI response."); }
};

export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: "You are a culinary expert AI assistant. Analyse the image and provide insightful, accurate information relevant to a professional chef. Be concise and clear.",
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 } },
        { type: 'text', text: prompt },
      ],
    }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');
  return block.text;
};

export const getRecipeFromImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<Recipe> => {
  const system = `You are a creative chef AI. Respond ONLY with a valid JSON object matching this schema exactly:
{"title":string,"description":string,"yields":string,"prepTime":string,"cookTime":string,"ingredients":[string],"instructions":[string]}`;
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64 } },
        { type: 'text', text: `Based on this image and prompt, create a complete recipe: "${prompt}"` },
      ],
    }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');
  try { return parseJSON<Recipe>(block.text); } catch (e) { throw new Error("Could not parse recipe from AI response."); }
};
