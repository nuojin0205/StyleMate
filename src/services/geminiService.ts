import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface ClothingInfo {
  category: string;
  color: string;
  material: string;
  thickness: string;
  seasons: string[];
  styles: string[];
  detectedObject?: {
    box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 
    label: string;
  };
}

export async function analyzeClothingImage(base64Image: string): Promise<ClothingInfo> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Analyze this image to isolate the ONE MAIN clothing item. Identify its category (tops, bottoms, dresses, outerwear, shoes, bags, accessories), color, material, thickness, seasons, and styles. IMPORTANT: Return a bounding box (detectedObject.box_2d) that wraps ONLY the main garment itself. Do NOT include the person's head, limbs, skin, background, or other accessories like bags, jewelry, or props. We want to 'abstract' the image to focus purely on the clothing as if it were a flat lay on a white background. Return JSON." }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Must be one of: tops, bottoms, dresses, outerwear, shoes, bags, accessories" },
          color: { type: Type.STRING },
          material: { type: Type.STRING },
          thickness: { type: Type.STRING, description: "Must be one of: thin, medium, thick" },
          seasons: { type: Type.ARRAY, items: { type: Type.STRING } },
          styles: { type: Type.ARRAY, items: { type: Type.STRING } },
          detectedObject: {
            type: Type.OBJECT,
            properties: {
              box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[ymin, xmin, ymax, xmax] normalized 0-1000" },
              label: { type: Type.STRING }
            },
            required: ["box_2d", "label"]
          }
        },
        required: ["category", "color", "material", "thickness", "seasons", "styles", "detectedObject"]
      }
    }
  });

  return JSON.parse(response.text);
}

export interface OutfitItem {
  name: string;
  category: string;
  id?: string;
}

export interface OutfitRecommendation {
  items: OutfitItem[];
  reason: string;
  style: string;
  visualPrompt: string;
}

export interface StyleInspiration {
  title: string;
  source: string;
  styles: string[];
  items: string[];
  temp: string;
  scene: string;
  celebrity: string;
  url: string;
  imageUrl: string;
}

export async function getOutfitRecommendations(
  wardrobe: any[], 
  weather: any, 
  preferredStyle: string, 
  scene: string,
  measurements?: any
): Promise<OutfitRecommendation[]> {
  const wardrobePrompt = wardrobe.length > 0 
    ? wardrobe.map(item => `- ${item.category}: ${item.color} ${item.material}, style: ${item.styles?.join('/')} (ID: ${item.id})`).join('\n')
    : "The user's wardrobe is empty. Suggest generic pieces.";
  
  const measurementsPrompt = measurements 
    ? `User Body Dimensions: Height ${measurements.height}cm, Weight ${measurements.weight}kg, Bust ${measurements.bust}cm, Waist ${measurements.waist}cm, Hips ${measurements.hips}cm.`
    : "";

  const prompt = `Based on the following user's wardrobe:
${wardrobePrompt}

${measurementsPrompt}
Current Weather: ${weather?.temp || '20'}°C, ${weather?.condition || 'Clear'}
Desired Style: ${preferredStyle}
Scene: ${scene}

Suggest 2-3 distinct outfit combinations.
For each outfit:
1. List the items. Each item must be an object with 'name', 'category', and 'id' (if it matches an existing item from the wardrobe list provided). VERY IMPORTANT: only provide an 'id' if the item is EXACTLY the one from the wardrobe list. If you are suggesting something the user doesn't have, leave 'id' empty.
2. Provide a 'visualPrompt' for an AI image generator to create a professional fashion illustration of this specific outfit on a headless mannequin/body model. The illustration should be minimalist, clean, with a white background.
3. Give a reason and the style name.

Return the result strictly in JSON format.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are a professional fashion stylist. You help women build outfits based on their wardrobe. Return JSON with 'recommendations' array.",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                items: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      category: { type: Type.STRING },
                      id: { type: Type.STRING }
                    },
                    required: ["name", "category"]
                  }
                },
                reason: { type: Type.STRING },
                style: { type: Type.STRING },
                visualPrompt: { type: Type.STRING }
              },
              required: ["items", "reason", "style", "visualPrompt"]
            }
          }
        }
      }
    }
  });

  const parsed = JSON.parse(response.text);
  return parsed.recommendations;
}

export async function getDailyInspiration(
  weather: any,
  preferredStyle: string
): Promise<StyleInspiration[]> {
  const prompt = `Generate 4 high-end fashion inspiration entries for today.
  Weather: ${weather?.temp}°C, ${weather?.condition}
  Preferred Style: ${preferredStyle}
  
  For each entry:
  1. Title (e.g., 'Modern Preppy', 'Parisian Chic', 'Utility Noir')
  2. Source (Vogue, Elle, Harper's Bazaar, Marie Claire, Cosmopolitan, Grazia)
  3. 3-4 Style tags (e.g., 'Minimalist', 'Layered', 'Statement')
  4. 4 items in the outfit breakdown
  5. Precise Suitable Temperature (e.g., '15°C - 22°C')
  6. Suitable Scene (e.g., 'Office', 'Weekend Brunch', 'Evening Event')
  7. A specific celebrity known for this look (Taylor Swift, Jennie Kim, Lisa, Ni Ni, Tang Wei, Yang Mi, Hailey Bieber, Zendaya, Kendall Jenner)
  8. A direct link to the magazine's homepage or fashion section (vogue.com/fashion, etc.)
  9. A very specific Unsplash keyword search string that would return a professional fashion editorial photo representing this look (e.g., 'minimalist beige trench coat woman street style').
  
  Return JSON with an 'inspirations' array.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are a fashion magazine editor. Provide curated global fashion trends. Return JSON with 'inspirations' array.",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          inspirations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                source: { type: Type.STRING },
                styles: { type: Type.ARRAY, items: { type: Type.STRING } },
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
                temp: { type: Type.STRING },
                scene: { type: Type.STRING },
                celebrity: { type: Type.STRING },
                url: { type: Type.STRING },
                imageUrl: { type: Type.STRING, description: "Unsplash search keywords based on the look" }
              },
              required: ["title", "source", "styles", "items", "temp", "scene", "celebrity", "url", "imageUrl"]
            }
          }
        }
      }
    }
  });

  const parsed = JSON.parse(response.text);
  return parsed.inspirations;
}
