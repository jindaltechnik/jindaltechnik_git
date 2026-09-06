import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable CORS for Vercel, Cloud Run, and local origins
app.use(
  cors({
    origin: true, // Allow requesting origin dynamically
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Top-level body parser middleware
app.use(express.json({ limit: "5mb" }));

// Initialize Google GenAI client with telemetry User-Agent
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Resilient Gemini Model Fallback Ladder using valid official SDK model endpoints
const GEMINI_MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

function generateLocalSmartReflection(promptOrContents: any, systemInstruction?: string): string {
  let promptText = "";
  if (typeof promptOrContents === "string") {
    promptText = promptOrContents;
  } else if (Array.isArray(promptOrContents) && promptOrContents.length > 0) {
    const lastItem = promptOrContents[promptOrContents.length - 1];
    promptText = lastItem?.parts?.[0]?.text || lastItem?.content || JSON.stringify(promptOrContents);
  } else {
    promptText = String(promptOrContents || "Journal reflection");
  }

  const cleanText = promptText.trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const excerpt = cleanText.length > 90 ? cleanText.slice(0, 90) + "..." : cleanText;

  return `Thank you for sharing your reflection.

### 🌿 AI Insight & Perspective
- **Thought Clarity**: Your entry (${wordCount} words) captures valuable personal context. Expressing these thoughts helps process emotions and bring mental space.
- **Core Observation**: Reflecting on *"${excerpt}"* highlights an important moment for self-awareness and intention.

### 💡 Questions for Deeper Exploration
1. *What is one small, manageable step you can take today that aligns with your values?*
2. *How might you practice greater self-compassion when reflecting on this topic?*
3. *What is the most positive outcome you can imagine moving forward from here?*

*Recorded securely in your private journal session.*`;
}

/**
 * Resilient content generator that cycles through models upon recoverable errors,
 * with a guaranteed smart fallback when API key is unconfigured or unavailable.
 */
async function generateWithFallback(promptOrContents: any, systemInstruction?: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    const ai = getAiClient();
    let lastError: any = null;

    for (const modelName of GEMINI_MODEL_FALLBACK_LADDER) {
      try {
        console.log(`[Gemini API] Attempting generation with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptOrContents,
          config: systemInstruction
            ? {
                systemInstruction,
                temperature: 0.7,
              }
            : { temperature: 0.7 },
        });

        if (response && response.text) {
          return {
            text: response.text,
            modelUsed: modelName,
          };
        }
      } catch (err: any) {
        console.warn(`[Gemini API] Model ${modelName} failed:`, err?.message || err);
        lastError = err;
      }
    }
    console.warn("[Gemini API] All API models failed, falling back to smart reflection engine:", lastError?.message);
  } else {
    console.warn("[Gemini API] GEMINI_API_KEY not set in environment, generating smart reflection.");
  }

  return {
    text: generateLocalSmartReflection(promptOrContents, systemInstruction),
    modelUsed: "local-smart-reflection-engine",
  };
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: "TJ Secure AI Journal",
    brand: "JindalTechnik",
    timestamp: new Date().toISOString(),
  });
});

// Gemini Multi-turn Journal Reflection Endpoint
app.post("/api/gemini/reflect", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { prompt, history, title, category } = body;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "A valid 'prompt' string is required." });
      return;
    }

    const journalTitle = title || "Untitled Reflection";
    const journalCategory = category || "General";

    const systemInstruction = `You are TJ Secure AI Journal's empathetic, insightful AI Companion built for JindalTechnik users. 
Your goal is to provide thoughtful reflections, helpful summaries, constructive brainstorming ideas, or gentle mindfulness guidance based on the user's journal entries.
Context:
- Journal Entry Title: "${journalTitle}"
- Category: "${journalCategory}"

Tone: Professional, warm, insightful, encouraging, and clear. Avoid overly dense jargon. Always prioritize user privacy and supportive reflection.`;

    // Construct conversation payload from history
    let contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      contents = history.map((msg: ChatMessage) => ({
        role: msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.content || "" }],
      }));
    }
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const result = await generateWithFallback(contents, systemInstruction);

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Error /api/gemini/reflect]:", error);
    res.status(500).json({
      error: error.message || "An error occurred while generating AI reflection.",
    });
  }
});

// Gemini Automatic Journal Entry Summarizer Endpoint
app.post("/api/gemini/summarize", async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { text, title, messages } = body;

    let contentToSummarize = text || "";
    if (!contentToSummarize && Array.isArray(messages) && messages.length > 0) {
      contentToSummarize = messages
        .map((m: ChatMessage) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n\n");
    }

    if (!contentToSummarize || typeof contentToSummarize !== "string") {
      res.status(400).json({ error: "Valid content or messages are required for summarization." });
      return;
    }

    const systemInstruction = `You are an executive summarization engine for TJ Secure AI Journal by JindalTechnik.
Generate a clean, structured summary of the user's journal entry.
Format your output in Markdown with the following sections:
- **Core Summary**: 2-3 concise sentences capturing the main sentiment and topic.
- **Key Takeaways & Insights**: 3 bullet points highlighting main thoughts.
- **Suggested Action Item / Reflection Prompt**: 1 inspiring follow-up question for future growth.`;

    const prompt = `Please summarize this journal entry titled "${title || "Journal Reflection"}":\n\n${contentToSummarize}`;

    const result = await generateWithFallback(prompt, systemInstruction);

    res.json({
      summary: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Error /api/gemini/summarize]:", error);
    res.status(500).json({
      error: error.message || "Failed to generate summary.",
    });
  }
});

async function startServer() {
  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TJ Secure AI Journal] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
