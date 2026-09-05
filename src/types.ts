export type EntryCategory =
  | "Personal"
  | "Work"
  | "Deep Thought"
  | "Gratitude"
  | "Ideas"
  | "Reflections";

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  category: EntryCategory;
  mood?: string;
  summary?: string;
  lastPrompt?: string;
  lastAiResponse?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalMessage {
  id: string;
  entryId: string;
  userId: string;
  role: "user" | "model";
  content: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
