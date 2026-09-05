import React, { useState } from "react";
import { ShieldCheck, X, Copy, Check, ExternalLink, Key, Globe, Lock } from "lucide-react";

interface OAuthDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OAuthDomainModal: React.FC<OAuthDomainModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const authorizedDomains = [
    currentHost || "ais-dev-nbv3wmmc5spawqfbywdt2z-652370691945.asia-southeast1.run.app",
    "ais-pre-nbv3wmmc5spawqfbywdt2z-652370691945.asia-southeast1.run.app",
    "jindaltechnik.firebaseapp.com",
    "jindaltechnik.web.app",
    "jindaltechnik.vercel.app",
    "jindaltechnik.com",
    "localhost",
  ];

  const authorizedOrigins = [
    currentOrigin || "https://ais-dev-nbv3wmmc5spawqfbywdt2z-652370691945.asia-southeast1.run.app",
    "https://ais-pre-nbv3wmmc5spawqfbywdt2z-652370691945.asia-southeast1.run.app",
    "https://jindaltechnik.com",
    "https://jindaltechnik.vercel.app",
    "http://localhost:3000",
  ];

  const authorizedRedirectUris = [
    "https://jindaltechnik.firebaseapp.com/__/auth/handler",
    "https://jindaltechnik.web.app/__/auth/handler",
    `${currentOrigin}/__/auth/handler`,
    "http://localhost:3000/__/auth/handler",
  ];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#E5E0D8] rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl text-[#2D2926] max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E0D8] bg-[#F0EDE8]/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#E8EAE0] text-[#5A5A40] border border-[#D8DBC7] flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-normal font-serif text-[#4A443D]">
                Google Cloud & Firebase OAuth URIs
              </h3>
              <p className="text-xs text-[#8A847C]">
                Exact Auth Handler Redirect URIs and Authorized Domains for JindalTechnik
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

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#5A544D]">
          {/* Active Browser Domain Highlight */}
          {currentHost && (
            <div className="p-4 bg-[#E8EAE0]/80 border border-[#D8DBC7] rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#5A5A40] font-bold block mb-0.5">
                  Your Current Active Browser Domain
                </span>
                <span className="font-mono text-xs font-semibold text-[#2D2926]">
                  {currentHost}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(currentHost, "active_host")}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A35] text-white rounded-xl text-xs font-medium transition cursor-pointer"
              >
                {copiedKey === "active_host" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Domain</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Notice Box */}
          <div className="p-4 bg-[#F7F5F2] border border-[#E5E0D8] rounded-2xl flex items-start space-x-3">
            <Lock className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-[#2D2926]">
                Why is Google Sign-In asking for Authorized URIs?
              </p>
              <p className="text-[#8A847C] leading-relaxed">
                Google OAuth requires all callback handlers and domain origins to be registered in both the <strong className="text-[#4A443D]">Firebase Console</strong> and <strong className="text-[#4A443D]">Google Cloud Console Credentials</strong> to prevent unauthorized domain impersonation.
              </p>
            </div>
          </div>

          {/* 1. Firebase Authorized Domains */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-[#4A443D] flex items-center gap-1.5 font-serif">
                <Globe className="w-4 h-4 text-[#5A5A40]" />
                1. Firebase Authorized Domains
              </h4>
              <a
                href="https://console.firebase.google.com/project/jindaltechnik/authentication/settings"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#5A5A40] hover:underline flex items-center gap-1 font-medium"
              >
                Open Firebase Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[#8A847C] mb-3">
              Add these hostnames under <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</strong>:
            </p>
            <div className="space-y-1.5">
              {authorizedDomains.map((dom, idx) => (
                <div
                  key={dom + idx}
                  className="flex items-center justify-between p-2.5 bg-[#F7F5F2] border border-[#E5E0D8] rounded-xl font-mono text-[11px]"
                >
                  <span className="text-[#2D2926] truncate pr-2">{dom}</span>
                  <button
                    onClick={() => copyToClipboard(dom, `dom_${idx}`)}
                    className="p-1 text-[#8A847C] hover:text-[#5A5A40] hover:bg-[#E8EAE0] rounded transition cursor-pointer"
                    title="Copy domain"
                  >
                    {copiedKey === `dom_${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Authorized Redirect URIs (Auth Handlers) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-[#4A443D] flex items-center gap-1.5 font-serif">
                <Key className="w-4 h-4 text-[#5A5A40]" />
                2. Authorized Redirect URIs (Auth Handlers)
              </h4>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#5A5A40] hover:underline flex items-center gap-1 font-medium"
              >
                Open GCP Credentials <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[#8A847C] mb-3">
              Add these URIs under <strong>Google Cloud Console &gt; Credentials &gt; Web Client ID &gt; Authorized Redirect URIs</strong>:
            </p>
            <div className="space-y-1.5">
              {authorizedRedirectUris.map((uri, idx) => (
                <div
                  key={uri + idx}
                  className="flex items-center justify-between p-2.5 bg-[#F7F5F2] border border-[#E5E0D8] rounded-xl font-mono text-[11px]"
                >
                  <span className="text-[#2D2926] truncate pr-2">{uri}</span>
                  <button
                    onClick={() => copyToClipboard(uri, `uri_${idx}`)}
                    className="p-1 text-[#8A847C] hover:text-[#5A5A40] hover:bg-[#E8EAE0] rounded transition cursor-pointer"
                    title="Copy URI"
                  >
                    {copiedKey === `uri_${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Authorized JavaScript Origins */}
          <div>
            <h4 className="font-semibold text-sm text-[#4A443D] mb-2 font-serif flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#5A5A40]" />
              3. Authorized JavaScript Origins
            </h4>
            <p className="text-[#8A847C] mb-3">
              Add these base origins under <strong>Google Cloud Console &gt; Credentials &gt; Web Client ID &gt; Authorized JavaScript Origins</strong>:
            </p>
            <div className="space-y-1.5">
              {authorizedOrigins.map((orig, idx) => (
                <div
                  key={orig + idx}
                  className="flex items-center justify-between p-2.5 bg-[#F7F5F2] border border-[#E5E0D8] rounded-xl font-mono text-[11px]"
                >
                  <span className="text-[#2D2926] truncate pr-2">{orig}</span>
                  <button
                    onClick={() => copyToClipboard(orig, `orig_${idx}`)}
                    className="p-1 text-[#8A847C] hover:text-[#5A5A40] hover:bg-[#E8EAE0] rounded transition cursor-pointer"
                    title="Copy origin"
                  >
                    {copiedKey === `orig_${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F0EDE8]/50 border-t border-[#E5E0D8] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#8A847C]">
            JindalTechnik Security Standard
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A35] text-white font-medium uppercase tracking-wider text-xs rounded-full transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
