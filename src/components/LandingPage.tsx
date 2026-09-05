import React, { useState } from "react";
import { ShieldCheck, Lock, Sparkles, BookOpen, ArrowRight, Key, Layers, Globe, UserCheck } from "lucide-react";
import { signInWithGoogle, signInAsGuest } from "../lib/firebase";

interface LandingPageProps {
  onOpenDeployGuide: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenDeployGuide }) => {
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      const code = err?.code || "";
      if (code === "auth/unauthorized-domain") {
        setError(
          "Domain Unauthorized: Please add your current domain (e.g. JindalTechnik.com or preview URL) to Firebase Console > Authentication > Settings > Authorized Domains."
        );
      } else if (code === "auth/popup-blocked") {
        setError("Sign-in popup was blocked by your browser or iframe. Try 'Quick Guest Session' below or open the app in a new browser tab.");
      } else if (code === "auth/popup-closed-by-user") {
        setError("Google sign-in popup was closed before completing.");
      } else {
        setError(err?.message || "Google sign-in failed. Try Quick Guest Session below.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setGuestLoading(true);
      setError(null);
      await signInAsGuest();
    } catch (err: any) {
      console.error("Guest sign-in failed:", err);
      setError(err?.message || "Failed to start guest session.");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#2D2926] flex flex-col justify-between font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Decorative Natural Shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E8EAE0] rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#F0EDE8] rounded-full blur-3xl"></div>
      </div>

      {/* Main Hero & Auth Section */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center justify-center text-center">
        {/* Brand Eyebrow */}
        <div className="inline-flex items-center space-x-2 bg-[#F0EDE8] border border-[#E5E0D8] text-[#5A5A40] text-xs uppercase tracking-widest px-4 py-1.5 rounded-full mb-8 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-[#5A5A40]" />
          <span>Powered by JindalTechnik</span>
          <span className="text-[#A39D94]">•</span>
          <span className="text-[#8A847C]">JindalTechnik.com</span>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-4xl sm:text-6xl font-normal font-serif tracking-tight text-[#4A443D] max-w-3xl mb-6 leading-tight">
          TJ Secure <span className="italic text-[#5A5A40]">AI Journal</span>
        </h1>
        <p className="text-lg sm:text-xl text-[#5A544D] max-w-2xl mb-12 leading-relaxed font-normal">
          An isolated, user-authenticated reflection canvas powered by <strong className="text-[#2D2926]">Gemini 3.6 Flash</strong> and encrypted <strong className="text-[#2D2926]">Cloud Firestore</strong> for private multi-turn journaling.
        </p>

        {/* Authentication Card */}
        <div className="w-full max-w-md bg-white border border-[#E5E0D8] rounded-[32px] p-8 shadow-sm relative">
          <div className="flex items-center justify-center w-12 h-12 bg-[#E8EAE0] border border-[#D8DBC7] rounded-full mx-auto mb-5 text-[#5A5A40]">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-normal font-serif text-[#4A443D] mb-2">
            Access Your Private Journal
          </h2>
          <p className="text-xs text-[#8A847C] mb-8 leading-relaxed">
            Sign in with your Google Account to encrypt & isolate your journal entries under your private UID.
          </p>

          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs text-left">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-[#5A5A40] hover:bg-[#4A4A35] text-white font-medium uppercase tracking-wider text-xs py-4 px-6 rounded-full shadow-sm transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E0D8]" />
            </div>
            <div className="relative bg-white px-3 text-[11px] text-[#A39D94] uppercase tracking-wider font-medium">
              or
            </div>
          </div>

          <button
            onClick={handleGuestSignIn}
            disabled={guestLoading || loading}
            className="w-full flex items-center justify-center space-x-2 bg-[#F0EDE8] hover:bg-[#E8EAE0] text-[#5A5A40] border border-[#D8DBC7] font-medium uppercase tracking-wider text-xs py-3 px-6 rounded-full transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            {guestLoading ? (
              <div className="w-4 h-4 border-2 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-[#5A5A40]" />
                <span>Continue with Quick Guest Session</span>
              </>
            )}
          </button>

          <div className="mt-6 pt-4 border-t border-[#E5E0D8] flex items-center justify-between text-[11px] text-[#8A847C]">
            <span className="flex items-center text-[#2D4F38] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#385244]" />
              Strict ABAC Security
            </span>
            <span>JindalTechnik Auth</span>
          </div>
        </div>

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-16 text-left">
          <div className="bg-[#F0EDE8] border border-[#E5E0D8] rounded-[24px] p-6">
            <div className="w-10 h-10 bg-[#E8EAE0] border border-[#D8DBC7] text-[#5A5A40] rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#4A443D] mb-1.5 font-serif">Firestore Isolation</h3>
            <p className="text-xs text-[#5A544D] leading-relaxed">
              Security rules mandate that entry path <code className="text-[#5A5A40] font-mono">/users/&#123;uid&#125;/entries</code> is accessible only by the authenticated owner.
            </p>
          </div>

          <div className="bg-[#F0EDE8] border border-[#E5E0D8] rounded-[24px] p-6">
            <div className="w-10 h-10 bg-[#E8EAE0] border border-[#D8DBC7] text-[#5A5A40] rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#4A443D] mb-1.5 font-serif">Gemini 3.6 Reflections</h3>
            <p className="text-xs text-[#5A544D] leading-relaxed">
              Multi-turn conversations & executive AI summaries with a resilient model fallback ladder (`gemini-3.6-flash`).
            </p>
          </div>

          <div className="bg-[#F0EDE8] border border-[#E5E0D8] rounded-[24px] p-6">
            <div className="w-10 h-10 bg-[#E8EAE0] border border-[#D8DBC7] text-[#5A5A40] rounded-2xl flex items-center justify-center mb-4">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#4A443D] mb-1.5 font-serif">Vercel & GCP Deployment</h3>
            <p className="text-xs text-[#5A544D] leading-relaxed">
              Configured for hosting on <strong className="text-[#2D2926]">JindalTechnik.com</strong> via git repo <code className="text-[#5A5A40] font-mono">googl-lab1-tjindal2026</code>.
            </p>
          </div>
        </div>

        {/* Deploy Guide Trigger */}
        <div className="mt-12">
          <button
            onClick={onOpenDeployGuide}
            className="inline-flex items-center space-x-2 text-xs font-medium uppercase tracking-widest text-[#5A544D] hover:text-[#2D2926] bg-[#E8EAE0] hover:bg-[#D8DBC7] px-5 py-2.5 rounded-full border border-[#D8DBC7] transition cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#5A5A40]" />
            <span>View Vercel & GCP Secret Manager Setup Specs</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#8A847C]" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#E5E0D8] py-8 text-center text-xs text-[#8A847C]">
        <p>© 2026 JindalTechnik. TJ Secure AI Journal. All Rights Reserved.</p>
      </footer>
    </div>
  );
};
