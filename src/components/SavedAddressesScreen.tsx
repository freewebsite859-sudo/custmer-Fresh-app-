import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Address } from '../types';
import {
  loadAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  subscribeToAddresses,
} from '../lib/addressesRepository';

interface SavedAddressesScreenProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
  customerId?: string;
}

export const SavedAddressesScreen: React.FC<SavedAddressesScreenProps> = ({
  onBack,
  onNavigate,
  customerId,
}) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [formLabel, setFormLabel] = useState<string>('Home');
  const [formFlatNumber, setFormFlatNumber] = useState<string>('');
  const [formStreet, setFormStreet] = useState<string>('');
  const [formLandmark, setFormLandmark] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('Jaipur');
  const [formPincode, setFormPincode] = useState<string>('');
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!supabase || !customerId) return;
    try {
      setAddresses(await loadAddresses(supabase, customerId));
    } catch (e: any) {
      console.warn('Addresses load notice:', e?.message || e);
    }
  }, [customerId]);

  useEffect(() => {
    void refresh();
    if (!supabase || !customerId) return;
    const unsubscribe = subscribeToAddresses(supabase, customerId, () => {
      void refresh();
    });
    return unsubscribe;
  }, [refresh, customerId]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSetDefault = (id: string) => {
    if (!supabase || !customerId) return;
    setDefaultAddress(supabase, customerId, id)
      .then(setAddresses)
      .then(() => triggerToast('Default address updated!'))
      .catch(() => triggerToast('Could not update default address.'));
  };

  const handleDelete = (id: string) => {
    if (!supabase || !customerId) return;
    deleteAddress(supabase, customerId, id)
      .then(setAddresses)
      .then(() => triggerToast('Address deleted successfully!'))
      .catch(() => triggerToast('Could not delete address.'));
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
      setFormCity('Jaipur');
      setFormPincode('');
      setFormIsDefault(addresses.length === 0);
    }
    setView('form');
  };

  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      triggerToast(`GPS position found ±${Math.round(pos.coords.accuracy)}m.`);
      setIsLocating(false);
    }, () => setIsLocating(false), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !customerId) return;
    if (!formFlatNumber.trim() || !formStreet.trim() || !formCity.trim() || !formPincode.trim()) {
      triggerToast('Required fields missing.');
      return;
    }
    const payload = {
      label: formLabel,
      flatNumber: formFlatNumber,
      street: formStreet,
      landmark: formLandmark,
      city: formCity,
      pincode: formPincode,
      isDefault: formIsDefault,
    };
    const makeDefault = formIsDefault || addresses.length === 0;
    setIsSaving(true);
    const op = selectedAddress
      ? updateAddress(supabase, customerId, selectedAddress.id, payload, makeDefault)
      : addAddress(supabase, customerId, payload, makeDefault);
    op.then(setAddresses).then(() => { triggerToast('Saved!'); setView('list'); }).finally(() => setIsSaving(false));
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-32 animate-in fade-in">
      {toast && (
        <div className="fixed bottom-32 mb-safe inset-x-4 z-50 bg-[#26181c] text-white px-4 py-3 rounded-xl shadow-lg border border-[#e0bec6]/30 text-xs font-semibold flex items-center gap-2 max-w-sm mx-auto animate-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-[#e6007e] text-lg">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {view === 'list' ? (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center px-4 pt-4">
            <div>
              <h2 className="text-[22px] font-bold text-on-surface tracking-tight">Saved Addresses</h2>
              <p className="text-[13px] text-[#5a3f47] mt-1">Manage your locations.</p>
            </div>
            <button onClick={() => handleOpenForm()} className="bg-[#e6007e] text-white h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"><span className="material-symbols-outlined text-[18px]">add</span>Add</button>
          </div>

          {addresses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-3xl border border-[#e8e8e8] mx-4"><h2 className="text-lg font-bold text-on-surface">No saved addresses</h2><p className="text-xs text-[#5a3f47] mt-2">Add an address for a faster booking experience.</p><button onClick={() => handleOpenForm()} className="mt-6 px-6 h-12 bg-[#e6007e] text-white font-bold text-sm rounded-xl shadow-md">Add Address</button></div>
          ) : (
            <div className="flex flex-col gap-4 px-4">
              {addresses.map((addr) => (
                <div key={addr.id} className={`bg-white p-5 rounded-2xl border transition-all relative overflow-hidden ${addr.isDefault ? 'border-[#e0bec6] bg-[#fff8f8]' : 'border-[#e8e8e8]'}`}>
                  <div className="flex justify-between items-start mb-3"><div className="flex items-center gap-2"><span className={`material-symbols-outlined text-[20px] ${addr.isDefault ? 'text-[#e6007e]' : 'text-[#8c7077]'}`}>{addr.label === 'Home' ? 'home' : 'work'}</span><h3 className="font-semibold text-[15px]">{addr.label}</h3>{addr.isDefault && <span className="bg-[#ffd9e2] text-[#8e004b] px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ml-2">Default</span>}</div><div className="flex gap-1.5"><button onClick={() => handleOpenForm(addr)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#5a3f47] hover:bg-[#ffe8ed] cursor-pointer"><span className="material-symbols-outlined text-[18px]">edit</span></button><button onClick={() => handleDelete(addr.id)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#5a3f47] hover:text-red-600 cursor-pointer"><span className="material-symbols-outlined text-[18px]">delete</span></button></div></div>
                  <div className="text-[13px] text-[#5a3f47] leading-relaxed"><p className="font-semibold text-on-surface">{addr.flatNumber}</p><p>{addr.street}</p><p className="text-[11px] text-[#8c7077] mt-1">{addr.city} {addr.pincode}</p></div>
                  {!addr.isDefault && <button onClick={() => handleSetDefault(addr.id)} className="text-[11px] font-bold text-[#e6007e] mt-3 underline">Set as Default</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-5 px-4 pt-4">
          <h2 className="text-[20px] font-bold text-on-surface">{selectedAddress ? 'Edit Address' : 'Add New Address'}</h2>
          <div className="w-full h-44 rounded-2xl overflow-hidden relative border border-[#e8e8e8] bg-slate-100 flex items-center justify-center">
            <button type="button" onClick={handleLocateMe} disabled={isLocating} className="z-10 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer border border-slate-100">{isLocating ? <span className="animate-spin material-symbols-outlined text-[#e6007e]">progress_activity</span> : <span className="material-symbols-outlined text-[#e6007e]">my_location</span>}<span className="text-xs font-bold">Locate Me</span></button>
            <span className="absolute material-symbols-outlined text-[#e6007e] text-4xl drop-shadow-md">location_on</span>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">{['Home', 'Office', 'Other'].map(l => <button key={l} type="button" onClick={() => setFormLabel(l)} className={`flex-1 h-11 rounded-xl font-bold text-[13px] transition-all cursor-pointer ${formLabel === l ? 'bg-[#e6007e] text-white' : 'bg-slate-100 text-[#5a3f47]'}`}>{l}</button>)}</div>
            <input type="text" value={formFlatNumber} onChange={(e) => setFormFlatNumber(e.target.value)} placeholder="House / Flat Number" className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px]" required />
            <input type="text" value={formStreet} onChange={(e) => setFormStreet(e.target.value)} placeholder="Street / Area" className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px]" required />
            <div className="grid grid-cols-2 gap-3"><input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="City" className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px]" required /><input type="text" value={formPincode} onChange={(e) => setFormPincode(e.target.value)} placeholder="PIN Code" className="w-full h-12 bg-white rounded-xl px-4 border border-[#e8e8e8] text-[13px]" required /></div>
            <div onClick={() => setFormIsDefault(!formIsDefault)} className="mt-2 flex items-center gap-3 cursor-pointer select-none"><div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${formIsDefault ? 'bg-[#e6007e]/20' : 'bg-slate-200'}`}><div className={`w-3 h-3 rounded-full transition-colors duration-300 ${formIsDefault ? 'bg-[#e6007e]' : 'bg-transparent'}`}></div></div><span className="text-[13px] font-bold text-on-surface">Set as default address</span></div>
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t border-[#e8e8e8]"><button type="button" onClick={() => setView('list')} className="flex-1 h-12 bg-white border border-[#e8e8e8] text-[#5a3f47] font-bold rounded-xl text-sm">Cancel</button><button type="submit" disabled={isSaving} className="flex-1 h-12 bg-[#e6007e] text-white font-bold rounded-xl shadow-md text-sm">{isSaving ? 'Saving…' : 'Save Address'}</button></div>
        </form>
      )}
    </div>
  );
};
