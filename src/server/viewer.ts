// The viewer: who is looking and with which roles (cumulative, read in Clavis). Demo personas ("View as") and signed-in users
// have the same shape. Pure type module.
import type { RoleKey } from '@/config/roles';

export interface Viewer {
  userId: string;
  name: string;
  email: string;
  /** Clavis person id (`oid` of the sign-in token): the key of clavis.pub_acces and matrix.pub_taches; null in demo mode. */
  oid: string | null;
  initials: string;
  /** Role shown (the first held, or the one chosen in the account menu). */
  role: RoleKey;
  /** Every role held: the rights are their union (src/domain/rights.ts). */
  roles: RoleKey[];
  demo: boolean;
}

/** "Claire Martin" → "CM". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
