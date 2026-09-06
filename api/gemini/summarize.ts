import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
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
    const { text, title, messages } = body;

    let contentToSummarize = text || "";
    if (!contentToSummarize && Array.isArray(messages) && messages.length > 0) {
      contentToSummarize = messages
        .map((m: any) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n\n");
    }

    if (!contentToSummarize) {
      return res.status(400).json({ error: "Content is required for summarization." });
    }

    if (contentToSummarize.length > 4000) {
      contentToSummarize = contentToSummarize.substring(0, 4000);
    }

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are an executive summarization engine for TJ Secure AI Journal by JindalTechnik.
Generate a clean, structured summary of the user's journal entry in Markdown.
Format output:
- **Core Summary**: 2-3 concise sentences.
- **Key Takeaways & Insights**: 3 bullet points.
- **Suggested Action Item / Reflection Prompt**: 1 inspiring question.`;

    const prompt = `Summarize this journal entry titled "${title || "Journal Reflection"}":\n\n${contentToSummarize}`;
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { systemInstruction, temperature: 0.7 },
        });

        if (response && response.text) {
          return res.status(200).json({
            summary: response.text,
            modelUsed: model,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (mErr: any) {
        console.warn(`[Vercel API] Summarize model ${model} failed:`, mErr?.message || mErr);
      }
    }

    return res.status(500).json({ error: "All Gemini summarization models failed." });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
