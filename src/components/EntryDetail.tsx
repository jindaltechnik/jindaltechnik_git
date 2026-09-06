import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Tag, Calendar, ShieldCheck, RefreshCw, MessageSquare, FileText, Check, Copy } from "lucide-react";
import { JournalEntry, JournalMessage } from "../types";

interface EntryDetailProps {
  entry: JournalEntry;
  messages: JournalMessage[];
  onSendMessage: (prompt: string) => Promise<void>;
  onSummarizeEntry: () => Promise<void>;
  isLoading: boolean;
  isSummarizing: boolean;
}

export const EntryDetail: React.FC<EntryDetailProps> = ({
  entry,
  messages,
  onSendMessage,
  onSummarizeEntry,
  isLoading,
  isSummarizing,
}) => {
  const [inputPrompt, setInputPrompt] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;
    const promptToSend = inputPrompt.trim();
    setInputPrompt("");
    await onSendMessage(promptToSend);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F7F5F2] text-[#2D2926] overflow-hidden">
      {/* Top Journal Detail Header */}
      <div className="p-6 bg-[#F7F5F2]/90 backdrop-blur-md border-b border-[#E5E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5A40] bg-[#E8EAE0] border border-[#D8DBC7] px-2.5 py-0.5 rounded-full">
              {entry.category}
            </span>
            {entry.mood && (
              <span className="text-[10px] font-medium text-[#5A544D] bg-[#F0EDE8] border border-[#E5E0D8] px-2.5 py-0.5 rounded-full">
                Mood: {entry.mood}
              </span>
            )}
            <span className="text-xs text-[#8A847C] flex items-center italic">
              <Calendar className="w-3 h-3 mr-1 text-[#A39D94]" />
              {formatDate(entry.createdAt)}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-normal font-serif text-[#4A443D] tracking-tight">
            {entry.title}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onSummarizeEntry}
            disabled={isSummarizing || messages.length === 0}
            className="inline-flex items-center space-x-1.5 text-xs uppercase tracking-widest font-medium bg-[#E8EAE0] hover:bg-[#D8DBC7] text-[#4A443D] border border-[#D8DBC7] px-4 py-2 rounded-full transition shadow-sm disabled:opacity-50 cursor-pointer"
            title="Generate AI executive summary and key takeaways"
          >
            {isSummarizing ? (
              <div className="w-3.5 h-3.5 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#5A5A40]" />
            )}
            <span>{isSummarizing ? "Summarizing..." : "AI Executive Summary"}</span>
          </button>
        </div>
      </div>

      {/* AI Summary Banner (if generated) */}
      {entry.summary && (
        <div className="mx-6 mt-6 p-6 bg-[#E8EAE0] border border-[#D8DBC7] rounded-[24px] shadow-sm relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5A5A40] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#5A5A40]" />
              AI Reflection Summary
            </span>
            <button
              onClick={() => handleCopyText(entry.summary || "", "summary")}
              className="text-[#8A847C] hover:text-[#2D2926] p-1 rounded transition text-xs flex items-center gap-1 cursor-pointer"
            >
              {copiedId === "summary" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === "summary" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div className="text-sm text-[#4A443D] leading-relaxed whitespace-pre-wrap font-serif">
            {entry.summary}
          </div>
        </div>
      )}

      {/* Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8A847C] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E8EAE0] border border-[#D8DBC7] flex items-center justify-center text-[#5A5A40]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-normal font-serif text-[#4A443D]">Start Your AI Reflection</h3>
            <p className="text-xs max-w-md text-[#5A544D] leading-relaxed">
              Type your thoughts, progress notes, or questions below. Gemini 3.6 Flash will respond with tailored insights in an organic, reflective tone.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
              >
                <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-[#8A847C] px-2">
                  <span>{isUser ? "You" : "Gemini AI Insight"}</span>
                  <span>•</span>
                  <span>{formatDate(msg.createdAt)}</span>
                </div>

                <div
                  className={`max-w-[88%] sm:max-w-[78%] p-6 text-sm leading-relaxed shadow-sm relative group ${
                    isUser
                      ? "bg-white border border-[#E5E0D8] text-[#4A443D] italic rounded-[32px] rounded-tr-none"
                      : "bg-[#E8EAE0] border border-[#D8DBC7] text-[#4A443D] rounded-[32px] rounded-tl-none"
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 bg-[#5A5A40] rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[9px] text-white font-bold">G</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-[#6B705C] font-semibold">
                        Gemini AI Insight
                      </span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</p>

                  <button
                    onClick={() => handleCopyText(msg.content, msg.id)}
                    className="absolute top-3 right-3 p-1.5 text-[#8A847C] hover:text-[#2D2926] rounded-full bg-[#F0EDE8]/60 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Copy text"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator for AI reply */}
        {isLoading && (
          <div className="flex flex-col items-start space-y-1.5 animate-pulse">
            <div className="text-[10px] uppercase tracking-widest text-[#8A847C] px-2">Gemini AI generating response...</div>
            <div className="bg-[#E8EAE0] border border-[#D8DBC7] p-6 rounded-[32px] rounded-tl-none text-[#5A544D] text-xs flex items-center space-x-3">
              <div className="w-4 h-4 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
              <span>Generating thoughtful reflection with Gemini 3.6 Flash...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Form Bar */}
      <div className="p-6 bg-[#F7F5F2] border-t border-[#E5E0D8]">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex flex-col">
          <div className="flex items-center justify-between mb-1.5 px-2">
            <span className="text-[10px] text-[#8A847C] uppercase tracking-wider">
              Press Enter to send, Shift + Enter for new line
            </span>
            <span className={`text-[10px] ${inputPrompt.length > 3800 ? "text-amber-600 font-bold" : "text-[#8A847C]"}`}>
              {inputPrompt.length.toLocaleString()} / 4,000
            </span>
          </div>
          <div className="relative flex items-center">
            <textarea
              rows={2}
              maxLength={4000}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Share your thoughts or ask Gemini for a reflection (Max 4,000 characters)..."
              className="w-full bg-white border border-[#E5E0D8] rounded-[24px] p-5 pr-16 text-[#4A443D] placeholder-[#A39D94] resize-none focus:outline-none focus:ring-1 focus:ring-[#5A5A40] shadow-sm text-sm"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading || inputPrompt.length > 4000}
              className="absolute right-4 bottom-4 w-10 h-10 bg-[#5A5A40] hover:bg-[#4A4A35] text-white rounded-full flex items-center justify-center transition disabled:opacity-40 cursor-pointer shadow-sm"
              title="Send Reflection Prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        <p className="text-center text-[10px] text-[#A39D94] mt-3 tracking-wide">
          JindalTechnik Secure Tunnel active • All data encrypted via Firestore ABAC rules
        </p>
      </div>
    </div>
  );
};
