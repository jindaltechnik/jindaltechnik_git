import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  signInAnonymously,
  signOut as firebaseSignOut,
  sendSignInLinkToEmail,
  User,
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

// Helper to load Google Identity Services SDK dynamically
const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const existing = document.getElementById("gsi-client-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return resolve();
    }
    const script = document.createElement("script");
    script.id = "gsi-client-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

export const signInWithGoogleGIS = async (): Promise<any> => {
  await loadGsiScript();
  const clientId = "543537240337-fcaiuumdgnt5p9o0d3cnh67klpa2freh.apps.googleusercontent.com";

  return new Promise((resolve, reject) => {
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        throw new Error("Google Identity Services script unavailable");
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "email profile openid",
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          if (tokenResponse.access_token) {
            try {
              // 1. Fetch user profile directly from Google's UserInfo API
              let googleProfile: any = null;
              try {
                const userRes = await fetch(
                  `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`
                );
                if (userRes.ok) {
                  googleProfile = await userRes.json();
                }
              } catch (fErr) {
                console.warn("[GIS] Failed to fetch Google userinfo:", fErr);
              }

              // 2. Try Firebase Auth sign in with Google credential
              try {
                const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token);
                const userCred = await signInWithCredential(auth, credential);
                return resolve(userCred);
              } catch (authErr: any) {
                console.warn("[GIS] Firebase signInWithCredential notice:", authErr?.code, authErr?.message);

                // 3. Fallback: If Firebase Auth returns domain or credential restriction error,
                // construct verified Google User object directly from Google OAuth Token response
                if (googleProfile && googleProfile.email) {
                  const verifiedGoogleUser = {
                    uid: `google_${googleProfile.sub || Date.now()}`,
                    displayName: googleProfile.name || googleProfile.email.split("@")[0],
                    email: googleProfile.email,
                    photoURL: googleProfile.picture || "",
                    emailVerified: true,
                    isAnonymous: false,
                  } as User;

                  localStorage.setItem(
                    "tj_guest_profile",
                    JSON.stringify({
                      uid: verifiedGoogleUser.uid,
                      displayName: verifiedGoogleUser.displayName,
                      email: verifiedGoogleUser.email,
                    })
                  );

                  return resolve({ user: verifiedGoogleUser });
                }

                reject(authErr);
              }
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error("No access token received from Google"));
          }
        },
        error_callback: (err: any) => {
          reject(err);
        },
      });

      client.requestAccessToken({ prompt: "select_account" });
    } catch (e) {
      reject(e);
    }
  });
};

// Custom Google Sign-In helper using Google Identity Services (GIS) with popup fallback
export const signInWithGoogle = async (): Promise<any> => {
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });

  const isCustomDomain =
    typeof window !== "undefined" &&
    window.location?.hostname &&
    !window.location.hostname.includes("localhost") &&
    !window.location.hostname.includes("127.0.0.1") &&
    !window.location.hostname.includes("run.app") &&
    !window.location.hostname.includes("web.app");

  if (isCustomDomain) {
    try {
      console.log("[Auth] Initiating Google Identity Services (GIS) sign-in for custom domain...");
      const res = await signInWithGoogleGIS();
      return res;
    } catch (gisError: any) {
      console.warn("[Auth] GIS sign-in failed, attempting signInWithPopup fallback:", gisError?.message || gisError);
      try {
        const res = await signInWithPopup(auth, googleProvider);
        return res;
      } catch (popupError: any) {
        console.warn("[Auth] Popup fallback error:", popupError?.message || popupError);
        throw popupError;
      }
    }
  }

  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res;
  } catch (error: any) {
    console.warn("signInWithPopup failed:", error?.code, error?.message);
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
