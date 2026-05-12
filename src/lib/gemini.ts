const GEMINI_API_KEY = 'AIzaSyBbLQd-ZRTno030TpXzMUQMhvMc4cIwJeknpx';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

type GraphImageData =
  | string
  | {
      base64: string;
      mimeType?: string;
      notes?: string;
    };

function parseImagePayload(imageData: GraphImageData) {
  if (typeof imageData === 'string') {
    const dataUriMatch = imageData.match(/^data:(.+);base64,(.+)$/);

    if (dataUriMatch) {
      return {
        mimeType: dataUriMatch[1],
        data: dataUriMatch[2],
        notes: undefined,
      };
    }

    return {
      mimeType: 'image/png',
      data: imageData,
      notes: undefined,
    };
  }

  return {
    mimeType: imageData.mimeType ?? 'image/png',
    data: imageData.base64,
    notes: imageData.notes,
  };
}

function buildPrompt(extraNotes?: string) {
  const contextLine = extraNotes
    ? `User context for the chart: ${extraNotes}`
    : 'No additional user context provided.';

  return [
    'You are Monai AI, an investment education assistant.',
    'Analyze the uploaded chart image which may be stock, crypto, or commodity data.',
    'Focus on educational guidance, not financial guarantees.',
    'Return response in this structure:',
    '1) Market Type Guess',
    '2) Trend Summary',
    '3) Key Levels (support/resistance)',
    '4) Volatility & Risk Notes',
    '5) Beginner-Friendly Learning Tip',
    contextLine,
  ].join('\n');
}

export async function analyzeInvestmentGraph(imageData: GraphImageData) {
  const payload = parseImagePayload(imageData);

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildPrompt(payload.notes) },
            {
              inline_data: {
                mime_type: payload.mimeType,
                data: payload.data,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const analysisText = result.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n').trim();

  if (!analysisText) {
    throw new Error('Gemini returned an empty analysis.');
  }

  return analysisText;
}
