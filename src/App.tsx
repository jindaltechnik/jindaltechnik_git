import React, { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, handleFirestoreError } from "./lib/firebase";
import { sanitizePayload } from "./lib/sanitize";
import { JournalEntry, JournalMessage, EntryCategory, OperationType } from "./types";

import { Header } from "./components/Header";
import { LandingPage } from "./components/LandingPage";
import { EntryList } from "./components/EntryList";
import { EntryDetail } from "./components/EntryDetail";
import { NewEntryModal } from "./components/NewEntryModal";
import { VercelDeployGuideModal } from "./components/VercelDeployGuideModal";
import { BookOpen, Plus, AlertCircle, Sparkles } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [messages, setMessages] = useState<JournalMessage[]>([]);

  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        setEntries([]);
        setSelectedEntry(null);
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync user's private journal entries from Firestore
  useEffect(() => {
    if (!user) return;

    const entriesPath = `users/${user.uid}/entries`;
    const entriesRef = collection(db, "users", user.uid, "entries");
    const q = query(entriesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            userId: data.userId || user.uid,
            title: data.title || "Untitled Reflection",
            category: data.category || "Reflections",
            mood: data.mood || "",
            summary: data.summary || "",
            lastPrompt: data.lastPrompt || "",
            lastAiResponse: data.lastAiResponse || "",
            messageCount: data.messageCount || 0,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });
        setEntries(loaded);

        // Auto-select first entry if none selected
        if (loaded.length > 0 && !selectedEntry) {
          setSelectedEntry(loaded[0]);
        } else if (selectedEntry) {
          // Update reference if exists
          const updated = loaded.find((e) => e.id === selectedEntry.id);
          if (updated) setSelectedEntry(updated);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, entriesPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Sync messages for selected entry
  useEffect(() => {
    if (!user || !selectedEntry) {
      setMessages([]);
      return;
    }

    const messagesPath = `users/${user.uid}/entries/${selectedEntry.id}/messages`;
    const messagesRef = collection(db, "users", user.uid, "entries", selectedEntry.id, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: JournalMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            entryId: selectedEntry.id,
            userId: user.uid,
            role: data.role === "model" ? "model" : "user",
            content: data.content || "",
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
        setMessages(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, messagesPath);
      }
    );

    return () => unsubscribe();
  }, [user, selectedEntry?.id]);

  // Create New Journal Entry
  const handleCreateEntry = async (
    title: string,
    category: EntryCategory,
    mood: string,
    initialPrompt: string
  ) => {
    if (!user) return;

    try {
      setErrorMessage(null);
      setAiLoading(true);

      const entryId = "entry_" + Date.now();
      const nowIso = new Date().toISOString();

      const newEntryDoc: JournalEntry = {
        id: entryId,
        userId: user.uid,
        title,
        category,
        mood,
        summary: "",
        lastPrompt: initialPrompt,
        lastAiResponse: "",
        messageCount: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 1. Save entry document to Firestore
      const entryRef = doc(db, "users", user.uid, "entries", entryId);
      await setDoc(entryRef, sanitizePayload(newEntryDoc));

      // 2. Add user's initial message
      const userMsgId = "msg_user_" + Date.now();
      const userMsgDoc: JournalMessage = {
        id: userMsgId,
        entryId,
        userId: user.uid,
        role: "user",
        content: initialPrompt,
        createdAt: nowIso,
      };
      const userMsgRef = doc(db, "users", user.uid, "entries", entryId, "messages", userMsgId);
      await setDoc(userMsgRef, sanitizePayload(userMsgDoc));

      setSelectedEntry(newEntryDoc);

      // 3. Call backend Gemini proxy for initial AI reflection with graceful fallback
      let aiReply = "Thank you for sharing your reflection.";
      try {
        const response = await fetch("/api/gemini/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: initialPrompt,
            title,
            category,
            history: [],
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          if (aiData.reply) {
            aiReply = aiData.reply;
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn("Gemini API call returned error status:", response.status, errData);
          aiReply = `Reflection recorded in Firestore. (Note: Ensure GEMINI_API_KEY environment variable is configured in Vercel settings for automated AI reflections.)`;
        }
      } catch (aiErr) {
        console.warn("Could not connect to Gemini API endpoint:", aiErr);
        aiReply = `Reflection recorded in Firestore. (Note: Ensure GEMINI_API_KEY environment variable is configured in Vercel settings for automated AI reflections.)`;
      }

      // 4. Save AI message to Firestore
      const aiMsgId = "msg_ai_" + Date.now();
      const aiMsgDoc: JournalMessage = {
        id: aiMsgId,
        entryId,
        userId: user.uid,
        role: "model",
        content: aiReply,
        createdAt: new Date().toISOString(),
      };
      const aiMsgRef = doc(db, "users", user.uid, "entries", entryId, "messages", aiMsgId);
      await setDoc(aiMsgRef, sanitizePayload(aiMsgDoc));

      // 5. Update Entry metadata
      await updateDoc(entryRef, {
        lastAiResponse: aiReply,
        messageCount: 2,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error creating entry in Firestore:", err);
      setErrorMessage(err?.message || "Failed to save journal entry to Firestore.");
      throw err;
    } finally {
      setAiLoading(false);
    }
  };

  // Send follow-up prompt in active entry
  const handleSendMessage = async (promptText: string) => {
    if (!user || !selectedEntry) return;

    try {
      setErrorMessage(null);
      setAiLoading(true);

      const nowIso = new Date().toISOString();
      const userMsgId = "msg_user_" + Date.now();

      // 1. Save user message in Firestore
      const userMsgDoc: JournalMessage = {
        id: userMsgId,
        entryId: selectedEntry.id,
        userId: user.uid,
        role: "user",
        content: promptText,
        createdAt: nowIso,
      };
      const userMsgRef = doc(
        db,
        "users",
        user.uid,
        "entries",
        selectedEntry.id,
        "messages",
        userMsgId
      );
      await setDoc(userMsgRef, sanitizePayload(userMsgDoc));

      // 2. Prepare conversation history
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 3. Call backend Gemini endpoint with graceful fallback
      let aiReply = "Reflection noted.";
      try {
        const response = await fetch("/api/gemini/reflect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            title: selectedEntry.title,
            category: selectedEntry.category,
            history: historyPayload,
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          if (aiData.reply) {
            aiReply = aiData.reply;
          }
        } else {
          console.warn("Gemini API call returned non-200 status:", response.status);
          aiReply = `Message saved to Firestore. (Note: Ensure GEMINI_API_KEY environment variable is configured in Vercel settings for AI responses.)`;
        }
      } catch (aiErr) {
        console.warn("Could not reach Gemini endpoint:", aiErr);
        aiReply = `Message saved to Firestore. (Note: Ensure GEMINI_API_KEY environment variable is configured in Vercel settings for AI responses.)`;
      }

      // 4. Save AI message in Firestore
      const aiMsgId = "msg_ai_" + Date.now();
      const aiMsgDoc: JournalMessage = {
        id: aiMsgId,
        entryId: selectedEntry.id,
        userId: user.uid,
        role: "model",
        content: aiReply,
        createdAt: new Date().toISOString(),
      };
      const aiMsgRef = doc(
        db,
        "users",
        user.uid,
        "entries",
        selectedEntry.id,
        "messages",
        aiMsgId
      );
      await setDoc(aiMsgRef, sanitizePayload(aiMsgDoc));

      // 5. Update entry summary/metadata
      const entryRef = doc(db, "users", user.uid, "entries", selectedEntry.id);
      await updateDoc(entryRef, {
        lastPrompt: promptText,
        lastAiResponse: aiReply,
        messageCount: messages.length + 2,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error sending message:", err);
      setErrorMessage(err?.message || "Failed to process reflection prompt.");
    } finally {
      setAiLoading(false);
    }
  };

  // Generate executive summary for active entry
  const handleSummarizeEntry = async () => {
    if (!user || !selectedEntry || messages.length === 0) return;

    try {
      setErrorMessage(null);
      setSummarizeLoading(true);

      const response = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedEntry.title,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Summarization failed.");
      }

      const data = await response.json();
      const summaryText = data.summary || "Summary generated.";

      // Persist summary in Firestore
      const entryRef = doc(db, "users", user.uid, "entries", selectedEntry.id);
      await updateDoc(entryRef, {
        summary: summaryText,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error summarizing entry:", err);
      setErrorMessage(err?.message || "Failed to generate AI executive summary.");
    } finally {
      setSummarizeLoading(false);
    }
  };

  // Delete journal entry from Firestore
  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      setErrorMessage(null);
      const entryRef = doc(db, "users", user.uid, "entries", entryId);
      await deleteDoc(entryRef);

      if (selectedEntry?.id === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        setSelectedEntry(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err: any) {
      console.error("Failed to delete entry:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/entries/${entryId}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium tracking-wide">Authenticating JindalTechnik Session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onOpenDeployGuide={() => setIsDeployGuideOpen(true)} />
        <VercelDeployGuideModal
          isOpen={isDeployGuideOpen}
          onClose={() => setIsDeployGuideOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        user={user}
        onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
        onNewEntry={() => setIsNewEntryModalOpen(true)}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-red-950/90 border-b border-red-800 text-red-200 px-4 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        {/* Left Sidebar: Entries List */}
        <EntryList
          entries={entries}
          selectedEntryId={selectedEntry?.id || null}
          onSelectEntry={(entry) => setSelectedEntry(entry)}
          onNewEntry={() => setIsNewEntryModalOpen(true)}
          onDeleteEntry={handleDeleteEntry}
        />

        {/* Right Main Area: Active Entry Detail */}
        {selectedEntry ? (
          <EntryDetail
            entry={selectedEntry}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSummarizeEntry={handleSummarizeEntry}
            isLoading={aiLoading}
            isSummarizing={summarizeLoading}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-950">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mb-4 shadow-xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">No Reflection Entry Selected</h3>
            <p className="text-xs max-w-md text-slate-400 mb-6 leading-relaxed">
              Select an existing journal entry from the sidebar or start a new AI reflection session.
            </p>
            <button
              onClick={() => setIsNewEntryModalOpen(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Journal Entry</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewEntryModal
        isOpen={isNewEntryModalOpen}
        onClose={() => setIsNewEntryModalOpen(false)}
        onCreate={handleCreateEntry}
      />

      <VercelDeployGuideModal
        isOpen={isDeployGuideOpen}
        onClose={() => setIsDeployGuideOpen(false)}
      />
    </div>
  );
}
