import React, { useState } from "react";
import { UserCheck, X, Mail, User as UserIcon, ArrowRight, ShieldCheck, Send, CheckCircle2, Lock } from "lucide-react";
import { sendEmailVerificationLink } from "../lib/firebase";

interface GuestRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: { firstName: string; lastName: string; email: string }) => void;
}

export const GuestRegistrationModal: React.FC<GuestRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  if (!isOpen) return null;

  const handleSendMagicLink = async () => {
    setError(null);
    setInfoMessage(null);

    const emailAddr = email.trim();
    if (!emailAddr || !emailAddr.includes("@") || !emailAddr.includes(".")) {
      setError("Please enter a valid email address to send the verification link.");
      return;
    }

    setSendingLink(true);
    try {
      await sendEmailVerificationLink(emailAddr);
      setInfoMessage(`Verification link sent to ${emailAddr}! Check your inbox to verify ownership.`);
    } catch (err: any) {
      console.warn("Failed to send verification email link:", err);
      if (err?.message?.includes("auth/operation-not-allowed") || err?.code === "auth/operation-not-allowed") {
        setInfoMessage("Email Link verification is disabled in Firebase Console, but no problem! Click 'START JOURNALING' below to enter your private session right now.");
      } else {
        setError(err?.message || "Failed to send verification email link. You can click 'START JOURNALING' below to proceed immediately!");
      }
    } finally {
      setSendingLink(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fName = firstName.trim();
    const lName = lastName.trim();
    const emailAddr = email.trim();

    if (!fName || !lName) {
      setError("Please enter both your First Name and Last Name.");
      return;
    }

    if (!emailAddr || !emailAddr.includes("@") || !emailAddr.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      onSubmit({ firstName: fName, lastName: lName, email: emailAddr });
    } catch (err: any) {
      setError(err?.message || "Failed to start guest session.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#E5E0D8] rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl text-[#2D2926]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E0D8] bg-[#F0EDE8]/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#E8EAE0] text-[#5A5A40] border border-[#D8DBC7] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-normal font-serif text-[#4A443D]">
                Guest Session Identity
              </h3>
              <p className="text-xs text-[#8A847C]">
                Enter profile details to label your session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A847C] hover:text-[#2D2926] p-1.5 rounded-full hover:bg-[#E8EAE0] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs text-left">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs text-left flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#4A443D] mb-1.5">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-[#8A847C]" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Tarun"
                  className="w-full bg-[#F7F5F2] border border-[#E5E0D8] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-[#2D2926] placeholder-[#A39D94] outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A443D] mb-1.5">
                Last Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-[#8A847C]" />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Jindal"
                  className="w-full bg-[#F7F5F2] border border-[#E5E0D8] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-[#2D2926] placeholder-[#A39D94] outline-none transition"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#4A443D]">
                Email Address <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleSendMagicLink}
                disabled={sendingLink}
                className="text-[11px] text-[#5A5A40] hover:underline font-medium flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{sendingLink ? "Sending..." : "Verify via Magic Link"}</span>
              </button>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#8A847C]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@jindaltechnik.com"
                className="w-full bg-[#F7F5F2] border border-[#E5E0D8] focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-[#2D2926] placeholder-[#A39D94] outline-none transition"
              />
            </div>
          </div>

          {/* Security Notice Box */}
          <div className="p-3 bg-[#F0EDE8] border border-[#E5E0D8] rounded-2xl text-[11px] text-[#5A544D] space-y-1 text-left">
            <div className="font-semibold text-[#4A443D] flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>Zero-Impersonation Isolation Guarantee</span>
            </div>
            <p className="text-[10px] leading-relaxed text-[#7A746D]">
              Local guest sessions are strictly isolated to your browser. Typing another person's email address will <strong>NEVER</strong> show or expose their cloud journals, because cloud data is strictly protected by Firebase Auth UID rules.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 text-xs font-medium text-[#5A544D] hover:text-[#2D2926] bg-[#F0EDE8] hover:bg-[#E8EAE0] border border-[#D8DBC7] rounded-full transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-3 text-xs font-medium uppercase tracking-wider text-white bg-[#5A5A40] hover:bg-[#4A4A35] rounded-full shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Start Journaling</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-[#E5E0D8] flex items-center justify-center text-[10px] text-[#8A847C] space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Strict Client Sandbox & Firebase Rules Active</span>
          </div>
        </form>
      </div>
    </div>
  );
};
