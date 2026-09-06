import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut as firebaseSignOut,
  sendSignInLinkToEmail,
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { FirestoreErrorInfo, OperationType } from "../types";

// Explicit configuration strictly bound to jindaltechnik (Project #543537240337)
export const firebaseConfig = {
  apiKey: "AIzaSyCyfVbM4mM2zmMRuggSGNeG4g24uZGeO7o",
  authDomain: "jindaltechnik.firebaseapp.com",
  projectId: "jindaltechnik",
  storageBucket: "jindaltechnik.firebasestorage.app",
  messagingSenderId: "543537240337",
  appId: "1:543537240337:web:e3391c6ca89e279bb5a3b8",
  firestoreDatabaseId: "ai-studio-059cf23a-d9c8-4a15-b4ce-d93cb5a1d55b",
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with explicit database ID from config with safe fallback
let firestoreDb;
try {
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreDb = getFirestore(app);
  }
} catch (e) {
  console.warn("Falling back to default Firestore database instance:", e);
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom Google Sign-In helper using signInWithPopup with redirect fallback
export const signInWithGoogle = async () => {
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.warn("signInWithPopup failed, attempting redirect flow fallback:", error?.code, error?.message);
    if (error?.code === "auth/popup-closed-by-user") {
      throw error;
    }
    // Fallback to full page redirect for popups, iframe policies, or cross-domain restrictions
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
};

export const signInAsGuest = async () => {
  return signInAnonymously(auth);
};

export const signOutUser = async () => {
  return firebaseSignOut(auth);
};

export const sendEmailVerificationLink = async (email: string) => {
  const baseUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : "https://jindaltechnik.firebaseapp.com";
  const actionCodeSettings = {
    url: baseUrl,
    handleCodeInApp: true,
  };
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem("tj_emailForSignIn", email);
  } catch (err: any) {
    if (err?.code === "auth/operation-not-allowed") {
      throw new Error(
        "Email Link (Magic Link) Sign-In is disabled in Firebase Console [auth/operation-not-allowed]. Enable 'Email/Password > Email link' in Firebase Console > Authentication > Sign-in method. You can still click 'Start Journaling' below to proceed immediately!"
      );
    }
    if (err?.code === "auth/invalid-continue-uri") {
      throw new Error(
        "Email Link Sign-In requires Passwordless Link activation in Firebase Console > Authentication > Sign-in method > Email/Password. You can still click 'Start Journaling' below to proceed immediately!"
      );
    }
    throw err;
  }
};

// Handle Firestore errors and serialize context for debugging
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error context:", JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

// Test Connection on boot quietly
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    // Quietly ignore initial connection check rejections during unauthenticated boot
  }
}

testConnection();
