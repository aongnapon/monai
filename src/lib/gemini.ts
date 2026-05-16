import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GEMINI API CONFIGURATION
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!API_KEY || API_KEY.trim().length === 0) {
  throw new Error(
    "CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is undefined. " +
    "Ensure it is defined in your .env file."
  );
}

const GEMINI_MODEL = "gemini-3.1-flash-lite";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

export interface InvestmentAnalysis {
  assetName: string;
  sentiment: "bullish" | "bearish" | "neutral";
  probability_score: number;
  resistance_levels: string[];
  support_levels: string[];
  detailed_analysis: string;
  key_price_target: string;
  chartData?: Array<{
    timestamp: number;
    value: number;
  }>;
}

/**
 * Analyzes a financial graph using Gemini 3.1 Flash-Lite as a Senior Quant Analyst.
 */
export async function analyzeInvestmentGraph(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<InvestmentAnalysis> {
  const prompt = `
You are a Senior Quant Analyst at a top-tier investment bank. 
Analyze the provided financial chart with institutional-grade precision. 
Identify technical patterns (e.g., Cup and Handle, Head and Shoulders, RSI Divergence), support/resistance zones, and price targets.

Return ONLY a valid raw JSON object. Do NOT include markdown code blocks or any other text.

Required JSON Structure:
{
  "asset_name": "Asset Name (with Currency Symbol if visible, e.g. ₩ or $)",
  "sentiment": "bullish" | "bearish" | "neutral",
  "probability_score": 75,
  "resistance_levels": ["Price 1", "Price 2"],
  "support_levels": ["Price 1", "Price 2"],
  "detailed_analysis": "Institutional-grade markdown analysis mentioning specific patterns and price points.",
  "key_price_target": "Main target price"
}

Be specific. Do not give generic advice. Mention the exact levels seen in the image.
`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const response = await result.response;
    let rawText = response.text().trim();

    // Remove markdown code blocks if present
    let sanitizedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(sanitizedText);
      return {
        assetName: parsed.asset_name,
        sentiment: parsed.sentiment,
        probability_score: parsed.probability_score,
        resistance_levels: parsed.resistance_levels,
        support_levels: parsed.support_levels,
        detailed_analysis: parsed.detailed_analysis,
        key_price_target: parsed.key_price_target,
        chartData: parsed.chartData || []
      };
    } catch (parseError) {
      console.error("[Gemini] Parse Error:", sanitizedText);
      throw new Error("Failed to parse AI response as JSON.");
    }
  } catch (error: any) {
    console.error("[Gemini] API Error:", error);
    throw new Error(error?.message || "AI Analysis failed.");
  }
}
