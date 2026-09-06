import React from "react";
import { User } from "firebase/auth";
import { ShieldCheck, LogOut, Sparkles, BookOpen, ExternalLink, Key } from "lucide-react";
import { signOutUser } from "../lib/firebase";

interface HeaderProps {
  user: User | null;
  onSignOut: () => void;
  onNewEntry: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut, onNewEntry }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F7F5F2]/90 backdrop-blur-md border-b border-[#E5E0D8] text-[#2D2926] px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center shadow-sm border border-[#4A4A35]/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-[#8A847C]">
                Powered by JindalTechnik
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E8EAE0] text-[#5A5A40] border border-[#D8DBC7]">
                <ShieldCheck className="w-3 h-3 mr-1 text-[#5A5A40]" />
                Firestore Encrypted
              </span>
            </div>
            <h1 className="text-xl font-normal font-serif text-[#4A443D] tracking-tight flex items-center gap-1.5">
              TJ Secure AI Journal
            </h1>
          </div>
        </div>

        {/* Action Controls & User Identity */}
        <div className="flex items-center space-x-3">
          {user && (
            <>
              <button
                onClick={onNewEntry}
                className="inline-flex items-center space-x-1.5 text-xs uppercase tracking-widest font-medium bg-[#5A5A40] hover:bg-[#4A4A35] text-white px-4 py-2 rounded-full shadow-sm transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Entry</span>
              </button>

              <div className="h-6 w-px bg-[#E5E0D8] mx-1 hidden sm:block" />

              <div className="flex items-center space-x-2.5 bg-[#F0EDE8] px-3 py-1.5 rounded-full border border-[#E5E0D8]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-[#D8D3C8] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#5A5A40] text-white flex items-center justify-center font-semibold text-xs">
                    {(user.displayName || user.email || "G").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-[#4A443D] truncate max-w-[140px]">
                    {user.displayName || "Journal User"}
                  </div>
                  <div className="text-[10px] text-[#8A847C] truncate max-w-[140px]">
                    {user.email || "Quick Guest Session"}
                  </div>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="p-2 text-[#8A847C] hover:text-[#2D2926] hover:bg-[#E5E0D8] rounded-full transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
