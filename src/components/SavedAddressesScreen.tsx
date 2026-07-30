import React, { useState, useEffect } from 'react';
import { Address } from '../types';

interface SavedAddressesScreenProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
}

export const SavedAddressesScreen: React.FC<SavedAddressesScreenProps> = ({
  onBack,
  onNavigate,
}) => {
  const [addresses, setAddresses] = useState<Address[]>(() => {
    const saved = localStorage.getItem('nexora_saved_addresses');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'addr-1',
        label: 'Home',
        flatNumber: 'Apt 4B, The Zenith Apartments',
        street: '124 Marina Boulevard',
        city: 'San Francisco, CA',
        pincode: '94123',
        isDefault: true,
      },
      {
        id: 'addr-2',
        label: 'Work',
        flatNumber: 'Nexora Headquarters, Floor 12',
        street: '500 Tech Square',
        city: 'San Francisco, CA',
        pincode: '94105',
        isDefault: false,
      },
      {
        id: 'addr-3',
        label: 'Mom\'s House',
        flatNumber: '889 Pinecrest Drive',
        street: 'Suburban Enclave',
        city: 'San Mateo, CA',
        pincode: '94401',
        isDefault: false,
      },
    ];
  });

  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Form states
  const [formLabel, setFormLabel] = useState<string>('Home');
  const [formFlatNumber, setFormFlatNumber] = useState<string>('');
  const [formStreet, setFormStreet] = useState<string>('');
  const [formLandmark, setFormLandmark] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('San Francisco, CA');
  const [formPincode, setFormPincode] = useState<string>('');
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('nexora_saved_addresses', JSON.stringify(addresses));
  }, [addresses]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSetDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
    triggerToast('Default address updated!');
  };

  const handleDelete = (id: string) => {
    setAddresses((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      // If default was deleted, make first remaining address default
      if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
    triggerToast('Address deleted successfully!');
  };

  const handleOpenForm = (address?: Address) => {
    if (address) {
      setSelectedAddress(address);
      setFormLabel(address.label);
      setFormFlatNumber(address.flatNumber);
      setFormStreet(address.street);
      setFormLandmark(address.landmark || '');
      setFormCity(address.city);
      setFormPincode(address.pincode);
      setFormIsDefault(address.isDefault);
    } else {
      setSelectedAddress(null);
      setFormLabel('Home');
      setFormFlatNumber('');
      setFormStreet('');
      setFormLandmark('');
      setFormCity('San Francisco, CA');
      setFormPincode('');
      setFormIsDefault(addresses.length === 0);
    }
    setView('form');
  };

  const handleLocateMe = () => {
    setIsLocating(true);
    triggerToast('Determining GPS Coordinates...');
    setTimeout(() => {
      setIsLocating(false);
      setFormFlatNumber('Apt 12B, Oceanview Towers');
      setFormStreet('88 Marina Boulevard');
      setFormCity('San Francisco, CA');
      setFormPincode('94123');
      setFormLandmark('Near Marina Park');
      triggerToast('GPS Address filled successfully!');
    }, 1200);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFlatNumber.trim() || !formStreet.trim() || !formCity.trim() || !formPincode.trim()) {
      triggerToast('Please fill in all required fields.');
      return;
    }

    const newAddressData = {
      label: formLabel,
      flatNumber: formFlatNumber,
      street: formStreet,
      landmark: formLandmark,
      city: formCity,
      pincode: formPincode,
      isDefault: formIsDefault,
    };

    setAddresses((prev) => {
      let updated: Address[];
      if (selectedAddress) {
        // Edit mode
        updated = prev.map((a) =>
          a.id === selectedAddress.id
            ? { ...a, ...newAddressData }
            : a
        );
      } else {
        // Add mode
        const newAddress: Address = {
          id: `addr-${Date.now()}`,
          ...newAddressData,
        };
        updated = [...prev, newAddress];
      }

      // Handle default constraint
      if (formIsDefault) {
        updated = updated.map((a) => ({
          ...a,
          isDefault: selectedAddress ? (a.id === selectedAddress.id ? true : false) : (a.id === updated[updated.length - 1].id ? true : false),
        }));
      } else if (!updated.some((a) => a.isDefault)) {
        if (updated.length > 0) {
          updated[0].isDefault = true;
        }
      }

      return updated;
    });

    triggerToast(selectedAddress ? 'Address updated!' : 'Address added successfully!');
    setView('list');
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-32 animate-in fade-in duration-200">
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-32 mb-safe inset-x-4 z-50 bg-[#26181c] text-white px-4 py-3 rounded-xl shadow-lg border border-primary-fixed-dim text-xs font-semibold flex items-center gap-2 max-w-sm mx-auto animate-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-primary-pink text-lg">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {view === 'list' ? (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-[22px] font-bold text-on-surface tracking-tight">Saved Addresses</h2>
              <p className="text-[13px] text-[#5a3f47] mt-1">Manage where we bring the salon to you.</p>
            </div>
            <button
              onClick={() => handleOpenForm()}
              className="bg-[#e6007e] text-white h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#b90064] transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add New
            </button>
          </div>

          {addresses.length === 0 ? (
            /* Empty State Screen exactly matching third user request HTML */
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-3xl border border-[#e8e8e8] relative overflow-hidden shadow-xs">
              {/* Subtle ambient background glow */}
              <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-30">
                <div className="w-64 h-64 rounded-full bg-primary-fixed-dim blur-3xl mix-blend-multiply animate-pulse" style={{ animationDuration: '4s' }}></div>
              </div>
              
              {/* Content Container */}
              <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full mx-auto space-y-6">
                {/* Illustration */}
                <div className="relative w-44 h-44 rounded-full bg-slate-50 flex items-center justify-center overflow-hidden border border-[#e8e8e8]/50">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary-fixed/20 to-transparent"></div>
                  <img
                    alt="Stylized map pin illustration"
                    className="w-full h-full object-cover p-4 mix-blend-darken rounded-full"
                    src="https://lh3.googleusercontent.com/aida/AP1WRLtmvAdbOAiNbHdMc7iyeZMCakHR9JSwfo91efu2VI2uG42xtd23ucSOYTJCU0YeJ5zp_C1LE2SUa2XYR4BkiVByNpE90OvjiLwHI68LdFz7m3tx7KL7fIW2dana5Kkn0xuBVd6fGozxiA-Fp6FH7Ou5uSqErDC8PlPRpQ7wEgO-j6CuZDDer_BwvGnQglO8YbCUCkS9luR5A-gxisk76ivWp96GxgpRsB9DK9tUNiPaIiQxVdtzgR0wFA"
                  />
                  <div className="absolute inset-0 rounded-full border border-outline-subtle/50 pointer-events-none"></div>
                </div>

                {/* Typography */}
                <div className="flex flex-col space-y-2 items-center">
                  <h2 className="text-lg font-bold text-on-surface tracking-tight">No saved addresses</h2>
                  <p className="text-xs text-[#5a3f47] max-w-[280px] leading-relaxed">
                    Add your home or office address for a faster booking experience.
                  </p>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleOpenForm()}
                  className="w-full sm:w-auto px-6 h-12 bg-[#e6007e] text-white font-bold text-sm rounded-xl shadow-md shadow-primary-pink/10 hover:bg-[#b90064] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Add Address</span>
                </button>
              </div>
            </div>
          ) : (
            /* Address cards exactly matching user list HTML */
            <div className="flex flex-col gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white p-5 rounded-2xl border transition-all relative overflow-hidden ${
                    addr.isDefault
                      ? 'border-[#e0bec6] bg-[#fff8f8] shadow-[0_4px_20px_rgba(230,0,126,0.02)]'
                      : 'border-[#e8e8e8] hover:border-slate-300'
                  }`}
                >
                  {addr.isDefault && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#e6007e]"></div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[20px] ${
                        addr.isDefault ? 'text-[#e6007e]' : 'text-[#8c7077]'
                      }`} style={addr.isDefault ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {addr.label.toLowerCase().includes('home') ? 'home' : addr.label.toLowerCase().includes('office') || addr.label.toLowerCase().includes('work') ? 'work' : 'favorite'}
                      </span>
                      <h3 className="font-semibold text-[15px] text-on-surface">{addr.label}</h3>
                      {addr.isDefault && (
                        <span className="bg-[#ffd9e2] text-[#8e004b] px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ml-2 scale-90">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenForm(addr)}
                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#5a3f47] hover:text-[#e6007e] hover:bg-[#ffe8ed] transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#5a3f47] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[13px] text-[#5a3f47] leading-relaxed mb-3">
                    <p className="font-semibold text-on-surface">{addr.flatNumber}</p>
                    <p>{addr.street}</p>
                    {addr.landmark && (
                      <p className="text-[11px] text-[#8c7077] italic mt-0.5">Landmark: {addr.landmark}</p>
                    )}
                    <p className="text-[11px] text-[#8c7077] mt-1">{addr.city} {addr.pincode}</p>
                  </div>

                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-[11px] font-bold text-[#e6007e] bg-[#ffd9e2]/30 hover:bg-[#ffd9e2]/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Form View exactly matching user form HTML structure */
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-[20px] font-bold text-on-surface tracking-tight">
                {selectedAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
              <p className="text-[12px] text-[#5a3f47] mt-0.5">
                {selectedAddress ? 'Modify your saved details below.' : 'Add your custom delivery and service address.'}
              </p>
            </div>
          </div>

          {/* Map background with pin & locate me */}
          <div
            className="w-full h-44 rounded-2xl overflow-hidden relative border border-[#e8e8e8]"
            style={{
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAA5SFkus6dDWmYvvjZrAYDHZOLX_IOHXETYBvKeJE27MH1A1cVuC1GYhOxkSoSX6b428DYbxVJwHKNzCXl1ZezM5bMXFDs1JC2r0Xc8PfjsuqHcuJF9xr36Q9mlGnMJZlE8sKYYtgCyE8uoEF53Zhx_lfHseqn0nB216Eby4dRk3NwS42VhDnwsPktz0zI3S54nRJEI93G8paIQNi5_bJQtaBH0J5sey3NeTrKGFrGyjPrt96R53b1yM8g915VBSZKe00wc9imMyM')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
            
            <div className="absolute inset-0 flex items-end justify-center pb-3 z-10">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all hover:bg-slate-50 border border-slate-100/80"
              >
                {isLocating ? (
                  <>
                    <span className="material-symbols-outlined text-[#e6007e] text-[18px] animate-spin">progress_activity</span>
                    <span className="text-xs font-bold text-[#26181c]">Locating...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[#e6007e] text-[18px]">my_location</span>
                    <span className="text-xs font-bold text-[#26181c]">Locate Me</span>
                  </>
                )}
              </button>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md pointer-events-none z-10">
              <span className="material-symbols-outlined text-[#e6007e] text-4xl font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Address Label buttons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#5a3f47] ml-0.5">Address Label</label>
              <div className="flex gap-2">
                {['Home', 'Office', 'Other'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setFormLabel(l)}
                    className={`flex-1 h-11 rounded-xl font-bold text-[13px] transition-all cursor-pointer ${
                      formLabel === l
                        ? 'bg-[#e6007e] text-white shadow-sm'
                        : 'bg-slate-100 text-[#5a3f47] hover:bg-slate-200/60'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Flat Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#5a3f47] ml-0.5">House / Flat Number</label>
              <input
                type="text"
                value={formFlatNumber}
                onChange={(e) => setFormFlatNumber(e.target.value)}
                placeholder="e.g. Apt 4B"
                className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px] text-on-surface focus:outline-none focus:border-[#e6007e] transition-colors"
                required
              />
            </div>

            {/* Street */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#5a3f47] ml-0.5">Street / Area</label>
              <input
                type="text"
                value={formStreet}
                onChange={(e) => setFormStreet(e.target.value)}
                placeholder="e.g. Oxford Street"
                className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px] text-on-surface focus:outline-none focus:border-[#e6007e] transition-colors"
                required
              />
            </div>

            {/* Landmark */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#5a3f47] ml-0.5">
                Landmark <span className="text-[#8c7077] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formLandmark}
                onChange={(e) => setFormLandmark(e.target.value)}
                placeholder="e.g. Opposite Central Park"
                className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px] text-on-surface focus:outline-none focus:border-[#e6007e] transition-colors"
              />
            </div>

            {/* City & PIN */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#5a3f47] ml-0.5">City / District</label>
                <input
                  type="text"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  placeholder="San Francisco"
                  className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px] text-on-surface focus:outline-none focus:border-[#e6007e] transition-colors"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#5a3f47] ml-0.5">PIN Code</label>
                <input
                  type="text"
                  value={formPincode}
                  onChange={(e) => setFormPincode(e.target.value)}
                  placeholder="94123"
                  className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px] text-on-surface focus:outline-none focus:border-[#e6007e] transition-colors"
                  required
                />
              </div>
            </div>

            {/* Set as default address toggle */}
            <div
              onClick={() => setFormIsDefault(!formIsDefault)}
              className="mt-2 flex items-center gap-3 cursor-pointer select-none"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  formIsDefault ? 'bg-[#e6007e]/20' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                    formIsDefault ? 'bg-[#e6007e]' : 'bg-transparent'
                  }`}
                ></div>
              </div>
              <span className="text-[13px] font-bold text-on-surface">Set as default address</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-[#e8e8e8]">
            <button
              type="button"
              onClick={() => setView('list')}
              className="flex-1 h-12 bg-white border border-[#e8e8e8] text-[#5a3f47] font-bold rounded-xl transition-colors hover:bg-slate-50 cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 bg-[#e6007e] hover:bg-[#b90064] text-white font-bold rounded-xl transition-colors shadow-md shadow-primary-pink/10 cursor-pointer text-sm"
            >
              Save Address
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
