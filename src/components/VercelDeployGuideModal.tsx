import React, { useState } from "react";
import { X, Check, Copy, ExternalLink, ShieldCheck, Key, Globe, Layers, Cpu } from "lucide-react";

interface VercelDeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelDeployGuideModal: React.FC<VercelDeployGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const gcpCommands = `# 1. Enable Secret Manager in GCP Project 'jindaltechnik'
gcloud config set project jindaltechnik
gcloud services enable secretmanager.googleapis.com

# 2. Create GEMINI_API_KEY secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Create a Service Account for Vercel integration
gcloud iam service-accounts create vercel-jindaltechnik-sa \\
  --description="Service account for Vercel deployment of TJ Secure AI Journal" \\
  --display-name="Vercel JindalTechnik Service Account"

# 4. Grant Secret Manager Accessor role to the Service Account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \\
  --member="serviceAccount:vercel-jindaltechnik-sa@jindaltechnik.iam.gserviceaccount.com" \\
  --role="roles/secretmanager.secretAccessor"

# 5. Generate JSON Service Account Key for Vercel
gcloud iam service-accounts keys create vercel-sa-key.json \\
  --iam-account=vercel-jindaltechnik-sa@jindaltechnik.iam.gserviceaccount.com`;

  const vercelEnvVars = `GCP_SECRET_NAME=projects/jindaltechnik/secrets/GEMINI_API_KEY/versions/latest
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"jindaltechnik",...}
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
NODE_ENV=production`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-[#E5E0D8] rounded-[32px] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl text-[#2D2926] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E0D8] bg-[#F0EDE8]/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#E8EAE0] border border-[#D8DBC7] text-[#5A5A40] flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#5A5A40] bg-[#E8EAE0] border border-[#D8DBC7] px-2.5 py-0.5 rounded-full">
                  Deployment Specs
                </span>
                <span className="text-xs text-[#8A847C]">JindalTechnik.com</span>
              </div>
              <h3 className="text-lg font-normal font-serif text-[#4A443D]">Vercel & GCP Secret Manager Integration</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A847C] hover:text-[#2D2926] p-1.5 rounded-full hover:bg-[#E8EAE0] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Overview Info Card */}
          <div className="bg-[#F0EDE8] border border-[#E5E0D8] rounded-[24px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4A443D] flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#5A5A40]" /> Target Domain & Hosting
              </span>
              <span className="text-xs font-mono text-[#5A5A40] bg-[#E8EAE0] border border-[#D8DBC7] px-2.5 py-0.5 rounded-full">
                JindalTechnik.com (Vercel)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-[#5A544D] border-t border-[#E5E0D8]">
              <div>
                <strong>Git Repository:</strong> <code className="text-[#2D2926] font-mono">googl-lab1-tjindal2026</code>
              </div>
              <div>
                <strong>Account Target:</strong> <code className="text-[#2D2926] font-mono">laxmijindal634@gmail.com/jindaltechnik</code>
              </div>
              <div>
                <strong>Google Cloud Project:</strong> <code className="text-[#2D2926] font-mono">jindaltechnik</code>
              </div>
              <div>
                <strong>Firestore Database ID:</strong> <code className="text-[#2D2926] font-mono">ai-studio-059cf23a-d9c8-4a15-b4ce-d93cb5a1d55b</code>
              </div>
            </div>
          </div>

          {/* Step 1: Enable GCP Secret Manager & Get Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-normal font-serif text-base text-[#4A443D] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#5A5A40] text-white flex items-center justify-center text-xs font-sans">1</span>
                Get Your Gemini API Key & Create GCP Secret
              </h4>
              <button
                onClick={() => handleCopy(gcpCommands, "gcpCommands")}
                className="inline-flex items-center space-x-1 text-xs text-[#5A544D] hover:text-[#2D2926] bg-[#E8EAE0] hover:bg-[#D8DBC7] px-3 py-1.5 rounded-full border border-[#D8DBC7] transition cursor-pointer"
              >
                {copiedSection === "gcpCommands" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === "gcpCommands" ? "Copied!" : "Copy CLI Commands"}</span>
              </button>
            </div>

            {/* Explainer callout */}
            <div className="bg-[#E8EAE0] border border-[#D8DBC7] rounded-[20px] p-4 text-xs text-[#4A443D] space-y-2 mb-3">
              <p className="font-medium text-[#2D2926]">
                🔑 What is <code className="bg-[#F0EDE8] px-1.5 py-0.5 rounded font-mono text-[#5A5A40]">YOUR_GEMINI_API_KEY</code>?
              </p>
              <p className="leading-relaxed text-[#5A544D]">
                It is your private secret key generated from <strong>Google AI Studio</strong> (e.g. starting with <code className="font-mono text-[#2D2926]">AIzaSy...</code>).
              </p>
              <div className="pt-2 border-t border-[#D8DBC7]/80">
                <p className="font-semibold text-[#4A443D] mb-1">Option A: Via Google Cloud Web Console (No terminal required)</p>
                <ol className="list-decimal list-inside space-y-1 text-[#5A544D] pl-1">
                  <li>Go to <strong>aistudio.google.com/app/apikey</strong> → Select project <strong>jindaltechnik</strong> → Click <strong>Create API Key</strong>. Copy the key (<code className="font-mono text-[#2D2926]">AIzaSy...</code>).</li>
                  <li>Open <strong>console.cloud.google.com</strong> → Select project <strong>jindaltechnik</strong>.</li>
                  <li>Search for <strong>Secret Manager</strong> → Click <strong>+ CREATE SECRET</strong>.</li>
                  <li>Name: <code className="font-mono font-bold text-[#5A5A40]">GEMINI_API_KEY</code></li>
                  <li>Secret Value: Paste your copied Gemini API key string.</li>
                  <li>Click <strong>Create Secret</strong>.</li>
                </ol>
              </div>
            </div>

            <p className="text-xs font-semibold text-[#4A443D] mb-1.5">Option B: Via gcloud Terminal CLI Commands:</p>
            <pre className="bg-[#F7F5F2] p-4 rounded-[20px] border border-[#E5E0D8] text-xs text-[#4A443D] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {gcpCommands}
            </pre>
          </div>

          {/* Step 2: Configure Environment Variables in Vercel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-normal font-serif text-base text-[#4A443D] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#5A5A40] text-white flex items-center justify-center text-xs font-sans">2</span>
                Add Vercel Environment Variables
              </h4>
              <button
                onClick={() => handleCopy(vercelEnvVars, "vercelEnvVars")}
                className="inline-flex items-center space-x-1 text-xs text-[#5A544D] hover:text-[#2D2926] bg-[#E8EAE0] hover:bg-[#D8DBC7] px-3 py-1.5 rounded-full border border-[#D8DBC7] transition cursor-pointer"
              >
                {copiedSection === "vercelEnvVars" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === "vercelEnvVars" ? "Copied!" : "Copy Variables"}</span>
              </button>
            </div>
            <p className="text-xs text-[#8A847C] mb-3">
              In Vercel Dashboard → Project Settings → Environment Variables, add:
            </p>
            <div className="space-y-2 text-xs">
              <div className="bg-[#F7F5F2] p-3.5 rounded-[16px] border border-[#E5E0D8]">
                <div className="font-mono text-[#5A5A40] font-bold">GCP_SECRET_NAME</div>
                <div className="text-[#5A544D] font-mono text-[11px] mt-0.5">projects/jindaltechnik/secrets/GEMINI_API_KEY/versions/latest</div>
              </div>
              <div className="bg-[#F7F5F2] p-3.5 rounded-[16px] border border-[#E5E0D8]">
                <div className="font-mono text-[#5A5A40] font-bold">GCP_SERVICE_ACCOUNT_KEY</div>
                <div className="text-[#5A544D] font-mono text-[11px] mt-0.5">The complete contents of the exported JSON service account key (vercel-sa-key.json)</div>
              </div>
            </div>
          </div>

          {/* Step 3: Deployment Verification */}
          <div className="bg-[#E2ECE5] border border-[#C8DBD0] rounded-[24px] p-5 text-[#385244] text-xs flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-[#385244] shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-[#2D4F38]">Security & Isolation Guaranteed</strong>
              <p className="mt-1 text-[#385244] leading-relaxed">
                The Firestore Security Rules have been built and deployed with owner-bound ABAC permissions. Every user entry is isolated to their specific Google authenticated UID.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E0D8] bg-[#F0EDE8]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A35] text-white font-medium uppercase tracking-wider text-xs rounded-full shadow-sm transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
