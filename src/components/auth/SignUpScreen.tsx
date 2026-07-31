import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';
import { WELCOME_BG_URL, LOGO_SQUARE } from '../../data/mockData';

export const SignUpScreen: React.FC<{onToggleAuth: () => void}> = ({onToggleAuth}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    role: 'customer' as 'customer' | 'business_user' | 'growth_partner',
    termsAccepted: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.fullName || !formData.email || !formData.mobile) {
      alert('Please fill in all fields.');
      setIsLoading(false);
      return;
    }
    
    if (!validatePassword(formData.password)) {
      alert('Password must be at least 8 characters, include uppercase, lowercase, number, and special character. Example: Nexora@123');
      setIsLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    if (!formData.termsAccepted) {
      alert('Please accept the terms');
      setIsLoading(false);
      return;
    }

    try {
      if (!supabase) {
        alert('Authentication is unavailable because the app is not configured.');
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            mobile: formData.mobile,
            signup_role: formData.role,
          },
        },
      });

      if (error) {
        alert('Sign up note: ' + (error.message || 'Please try again.'));
      } else {
        if (data.user) {
          try {
            // Consistent profile creation for unified auth
            const { error: profileError } = await supabase.from('profiles').upsert(
              {
                id: data.user.id,
                email: formData.email,
                full_name: formData.fullName,
                phone: formData.mobile,
                platform_role: formData.role,
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
            if (profileError) console.error('Profile creation error:', profileError);
          } catch (pe) {
            console.error('Profile upsert failed:', pe);
          }
        }
        alert('Registration submitted! Check your email for confirmation link.');
      }
    } catch (err: any) {
      alert('Sign up server notice: ' + (err?.message || 'Connection offline or rate limit reached.'));
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
          <p className="text-sm text-[#5a3f47]">Join Nexora and start growing your business.</p>
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

          <button className="w-full bg-[#e6007e] text-white rounded-xl py-3.5 font-bold hover:bg-[#b90064] transition-colors mt-2 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2" type="submit" disabled={isLoading}>
            {isLoading && <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>}
            {isLoading ? 'Creating Account...' : 'Sign Up'}
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
