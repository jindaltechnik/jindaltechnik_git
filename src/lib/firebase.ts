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
import rawFirebaseConfig from "../../firebase-applet-config.json";
import { FirestoreErrorInfo, OperationType } from "../types";

// Support environment variables with fallback to config json
const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId,
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

// Process redirect result if page redirected back from Google Auth
getRedirectResult(auth).catch((err) => {
  if (
    err?.code !== "auth/credential-already-in-use" &&
    err?.code !== "auth/invalid-continue-uri" &&
    err?.code !== "auth/null-user"
  ) {
    console.warn("Redirect sign-in result error:", err);
  }
});

// Custom Google Sign-In helper with iframe sandbox detection
export const signInWithGoogle = async () => {
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });

  const isIframe = typeof window !== "undefined" && window.self !== window.top;

  if (isIframe) {
    const iframeErr = new Error(
      "Google Sign-In popup is restricted inside the preview frame. Click 'Open Tab' to open the app in a standalone browser tab."
    );
    (iframeErr as any).code = "auth/iframe-popup-blocked";
    throw iframeErr;
  }

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.warn("signInWithPopup failed with code:", error?.code, error?.message);
    throw error;
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
    if (err?.code === "auth/invalid-continue-uri") {
      throw new Error(
        "Email Link Sign-In requires Passwordless Link activation. Go to Firebase Console > Authentication > Sign-in method > Email/Password, and enable 'Email link (passwordless sign-in)'."
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
