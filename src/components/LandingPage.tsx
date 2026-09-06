import React, { useState } from "react";
import { ShieldCheck, Lock, Sparkles, BookOpen, ArrowRight, Key, Layers, Globe, UserCheck, ExternalLink } from "lucide-react";
import { signInWithGoogle, signInAsGuest } from "../lib/firebase";
import { OAuthDomainModal } from "./OAuthDomainModal";

interface LandingPageProps {
  onOpenDeployGuide: () => void;
  onOpenGuestRegistration: () => void;
  onInstantGuest: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenDeployGuide, onOpenGuestRegistration, onInstantGuest }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const isIframe = typeof window !== "undefined" && window.self !== window.top;

  const handleCopyDomain = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.warn("Google Sign-In caught error:", err);
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user") {
        setError("Sign-in popup window was closed.");
      } else if (code === "auth/popup-blocked" || code === "auth/iframe-popup-blocked") {
        setError("Popup blocked by browser. Retrying redirect mode...");
      } else if (code === "auth/unauthorized-domain") {
        const currentHost = typeof window !== "undefined" ? window.location.hostname : "jindaltechnik.com";
        setError(`Domain '${currentHost}' needs to be added in Firebase Console > Authentication > Settings > Authorized Domains. Click 'Continue in Private Session Mode' below to start immediately.`);
      } else {
        setError(`Google Sign-In was unable to complete (${err?.message || code || "Unknown error"}). You can also continue in Private Session Mode below.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewTab = () => {
    if (typeof window !== "undefined") {
      window.open(window.location.href, "_blank");
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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs text-left space-y-2">
              <p className="font-medium">{error}</p>
              {error.includes("Domain Unauthorized") && (
                <div className="pt-2 border-t border-red-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <button
                    onClick={handleCopyDomain}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-mono font-medium transition cursor-pointer"
                  >
                    <span>{copiedDomain ? "Copied!" : `Copy '${window.location.hostname}'`}</span>
                  </button>
                  <a
                    href="https://console.firebase.google.com/project/jindaltechnik/authentication/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-red-700 font-semibold hover:underline"
                  >
                    <span>Open Firebase Settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {(error.includes("invalid-continue-uri") || error.includes("unauthorized-domain") || error.includes("preview links") || error.includes("Google Sign-In") || error.includes("OAuth Error")) && (
                <div className="pt-2 border-t border-red-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <button
                    onClick={onInstantGuest}
                    className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-[#5A5A40] hover:bg-[#4A4A35] text-white rounded-xl font-medium transition cursor-pointer shadow-sm"
                  >
                    <span>Continue with Private Session</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {isIframe && (
            <div className="mb-6 p-3 bg-[#F0EDE8] border border-[#D8DBC7] rounded-2xl flex items-center justify-between text-xs text-[#5A5A40]">
              <span className="text-[11px] text-[#5A544D] text-left pr-2">
                Previewing inside iframe? Open in standalone tab for seamless Google OAuth.
              </span>
              <button
                onClick={handleOpenNewTab}
                className="shrink-0 flex items-center space-x-1 font-semibold text-[#5A5A40] hover:underline cursor-pointer"
              >
                <span>Open Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
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
            onClick={onInstantGuest}
            className="w-full flex items-center justify-center space-x-2 bg-[#F0EDE8] hover:bg-[#E8EAE0] text-[#5A5A40] border border-[#D8DBC7] font-medium uppercase tracking-wider text-xs py-3.5 px-6 rounded-full transition duration-200 cursor-pointer shadow-sm hover:shadow"
          >
            <UserCheck className="w-4 h-4 text-[#5A5A40]" />
            <span>Continue with Quick Guest Session</span>
          </button>

          <div className="mt-6 pt-4 border-t border-[#E5E0D8] flex items-center justify-between text-[11px] text-[#8A847C]">
            <span className="flex items-center text-[#2D4F38] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#385244]" />
              Strict Encrypted Isolation
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
            <h3 className="text-sm font-semibold text-[#4A443D] mb-1.5 font-serif">Private Session Isolation</h3>
            <p className="text-xs text-[#5A544D] leading-relaxed">
              Your journal entries and reflection threads are completely isolated to your personal session account.
            </p>
          </div>

          <div className="bg-[#F0EDE8] border border-[#E5E0D8] rounded-[24px] p-6">
            <div className="w-10 h-10 bg-[#E8EAE0] border border-[#D8DBC7] text-[#5A5A40] rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#4A443D] mb-1.5 font-serif">Gemini 3.6 Reflections</h3>
            <p className="text-xs text-[#5A544D] leading-relaxed">
              Multi-turn conversations & executive AI summaries powered by Google's latest Gemini 3.6 Flash model.
            </p>
          </div>

          <div className="bg-[#F0EDE8] border border-[#E5E0D8] rounded-[24px] p-6">
            <div className="w-10 h-10 bg-[#E8EAE0] border border-[#D8DBC7] text-[#5A5A40] rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#4A443D] mb-1.5 font-serif">Executive Synthesis</h3>
            <p className="text-xs text-[#5A544D] leading-relaxed">
              Transform deep personal journal reflections into clear executive summaries and actionable insights.
            </p>
          </div>
        </div>
      </main>

      {/* OAuth Domain Helper Modal */}
      <OAuthDomainModal
        isOpen={isOAuthModalOpen}
        onClose={() => setIsOAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#E5E0D8] py-8 text-center text-xs text-[#8A847C]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span>TJ Secure AI Journal &bull; Built with JindalTechnik Architecture</span>
            <span className="bg-[#E8EAE0] text-[#5A5A40] border border-[#D8DBC7] text-[10px] font-mono px-2 py-0.5 rounded-full">
              Project: jindaltechnik
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <button
              onClick={() => setIsOAuthModalOpen(true)}
              className="hover:underline hover:text-[#2D2926] cursor-pointer"
            >
              Developer OAuth Config
            </button>
            <span>&bull;</span>
            <button
              onClick={onOpenDeployGuide}
              className="hover:underline hover:text-[#2D2926] cursor-pointer"
            >
              Vercel / GCP Specs
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
