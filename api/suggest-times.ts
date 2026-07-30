// Vercel Serverless Function for POST /api/suggest-times.
// Mirrors the handler in server.ts exactly (same fallbacks) so local dev
// (server.ts via tsx) and Vercel production behave identically.
// server.ts stays untouched for Node-host deployments (npm start).
import { GoogleGenAI } from "@google/genai";

const NO_KEY_FALLBACK =
  "Suggested times: 10:00 AM, 2:30 PM, 6:00 PM (Popular peak booking hours).";
const EMPTY_FALLBACK = "Suggested times: 10:00 AM, 2:30 PM, 6:00 PM.";
const ERROR_FALLBACK =
  "Suggested optimal times: 10:00 AM, 2:30 PM, 6:00 PM (Based on peak salon slots).";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { appointmentHistory } = req.body ?? {};

  if (!process.env.GEMINI_API_KEY) {
    res.status(200).json({ suggestions: NO_KEY_FALLBACK });
    return;
  }

  try {
    const prompt = `Analyze this user's appointment history and suggest 3 optimal times for a next appointment. History: ${JSON.stringify(appointmentHistory)}`;

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.status(200).json({ suggestions: response.text || EMPTY_FALLBACK });
  } catch (error: any) {
    console.warn(
      "Gemini API notice (rate limit or connection):",
      error?.message || error,
    );
    res.status(200).json({ suggestions: ERROR_FALLBACK });
  }
}
