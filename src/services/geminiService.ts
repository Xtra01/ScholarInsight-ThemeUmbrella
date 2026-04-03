import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

export interface ResearcherInput {
  name: string;
  title?: string;
  university?: string;
  linkedin?: string;
}

export interface ResearcherData extends ResearcherInput {
  researchAreas: string[];
  citationsAll: number;
  hIndexAll: number;
  i10IndexAll: number;
  citationsSince2021: number;
  hIndexSince2021: number;
  i10IndexSince2021: number;
  scholarUrl?: string;
  status: 'pending' | 'searching' | 'completed' | 'error';
  error?: string;
}

export interface ThemeUmbrella {
  theme: string;
  description: string;
  relatedAreas: string[];
  count: number;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function searchResearcher(input: ResearcherInput): Promise<Partial<ResearcherData>> {
  const prompt = `Search for the Google Scholar profile of this researcher:
Name: ${input.name}
Title/Dept: ${input.title || 'N/A'}
University: ${input.university || 'N/A'}

Extract the following information exactly:
1. The URL of their Google Scholar profile (CRITICAL: Ensure this is the correct profile and the link is active/not 404).
2. Research Areas (as a list)
3. Citations (All Time)
4. h-index (All Time)
5. i10-index (All Time)
6. Citations (Since 2021)
7. h-index (Since 2021)
8. i10-index (Since 2021)

Return the data in JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scholarUrl: { type: Type.STRING },
            researchAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            citationsAll: { type: Type.NUMBER },
            hIndexAll: { type: Type.NUMBER },
            i10IndexAll: { type: Type.NUMBER },
            citationsSince2021: { type: Type.NUMBER },
            hIndexSince2021: { type: Type.NUMBER },
            i10IndexSince2021: { type: Type.NUMBER },
          },
          required: ["scholarUrl", "researchAreas", "citationsAll", "hIndexAll", "i10IndexAll", "citationsSince2021", "hIndexSince2021", "i10IndexSince2021"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);
    return {
      researchAreas: data.researchAreas || [],
      citationsAll: Number(data.citationsAll) || 0,
      hIndexAll: Number(data.hIndexAll) || 0,
      i10IndexAll: Number(data.i10IndexAll) || 0,
      citationsSince2021: Number(data.citationsSince2021) || 0,
      hIndexSince2021: Number(data.hIndexSince2021) || 0,
      i10IndexSince2021: Number(data.i10IndexSince2021) || 0,
      scholarUrl: data.scholarUrl,
    };
  } catch (error) {
    console.error("Error searching researcher:", error);
    throw error;
  }
}

export async function analyzeThemes(researchAreas: string[]): Promise<ThemeUmbrella[]> {
  const prompt = `You are an academic event planner. Analyze the following list of research areas and group them into 3-6 broad "Theme Umbrellas" (Main Topics) suitable for a high-level academic conference.

For each theme, provide:
- theme: A catchy and professional name for the theme.
- description: A 1-2 sentence description of why this theme is important and what it covers.
- relatedAreas: A list of specific research areas from the input that fall under this theme.
- count: The number of times research areas related to this theme appeared in the input (or a relative weight).

Research Areas to analyze:
${researchAreas.join(", ")}

Return the data as a JSON array of objects.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              theme: { type: Type.STRING },
              description: { type: Type.STRING },
              relatedAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
              count: { type: Type.NUMBER },
            },
            required: ["theme", "description", "relatedAreas", "count"]
          }
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error analyzing themes:", error);
    return [];
  }
}
