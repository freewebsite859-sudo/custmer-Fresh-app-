import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />
      <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] shadow-2xl border border-[#e8e8e8] flex flex-col relative max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-4 border-b border-[#e8e8e8] bg-[#fff8f8]">
          <h3 className="text-[16px] font-extrabold text-[#26181c]">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#ffe8ed] flex items-center justify-center text-[#5a3f47] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
