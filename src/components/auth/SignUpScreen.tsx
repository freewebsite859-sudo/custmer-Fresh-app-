import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { friendlyAuthErrorMessage } from '../../lib/authErrors';
import { Eye, EyeOff } from 'lucide-react';
import { LOGO_SQUARE } from '../../data/mockData';
import { PLATFORM_ROLE_LABELS, type PlatformRole } from '../../lib/authRoles';
import { updateProfile, waitForProfile } from '../../lib/profileRepository';

export const SignUpScreen: React.FC<{onToggleAuth: () => void}> = ({onToggleAuth}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    role: 'customer' as PlatformRole,
    termsAccepted: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    if (!formData.email) {
      setErrorMsg('Please enter your email address.');
      setIsLoading(false);
      return;
    }
    
    if (!validatePassword(formData.password)) {
      setErrorMsg('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setIsLoading(false);
      return;
    }
    
    if (!formData.termsAccepted) {
      setErrorMsg('Please accept the terms.');
      setIsLoading(false);
      return;
    }

    try {
      if (!supabase) {
        setErrorMsg('Authentication is unavailable because the app is not configured.');
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            mobile: formData.mobile.trim(),
            signup_role: formData.role,
          },
        },
      });

      if (error) {
        // Real server error, mapped to an actionable message (e.g.
        // "This email address is already registered…" instead of a raw code).
        setErrorMsg(friendlyAuthErrorMessage(error, 'Sign up failed. Please try again.'));
      } else if (data.session && data.user) {
        try {
          const seededProfile = await waitForProfile(supabase, data.user.id, { attempts: 6, delayMs: 350 });
          if (seededProfile) {
            await updateProfile(supabase, data.user.id, {
              full_name: formData.fullName.trim() || formData.email.split('@')[0],
              phone: formData.mobile.trim() || null,
            });
          }
        } catch (profileError) {
          console.warn('Profile seed notice:', profileError);
        }
        setSignedIn(true);
      } else if (data.user) {
        // Email confirmation still enabled — no session until the user
        // confirms. Honest message (no fake auto-login claim).
        setErrorMsg(`Registration submitted for the ${PLATFORM_ROLE_LABELS[formData.role]} role. Please confirm the account from the link in your email, then log in.`);
      }
    } catch (err: any) {
      setErrorMsg(friendlyAuthErrorMessage(err, 'Connection offline or rate limit reached. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fcf9f8] text-[#26181c] font-sans flex flex-col items-center overflow-y-auto antialiased">
      <div className="fixed top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-[#e6007e]/10 blur-[60px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-80 h-80 rounded-full bg-[#fde7f3]/40 blur-[60px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col">
        <div className="flex flex-col items-center mb-8">
          <img alt="Nexora Logo" className="h-24 w-24 object-contain mb-4" src={LOGO_SQUARE} />
        </div>

        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl font-bold text-[#26181c] mb-2">Create Account</h2>
          <p className="text-sm text-[#5a3f47]">Choose your role once — Supabase will keep your Nexora account, bookings and profile in sync across devices.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#26181c] ml-1">Account Role</label>
            <select 
              className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] transition-colors" 
              value={formData.role} 
              onChange={(e) => setFormData({...formData, role: e.target.value as any})}
            >
              <option value="customer">Customer</option>
              <option value="business_user">Shop Owner</option>
              <option value="growth_partner">Growth Partner</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#26181c] ml-1">Full Name</label>
            <input className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] transition-colors" placeholder="e.g. Rahul Sharma" type="text" required onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#26181c] ml-1">Email Address</label>
            <input className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] transition-colors" placeholder="name@domain.com" type="email" required onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-semibold text-[#26181c] ml-1">Password</label>
              <div className="relative">
                <input className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] transition-colors pr-10" type={showPassword ? "text" : "password"} required onChange={(e) => setFormData({...formData, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a3f47]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-semibold text-[#26181c] ml-1">Confirm</label>
              <div className="relative">
                <input className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] transition-colors pr-10" type={showConfirmPassword ? "text" : "password"} required onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a3f47]">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#26181c] ml-1">Mobile Number</label>
            <input className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] transition-colors" placeholder="e.g. 9876543210" type="tel" required onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#5a3f47] font-medium mt-2 cursor-pointer">
            <input type="checkbox" required onChange={(e) => setFormData({...formData, termsAccepted: e.target.checked})} className="rounded border-[#e8e8e8] text-[#e6007e] focus:ring-[#e6007e]" />
            <span>I accept the <span className="text-[#e6007e] font-bold">Terms & Conditions</span></span>
          </label>

          {errorMsg && (
            <p className={`text-xs ml-1 font-medium ${errorMsg.startsWith('Registration submitted') ? 'text-emerald-600' : 'text-rose-600'}`}>{errorMsg}</p>
          )}

          <button className="w-full bg-[#e6007e] text-white rounded-xl py-3.5 font-bold hover:bg-[#b90064] transition-colors mt-2 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2" type="submit" disabled={isLoading || signedIn}>
            {(isLoading || signedIn) && <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>}
            {signedIn ? 'Account created — signing you in…' : isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-8 text-center pb-8 pb-safe">
          <p className="text-sm text-[#5a3f47]">
            Already have an account?
            <button onClick={onToggleAuth} className="text-[#e6007e] font-bold hover:text-[#b90064] transition-colors ml-1">Login</button>
          </p>
        </div>
      </main>
    </div>
  );
};
