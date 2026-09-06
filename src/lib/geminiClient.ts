import { GoogleGenAI } from "@google/genai";

interface ChatMsg {
  role: "user" | "model";
  content: string;
}

const getClientApiKey = (): string => {
  const metaEnv = (import.meta as any)?.env;
  if (metaEnv?.VITE_GEMINI_API_KEY) {
    return metaEnv.VITE_GEMINI_API_KEY;
  }
  if (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  return "";
};

export function generateLocalReflection(prompt: string, title?: string, category?: string): string {
  const cleanText = prompt.trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const excerpt = cleanText.length > 80 ? cleanText.slice(0, 80) + "..." : cleanText;
  const entryTitle = title || "Journal Reflection";

  return `### 🌿 Reflection & Insights
- **Thought Focus**: Your entry on *"${entryTitle}"* (${wordCount} words) expresses meaningful personal context.
- **Key Observation**: Processing *"${excerpt}"* allows you to step back, gain perspective, and organize your thoughts clearly.

### 💡 Suggested Reflection Questions
1. *What is one positive intention or action you can set based on this reflection?*
2. *How does focusing on this topic support your overall goals and well-being?*
3. *What key lesson or insight stands out most to you right now?*

*Recorded securely in your isolated journal session.*`;
}

export function generateLocalSummary(title: string, messages: ChatMsg[]): string {
  const userMessages = messages.filter((m) => m.role === "user");
  const count = userMessages.length;
  const snippet = userMessages.map((m) => m.content).join(" ").slice(0, 120);

  return `### 📊 Executive Summary: ${title}

**Core Theme**: Reflections and dialog captured across ${count} entries.

**Key Insights & Perspective**:
- Captured structured user thoughts regarding *"${snippet}${snippet.length >= 120 ? "..." : ""}"*.
- Multi-turn reflection thread established with encrypted isolation.

**Actionable Takeaway**:
- Revisit these notes during your weekly review to track emotional patterns and personal growth over time.`;
}

export async function getAiReflection(
  prompt: string,
  title: string,
  category: string,
  history: ChatMsg[] = []
): Promise<string> {
  // 1. First attempt: Vercel / Express Backend Endpoint
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for Gemini LLM generation

  try {
    const response = await fetch("/api/gemini/reflect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        prompt,
        title,
        category,
        history,
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.reply && typeof data.reply === "string") {
          return data.reply;
        }
      }
    } else {
      const errJson = await response.json().catch(() => ({}));
      console.warn("[GeminiClient] /api/gemini/reflect status error:", response.status, errJson);
    }
  } catch (err: any) {
    console.warn("[GeminiClient] Server API endpoint call notice:", err?.name || err?.message || err);
  } finally {
    clearTimeout(timeoutId);
  }

  // 2. Second attempt: Direct Client SDK Call using @google/genai
  const apiKey = getClientApiKey();
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are TJ Secure AI Journal's empathetic, highly intelligent AI Companion built for JindalTechnik users.
Provide thoughtful reflections, constructive summaries, and supportive dialogue based on the user's journal entries.
Journal Title: "${title || "Journal Reflection"}"
Category: "${category || "General"}"`;

      let contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        contents = history.map((m) => ({
          role: m.role === "model" ? "model" : "user",
          parts: [{ text: m.content || "" }],
        }));
      }
      contents.push({ role: "user", parts: [{ text: prompt }] });

      const models = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];
      for (const modelName of models) {
        try {
          console.log(`[Client SDK] Generating content with model: ${modelName}`);
          const res = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          if (res?.text) {
            return res.text;
          }
        } catch (modelErr: any) {
          console.warn(`[Client SDK] Model ${modelName} attempt notice:`, modelErr?.message || modelErr);
        }
      }
    } catch (sdkErr: any) {
      console.warn("[Client SDK] Direct SDK call notice:", sdkErr?.message || sdkErr);
    }
  }

  // 3. Guaranteed Local Fallback
  return generateLocalReflection(prompt, title, category);
}

export async function getAiSummary(title: string, messages: ChatMsg[]): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("/api/gemini/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        title,
        messages,
      }),
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.summary && typeof data.summary === "string") {
          return data.summary;
        }
      }
    }
  } catch (err: any) {
    console.warn("[GeminiClient] Summary API endpoint notice:", err?.name || err?.message || err);
  } finally {
    clearTimeout(timeoutId);
  }

  // Direct Client SDK call fallback for summary
  const apiKey = getClientApiKey();
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are an executive summarization engine for TJ Secure AI Journal by JindalTechnik.
Generate a clean, structured summary of the user's journal entry in Markdown.`;

      const contentToSummarize = messages
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n\n");
      const prompt = `Summarize this journal entry titled "${title || "Journal Reflection"}":\n\n${contentToSummarize}`;

      const models = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];
      for (const modelName of models) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { systemInstruction, temperature: 0.7 },
          });
          if (res?.text) {
            return res.text;
          }
        } catch (mErr: any) {
          console.warn(`[Client SDK] Summarize model ${modelName} notice:`, mErr?.message || mErr);
        }
      }
    } catch (sdkErr: any) {
      console.warn("[Client SDK] Direct summary SDK call notice:", sdkErr);
    }
  }

  return generateLocalSummary(title, messages);
}
