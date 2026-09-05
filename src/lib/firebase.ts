import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { FirestoreErrorInfo, OperationType } from "../types";

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

// Process redirect result if page redirected back from Google Auth
getRedirectResult(auth).catch((err) => {
  if (err?.code !== "auth/credential-already-in-use") {
    console.warn("Redirect sign-in result error:", err);
  }
});

// Custom Google Sign-In helper with iframe sandbox detection
export const signInWithGoogle = async () => {
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });

  const isIframe = typeof window !== "undefined" && window.self !== window.top;

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.warn("signInWithPopup failed with code:", error?.code, error?.message);

    // If running inside a sandboxed iframe, Google OAuth blocks redirecting the frame (X-Frame-Options: DENY)
    if (isIframe) {
      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/cancelled-popup-request" ||
        error?.code === "auth/internal-error"
      ) {
        const iframeErr = new Error(
          "Google Sign-In popup was restricted by browser iframe sandbox. Please open the app in a new tab or use Quick Guest Session below."
        );
        (iframeErr as any).code = "auth/iframe-popup-blocked";
        throw iframeErr;
      }
    } else {
      // Outside iframe: attempt redirect fallback
      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/cancelled-popup-request" ||
        error?.code === "auth/internal-error"
      ) {
        console.log("Attempting signInWithRedirect fallback outside iframe...");
        return await signInWithRedirect(auth, googleProvider);
      }
    }
    throw error;
  }
};

export const signInAsGuest = async () => {
  return signInAnonymously(auth);
};

export const signOutUser = async () => {
  return firebaseSignOut(auth);
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

// Test Connection on boot as required by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("client is offline")) {
      console.warn("Firestore connection check: Client is currently offline or initial connection pending.");
    }
  }
}

testConnection();
