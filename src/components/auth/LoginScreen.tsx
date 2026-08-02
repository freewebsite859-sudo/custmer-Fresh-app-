import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';
import { LOGO_SQUARE } from '../../data/mockData';

export const LoginScreen: React.FC<{onToggleAuth: () => void}> = ({onToggleAuth}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      if (!supabase) {
        setErrorMsg('Authentication is unavailable because the app is not configured.');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes('rate') || error.status === 429) {
          setErrorMsg('Auth rate limit reached. Please wait a moment and try again.');
        } else {
          setErrorMsg('Invalid credentials. Please check your email and password.');
        }
      }
    } catch (err: any) {
      setErrorMsg('Login request failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (!supabase) {
        setErrorMsg('Authentication is unavailable because the app is not configured.');
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) {
        setErrorMsg('Google login could not be started. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Google login could not be started. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('Please enter your email address first.');
      return;
    }
    if (!supabase) {
      alert('Authentication is unavailable because the app is not configured.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      alert(error.message);
    } else {
      alert('Password reset link has been sent to your email.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fcf9f8] text-[#26181c] font-sans flex flex-col items-center overflow-y-auto antialiased">
      {/* Background Glassmorphism blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-[#e6007e]/10 blur-[60px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-80 h-80 rounded-full bg-[#fde7f3]/40 blur-[60px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col">
        {/* Top Area: Logo & Brand */}
        <div className="flex flex-col items-center mb-8">
          <img 
            alt="Nexora Logo" 
            className="h-28 w-28 object-contain mb-4" 
            src={LOGO_SQUARE}
          />
        </div>

        {/* Illustration */}
        <div className="mb-8 rounded-2xl overflow-hidden aspect-video relative shadow-sm border border-[#e8e8e8] bg-white">
          <img 
            className="object-cover w-full h-full"
            src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80"
            alt="Corporate luxury aesthetic growth illustration"
          />
        </div>

        {/* Content: Titles */}
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl font-bold text-[#26181c] mb-2">Welcome Back</h2>
          <p className="text-sm text-[#5a3f47]">Log in once — Nexora will route Customers, Shop Owners and Growth Partners to the right workspace and keep everything synced on every device.</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
            {['Customer', 'Shop Owner', 'Growth Partner'].map((role) => (
              <span
                key={role}
                className="rounded-full border border-[#f3c2dc] bg-[#fde7f3] px-3 py-1 text-[11px] font-bold text-[#8e004b]"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#26181c] ml-1" htmlFor="identifier">Email Address</label>
            <input 
              className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] transition-colors" 
              id="identifier" 
              placeholder="name@domain.com" 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-semibold text-[#26181c] ml-1" htmlFor="password">Password</label>
            <div className="relative">
              <input 
                className="w-full bg-[#fcf9f8] border border-[#e8e8e8] rounded-xl px-4 py-3.5 text-sm text-[#26181c] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] transition-colors pr-12" 
                id="password" 
                placeholder="••••••••" 
                type={showPassword ? "text" : "password"}
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

          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                className="rounded border-[#e8e8e8] text-[#e6007e] focus:ring-[#e6007e] w-4 h-4" 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="text-xs text-[#5a3f47] group-hover:text-[#26181c] transition-colors font-medium">Remember me</span>
            </label>
            <button 
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-[#e6007e] hover:text-[#b90064] transition-colors font-semibold"
            >
              Forgot Password?
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 ml-1 font-medium">{errorMsg}</p>
          )}

          <div className="flex flex-col gap-4 mt-2">
            <button 
              className="w-full bg-[#e6007e] text-white rounded-xl py-3.5 font-bold hover:bg-[#b90064] transition-colors flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-[#e6007e]/10 disabled:opacity-70" 
              id="login-btn" 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              ) : null}
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#e8e8e8]"></div>
              <span className="flex-shrink-0 mx-4 text-[11px] font-medium text-[#5a3f47] uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-[#e8e8e8]"></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-[#fde7f3] text-[#e6007e] rounded-xl py-3.5 font-bold hover:bg-[#fce2e7] transition-colors flex items-center justify-center gap-3 active:scale-[0.98] border border-[#f3c2dc]" 
              type="button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              Continue with Google
            </button>

          </div>
        </form>

        {/* Bottom Link */}
        <div className="mt-12 text-center pb-8 pb-safe">
          <p className="text-sm text-[#5a3f47]">
            Need a new Nexora account?
            <button 
              onClick={onToggleAuth}
              className="text-[#e6007e] font-bold hover:text-[#b90064] transition-colors ml-1"
            >
              Sign Up
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};
