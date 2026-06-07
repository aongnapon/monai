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

// Using Gemini 1.5 Flash for high-speed, structural JSON output
const GEMINI_MODEL = "gemini-3.1-flash-lite";

const genAI = new GoogleGenerativeAI(API_KEY);

// Force structural response via generationConfig
const model = genAI.getGenerativeModel({ 
  model: GEMINI_MODEL,
  generationConfig: { 
    responseMimeType: "application/json" 
  }
});

/**
 * UI INTERFACES FOR FIRESTORE PIPELINE
 */
export interface PresentationSlide {
  slideOrder: number;
  slideHeading: string;
  mascotExpression: 'scan_active' | 'thinking' | 'wave' | 'alert';
  bulletPointsList: string[];
}

export interface ScanResultDoc {
  scanCategory: 'fed' | 'bank' | 'crypto';
  createdAt: string;
  status: 'COMPLETED';
  dashboardData: {
    trend: 'Bullish' | 'Bearish' | 'Sideways';
    confidenceScore: number;
    sentimentLevel: number;
  };
  presentationSlides: PresentationSlide[];
}

/**
 * Analyzes raw chart context and structures results for the Firestore pipeline.
 * Returns sequential PowerPoint-style slides optimized for mobile UI.
 */
export async function analyzeMarketScan(
  category: 'fed' | 'bank' | 'crypto',
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<ScanResultDoc> {
  const prompt = `Analyze the provided market chart context for the [${category.toUpperCase()}] scan channel.
You are the primary financial analysis engine for a premium mobile intelligence application.

CRITICAL INSTRUCTIONS:
1. Break down findings into EXACTLY 3 sequential presentation slides with distinct logical intents:
   - Slide 1: "Market Structure" (Focus on Current Price Action, Support & Resistance levels with exact metrics if visible, or structural zones).
   - Slide 2: "Strategic Outlook" (Focus on Target Levels for Short-Term, Mid-Term, and Long-Term scenarios, plus scenario probability percentage).
   - Slide 3: "Catalysts & Risks" (Focus on immediate trigger events, momentum signals, and key risk threats).

2. Every slide MUST contain a "bulletPointsList" with EXACTLY 3 lines following a key-value token structure so the UI can parse metrics dynamically:
   - For Slide 1 (Market Structure), formatting must include: "Resistance: [Value]", "Support: [Value]", and a summary.
   - For Slide 2 (Strategic Outlook), formatting must include: "Targets: [Short] | [Mid] | [Long]", "Probability: [XX%]", and a strategic recommendation.
   - For Slide 3 (Catalysts & Risks), formatting must break down distinct risk or trigger headlines.

3. Output exclusively a raw, valid JSON object matching the schema below.
4. Absolutely NO markdown code blocks (json) and NO conversational prose.

JSON Schema Blueprint:
{
  "scanCategory": "${category}",
  "createdAt": "${new Date().toISOString()}",
  "status": "COMPLETED",
  "dashboardData": {
    "trend": "Bullish" | "Bearish" | "Sideways",
    "confidenceScore": number,
    "sentimentLevel": number
  },
  "presentationSlides": [
    {
      "slideOrder": 1,
      "slideHeading": "Market Structure",
      "mascotExpression": "thinking",
      "bulletPointsList": [
        "Resistance: 72,100 THB zone showing selling pressure.",
        "Support: 61,900 THB floor defending current range.",
        "Trend Analysis: Price action is forming a horizontal accumulation pattern."
      ]
    },
    {
      "slideOrder": 2,
      "slideHeading": "Strategic Outlook",
      "mascotExpression": "scan_active",
      "bulletPointsList": [
        "Targets: Short: 73K-75K | Mid: 76K-78K | Long: 80K-85K",
        "Probability: 75% Chance of breakout validation.",
        "Strategy: Accumulate near local support ranges with tight invalidation."
      ]
    },
    {
      "slideOrder": 3,
      "slideHeading": "Catalysts & Risks",
      "mascotExpression": "alert",
      "bulletPointsList": [
        "Trigger: Increased global demand for gold as inflation defense.",
        "Risk Factor: Strong US Dollar index movements capping short-term gains.",
        "Macro Catalyst: Geopolitical tensions driving safe haven premium flows."
      ]
    }
  ]
}`;

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
    let rawJson = response.text().trim();

    if (rawJson.startsWith("```")) {
      rawJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    return JSON.parse(rawJson) as ScanResultDoc;
  } catch (error: any) {
    console.error("[Gemini Engine] Analysis Error:", error);
    throw new Error("Market analysis engine failed to generate structured response.");
  }
}

/**
 * FIRESTORE-COMPATIBLE AND FINELO-COMPATIBLE RESPONSE SCHEMA
 */
export interface MarketAnalysisResult {
  assetName: string;
  currentPrice: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  actionScore: number; // 1 to 4 for visual appraisal gauge
  trend: string;
  volatility: string;
  resistance: string;
  support: string;
  probability: string; // e.g. "75%"
  summary: string;
  shortTermTarget: string;
  midTermTarget: string;
  longTermTarget: string;
  triggers: string[];
  risks: string[];
}

/**
 * Helper to convert local file URI to base64 using standard Fetch and FileReader
 */
async function uriToBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    const parts = uri.split(',');
    return parts[1] || parts[0];
  }
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Analyzes market chart and returns a premium, PowerPoint-style Finelo-compatible payload.
 */
export async function analyzeMarketChart(
  imageUri: string,
  engine: string
): Promise<MarketAnalysisResult> {
  // Resolve engine parameter to expected macro | whale | crypto activeEngine values
  const engineMap: Record<string, 'macro' | 'whale' | 'crypto'> = {
    fed: 'macro',
    bank: 'whale',
    crypto: 'crypto',
    macro: 'macro',
    whale: 'whale',
  };
  const activeEngine = engineMap[engine] || 'crypto';

  const base64Image = await uriToBase64(imageUri);
  const mimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  const prompt = `Analyze the provided market chart image for the [${activeEngine.toUpperCase()}] engine.
You are the primary financial analysis engine for a premium mobile intelligence application, Finelo.

CRITICAL INSTRUCTIONS:
1. Extract or determine:
   - "assetName": Name of the asset shown in the chart (e.g., "Gold Bullion 96.5% purity", "Bitcoin (BTC)", "Nasdaq 100", or a generic asset name if not clear).
   - "currentPrice": Last traded price visible (e.g. "฿72,100.00", "$68,540.00", "₩1,200.00" or similar). Include the currency symbol.
   - "action": Recommended action ('BUY', 'SELL', 'HOLD') based on technical indicators.
   - "actionScore": An integer from 1 to 4 representing recommended action strength (1 = weak, 4 = strong).
   - "trend": Short description of the trend (e.g., "Bullish", "Bearish", "Sideways").
   - "volatility": Assessment of volatility (e.g., "Low", "Medium", "High").
   - "resistance": Calculated resistance ceiling price metric (e.g. "฿72,100" or "$68,500").
   - "support": Calculated support floor price metric (e.g. "฿61,900" or "$62,000").
   - "probability": Scenario probability percentage string (e.g., "75%", "82%").
   - "summary": A premium, detailed paragraph summarizing the technical analysis, chart patterns, and outlook.
   - "shortTermTarget": Price target for short-term horizon (e.g. "฿72,500.00").
   - "midTermTarget": Price target for mid-term horizon (e.g. "฿74,000.00").
   - "longTermTarget": Price target for long-term horizon (e.g. "฿76,000.00").
   - "triggers": EXACTLY 3 key upcoming trigger events/catalysts in an array of strings.
   - "risks": EXACTLY 3 key systemic risks/threats in an array of strings.

2. Output exclusively a raw, valid JSON object matching the schema. Do not output markdown code blocks. Do not include conversational prose.

JSON Schema:
{
  "assetName": string,
  "currentPrice": string,
  "action": "BUY" | "SELL" | "HOLD",
  "actionScore": number,
  "trend": string,
  "volatility": string,
  "resistance": string,
  "support": string,
  "probability": string,
  "summary": string,
  "shortTermTarget": string,
  "midTermTarget": string,
  "longTermTarget": string,
  "triggers": [string, string, string],
  "risks": [string, string, string]
}`;

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
    let rawJson = response.text().trim();

    if (rawJson.startsWith("```")) {
      rawJson = rawJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    return JSON.parse(rawJson) as MarketAnalysisResult;
  } catch (error: any) {
    console.error("[Gemini Engine] Analysis Error:", error);
    throw new Error("Market analysis engine failed to generate structured response.");
  }
}

