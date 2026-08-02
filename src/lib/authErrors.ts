// Real, actionable auth error messages for the customer app.
//
// Supabase returns precise error codes/messages (e.g. `email_not_confirmed`,
// `invalid_credentials`, `user_already_exists`). Instead of hiding them behind
// a generic "Invalid credentials" string, map the known cases to messages the
// user can actually act on, and fall back to the REAL server message so no
// failure mode is ever masked.

interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number | null;
}

export function friendlyAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;

  const message = (error.message || '').trim();
  const code = (error.code || '').toLowerCase();
  const status = error.status;

  if (status === 429 || /rate limit|too many requests|rate/i.test(message)) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (
    code === 'email_not_confirmed' ||
    /email not confirmed|confirm your email/i.test(message)
  ) {
    return 'Email not confirmed yet — please click the confirmation link we emailed you, then log in.';
  }

  if (
    code === 'invalid_credentials' ||
    /invalid login credentials|invalid credentials/i.test(message)
  ) {
    return 'Invalid login credentials. Please check your email and password.';
  }

  if (
    code === 'user_already_exists' ||
    /already registered|already exists/i.test(message)
  ) {
    return 'An account with this email already exists. Please log in instead, or reset your password.';
  }

  if (/password should be at least/i.test(message)) {
    return 'Password must be at least 6 characters.';
  }

  if (
    code === 'email_exists' ||
    /email address already/i.test(message) ||
    /is already used/i.test(message)
  ) {
    return 'This email address is already registered. Please log in instead.';
  }

  if (
    code === 'otp_expired' ||
    /link has expired|token has expired|otp expired/i.test(message)
  ) {
    return 'That link has expired. Please request a fresh one and try again.';
  }

  if (
    code === 'provider_disabled' ||
    /provider is not enabled|provider.*disabled/i.test(message)
  ) {
    return 'That sign-in option is not available yet. Please log in with email and password.';
  }

  // Unknown case — surface the REAL server message (never a fake generic one).
  return message || fallback;
}
