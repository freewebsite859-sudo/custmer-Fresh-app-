import React, { useState } from 'react';

export interface SavedCard {
  id: string;
  cardNumber: string; // Last 4 digits or full formatted
  cardHolder: string;
  expiry: string;
  network: 'visa' | 'mastercard' | 'amex' | 'generic';
  isPrimary?: boolean;
}

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdded: (card: SavedCard) => void;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
  isOpen,
  onClose,
  onCardAdded,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveForFuture, setSaveForFuture] = useState(true);

  // Button state: 'idle' | 'saving' | 'success'
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Determine card network
  const cleanNumber = cardNumber.replace(/\D/g, '');
  let network: 'visa' | 'mastercard' | 'amex' | 'generic' = 'generic';
  if (cleanNumber.startsWith('4')) network = 'visa';
  else if (cleanNumber.startsWith('5')) network = 'mastercard';
  else if (cleanNumber.startsWith('3')) network = 'amex';

  // Formatters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
    setErrorMessage('');
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiry(raw);
    setErrorMessage('');
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (cleanNumber.length < 12) {
      setErrorMessage('Please enter a valid card number.');
      return;
    }
    if (!cardHolder.trim()) {
      setErrorMessage('Please enter cardholder name.');
      return;
    }
    if (expiry.length < 5) {
      setErrorMessage('Please enter expiry date (MM/YY).');
      return;
    }
    if (cvv.length < 3) {
      setErrorMessage('Please enter a valid 3-digit CVV.');
      return;
    }

    setErrorMessage('');
    setSaveState('saving');

    // Simulate payment gateway tokenization / saving delay
    setTimeout(() => {
      setSaveState('success');

      // Trigger success callback after smooth checkmark animation display
      setTimeout(() => {
        const last4 = cleanNumber.slice(-4) || '4242';
        onCardAdded({
          id: 'card-' + Date.now(),
          cardNumber: `•••• •••• •••• ${last4}`,
          cardHolder: cardHolder.toUpperCase(),
          expiry: expiry,
          network: network,
          isPrimary: false,
        });

        // Reset state and close
        setSaveState('idle');
        setCardNumber('');
        setCardHolder('');
        setExpiry('');
        setCvv('');
        onClose();
      }, 1400);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop listener */}
      <div className="absolute inset-0" onClick={saveState === 'saving' ? undefined : onClose} />

      {/* Main Modal Container */}
      <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl p-6 border border-[#e8e8e8] z-10 animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#fde7f3] text-[#e6007e] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">add_card</span>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#26181c] leading-tight">Add New Card</h2>
              <p className="text-[12px] text-[#594047]">Save card for 1-click fast salon booking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saveState === 'saving'}
            className="w-9 h-9 rounded-full bg-[#f6dce2] hover:bg-[#ffd9e2] text-[#26181c] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Card Visual Interactive Preview */}
        <div className="relative w-full aspect-[1.586/1] rounded-[22px] p-5 mb-6 overflow-hidden transition-all duration-500 shadow-xl bg-gradient-to-br from-[#8e004b] via-[#b80663] to-[#e6007e] text-white flex flex-col justify-between border border-white/20">
          {/* Glass glare overlay */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top row */}
          <div className="flex justify-between items-start relative z-10">
            <div className="w-11 h-8 bg-amber-200/40 rounded-md border border-white/30 backdrop-blur-xs flex items-center justify-center">
              <div className="w-6 h-4 border border-white/40 rounded-xs bg-amber-300/30" />
            </div>
            <div className="text-right">
              {network === 'visa' && (
                <span className="text-[20px] font-black tracking-wider italic text-white/90">VISA</span>
              )}
              {network === 'mastercard' && (
                <div className="flex -space-x-2">
                  <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
                  <div className="w-5 h-5 rounded-full bg-amber-400 opacity-90" />
                </div>
              )}
              {network === 'amex' && (
                <span className="text-[14px] font-black tracking-wider text-blue-200">AMEX</span>
              )}
              {network === 'generic' && (
                <span className="material-symbols-outlined text-[28px] opacity-80">credit_card</span>
              )}
            </div>
          </div>

          {/* Card Number */}
          <div className="relative z-10 my-1">
            <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold mb-0.5">Card Number</p>
            <p className="font-mono text-[18px] sm:text-[20px] font-bold tracking-[0.18em] text-white drop-shadow-xs">
              {cardNumber || '•••• •••• •••• ••••'}
            </p>
          </div>

          {/* Bottom Row */}
          <div className="flex justify-between items-end relative z-10 pt-1">
            <div className="max-w-[190px]">
              <p className="text-[9px] uppercase tracking-wider text-white/70 font-semibold">Card Holder</p>
              <p className="text-[13px] font-bold tracking-wide uppercase truncate text-white">
                {cardHolder || 'YOUR NAME'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-white/70 font-semibold">Expires</p>
              <p className="text-[13px] font-bold tracking-wide text-white">
                {expiry || 'MM/YY'}
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSaveCard} className="flex flex-col gap-4">
          {errorMessage && (
            <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-xl text-[12px] font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Card Number Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-[#594047] px-1">Card Number</label>
            <div className="relative">
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                disabled={saveState === 'saving' || saveState === 'success'}
                className="w-full h-[48px] bg-[#fff8f8] border border-[#e8e8e8] focus:border-[#e6007e] rounded-xl px-4 text-[14px] font-mono text-[#26181c] outline-none transition-all placeholder:font-sans placeholder:text-[13px] placeholder:text-[#8c7077]/50"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8c7077]">
                <span className="material-symbols-outlined text-[20px]">credit_card</span>
              </div>
            </div>
          </div>

          {/* Cardholder Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-[#594047] px-1">Cardholder Name</label>
            <input
              type="text"
              value={cardHolder}
              onChange={(e) => {
                setCardHolder(e.target.value);
                setErrorMessage('');
              }}
              placeholder="Name as printed on card"
              disabled={saveState === 'saving' || saveState === 'success'}
              className="w-full h-[48px] bg-[#fff8f8] border border-[#e8e8e8] focus:border-[#e6007e] rounded-xl px-4 text-[14px] text-[#26181c] font-semibold uppercase outline-none transition-all placeholder:normal-case placeholder:font-normal placeholder:text-[13px] placeholder:text-[#8c7077]/50"
            />
          </div>

          {/* Grid: Expiry and CVV */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-[#594047] px-1">Expiry Date</label>
              <input
                type="text"
                value={expiry}
                onChange={handleExpiryChange}
                placeholder="MM/YY"
                maxLength={5}
                disabled={saveState === 'saving' || saveState === 'success'}
                className="w-full h-[48px] bg-[#fff8f8] border border-[#e8e8e8] focus:border-[#e6007e] rounded-xl px-4 text-[14px] font-mono text-[#26181c] outline-none transition-all placeholder:font-sans placeholder:text-[13px] placeholder:text-[#8c7077]/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-[#594047] px-1">CVV Security Code</label>
              <input
                type="password"
                value={cvv}
                onChange={(e) => {
                  setCvv(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setErrorMessage('');
                }}
                placeholder="•••"
                maxLength={4}
                disabled={saveState === 'saving' || saveState === 'success'}
                className="w-full h-[48px] bg-[#fff8f8] border border-[#e8e8e8] focus:border-[#e6007e] rounded-xl px-4 text-[14px] font-mono text-[#26181c] outline-none transition-all placeholder:font-sans placeholder:text-[13px] placeholder:text-[#8c7077]/50"
              />
            </div>
          </div>

          {/* Save Toggle */}
          <label className="flex items-center justify-between p-3.5 bg-[#fff0f2] rounded-2xl border border-[#fcd5e8] cursor-pointer mt-1">
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-[#26181c]">Save card securely</span>
              <span className="text-[11px] text-[#594047]">Used for fast 1-click booking checkout</span>
            </div>
            <input
              type="checkbox"
              checked={saveForFuture}
              onChange={(e) => setSaveForFuture(e.target.checked)}
              className="w-5 h-5 accent-[#e6007e] cursor-pointer"
            />
          </label>

          {/* Save Card Button with Smooth Checkmark Success Animation */}
          <div className="mt-2">
            <button
              type="submit"
              disabled={saveState !== 'idle'}
              className={`relative w-full h-[52px] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg cursor-pointer overflow-hidden ${
                saveState === 'idle'
                  ? 'bg-[#e6007e] hover:bg-[#b90064] text-white shadow-[#e6007e]/25 active:scale-[0.98]'
                  : saveState === 'saving'
                  ? 'bg-[#b90064] text-white opacity-95 scale-[0.99] cursor-wait'
                  : 'bg-emerald-600 text-white shadow-emerald-600/30 scale-[1.02] ring-4 ring-emerald-100'
              }`}
            >
              {saveState === 'idle' && (
                <>
                  <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                  <span>Save Card</span>
                </>
              )}

              {saveState === 'saving' && (
                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-[22px] animate-spin">progress_activity</span>
                  <span>Encrypting & Saving Card...</span>
                </div>
              )}

              {saveState === 'success' && (
                <div className="flex items-center gap-2 animate-in zoom-in duration-300">
                  <div className="w-7 h-7 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xs animate-bounce">
                    <span className="material-symbols-outlined text-[20px] font-extrabold">check</span>
                  </div>
                  <span className="font-extrabold tracking-wide text-[16px]">Card Saved Successfully!</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
