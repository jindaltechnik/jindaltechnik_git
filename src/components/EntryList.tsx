import React, { useState } from "react";
import { Search, Plus, Tag, Trash2, Calendar, MessageSquare, Sparkles, Filter } from "lucide-react";
import { JournalEntry, EntryCategory } from "../types";

interface EntryListProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
}

const CATEGORIES: ("All" | EntryCategory)[] = [
  "All",
  "Personal",
  "Work",
  "Deep Thought",
  "Gratitude",
  "Ideas",
  "Reflections",
];

export const EntryList: React.FC<EntryListProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | EntryCategory>("All");

  const filteredEntries = entries.filter((entry) => {
    const matchesCategory = selectedCategory === "All" || entry.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.summary && entry.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (entry.lastPrompt && entry.lastPrompt.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryBadgeColor = (cat: EntryCategory) => {
    switch (cat) {
      case "Work":
        return "bg-[#E3E7DA] text-[#4A4D3B] border-[#D1D8C5]";
      case "Deep Thought":
        return "bg-[#EAE4DC] text-[#5C4E43] border-[#DAD0C5]";
      case "Gratitude":
        return "bg-[#E2ECE5] text-[#385244] border-[#C8DBD0]";
      case "Ideas":
        return "bg-[#FAF0E4] text-[#6E5033] border-[#EEDCC9]";
      case "Personal":
        return "bg-[#F5E8E8] text-[#6B3B3B] border-[#E8D3D3]";
      default:
        return "bg-[#E5E8E0] text-[#48523A] border-[#D2D8C9]";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F0EDE8] border-r border-[#E5E0D8] text-[#2D2926] w-full lg:w-80 xl:w-96 shrink-0">
      {/* Top Header & Search */}
      <div className="p-5 border-b border-[#E5E0D8] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#8A847C] block mb-0.5">
              Reflections
            </span>
            <h2 className="text-base font-normal font-serif text-[#4A443D] flex items-center gap-1.5">
              Recent Entries
            </h2>
          </div>
          <span className="text-[11px] font-semibold bg-[#E5E0D8] text-[#5A544D] px-2.5 py-1 rounded-full border border-[#D8D3C8]">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8A847C] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reflections..."
            className="w-full bg-white border border-[#E5E0D8] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-full pl-9 pr-3 py-2 text-xs text-[#2D2926] placeholder-[#A39D94] outline-none transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full border whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#5A5A40] border-[#4A4A35] text-white font-medium shadow-sm"
                  : "bg-white border-[#E5E0D8] text-[#5A544D] hover:bg-[#E8EAE0] hover:text-[#2D2926]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Entry List Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E5E0D8] text-[#8A847C] flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6" />
            </div>
            <p className="text-xs text-[#8A847C] font-medium">
              {entries.length === 0
                ? "No journal entries created yet."
                : "No reflections match your current search filter."}
            </p>
            <button
              onClick={onNewEntry}
              className="inline-flex items-center space-x-1.5 text-xs font-medium uppercase tracking-wider bg-[#5A5A40] hover:bg-[#4A4A35] text-white px-4 py-2 rounded-full shadow transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Entry</span>
            </button>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = selectedEntryId === entry.id;
            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className={`group relative p-4 rounded-[20px] border transition cursor-pointer ${
                  isSelected
                    ? "bg-[#E8EAE0] border-[#D8DBC7] shadow-sm"
                    : "bg-white border-[#E5E0D8] hover:border-[#D8D3C8] hover:bg-[#F7F5F2]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-normal font-serif text-[#4A443D] line-clamp-1 group-hover:text-[#2D2926] transition">
                    {entry.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete reflection entry "${entry.title}"?`)) {
                        onDeleteEntry(entry.id);
                      }
                    }}
                    className="text-[#8A847C] hover:text-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition cursor-pointer shrink-0"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Preview text */}
                <p className="text-xs text-[#5A544D] line-clamp-2 mb-2.5 leading-relaxed italic">
                  {entry.summary || entry.lastPrompt || "Click to open reflection thread..."}
                </p>

                {/* Footer Metadata Badges */}
                <div className="flex items-center justify-between text-[10px] text-[#8A847C] border-t border-[#E5E0D8]/60 pt-2.5">
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full border font-medium ${getCategoryBadgeColor(entry.category)}`}>
                      {entry.category}
                    </span>
                    {entry.mood && (
                      <span className="text-[#8A847C] bg-[#F0EDE8] border border-[#E5E0D8] px-2 py-0.5 rounded-full">
                        {entry.mood}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[#8A847C]">
                    <span className="flex items-center">
                      <MessageSquare className="w-3 h-3 mr-0.5 text-[#A39D94]" />
                      {entry.messageCount || 0}
                    </span>
                    <span className="flex items-center italic">
                      <Calendar className="w-3 h-3 mr-0.5 text-[#A39D94]" />
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
