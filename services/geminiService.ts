import { GoogleGenAI } from "@google/genai";
import { RETAILERS } from "../constants";
import { ScrapedPrice } from "../types";

// The API Key is injected by the build environment/process.
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchCurrentPricesWithGemini = async (): Promise<ScrapedPrice[]> => {
  try {
    const modelId = "gemini-3-flash-preview"; 
    
    const retailerList = RETAILERS.map(r => `${r.name}: ${r.url}`).join('\n');
    
    const prompt = `
      I need to find the current *lowest selling price* (in Euros) of the "Siux Electra ST4 Pro" padel racket from the following specific URLs.
      
      ${retailerList}
      
      Please use Google Search to find the price listed on these specific pages.
      
      IMPORTANT PRICING RULES:
      1. **FIND THE DEAL/SALE PRICE**: Many of these items are discounted. You MUST return the discounted price (the price the user would pay at checkout), NOT the MSRP or "Adviesprijs".
      2. If you see two prices (e.g., "€300" crossed out and "€250" active), return 250.
      3. Ignore "Club" or "Member" specific prices unless it is the only price available, but always prefer the public sale price.
      
      OUTPUT INSTRUCTIONS:
      - Return the data strictly as a JSON array.
      - Each item in the array should be an object with "retailerName" (string) and "price" (number).
      - If a price cannot be found, use 0.
      - Do not include any markdown formatting (like \`\`\`json). Just return the raw JSON string.
      
      Example format:
      [
        { "retailerName": "JustPadel", "price": 275.50 },
        { "retailerName": "Decathlon", "price": 0 }
      ]
    `;

    const response = await genAI.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let jsonText = response.text;
    
    // Log grounding chunks for debugging/verification purposes
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
       console.log("Grounding Chunks:", response.candidates[0].groundingMetadata.groundingChunks);
    }

    if (!jsonText) return [];

    // Clean up potential markdown code blocks
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Extract JSON array if surrounded by other text
    const startIndex = jsonText.indexOf('[');
    const endIndex = jsonText.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1) {
        jsonText = jsonText.substring(startIndex, endIndex + 1);
    }

    let parsedData: Array<{ retailerName: string, price: number }> = [];
    try {
        parsedData = JSON.parse(jsonText);
    } catch (e) {
        console.warn("Failed to parse JSON from model response:", jsonText);
        return [];
    }

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