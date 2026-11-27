// Sign-in rules — pure, shared by the proxy, the auth routes and the data layer. Ingenium signs in through Clavis (OpenID
// Connect shaped like Entra ID, ENTRA_ISSUER = Clavis) and reads its roles in clavis.pub_acces (Norma § 6), never in the token.
import { sortRoles, type RoleKey } from '@/config/roles';

/** Why a sign-in is refused (shown on /sign-in?error=…). */
export type SignInError = 'config' | 'provider' | 'state' | 'expired' | 'token' | 'no_email' | 'no_role' | 'failed' | 'session';

export const SIGN_IN_ERROR: Record<SignInError, string> = {
  config: 'Sign-in is not configured. Contact the IT department.',
  provider: 'The sign-in service did not answer. Please try again.',
  state: 'The sign-in was interrupted. Please try again.',
  expired: 'The sign-in took too long. Please try again.',
  token: 'The sign-in could not be verified. Please try again.',
  no_email: 'Your account has no professional e-mail address. Contact the IT department.',
  no_role: 'Ingenium is not open to you. Ask the IT department for an access in Clavis.',
  failed: 'The sign-in failed. Please try again.',
  session: 'Your session has ended. Please sign in again.',
};

export const isSignInError = (v: unknown): v is SignInError => typeof v === 'string' && Object.hasOwn(SIGN_IN_ERROR, v);

/** "Ingenium.Manager", "ingenium:coordinator", "manager" → role keys, unknown values dropped. */
export function ingeniumRoleKeys(values: unknown): RoleKey[] {
  const raw = Array.isArray(values) ? values : [];
  return sortRoles(raw.filter((r): r is string => typeof r === 'string').map((r) => r.trim().replace(/^ingenium[.:_-]/i, '').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()));
}

/**
 * Roles granted by Clavis: the person's row of clavis.pub_acces for Ingenium gives its role when the access opens now
 * (`ouvert`), and, once Clavis publishes it (request C-1 / Clavis DM-1), every role in force in `roles`.
 */
export function grantedRolesFromClavisAccess(row: Record<string, unknown> | null | undefined): RoleKey[] {
  if (!row || row.ouvert !== true) return [];
  const all = Array.isArray(row.roles) ? row.roles : [];
  return ingeniumRoleKeys([...(typeof row.role === 'string' ? [row.role] : []), ...all]);
}

/** A professional e-mail of the token (email, preferred_username or upn), lower case. */
export function emailFromClaims(c: Record<string, unknown>): string | null {
  for (const k of ['email', 'preferred_username', 'upn']) {
    const v = c[k];
    if (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return v.trim().toLowerCase();
  }
  return null;
}

/** Where to land after sign-in: a same-origin absolute path only. */
export function safeReturnTo(raw: unknown): string {
  if (typeof raw !== 'string' || !raw || raw.length > 2048) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return '/';
  if (raw === '/sign-in' || raw.startsWith('/sign-in?') || raw.startsWith('/api/auth/')) return '/';
  return raw;
}

export const VIEW_AS_REFUSED = 'View as is only available in demo mode';
export const ROLE_SWITCH_REFUSED = 'You do not hold this role';

export const AUTH_PATHS = {
  signIn: '/api/auth/sign-in',
  callback: '/api/auth/callback',
  signOut: '/api/auth/sign-out',
  page: '/sign-in',
} as const;

export const HEALTH_PATHS = ['/api/health'] as const;

/** Business API of Ingenium (docs/spec/05 § 3): it authenticates its own callers (API client key from delivery 2), never by the session cookie. */
export const API_PREFIX = '/api/v1';

const STATIC_FILE_RE = /\.(?:ico|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|otf|css|js|map|txt|webmanifest)$/i;

/** Paths served without a session in Entra mode. */
export function isPublicPath(pathname: string): boolean {
  if (pathname === AUTH_PATHS.page || pathname === '/access-denied' || pathname.startsWith('/api/auth/')) return true;
  if (HEALTH_PATHS.some((h) => pathname === h || pathname.startsWith(h + '/'))) return true;
  if (pathname === API_PREFIX || pathname.startsWith(API_PREFIX + '/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  return /^\/[^/]+$/.test(pathname) && STATIC_FILE_RE.test(pathname);
}
