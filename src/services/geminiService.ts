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
  const response = await fetch('/api/analyze-clothing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to analyze clothing');
  }
  
  return response.json();
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

  const response = await fetch('/api/outfit-recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get recommendations');
  }

  const data = await response.json();
  return data.recommendations;
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

  const response = await fetch('/api/daily-inspiration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch inspiration');
  }

  const data = await response.json();
  return data.inspirations;
}
