import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Handle both /api/... and root relative paths
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasKey: !!process.env.GEMINI_API_KEY });
});

app.post("/api/analyze-clothing", async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel Environment Variables" });
    }
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", 
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: "Analyze this image to isolate the ONE MAIN clothing item. Identify its category (tops, bottoms, dresses, outerwear, shoes, bags, accessories), color, material, thickness, seasons, and styles. IMPORTANT: Return a bounding box (detectedObject.box_2d) that wraps ONLY the main garment itself. Return JSON." }
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
            styles: { type: Type.ARRAY, items: { type: Type.STRING } },
            detectedObject: {
              type: Type.OBJECT,
              properties: {
                box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                label: { type: Type.STRING }
              }
            }
          },
          required: ["category", "color", "material", "thickness", "seasons", "styles", "detectedObject"]
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Analysis Error:", err);
    let message = err.message || "Failed to analyze image";
    if (message.includes("API KEY NOT VALID") || message.includes("400")) {
      message = "Gemini API Key 校验失败。请在 Vercel 环境变量中检查 GEMINI_API_KEY 是否配置正确。";
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/outfit-recommendations", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel Environment Variables" });
    }
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a professional fashion stylist. Return JSON with 'recommendations' array.",
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
    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Outfit Error:", err);
    let message = err.message || "Failed to generate recommendations";
    if (message.includes("API KEY NOT VALID") || message.includes("400")) {
      message = "Gemini API Key 校验失败。请在 Vercel 环境变量中检查 GEMINI_API_KEY 是否配置正确。";
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/daily-inspiration", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel Environment Variables" });
    }
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a fashion magazine editor. Return JSON with 'inspirations' array.",
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
                  imageUrl: { type: Type.STRING }
                },
                required: ["title", "source", "styles", "items", "temp", "scene", "celebrity", "url", "imageUrl"]
              }
            }
          }
        }
      }
    });
    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Inspiration Error:", err);
    let message = err.message || "Failed to fetch inspiration";
    if (message.includes("API KEY NOT VALID") || message.includes("400")) {
      message = "Gemini API Key 校验失败。请在 Vercel 环境变量中检查 GEMINI_API_KEY 是否配置正确。";
    }
    res.status(500).json({ error: message });
  }
});

export default app;
