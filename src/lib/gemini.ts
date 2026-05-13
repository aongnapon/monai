import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * MONAI GEMINI SERVICE
 * Using Gemini 3.1 Flash-Lite for fast, low-latency financial graph reasoning.
 */

const GEMINI_API_KEY = 'AIzaSyBbLQd-ZRTno030TpXzMUQMhvMc4cIwJek';

// Model ID updated to the Generally Available version of 3.1 Flash-Lite
const GEMINI_MODEL = 'gemini-3.1-flash-lite'; 

const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiVisionModel = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

/**
 * Analyzes a base64 encoded image of a financial graph.
 */
export async function analyzeInvestmentGraph(base64Image: string, mimeType = 'image/jpeg') {
  const prompt = `
    Analyze this financial graph for a fintech app named Monai. 
    Provide a professional, concise summary including:
    1. Trend Analysis (Is it bullish, bearish, or sideways?)
    2. Key Support/Resistance levels visible.
    3. A brief recommendation for a sophisticated investor.
    Keep the tone luxury and minimal.
  `;

  try {
    const result = await geminiVisionModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text().trim();

    if (!text) {
      throw new Error('Gemini returned an empty analysis.');
    }

    return text;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(`Analysis failed: ${error.message || 'Unknown Error'}`);
  }
}