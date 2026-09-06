import React, { useState } from "react";
import { Sparkles, X, Tag, BookOpen, MessageSquare } from "lucide-react";
import { EntryCategory } from "../types";

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, category: EntryCategory, mood: string, initialPrompt: string) => Promise<void>;
}

const CATEGORIES: EntryCategory[] = ["Personal", "Work", "Deep Thought", "Gratitude", "Ideas", "Reflections"];

export const NewEntryModal: React.FC<NewEntryModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EntryCategory>("Reflections");
  const [mood, setMood] = useState("Focused");
  const [initialPrompt, setInitialPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title for your journal entry.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreate(
        title.trim(),
        category,
        mood.trim(),
        initialPrompt.trim() || "Help me reflect on this session."
      );
      // Reset form
      setTitle("");
      setInitialPrompt("");
      onClose();
    } catch (err: any) {
      console.error("Failed to create entry:", err);
      setError(err?.message || "Failed to create journal entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#E5E0D8] rounded-[32px] w-full max-w-lg overflow-hidden shadow-xl text-[#2D2926]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E0D8] bg-[#F0EDE8]/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#E8EAE0] text-[#5A5A40] border border-[#D8DBC7] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-normal font-serif text-[#4A443D]">Create New Reflection Entry</h3>
              <p className="text-xs text-[#8A847C]">Start a multi-turn AI reflection thread</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A847C] hover:text-[#2D2926] p-1.5 rounded-full hover:bg-[#E8EAE0] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[#5A544D] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#5A5A40]" />
              Journal Entry Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Strategic Priorities & Personal Growth"
              className="w-full bg-[#F7F5F2] border border-[#E5E0D8] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-[16px] px-4 py-3 text-sm text-[#2D2926] placeholder-[#A39D94] outline-none transition"
            />
          </div>

          {/* Category & Mood */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#5A544D] mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#5A5A40]" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EntryCategory)}
                className="w-full bg-[#F7F5F2] border border-[#E5E0D8] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-[16px] px-4 py-3 text-sm text-[#2D2926] outline-none transition cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#5A544D] mb-2">
                Current Mood / Mindset
              </label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="e.g. Focused, Reflective"
                className="w-full bg-[#F7F5F2] border border-[#E5E0D8] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-[16px] px-4 py-3 text-sm text-[#2D2926] placeholder-[#A39D94] outline-none transition"
              />
            </div>
          </div>

          {/* Initial Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium uppercase tracking-wider text-[#5A544D] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#5A5A40]" />
                Initial Reflection Prompt
              </label>
              <span className={`text-[10px] ${initialPrompt.length > 3800 ? "text-amber-600 font-bold" : "text-[#8A847C]"}`}>
                {initialPrompt.length.toLocaleString()} / 4,000
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={4000}
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              placeholder="What is on your mind? Share your thoughts, goals, or questions for Gemini to reflect upon (Max 4,000 characters)..."
              className="w-full bg-[#F7F5F2] border border-[#E5E0D8] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-[16px] p-4 text-sm text-[#2D2926] placeholder-[#A39D94] outline-none resize-none transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E5E0D8]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[#8A847C] hover:text-[#2D2926] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 bg-[#5A5A40] hover:bg-[#4A4A35] text-white font-medium uppercase tracking-wider text-xs px-6 py-3 rounded-full shadow-sm disabled:opacity-50 transition cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
