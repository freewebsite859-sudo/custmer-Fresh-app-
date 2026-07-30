import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#e8e8e8] rounded-xl ${className}`} />
);

export const SalonCardSkeleton: React.FC = () => (
  <div className="flex flex-col bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden border border-[#e8e8e8]">
    <Skeleton className="h-44 w-full rounded-none" />
    <div className="p-4 flex flex-col gap-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  </div>
);

export const ServiceItemSkeleton: React.FC = () => (
  <div className="flex gap-4 p-4 border-b border-[#f0f0f0]">
    <Skeleton className="w-16 h-16 rounded-xl" />
    <div className="flex-1 flex flex-col justify-center gap-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-4 w-1/4 mt-1" />
    </div>
  </div>
);

export const BookingSummarySkeleton: React.FC = () => (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-24 w-full" />
    <div className="flex gap-3">
      <Skeleton className="h-20 flex-1" />
      <Skeleton className="h-20 flex-1" />
    </div>
    <Skeleton className="h-32 w-full mt-2" />
  </div>
);
