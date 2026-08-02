import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';
import { LOGO_SQUARE } from '../../data/mockData';

interface ResetPasswordScreenProps {
  onDone: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!supabase) {
      setErrorMsg('Authentication is unavailable because the app is not configured.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message || 'Could not update your password. Please try again.');
      } else {
        setDone(true);
      }
    } catch (err: any) {
      setErrorMsg('Password update failed. Please check your connection and try again.');
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
          <h2 className="text-2xl font-bold text-[#26181c] mb-2">
            {done ? 'Password Updated' : 'Set a New Password'}
          </h2>
          <p className="text-sm text-[#5a3f47]">
            {done
              ? 'Your password has been changed successfully. You can now log in with your new password.'
              : 'Choose a new password for your Nexora account.'}
          </p>
        </div>

        {done ? (
          <button
            onClick={onDone}
            className="w-full bg-[#e6007e] text-white rounded-xl py-3.5 font-bold hover:bg-[#b90064] transition-colors flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-[#e6007e]/10"
          >
            <span className="material-symbols-outlined text-xl">login</span>
            Back to Login
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-semibold text-[#26181c] ml-1" htmlFor="new-password">New Password</label>
              <div className="relative">
                <input
                  className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] transition-colors pr-12"
                  id="new-password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a3f47] hover:text-[#e6007e] transition-colors p-1"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-semibold text-[#26181c] ml-1" htmlFor="confirm-password">Confirm New Password</label>
              <div className="relative">
                <input
                  className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] transition-colors pr-12"
                  id="confirm-password"
                  placeholder="••••••••"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  aria-label="Toggle confirm password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a3f47] hover:text-[#e6007e] transition-colors p-1"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 ml-1 font-medium">{errorMsg}</p>
            )}

            <button
              className="w-full bg-[#e6007e] text-white rounded-xl py-3.5 font-bold hover:bg-[#b90064] transition-colors flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-[#e6007e]/10 disabled:opacity-70"
              type="submit"
              disabled={isLoading}
            >
              {isLoading && (
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              )}
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={onDone}
              className="text-xs text-[#5a3f47] hover:text-[#e6007e] transition-colors font-semibold text-center mt-1"
            >
              Back to Login
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
