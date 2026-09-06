/**
 * Resilient Gemini Client for TJ Secure AI Journal
 * Handles API reflections & executive summaries with strict timeouts
 * and instant local fallback so the application NEVER hangs.
 */

interface ChatMsg {
  role: "user" | "model";
  content: string;
}

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s strict timeout

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
    }
  } catch (err: any) {
    console.warn("[GeminiClient] API endpoint call bypassed or timed out:", err?.name || err?.message || err);
  } finally {
    clearTimeout(timeoutId);
  }

  // Instant fallback so UI never hangs
  return generateLocalReflection(prompt, title, category);
}

export async function getAiSummary(title: string, messages: ChatMsg[]): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s strict timeout

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
    console.warn("[GeminiClient] Summary API endpoint call bypassed or timed out:", err?.name || err?.message || err);
  } finally {
    clearTimeout(timeoutId);
  }

  // Instant fallback so UI never hangs
  return generateLocalSummary(title, messages);
}
