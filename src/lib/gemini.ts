import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyBbLQd-ZRTno030TpXzMUQMhvMc4cIwJeknpx';
const GEMINI_MODEL = 'gemini-1.5-pro';

const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiVisionModel = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });

export async function analyzeInvestmentGraph(base64Image: string, mimeType = 'image/jpeg') {
  const prompt = [
    'You are Monai AI, an investment learning coach.',
    'Analyze this chart image (stock, crypto, or commodity).',
    'Keep the response educational and beginner-friendly.',
    'Provide: market type, trend direction, key support/resistance levels, risk notes, and one learning tip.',
  ].join(' ');

  const result = await geminiVisionModel.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
  ]);

  const text = result.response.text().trim();

  if (!text) {
    throw new Error('Gemini returned an empty analysis.');
  }

  return text;
}
