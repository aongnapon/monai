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
  const prompt = `
Analyze the provided market chart context for the [${category.toUpperCase()}] scan channel.
You are the primary financial analysis engine for a mobile application.

CRITICAL INSTRUCTIONS:
1. Break down findings into sequential, PowerPoint-style presentation cards.
2. Every slide MUST contain a "bulletPointsList" with EXACTLY 3 numbered lines (1., 2., 3.).
3. Each bullet must be a single, short sentence optimized for mobile UI cards.
4. Output exclusively a raw, valid JSON object matching the schema below.
5. Absolutely NO markdown code blocks (\`\`\`json) and NO conversational prose.

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
      "slideOrder": number,
      "slideHeading": "string",
      "mascotExpression": "scan_active" | "thinking" | "wave" | "alert",
      "bulletPointsList": [
        "1. First short, single-sentence discovery item.",
        "2. Second short, single-sentence immediate technical catalyst.",
        "3. Third short, single-sentence critical macro risk."
      ]
    }
  ]
}
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
