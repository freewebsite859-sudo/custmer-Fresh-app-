import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/suggest-times", async (req, res) => {
    const { appointmentHistory } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ suggestions: "Suggested times: 10:00 AM, 2:30 PM, 6:00 PM (Popular peak booking hours)." });
    }

    try {
      const prompt = `Analyze this user's appointment history and suggest 3 optimal times for a next appointment. History: ${JSON.stringify(appointmentHistory)}`;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ suggestions: response.text || "Suggested times: 10:00 AM, 2:30 PM, 6:00 PM." });
    } catch (error: any) {
      console.warn('Gemini API notice (rate limit or connection):', error?.message || error);
      res.json({ suggestions: "Suggested optimal times: 10:00 AM, 2:30 PM, 6:00 PM (Based on peak salon slots)." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
