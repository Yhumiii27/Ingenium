// Keystone as simulated in the demonstration (INGENIUM_KEYSTONE=simulation): rows shaped like keystone.pub_projets and
// keystone.pub_affectations, on project codes of Keystone's own demonstration data set (HLT-026, NDC-031, EWA-051, PRS-038,
// WSA-044). Entirely fictitious: names of demo.example only, never a real person, company or project. Never served on the
// shared server (the mode `views` reads the real views).
import { DEMO_COLLEAGUES, DEMO_PERSONAS } from '@/server/db/seed/personas';

const PEOPLE = [...DEMO_PERSONAS, ...DEMO_COLLEAGUES];

const person = (email: string) => {
  const i = PEOPLE.findIndex((x) => x.email === email);
  if (i < 0) throw new Error(`Keystone simulation: unknown demo person ${email}`);
  return { ...PEOPLE[i], matricule: `EMP-9${String(i + 1).padStart(3, '0')}` };
};

export const KEYSTONE_DEMO_PROJECTS: readonly Record<string, unknown>[] = [
  { code: 'HLT-026', numero: '#026', nom: 'Harbor Line Terminal Expansion', client: 'Port authority', phase: 'Études', imputable: true },
  { code: 'NDC-031', numero: '#031', nom: 'Northgate Data Center Retrofit', client: 'Infrastructure BU', phase: 'Études', imputable: true },
  { code: 'EWA-051', numero: '#051', nom: 'Eastbank Warehouse Automation', client: 'Logistics BU', phase: 'Fabrication', imputable: true },
  { code: 'PRS-038', numero: '#038', nom: 'Portside Rail Spur', client: 'Port authority', phase: 'Offre', imputable: true },
  { code: 'WSA-044', numero: '#044', nom: 'Westfield Solar Array', client: 'Energy BU', phase: 'Clos', imputable: false },
];

/** Assignments: [project, demo e-mail, activity]. */
const TEAMS: readonly [string, string, string][] = [
  ['HLT-026', 'marc.lenoir@demo.example', 'Responsable ingénierie'],
  ['HLT-026', 'claire.renaud@demo.example', 'Ingénierie process'],
  ['HLT-026', 'julien.faure@demo.example', 'Ingénierie mécanique'],
  ['HLT-026', 'ines.barbier@demo.example', 'Ingénierie électrique'],
  ['HLT-026', 'hugo.lemaire@demo.example', 'Automatisme'],
  ['HLT-026', 'camille.arnaud@demo.example', 'Gestion documentaire'],
  ['NDC-031', 'marc.lenoir@demo.example', 'Responsable ingénierie'],
  ['NDC-031', 'ines.barbier@demo.example', 'Ingénierie électrique'],
  ['NDC-031', 'hugo.lemaire@demo.example', 'Automatisme'],
  ['EWA-051', 'julien.faure@demo.example', 'Ingénierie mécanique'],
  ['EWA-051', 'claire.renaud@demo.example', 'Ingénierie process'],
  ['WSA-044', 'claire.renaud@demo.example', 'Ingénierie process'],
];

export const KEYSTONE_DEMO_ASSIGNMENTS: readonly Record<string, unknown>[] = TEAMS.map(([projet_code, email, activite], i) => ({
  source: 'planning', affectation_id: `demo-${String(i + 1).padStart(3, '0')}`, matricule: person(email).matricule,
  personne_nom: person(email).name, projet_code, activite,
}));

/** What clavis.pub_personnes would give for the simulated employee numbers (matricule → e-mail). */
export const KEYSTONE_DEMO_EMAILS: ReadonlyMap<string, string> = new Map(PEOPLE.map((p) => [person(p.email).matricule, p.email]));
