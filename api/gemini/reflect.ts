import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // CORS headers for Vercel functions
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  try {
    const body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { prompt, history, title, category } = body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "A valid prompt is required." });
    }

    if (prompt.length > 4000) {
      return res.status(400).json({ error: "Prompt exceeds the maximum allowed limit of 4,000 characters." });
    }

    if (!apiKey) {
      console.warn("[Vercel /api/gemini/reflect] GEMINI_API_KEY missing");
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are TJ Secure AI Journal's empathetic, insightful AI Companion built for JindalTechnik users.
Provide thoughtful reflections, constructive summaries, and supportive dialogue.
Journal Title: "${title || "Journal Reflection"}"
Category: "${category || "General"}"`;

    let contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      contents = history.map((m: any) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      }));
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const model of models) {
      try {
        console.log(`[Vercel API] Attempting Gemini model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        if (response && response.text) {
          return res.status(200).json({
            reply: response.text,
            modelUsed: model,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (mErr: any) {
        console.warn(`[Vercel API] Model ${model} failed:`, mErr?.message || mErr);
        lastError = mErr;
      }
    }

    return res.status(500).json({
      error: lastError?.message || "All Gemini AI models failed to respond.",
    });
  } catch (err: any) {
    console.error("[Vercel API Exception]:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
