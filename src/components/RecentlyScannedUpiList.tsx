import React, { useState, useEffect } from 'react';
import { SavedUpi } from './AddUpiModal';

interface RecentlyScannedUpiListProps {
  onDeleteUpi?: (id: string) => void;
  onSelectUpi?: (upi: SavedUpi) => void;
}

export const RecentlyScannedUpiList: React.FC<RecentlyScannedUpiListProps> = ({
  onDeleteUpi,
  onSelectUpi,
}) => {
  const [scannedList, setScannedList] = useState<SavedUpi[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadScannedUpis = () => {
    try {
      const saved = localStorage.getItem('nexora_saved_upis');
      if (saved) {
        const parsed: SavedUpi[] = JSON.parse(saved);
        const qrScanned = parsed.filter((item) => item.isQrScanned);
        setScannedList(qrScanned.slice(0, 3));
      } else {
        setScannedList([]);
      }
    } catch (e) {
      console.warn('Failed to parse nexora_saved_upis:', e);
    }
  };

  useEffect(() => {
    loadScannedUpis();

    // Listen for storage events across tabs or local updates
    const handleStorage = () => loadScannedUpis();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleCopy = (upiId: string, id: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    if (onDeleteUpi) {
      onDeleteUpi(id);
    } else {
      try {
        const saved = localStorage.getItem('nexora_saved_upis');
        if (saved) {
          const parsed: SavedUpi[] = JSON.parse(saved);
          const updated = parsed.filter((item) => item.id !== id);
          localStorage.setItem('nexora_saved_upis', JSON.stringify(updated));
          setScannedList(updated.filter((item) => item.isQrScanned).slice(0, 3));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="pt-3 border-t border-[#e8e8e8] flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#e6007e]">history</span>
          <p className="text-[13px] font-bold text-[#26181c]">Recently Scanned via QR</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#fde7f3] text-[#e6007e] border border-[#fcd5e8]">
          Last 3 Scans
        </span>
      </div>

      {/* List Container */}
      {scannedList.length > 0 ? (
        <div className="flex flex-col gap-2">
          {scannedList.map((scannedUpi) => (
            <div
              key={'recent-comp-' + scannedUpi.id}
              className="p-3 rounded-2xl bg-gradient-to-r from-[#fde7f3]/60 via-[#fff8f8] to-[#fff0f2] border border-[#fcd5e8] flex items-center justify-between shadow-2xs hover:border-[#e6007e]/40 transition-colors"
            >
              <div
                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                onClick={() => onSelectUpi && onSelectUpi(scannedUpi)}
              >
                <div className="w-8.5 h-8.5 rounded-xl bg-[#e6007e] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[17px]">qr_code_2</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] font-bold text-[#26181c] font-mono truncate">
                      {scannedUpi.upiId}
                    </p>
                    <span className="px-1.5 py-0.2 rounded bg-[#e6007e] text-white text-[8px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                      QR
                    </span>
                  </div>
                  <p className="text-[10px] text-[#594047] truncate">
                    {scannedUpi.name} {scannedUpi.scannedAt ? `• ${scannedUpi.scannedAt}` : ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleCopy(scannedUpi.upiId, scannedUpi.id)}
                  className="w-7 h-7 rounded-full hover:bg-white text-[#594047] hover:text-[#e6007e] flex items-center justify-center transition-colors cursor-pointer"
                  title="Copy UPI ID"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiedId === scannedUpi.id ? 'check' : 'content_copy'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(scannedUpi.id)}
                  className="w-7 h-7 rounded-full hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove from linked UPIs"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-[#fcf9f8] border border-dashed border-[#e0bec6] text-center flex flex-col items-center justify-center">
          <p className="text-[11px] font-medium text-[#594047]">
            No recently scanned QR codes yet. Scan a QR code to link instantly.
          </p>
        </div>
      )}
    </div>
  );
};
