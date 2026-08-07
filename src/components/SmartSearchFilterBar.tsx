import React from 'react';
import { motion } from 'framer-motion';

interface SmartSearchFilterBarProps {
  activeFilter: 'all' | 'top-rated-city' | 'top-nexora';
  userCity: string;
  onSelectFilter: (filter: 'all' | 'top-rated-city' | 'top-nexora') => void;
}

export const SmartSearchFilterBar: React.FC<SmartSearchFilterBarProps> = ({
  activeFilter,
  userCity,
  onSelectFilter,
}) => {
  const cityDisplayName = userCity || 'your area';

  const handleSelectFilter = (filter: 'all' | 'top-rated-city' | 'top-nexora') => {
    const nextFilter = activeFilter === filter ? 'all' : filter;
    onSelectFilter(nextFilter);

    if (nextFilter === 'top-rated-city') {
      setTimeout(() => {
        const el = document.getElementById('top-rated-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    } else if (nextFilter === 'top-nexora') {
      setTimeout(() => {
        const el = document.getElementById('top-nexora-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8c7077] flex items-center gap-1 shrink-0">
          <span className="material-symbols-outlined text-[14px] text-[#e6007e]">auto_awesome</span>
          Smart Discovery Filters
        </span>
        <span className="text-[10px] text-[#e6007e] font-bold bg-[#fde7f3] px-2.5 py-1 rounded-full border border-[#f3c2dc] shrink-0 whitespace-nowrap shadow-2xs">
          Real-Time Business Data
        </span>
      </div>

      <div className="flex flex-row flex-nowrap items-center gap-2 overflow-x-auto scroll-smooth scrollbar-none no-scrollbar snap-x px-0.5 py-1 touch-pan-x select-none w-full max-w-full">
        {/* All / Default Filter */}
        <button
          type="button"
          onClick={() => handleSelectFilter('all')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 snap-start shrink-0 border select-none active:scale-95 ${
            activeFilter === 'all'
              ? 'bg-[#26181c] text-white border-[#26181c] shadow-md ring-2 ring-[#26181c]/20'
              : 'bg-white text-[#5a3f47] border-[#f0d8e2] hover:bg-[#fff0f3] hover:border-[#e0bec6]'
          }`}
        >
          <span className={`material-symbols-outlined text-[17px] ${activeFilter === 'all' ? 'text-[#e6007e]' : 'text-[#8e004b]'}`}>
            grid_view
          </span>
          <span className={activeFilter === 'all' ? 'text-white font-extrabold' : 'text-[#26181c] font-bold'}>
            All Salons
          </span>
        </button>

        {/* 1. Top Rated in City */}
        <button
          type="button"
          onClick={() => handleSelectFilter('top-rated-city')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl text-[12px] font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 snap-start shrink-0 border relative select-none active:scale-95 ${
            activeFilter === 'top-rated-city'
              ? 'bg-[#26181c] text-white border-amber-400 shadow-md ring-2 ring-amber-400/40'
              : 'bg-amber-50/90 text-amber-950 border-amber-300 hover:bg-amber-100/90 hover:border-amber-400 shadow-2xs'
          }`}
        >
          <span className="text-[14px]">⭐</span>
          <span className={activeFilter === 'top-rated-city' ? 'text-white font-extrabold' : 'text-amber-950 font-extrabold'}>
            Top Rated in {cityDisplayName}
          </span>
          {activeFilter === 'top-rated-city' && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs ml-0.5 animate-pulse" />
          )}
        </button>

        {/* 2. Top Salon by Nexora */}
        <button
          type="button"
          onClick={() => handleSelectFilter('top-nexora')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl text-[12px] font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 snap-start shrink-0 border relative select-none active:scale-95 ${
            activeFilter === 'top-nexora'
              ? 'bg-[#8e004b] text-white border-[#e6007e] shadow-md ring-2 ring-pink-400/40'
              : 'bg-[#fff0f5] text-[#8e004b] border-[#fcd5e8] hover:bg-[#fde7f3] hover:border-[#f9b5d8] shadow-2xs'
          }`}
        >
          <span className="text-[14px]">🏆</span>
          <span className={activeFilter === 'top-nexora' ? 'text-white font-extrabold' : 'text-[#8e004b] font-extrabold'}>
            Top Salon by Nexora
          </span>
          {activeFilter === 'top-nexora' && (
            <span className="w-2 h-2 rounded-full bg-white shadow-xs ml-0.5 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};
