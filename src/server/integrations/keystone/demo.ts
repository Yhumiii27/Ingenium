// Keystone as simulated in the demonstration (INGENIUM_KEYSTONE=simulation): rows shaped like keystone.pub_projets (with the
// `confidentialite` asked in DI-K5) and keystone.pub_equipes_projets (assignments and stakeholders, ING-30), on project codes of Keystone's own demonstration data set (HLT-026, NDC-031, EWA-051, PRS-038,
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
  // A confidential R&D project (ING-29): only its team sees it in Ingenium.
  { code: 'RDP-072', numero: '#072', nom: 'Compact Separator Test Rig', client: 'R&D', phase: 'Études', imputable: true, categorie: 'rd', confidentialite: 'confidentiel' },
].map((p) => ({ confidentialite: 'normal', ...p }));

/** Team: [project, demo e-mail, activity, origin] — assigned to a task by default, or a stakeholder of the project. */
const TEAMS: readonly [string, string, string, ('affectation' | 'partie_prenante')?][] = [
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
  ['HLT-026', 'anne.duval@demo.example', 'Chef de projet', 'partie_prenante'],
  ['RDP-072', 'anne.duval@demo.example', 'Chef de projet', 'partie_prenante'],
  ['RDP-072', 'claire.renaud@demo.example', 'Ingénierie process'],
  ['RDP-072', 'hugo.lemaire@demo.example', 'Automatisme'],
];

/** Rows of keystone.pub_equipes_projets (e-mail left out: the connector reads it in clavis.pub_personnes by employee number). */
export const KEYSTONE_DEMO_ASSIGNMENTS: readonly Record<string, unknown>[] = TEAMS.map(([projet_code, email, activite, origine = 'affectation']) => ({
  projet_code, matricule: person(email).matricule, personne_nom: person(email).name, origine, activite,
}));

/** What clavis.pub_personnes would give for the simulated employee numbers (matricule → e-mail). */
export const KEYSTONE_DEMO_EMAILS: ReadonlyMap<string, string> = new Map(PEOPLE.map((p) => [person(p.email).matricule, p.email]));
