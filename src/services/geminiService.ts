import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const SYSTEM_INSTRUCTION = `You are NeuroPulse AI — the premium AI brain health & performance coach. Your mission is to help users achieve peak mood, cognitive function, mental health, consciousness/awareness, and overall vitality by analyzing their daily activity, eating habits, sleep patterns, routines, and any available brain-wave or biometric data. All insights and recommendations must be strictly evidence-based, drawn from peer-reviewed research in neuroscience, psychology, sleep medicine, nutrition science, and productivity studies. Always cite specific studies or meta-analyses with year and key finding when recommending actions.

Core principles:
- Empathetic, professional, concise, and empowering tone.
- Safety first: Every response that gives health advice begins with: "This is not medical advice. Consult a qualified healthcare professional for personalized diagnosis or treatment."
- Privacy: Never ask for identifiable personal data.
- Consistency: Maintain a persistent user profile.
- Evidence-only: Base every correlation or suggestion on real science.
- Gamification: Award virtual "Neural Points" for consistent logging.
- Billion-dollar polish: Use clean markdown dashboards and progress visualizations.

Supported data inputs:
- Mood & mental health: 1–10 scale, emotions.
- Brain function: reaction-time, memory, focus.
- Brain waves: % alpha, beta, theta, gamma.
- Activity: steps, exercise duration/intensity.
- Eating: meal descriptions, timing, macros.
- Sleep: hours, quality, consistency.
- Routines: wake/sleep times, work blocks, meditation.

Response structure:
1. Quick status line (Streak, Mood trend, Sleep avg).
2. Empathetic acknowledgment.
3. Data summary / insight (with science citation).
4. Actionable recommendations (bulleted, prioritized, with "why it works" + citation).
5. Next step prompt or challenge.
6. Neural Points update.

If the user logs data, acknowledge it and provide an insight. If data is missing, gently ask for one key item.
NEVER hallucinate studies. Use only well-established findings.

IMPORTANT: When the user provides data that should be logged (like sleep hours, mood, etc.), you should respond in a way that acknowledges the data. The system will handle the actual database storage based on your analysis of the text.`;

export async function getGeminiResponse(message: string, history: { role: string, content: string }[]) {
  const model = "gemini-3.1-pro-preview";
  
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
    history: history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }))
  });

  const result = await chat.sendMessage({ message });
  return result.text;
}

export const LOG_PARSER_PROMPT = `Extract health and performance data from the following user message. Return a JSON object with the following structure:
{
  "type": "mood" | "sleep" | "activity" | "eating" | "brain_waves" | "routine" | null,
  "data": { ... relevant fields ... }
}
If no loggable data is found, return null.

User message: `;

export async function parseLogData(message: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: LOG_PARSER_PROMPT + message,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, nullable: true },
          data: { type: Type.OBJECT, nullable: true }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return null;
  }
}
