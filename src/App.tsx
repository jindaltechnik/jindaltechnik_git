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
import { auth, db, handleFirestoreError, signOutUser, signInAsGuest, firebaseConfig } from "./lib/firebase";
import { getRedirectResult } from "firebase/auth";
import { sanitizePayload } from "./lib/sanitize";
import { JournalEntry, JournalMessage, EntryCategory, OperationType } from "./types";

import { Header } from "./components/Header";
import { LandingPage } from "./components/LandingPage";
import { EntryList } from "./components/EntryList";
import { EntryDetail } from "./components/EntryDetail";
import { NewEntryModal } from "./components/NewEntryModal";
import { GuestRegistrationModal } from "./components/GuestRegistrationModal";
import { VercelDeployGuideModal } from "./components/VercelDeployGuideModal";
import { BookOpen, Plus, AlertCircle, Sparkles } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLocalGuest, setIsLocalGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [messages, setMessages] = useState<JournalMessage[]>([]);

  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isGuestRegistrationOpen, setIsGuestRegistrationOpen] = useState(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auth observer & redirect handler
  useEffect(() => {
    // Check for pending redirect result from signInWithRedirect
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Redirect sign-in successful:", result.user.email);
          setUser(result.user);
        }
      })
      .catch((err) => {
        console.warn("getRedirectResult warning:", err);
      });

    // Check if a saved guest profile exists in localStorage on startup
    let hasGuest = false;
    try {
      const savedGuestProfile = localStorage.getItem("tj_guest_profile");
      if (savedGuestProfile) {
        const parsed = JSON.parse(savedGuestProfile);
        if (parsed?.uid) {
          hasGuest = true;
          setIsLocalGuest(true);
          const guestUser = {
            uid: parsed.uid,
            displayName: parsed.displayName || (parsed.firstName ? `${parsed.firstName} ${parsed.lastName || ""}`.trim() : "Guest Journaler"),
            email: parsed.email || `${parsed.uid}@guest.local`,
            emailVerified: false,
            isAnonymous: true,
          } as User;
          setUser(guestUser);

          // Restore guest entries
          const savedEntries = localStorage.getItem(`tj_guest_entries_${parsed.uid}`);
          if (savedEntries) {
            const parsedEntries = JSON.parse(savedEntries);
            setEntries(parsedEntries);
            if (parsedEntries.length > 0) {
              setSelectedEntry(parsedEntries[0]);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Error restoring saved guest profile:", e);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        localStorage.removeItem("tj_guest_profile");
        setIsLocalGuest(false);
        setUser(currentUser);
      } else if (!hasGuest) {
        setUser(null);
        setEntries([]);
        setSelectedEntry(null);
        setMessages([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStartGuestSessionWithProfile = ({
    firstName,
    lastName,
    email,
  }: {
    firstName: string;
    lastName: string;
    email: string;
  }) => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const cleanEmail = email.trim().toLowerCase();
    const guestUid = "guest_" + btoa(cleanEmail).replace(/=/g, "");

    const guestUser = {
      uid: guestUid,
      displayName: fullName,
      email: cleanEmail,
      emailVerified: false,
      isAnonymous: true,
    } as User;

    localStorage.setItem(
      "tj_guest_profile",
      JSON.stringify({ firstName, lastName, email: cleanEmail, uid: guestUid, displayName: fullName })
    );

    setIsLocalGuest(true);
    setUser(guestUser);
    setAuthLoading(false);
    setIsGuestRegistrationOpen(false);

    // Restore guest entries if available
    const savedEntries = localStorage.getItem(`tj_guest_entries_${guestUid}`);
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries);
        setEntries(parsed);
        if (parsed.length > 0) {
          setSelectedEntry(parsed[0]);
        }
      } catch (e) {
        console.warn("Failed to parse saved guest entries:", e);
      }
    }
  };

  const handleInstantGuestSession = async () => {
    try {
      setAuthLoading(true);
      await signInAsGuest();
    } catch (err: any) {
      console.warn("Firebase anonymous sign-in failed, falling back to session mode:", err);
      const uniqueSessionId = "anon_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      handleStartGuestSessionWithProfile({
        firstName: "Guest",
        lastName: "Journaler",
        email: `${uniqueSessionId}@guest.local`,
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.warn("Firebase sign out error:", e);
    }
    setIsLocalGuest(false);
    setUser(null);
    setEntries([]);
    setSelectedEntry(null);
    setMessages([]);
    localStorage.removeItem("tj_guest_profile");
  };

  // Persist guest entries
  useEffect(() => {
    if (isLocalGuest && user?.uid) {
      localStorage.setItem(`tj_guest_entries_${user.uid}`, JSON.stringify(entries));
    }
  }, [entries, isLocalGuest, user?.uid]);

  // Sync user's private journal entries from Firestore
  useEffect(() => {
    if (!user || isLocalGuest) return;

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

        // Auto-select first entry if none selected, or update reference safely
        setSelectedEntry((prevSelected) => {
          if (!prevSelected && loaded.length > 0) {
            return loaded[0];
          }
          if (prevSelected) {
            const updated = loaded.find((e) => e.id === prevSelected.id);
            return updated || (loaded.length > 0 ? loaded[0] : null);
          }
          return null;
        });
      },
      (error) => {
        const errObj = handleFirestoreError(error, OperationType.LIST, entriesPath);
        console.warn("Firestore entries subscription error:", errObj);
      }
    );

    return () => unsubscribe();
  }, [user, isLocalGuest]);

  // Sync messages for selected entry
  useEffect(() => {
    if (!user || !selectedEntry || isLocalGuest) {
      if (isLocalGuest && !selectedEntry) {
        setMessages([]);
      }
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
        const errObj = handleFirestoreError(error, OperationType.LIST, messagesPath);
        console.warn("Firestore messages subscription error:", errObj);
      }
    );

    return () => unsubscribe();
  }, [user, selectedEntry?.id, isLocalGuest]);

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

      const userMsgId = "msg_user_" + Date.now();
      const userMsgDoc: JournalMessage = {
        id: userMsgId,
        entryId,
        userId: user.uid,
        role: "user",
        content: initialPrompt,
        createdAt: nowIso,
      };

      // Always update local React state immediately so UI updates
      setEntries((prev) => [newEntryDoc, ...prev]);
      setSelectedEntry(newEntryDoc);
      setMessages([userMsgDoc]);

      // 1. Save entry document to Firestore if not local guest
      if (!isLocalGuest) {
        try {
          const entryRef = doc(db, "users", user.uid, "entries", entryId);
          await setDoc(entryRef, sanitizePayload(newEntryDoc));

          const userMsgRef = doc(db, "users", user.uid, "entries", entryId, "messages", userMsgId);
          await setDoc(userMsgRef, sanitizePayload(userMsgDoc));
        } catch (fsErr) {
          console.warn("Firestore save failed, proceeding with local state:", fsErr);
        }
      }

      // 2. Call backend Gemini proxy for initial AI reflection with graceful fallback
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
          aiReply = `Reflection recorded in session. (AI service response error - ${errData?.error || response.statusText || "please try again"})`;
        }
      } catch (aiErr: any) {
        console.warn("Could not connect to Gemini API endpoint:", aiErr);
        aiReply = `Reflection recorded in session. (Could not connect to AI service: ${aiErr?.message || "Network error"})`;
      }

      // 3. Save AI message
      const aiMsgId = "msg_ai_" + Date.now();
      const aiMsgDoc: JournalMessage = {
        id: aiMsgId,
        entryId,
        userId: user.uid,
        role: "model",
        content: aiReply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsgDoc]);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, lastAiResponse: aiReply, messageCount: 2, updatedAt: new Date().toISOString() }
            : e
        )
      );
      setSelectedEntry((prev) =>
        prev?.id === entryId
          ? { ...prev, lastAiResponse: aiReply, messageCount: 2, updatedAt: new Date().toISOString() }
          : prev
      );

      if (!isLocalGuest) {
        try {
          const aiMsgRef = doc(db, "users", user.uid, "entries", entryId, "messages", aiMsgId);
          await setDoc(aiMsgRef, sanitizePayload(aiMsgDoc));

          const entryRef = doc(db, "users", user.uid, "entries", entryId);
          await updateDoc(entryRef, {
            lastAiResponse: aiReply,
            messageCount: 2,
            updatedAt: new Date().toISOString(),
          });
        } catch (fsErr) {
          console.warn("Firestore update for AI message failed:", fsErr);
        }
      }
    } catch (err: any) {
      console.error("Error creating entry:", err);
      setErrorMessage(err?.message || "Failed to save journal entry.");
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

      const userMsgDoc: JournalMessage = {
        id: userMsgId,
        entryId: selectedEntry.id,
        userId: user.uid,
        role: "user",
        content: promptText,
        createdAt: nowIso,
      };

      setMessages((prev) => [...prev, userMsgDoc]);

      if (!isLocalGuest) {
        try {
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
        } catch (fsErr) {
          console.warn("Firestore user message write failed:", fsErr);
        }
      }

      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

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
          const errData = await response.json().catch(() => ({}));
          console.warn("Gemini API call returned non-200 status:", response.status, errData);
          aiReply = `Message saved in session. (AI response error - ${errData?.error || response.statusText || "please try again"})`;
        }
      } catch (aiErr: any) {
        console.warn("Could not reach Gemini endpoint:", aiErr);
        aiReply = `Message saved in session. (Could not connect to AI service: ${aiErr?.message || "Network error"})`;
      }

      const aiMsgId = "msg_ai_" + Date.now();
      const aiMsgDoc: JournalMessage = {
        id: aiMsgId,
        entryId: selectedEntry.id,
        userId: user.uid,
        role: "model",
        content: aiReply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsgDoc]);

      const newMsgCount = messages.length + 2;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === selectedEntry.id
            ? {
                ...e,
                lastPrompt: promptText,
                lastAiResponse: aiReply,
                messageCount: newMsgCount,
                updatedAt: new Date().toISOString(),
              }
            : e
        )
      );
      setSelectedEntry((prev) =>
        prev?.id === selectedEntry.id
          ? {
              ...prev,
              lastPrompt: promptText,
              lastAiResponse: aiReply,
              messageCount: newMsgCount,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );

      if (!isLocalGuest) {
        try {
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

          const entryRef = doc(db, "users", user.uid, "entries", selectedEntry.id);
          await updateDoc(entryRef, {
            lastPrompt: promptText,
            lastAiResponse: aiReply,
            messageCount: newMsgCount,
            updatedAt: new Date().toISOString(),
          });
        } catch (fsErr) {
          console.warn("Firestore update failed:", fsErr);
        }
      }
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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Summarization failed.");
      }

      const data = await response.json();
      const summaryText = data.summary || "Summary generated.";

      setEntries((prev) =>
        prev.map((e) =>
          e.id === selectedEntry.id ? { ...e, summary: summaryText, updatedAt: new Date().toISOString() } : e
        )
      );
      setSelectedEntry((prev) =>
        prev?.id === selectedEntry.id ? { ...prev, summary: summaryText, updatedAt: new Date().toISOString() } : prev
      );

      // Persist summary in Firestore if allowed
      if (!isLocalGuest) {
        try {
          const entryRef = doc(db, "users", user.uid, "entries", selectedEntry.id);
          await updateDoc(entryRef, {
            summary: summaryText,
            updatedAt: new Date().toISOString(),
          });
        } catch (fsErr) {
          console.warn("Firestore summary update failed:", fsErr);
        }
      }
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

      const remaining = entries.filter((e) => e.id !== entryId);
      setEntries(remaining);
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(remaining.length > 0 ? remaining[0] : null);
      }

      if (!isLocalGuest) {
        try {
          const entryRef = doc(db, "users", user.uid, "entries", entryId);
          await deleteDoc(entryRef);
        } catch (fsErr) {
          console.warn("Firestore delete failed:", fsErr);
        }
      }
    } catch (err: any) {
      console.error("Failed to delete entry:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex flex-col items-center justify-center text-[#5A544D] space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium tracking-wide text-[#5A5A40]">Authenticating Session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage
          onOpenDeployGuide={() => setIsDeployGuideOpen(true)}
          onOpenGuestRegistration={() => setIsGuestRegistrationOpen(true)}
          onInstantGuest={handleInstantGuestSession}
        />
        <GuestRegistrationModal
          isOpen={isGuestRegistrationOpen}
          onClose={() => setIsGuestRegistrationOpen(false)}
          onSubmit={handleStartGuestSessionWithProfile}
        />
        <VercelDeployGuideModal
          isOpen={isDeployGuideOpen}
          onClose={() => setIsDeployGuideOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#2D2926] flex flex-col font-sans">
      {/* Header */}
      <Header
        user={user}
        onSignOut={handleSignOut}
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F7F5F2]">
            <div className="w-16 h-16 rounded-2xl bg-[#E8EAE0] border border-[#D8DBC7] flex items-center justify-center text-[#5A5A40] mb-4 shadow-sm">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-normal font-serif text-[#4A443D] mb-2">No Reflection Entry Selected</h3>
            <p className="text-xs max-w-md text-[#8A847C] mb-6 leading-relaxed font-normal">
              Select an existing journal entry from the sidebar or start a new AI reflection session.
            </p>
            <button
              onClick={() => setIsNewEntryModalOpen(true)}
              className="inline-flex items-center space-x-2 bg-[#5A5A40] hover:bg-[#4A4A35] text-white font-medium uppercase tracking-wider text-xs px-5 py-3 rounded-full shadow-sm transition cursor-pointer"
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
