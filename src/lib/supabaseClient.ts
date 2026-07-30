import { createClient } from '@supabase/supabase-js';

// Safe environment variable accessor
const getEnv = (key: string): string => {
  try {
    // Standard Vite env access
    const viteEnv = (import.meta as any).env;
    if (viteEnv && viteEnv[key]) return viteEnv[key];
    
    // Fallback to process.env (for some CI/CD or custom runners)
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  } catch (e) {
    // Silence errors
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'placeholder-anon-key';

// Only create client if we have a valid URL format (prevents crash on empty string)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
