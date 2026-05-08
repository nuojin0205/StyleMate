import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ClothingInfo {
  category: string;
  color: string;
  material: string;
  thickness: string;
  seasons: string[];
  styles: string[];
}

export async function analyzeClothingImage(base64Image: string): Promise<ClothingInfo> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Analyze this piece of clothing and identify its category (tops, bottoms, dresses, outerwear, shoes, bags, accessories), color, material, thickness (thin, medium, thick), which seasons it's suitable for, and what fashion styles it matches (e.g., casual, elegant, formal, sporty, outdoor). Return the result strictly in JSON format." }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          color: { type: Type.STRING },
          material: { type: Type.STRING },
          thickness: { type: Type.STRING },
          seasons: { type: Type.ARRAY, items: { type: Type.STRING } },
          styles: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["category", "color", "material", "thickness", "seasons", "styles"]
      }
    }
  });

  return JSON.parse(response.text);
}

export interface OutfitRecommendation {
  items: string[]; // Descriptors of items (since we might not have all in wardrobe)
  reason: string;
  style: string;
  matchingIds: string[]; // IDs from wardrobe that match
}

export async function getOutfitRecommendations(
  wardrobe: any[], 
  weather: any, 
  preferredStyle: string, 
  scene: string
): Promise<OutfitRecommendation> {
  const wardrobePrompt = wardrobe.map(item => `- ${item.category}: ${item.color} ${item.material} (ID: ${item.id})`).join('\n');
  
  const prompt = `Based on the following user's wardrobe:
${wardrobePrompt}

Current Weather: ${weather?.temp || 'unknown'}°C, ${weather?.condition || 'unknown'}
Desired Style: ${preferredStyle}
Scene: ${scene}

Suggest 1-2 outfit combinations using ONLY or MOSTLY items from the wardrobe. If an item is missing, suggest a generic replacement.
Return the result strictly in JSON format.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are a professional fashion stylist. You help women build outfits based on their wardrobe, weather, and desired vibes. Focus on color coordination, temperature appropriateness, and silhouette.",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
                matchingIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                reason: { type: Type.STRING },
                style: { type: Type.STRING }
              },
              required: ["items", "matchingIds", "reason", "style"]
            }
          }
        }
      }
    }
  });

  const parsed = JSON.parse(response.text);
  return parsed.recommendations[0]; // Return the top one for now
}
