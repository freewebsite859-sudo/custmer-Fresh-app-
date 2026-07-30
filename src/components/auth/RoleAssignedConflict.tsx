import React from 'react';
import { motion } from 'framer-motion';

interface RoleAssignedConflictProps {
  existingRole?: string;
  onLogin: () => void;
  onUseAnotherEmail: () => void;
  onContactSupport: () => void;
}

export const RoleAssignedConflict: React.FC<RoleAssignedConflictProps> = ({
  existingRole = 'Existing Role',
  onLogin,
  onUseAnotherEmail,
  onContactSupport,
}) => {
  return (
    <div className="fixed inset-0 z-[60] bg-[#fcf9f8] text-[#26181c] font-sans overflow-hidden flex flex-col">
      {/* Subtle Ambient Background Decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg className="absolute top-[-10%] right-[-10%] w-[80%] opacity-20" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path d="M44.7,-76.4C58.3,-69.2,70.1,-57.4,78.6,-43.3C87.1,-29.2,92.3,-12.8,91.2,3.2C90.1,19.2,82.7,34.8,72.4,48.3C62,61.8,48.7,73.1,33.5,79.5C18.3,85.9,1.1,87.4,-16.1,84.6C-33.3,81.8,-50.5,74.7,-64.1,62.8C-77.7,50.9,-87.7,34.2,-91.6,16.5C-95.5,-1.2,-93.3,-19.9,-84.9,-35.8C-76.5,-51.7,-61.9,-64.8,-45.9,-71C-29.9,-77.2,-12.5,-76.5,2.4,-80.7C17.3,-84.9,31.1,-83.6,44.7,-76.4Z" fill="#ffd9e2" transform="translate(100 100)"></path>
        </svg>
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center max-w-md mx-auto">
        {/* Visual Illustration Container */}
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          {/* Animated Background Pulse */}
          <div className="absolute inset-0 bg-[#fce2e7] rounded-full opacity-30 animate-pulse" />
          
          {/* Minimalist Conflict Illustration */}
          <div className="relative flex items-center justify-center">
            <div className="relative z-20 bg-white p-6 rounded-[22px] shadow-sm border border-[#e8e8e8]">
              <span className="material-symbols-outlined text-[64px] text-[#e6007e] select-none" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>
                account_circle
              </span>
            </div>
            {/* Floating Key/Access Indicator */}
            <div className="absolute -top-2 -right-2 bg-[#b90064] p-2.5 rounded-full shadow-md animate-bounce" style={{ animationDuration: '3s' }}>
              <span className="material-symbols-outlined text-white text-xl">key</span>
            </div>
            {/* Warning Badge */}
            <div className="absolute -bottom-1 -left-1 bg-[#ffdad6] p-2 rounded-full shadow-md">
              <span className="material-symbols-outlined text-[#ba1a1a] text-lg">priority_high</span>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-2 max-w-[320px]">
          <h1 className="text-xl font-bold text-[#26181c]">
            Role Already Assigned
          </h1>
          <p className="text-sm text-[#5a3f47] leading-relaxed">
            यह email पहले से <span className="text-[#e6007e] font-semibold">[{existingRole}]</span> account से जुड़ी है।
          </p>
          <p className="text-xs text-[#5a3f47]/80 mt-1">
            एक email से केवल एक role बनाया जा सकता है। दूसरे role के लिए दूसरी email ID इस्तेमाल करें।
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col w-full gap-4 mt-8">
          <button 
            onClick={onLogin}
            className="w-full h-[54px] bg-[#e6007e] text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">login</span>
            Login to Existing Account
          </button>
          <button 
            onClick={onUseAnotherEmail}
            className="w-full h-[54px] bg-[#fde7f3] text-[#e6007e] font-bold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-[#f3c2dc]"
          >
            <span className="material-symbols-outlined text-xl">alternate_email</span>
            Use Another Email
          </button>
        </div>

        {/* Help Link */}
        <button 
          onClick={onContactSupport}
          className="mt-10 text-xs font-bold text-[#5a3f47] flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
        >
          <span className="material-symbols-outlined text-sm">help</span>
          Need help merging accounts?
        </button>
      </main>
    </div>
  );
};
