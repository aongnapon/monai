import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GEMINI API CONFIGURATION
 * Loads from .env EXPO_PUBLIC_GEMINI_API_KEY
 */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Explicit debug logging for environment variable injection
console.log("[Gemini Audit] API Key defined:", !!API_KEY);
console.log("[Gemini Audit] API Key length:", API_KEY ? API_KEY.length : 0);

if (!API_KEY || API_KEY.trim().length === 0) {
  throw new Error(
    "CRITICAL: EXPO_PUBLIC_GEMINI_API_KEY is undefined or empty. " +
    "Ensure it is defined in your .env file and you have restarted the Metro bundler."
  );
}

// Model Requirement: ONLY gemini-3.1-flash-lite
const GEMINI_MODEL = "gemini-3.1-flash-lite";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

export interface InvestmentAnalysis {
  analysisText: string;
  trend: "bullish" | "bearish" | "neutral";
  assetName: string;
  chartData: Array<{
    timestamp: number;
    value: number;
  }>;
}

/**
 * Analyzes a financial graph using Gemini 3.1 Flash-Lite.
 * Returns a strictly typed JSON object.
 */
export async function analyzeInvestmentGraph(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<InvestmentAnalysis> {
  // Strict prompt engineering to force raw JSON output
  const prompt = `
Return ONLY a valid raw JSON object. 
Do NOT include markdown code blocks. 
Do NOT include any explanations, preambles, or postambles. 
Do NOT use triple backticks.

Expected Format:
{
  "analysisText": "Expert markdown summary",
  "trend": "bullish" | "bearish" | "neutral",
  "assetName": "Asset Name",
  "chartData": [
    {"timestamp": 1715644800000, "value": 100},
    ...
  ]
}

Analyze this financial graph image and provide the insights above.
Return ONLY raw JSON.
Do not use markdown.
Do not use triple backticks.
Do not explain anything.
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

    /**
     * STABILITY: Robust JSON Parsing
     * Handles cases where Gemini ignores instructions and returns Markdown.
     */
    let sanitizedText = rawText;
    
    // Remove triple backticks and optional 'json' label
    if (sanitizedText.includes("```")) {
      // Extract content between backticks if they exist
      const match = sanitizedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        sanitizedText = match[1];
      } else {
        // Fallback: just strip the markers
        sanitizedText = sanitizedText.replace(/```json/g, "").replace(/```/g, "");
      }
    }
    
    sanitizedText = sanitizedText.trim();

    if (!sanitizedText) {
      throw new Error("Gemini returned an empty response.");
    }

    try {
      const parsed = JSON.parse(sanitizedText);
      
      // Basic validation of required fields
      if (!parsed.analysisText || !parsed.trend || !parsed.assetName) {
        throw new Error("Missing required fields in Gemini JSON response.");
      }

      return parsed as InvestmentAnalysis;
    } catch (parseError) {
      console.error("[Gemini] Critical: Failed to parse AI response as JSON.");
      console.error("[Gemini] Raw AI Output:", rawText);
      console.error("[Gemini] Sanitized Text:", sanitizedText);
      throw new Error(`Invalid JSON output from model: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error: any) {
    console.error("[Gemini] Analysis Error:", error);
    
    // Handle 403 "Unregistered Caller" or other API errors
    if (error?.message?.includes("403") || error?.message?.includes("Unregistered")) {
      throw new Error("Gemini API Error (403): Unregistered Caller. Check your API key and project permissions.");
    }

    throw new Error(error?.message || "An unexpected error occurred during Gemini analysis.");
  }
}
