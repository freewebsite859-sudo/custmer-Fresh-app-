import { createClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_REF = 'qwaehqsmodekbgvnaavz';
const EXPECTED_SUPABASE_HOSTNAME = `${SUPABASE_PROJECT_REF}.supabase.co`;

type SupabaseConfigResult =
  | { isValid: true; url: string; anonKey: string; error: null }
  | { isValid: false; url: null; anonKey: null; error: string };

const isBrowserSafeSupabaseKey = (key: string): boolean => {
  if (key.startsWith('sb_publishable_')) {
    return key.length > 'sb_publishable_'.length;
  }

  const jwtParts = key.split('.');
  if (jwtParts.length !== 3) return false;

  try {
    const base64UrlPayload = jwtParts[1];
    const base64Payload = base64UrlPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(base64UrlPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(base64Payload)) as { role?: unknown };
    return payload.role === 'anon';
  } catch {
    return false;
  }
};

export const validateSupabaseConfig = (
  rawUrl: unknown,
  rawAnonKey: unknown,
): SupabaseConfigResult => {
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  const anonKey = typeof rawAnonKey === 'string' ? rawAnonKey.trim() : '';

  if (!url || !anonKey) {
    return {
      isValid: false,
      url: null,
      anonKey: null,
      error:
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the hosting environment.',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      isValid: false,
      url: null,
      anonKey: null,
      error: 'Supabase configuration is invalid. Check the deployment environment variables.',
    };
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.hostname !== EXPECTED_SUPABASE_HOSTNAME ||
    parsedUrl.username ||
    parsedUrl.password ||
    (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    return {
      isValid: false,
      url: null,
      anonKey: null,
      error: `Supabase configuration must use the approved ${SUPABASE_PROJECT_REF} project.`,
    };
  }

  if (!isBrowserSafeSupabaseKey(anonKey)) {
    return {
      isValid: false,
      url: null,
      anonKey: null,
      error: 'Supabase configuration contains an invalid browser key.',
    };
  }

  return {
    isValid: true,
    url: parsedUrl.origin,
    anonKey,
    error: null,
  };
};

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const config = validateSupabaseConfig(
  viteEnv?.VITE_SUPABASE_URL,
  viteEnv?.VITE_SUPABASE_ANON_KEY,
);

export const supabaseConfigError = config.isValid ? null : config.error;
export const supabase = config.isValid
  ? createClient(config.url, config.anonKey)
  : null;
