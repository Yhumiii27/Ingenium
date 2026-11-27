// Ingenium's roles (docs/spec/02-roles.md, default answer of ING-19), granted in Clavis and read in clavis.pub_acces (role keys
// `Ingenium.EngineeringLead`…, Clavis src/domain/app-roles.ts) — cumulative. Pure registry: no component, no server import, so
// server code, the proxy and scripts can load it.

/** Role keys, from the broadest to the narrowest (the first one held is shown as the person's role). */
export const ROLE_KEYS = ['engineering_lead', 'engineer', 'designer', 'document_controller', 'admin', 'reader'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const isRoleKey = (v: unknown): v is RoleKey => typeof v === 'string' && (ROLE_KEYS as readonly string[]).includes(v);

/** Role names (EN source strings, translated through t()). */
export const ROLE_LABEL: Record<RoleKey, string> = {
  engineering_lead: 'Engineering lead',
  engineer: 'Discipline engineer',
  designer: 'Designer / draughtsperson',
  document_controller: 'Engineering document controller',
  admin: 'Administrator',
  reader: 'Reader',
};

/** Role key in Clavis's catalogue (`Ingenium.EngineeringLead`). */
export const CLAVIS_ROLE: Record<RoleKey, string> = Object.fromEntries(
  ROLE_KEYS.map((r) => [r, `Ingenium.${r.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`]),
) as Record<RoleKey, string>;

/** Distinct known roles in priority order (unknown values dropped). */
export function sortRoles(roles: Iterable<unknown>): RoleKey[] {
  const held = new Set<string>();
  for (const r of roles) if (isRoleKey(r)) held.add(r);
  return ROLE_KEYS.filter((r) => held.has(r));
}

/** Active role: `preferred` when the user holds it, else the highest role held; null when the user holds none. */
export function activeRoleOf(roles: readonly string[], preferred?: string | null): RoleKey | null {
  const held = sortRoles(roles);
  if (preferred && isRoleKey(preferred) && held.includes(preferred)) return preferred;
  return held[0] ?? null;
}
