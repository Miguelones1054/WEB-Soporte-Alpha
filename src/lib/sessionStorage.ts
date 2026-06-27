const REMEMBER_KEY = 'admin_remember';
const EMAIL_KEY = 'admin_email';
const PASSWORD_KEY = 'admin_password';
const TOKEN_KEY = 'admin_token';

export function isRememberSessionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(REMEMBER_KEY) === 'true';
}

export function getSavedCredentials(): { email: string; password: string } | null {
  if (!isRememberSessionEnabled()) return null;
  const email = localStorage.getItem(EMAIL_KEY)?.trim() ?? '';
  const password = localStorage.getItem(PASSWORD_KEY) ?? '';
  if (!email || !password) return null;
  return { email, password };
}

export function persistRememberSession(
  email: string,
  password: string,
  remember: boolean
): void {
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, 'true');
    localStorage.setItem(EMAIL_KEY, email.trim());
    localStorage.setItem(PASSWORD_KEY, password);
    return;
  }
  clearRememberSession();
}

export function clearRememberSession(): void {
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(PASSWORD_KEY);
}

export function saveAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function clearAllSessionData(): void {
  clearAdminToken();
  clearRememberSession();
}
