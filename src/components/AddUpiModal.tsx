import React, { useState } from 'react';

export interface SavedUpi {
  id: string;
  upiId: string;
  name: string;
  provider: string;
  isVerified: boolean;
  isQrScanned?: boolean;
  scannedAt?: string;
}

interface AddUpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpiAdded: (upi: SavedUpi) => void;
  initialUpiInput?: string;
  onOpenScanner?: () => void;
}

export const AddUpiModal: React.FC<AddUpiModalProps> = ({
  isOpen,
  onClose,
  onUpiAdded,
  initialUpiInput = '',
  onOpenScanner,
}) => {
  const [upiInput, setUpiInput] = useState(initialUpiInput);
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Update input when initialUpiInput changes
  React.useEffect(() => {
    if (initialUpiInput && isOpen) {
      setUpiInput(initialUpiInput);
      setErrorMessage('');
      
      // Auto-verify prefilled scanned QR code for quick linking
      const prefix = initialUpiInput.split('@')[0].replace(/[\._-]/g, ' ');
      const formattedName = prefix
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setVerifiedName(formattedName.length > 2 ? formattedName : 'Verified Merchant / User');
      setIsVerified(true);
    }
  }, [initialUpiInput, isOpen]);

  if (!isOpen) return null;

  const handleVerify = () => {
    if (!upiInput.includes('@') || upiInput.trim().length < 5) {
      setErrorMessage('Please enter a valid UPI ID (e.g., name@okaxis)');
      return;
    }

    setErrorMessage('');
    setVerifying(true);

    setTimeout(() => {
      setVerifying(false);
      setIsVerified(true);
      
      // Determine name from UPI ID prefix or default to Amelia Stratton
      const prefix = upiInput.split('@')[0].replace('.', ' ');
      const formattedName = prefix
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'Amelia Stratton';
      setVerifiedName(formattedName.length > 2 ? formattedName : 'Amelia Stratton');
    }, 1000);
  };

  const handleLink = () => {
    if (!isVerified) return;

    const provider = upiInput.split('@')[1] || 'upi';
    onUpiAdded({
      id: 'upi-' + Date.now(),
      upiId: upiInput.toLowerCase().trim(),
      name: verifiedName,
      provider: provider,
      isVerified: true,
    });

    // Reset modal state
    setUpiInput('');
    setIsVerified(false);
    setVerifiedName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop listener */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Container */}
      <div className="relative w-full max-w-md bg-[#fff8f8] rounded-t-[28px] sm:rounded-[28px] shadow-2xl p-6 border border-[#e8e8e8] z-10 animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#ffe8ed] hover:bg-[#fce2e7] transition-colors active:scale-95 cursor-pointer text-[#26181c]"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <h2 className="text-[20px] font-bold text-[#26181c] tracking-tight">Add UPI ID</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f6dce2] hover:bg-[#ffd9e2] text-[#26181c] flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Instructional Text */}
          <p className="text-[14px] text-[#5a3f47] leading-relaxed mb-6">
            Enter your UPI ID to link it for faster, one-click payments.
          </p>

          {/* Input Group */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between ml-1">
              <label className="block text-[13px] font-medium text-[#5a3f47]">
                UPI ID
              </label>
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="text-[12px] font-bold text-[#e6007e] hover:text-[#b90064] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                  <span>Scan QR Code</span>
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={upiInput}
                onChange={(e) => {
                  setUpiInput(e.target.value);
                  setIsVerified(false);
                  setErrorMessage('');
                }}
                readOnly={isVerified}
                placeholder="e.g., amelia.strat@okaxis"
                className={`w-full h-[52px] px-4 pr-24 rounded-[14px] font-body text-[#26181c] text-[15px] outline-none transition-all ${
                  isVerified
                    ? 'bg-green-50/40 border-2 border-[#2D8A39] text-[#2D8A39] font-medium'
                    : 'bg-[#FAFAFA] border border-[#e8e8e8] focus:border-[#8e004b] focus:ring-2 focus:ring-[#8e004b]/10'
                }`}
              />
              <div className="absolute right-2 flex items-center">
                {!isVerified ? (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifying || !upiInput.trim()}
                    className="h-9 px-4 rounded-lg bg-[#fde7f3] text-[#8e004b] font-medium text-[13px] hover:bg-[#ffd9e2] transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center"
                  >
                    {verifying ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                    ) : (
                      'Verify'
                    )}
                  </button>
                ) : (
                  <span className="material-symbols-outlined text-[#2D8A39] mr-2 text-[22px]">
                    verified
                  </span>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-[12px] font-semibold text-[#ba1a1a] px-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {errorMessage}
              </p>
            )}

            {/* Supporting Text / Verified Badge */}
            <div className="min-h-[24px] px-1 pt-1">
              {!isVerified ? (
                <p className="text-[12px] text-[#5a3f47] opacity-80 leading-normal">
                  Your UPI ID is usually your phone number or name followed by @provider (e.g., @okaxis, @paytm).
                </p>
              ) : (
                <div className="flex items-center gap-2 text-[#2D8A39] animate-in fade-in zoom-in duration-200">
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <span className="text-[13px] font-bold">Verified: {verifiedName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Visual Delight Illustration */}
          <div className="my-6 flex justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#8e004b]/5 rounded-full blur-2xl animate-pulse" />
              <div className="relative z-10 w-28 h-28 bg-white rounded-[24px] shadow-lg flex items-center justify-center overflow-hidden border border-[#ffe8ed]">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrgVOWBpyRx0yAo0CSrOfeTUtt9ljflrFCMaPIWIrwRcLUy5pgTDf3xfiMNIZZ5Frw3TCXjxRoGNd7rPewwSo8TG-C6Q-43bUB359JxJJHhMOhyKaIH5_LqxCzVivGbLl8cAB8K2sb18L5goDFq2F2BZeTelKtDUo9vZhu0BaWzYCDK61renNHb0ivM_215V14myh1fpMyL4fmGIvnsW2rDj1pbA36wFj2jD1PZwmKXJBD5rVqe7kNzN4d3eeuWoYjnvKwmDIYb68"
                  alt="Secure UPI Payment"
                  className="w-20 h-20 object-contain"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-10 h-10 bg-[#fde7f3] rounded-full flex items-center justify-center shadow-xs border border-white">
                <span className="material-symbols-outlined text-[#8e004b] text-lg">lock</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleLink}
            disabled={!isVerified}
            className={`w-full h-[52px] rounded-xl font-bold text-[15px] shadow-md transition-all flex items-center justify-center gap-2 ${
              isVerified
                ? 'bg-[#b90064] hover:bg-[#8e004b] text-white cursor-pointer active:scale-[0.98]'
                : 'bg-[#b90064] text-white opacity-40 cursor-not-allowed'
            }`}
          >
            Link UPI ID
          </button>

          <div className="flex items-center gap-1.5 opacity-70">
            <span className="material-symbols-outlined text-[16px] text-[#26181c]">verified_user</span>
            <p className="text-[11px] uppercase tracking-wider text-[#26181c] font-medium">
              Bank-grade encryption • Secure Payments
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
