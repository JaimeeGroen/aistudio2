import { GoogleGenAI, Type } from "@google/genai";
import { RETAILERS } from "../constants";
import { ScrapedPrice } from "../types";

// In a real production app, this key should be proxied through a backend
// For this demo, we rely on the process.env injection or user input context if needed.
// However, per instructions, we assume process.env.API_KEY is available.

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchCurrentPricesWithGemini = async (): Promise<ScrapedPrice[]> => {
  try {
    const modelId = "gemini-3-pro-preview"; // Using the capable model for search grounding
    
    const retailerList = RETAILERS.map(r => `${r.name}: ${r.url}`).join('\n');
    
    const prompt = `
      I need to find the current price (in Euros) of the "Siux Electra ST4 Pro" padel racket from the following specific URLs.
      
      ${retailerList}
      
      Please use Google Search to find the *current* price listed on these specific pages. 
      Return the data strictly as a JSON list. 
      If a price cannot be found for a specific retailer, use 0.
    `;

    // Define the schema for structured output
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          retailerName: { type: Type.STRING, description: "Name of the retailer (e.g. JustPadel)" },
          price: { type: Type.NUMBER, description: "The numeric price found (e.g. 279.95)" }
        },
        required: ["retailerName", "price"]
      }
    };

    const response = await genAI.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const parsedData = JSON.parse(jsonText) as Array<{ retailerName: string, price: number }>;

    // Map the AI response back to our internal retailer IDs
    const result: ScrapedPrice[] = [];
    
    parsedData.forEach(item => {
      // Fuzzy match or exact match the name to our ID
      const retailer = RETAILERS.find(r => 
        item.retailerName.toLowerCase().includes(r.name.toLowerCase()) || 
        r.name.toLowerCase().includes(item.retailerName.toLowerCase())
      );
      
      if (retailer) {
        result.push({
          retailerId: retailer.id,
          price: item.price
        });
      }
    });

    return result;

  } catch (error) {
    console.error("Error fetching prices with Gemini:", error);
    throw error;
  }
};
