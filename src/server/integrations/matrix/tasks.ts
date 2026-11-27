import 'server-only';
// Tasks and approvals of the whole suite (Norma 2.4, contract norma/contrats/taches-v1.md § 4): read in matrix.pub_taches
// for the signed-in person (`personne_id` = the Clavis `oid`, and `pour_le_compte_de` for the stand-ins), with
// matrix.pub_taches_sources for the « source unavailable » banner (INGENIUM_SUITE_TASKS=views, link `lecture
// matrix.pub_taches` granted by Matrix). Mode `simulation`: fictitious rows of other tools dated from the business day, for the
// demonstration. Never throws: a view that cannot be read gives the banner « Matrix: source unavailable ». Ingenium publishes
// no task of its own yet (its computed tasks come with the registers of delivery 2; ingenium.pub_taches follows).
import { sql } from 'drizzle-orm';
import { addDays, dedupe, PUB_TACHES_COLUMNS, rowProblems, type TaskRow } from '@norma/charte/ds/task-rules';
import type { ConnectorMode } from '@/domain/vocab';
import type { DB } from '@/server/db/types';
import { log } from '@/server/log';

export const SUITE_TASKS_VIEWS = { tasks: 'matrix.pub_taches', sources: 'matrix.pub_taches_sources' } as const;

export interface SuiteTasks {
  rows: TaskRow[];
  /** Tools whose publication could not be read (banner). */
  unavailable: string[];
  /** The rows are the demonstration's simulation. */
  simulated: boolean;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null);
const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'string' ? v.slice(0, 10) : null);

/** A row of matrix.pub_taches as the charter's components read it; null when it breaks the contract. */
export function taskRowOf(r: Record<string, unknown>): TaskRow | null {
  const row = {
    ...r,
    echeance: day(r.echeance),
    cree_le: iso(r.cree_le) ?? undefined,
    maj_le: iso(r.maj_le) ?? '',
    personne_id: r.personne_id == null ? '' : String(r.personne_id),
    actions: Array.isArray(r.actions) ? r.actions : [],
    version: r.version == null ? '' : String(r.version),
  } as unknown as TaskRow;
  return rowProblems(row).length ? null : row;
}

const DEMO_PERSON = '00000000-0000-4000-8000-000000000001';

/** Fictitious rows of the other tools (simulation), dated from the business day `today`: never a real person or project. */
export function simulatedSuiteTasks(today: string, now = new Date()): TaskRow[] {
  const at = now.toISOString();
  const base = { personne_id: DEMO_PERSON, pour_le_compte_de: null, resultat: null, sensible: false, decision_a_distance: false, site: null, filiale: null, cree_le: at, maj_le: at } as const;
  return [
    { ...base, outil: 'keystone', tache_id: 'activity:HLT-026-ENG-12', nature: 'tache', type: 'activity', type_libelle: 'Activité du planning', type_libelle_en: 'Planning activity', objet_ref: 'HLT-026', titre: 'Note de calcul de la charpente, révision B', etat: 'en_cours', echeance: addDays(today, 3), priorite: 'haute', actions: ['ouvrir', 'commenter'], projet: 'HLT-026', lien: 'https://keystone.example/projects/HLT-026/schedule', version: '4' },
    { ...base, outil: 'keystone', tache_id: 'activity:NDC-031-ENG-04', nature: 'tache', type: 'activity', type_libelle: 'Activité du planning', type_libelle_en: 'Planning activity', objet_ref: 'NDC-031', titre: 'Schémas électriques du tableau TGBT', etat: 'a_faire', echeance: addDays(today, -2), priorite: 'normale', actions: ['ouvrir'], projet: 'NDC-031', lien: 'https://keystone.example/projects/NDC-031/schedule', version: '2' },
    { ...base, outil: 'codex', tache_id: 'step:PLA-HLT-0042-B-2', nature: 'approbation', type: 'circuit_step', type_libelle: 'Étape de circuit', type_libelle_en: 'Approval step', objet_ref: 'PLA-HLT-0042', titre: 'Plan d’implantation, révision B — vérification', etat: 'a_faire', echeance: addDays(today, 1), priorite: 'normale', actions: ['ouvrir', 'approuver', 'refuser'], projet: 'HLT-026', lien: 'https://codex.example/documents/PLA-HLT-0042', version: '7' },
    { ...base, outil: 'codex', tache_id: 'review:NOT-QUA-0007', nature: 'tache', type: 'review', type_libelle: 'Revue de document', type_libelle_en: 'Document review', objet_ref: 'NOT-QUA-0007', titre: 'Revue périodique de la note de conception', etat: 'en_attente', echeance: addDays(today, 12), priorite: 'normale', actions: ['ouvrir'], projet: null, lien: 'https://codex.example/documents/NOT-QUA-0007', version: '3' },
    { ...base, outil: 'vigie', tache_id: 'eco-approbation:ECO-2026-031:englead', nature: 'approbation', type: 'eco_key', type_libelle: 'Clé d’un ordre de modification', type_libelle_en: 'Engineering change key', objet_ref: 'ECO-2026-031', titre: 'Pompe 18,5 kW à la place de 15 kW — clé responsable ingénierie', etat: 'a_faire', echeance: addDays(today, 5), priorite: 'haute', actions: ['ouvrir', 'approuver', 'refuser'], projet: 'HLT-026', lien: 'https://vigie.example/modifications-techniques?sel=ECO-2026-031', version: '2' },
    { ...base, outil: 'vigie', tache_id: 'action:AC-260140', nature: 'tache', type: 'action', type_libelle: 'Action QSE', type_libelle_en: 'QHSE action', objet_ref: 'AC-260140', titre: 'Mettre à jour l’analyse de risques du poste de remplissage', etat: 'faite', echeance: addDays(today, -6), priorite: 'normale', actions: ['ouvrir'], projet: null, lien: 'https://vigie.example/actions?sel=AC-260140', version: '5' },
  ];
}

/** The person's tasks and approvals of the whole suite (deduplicated). `personId` is the Clavis `oid` (null in demo mode). */
export async function readSuiteTasks(db: DB, opts: { mode: ConnectorMode; personId: string | null; today: string }): Promise<SuiteTasks> {
  if (opts.mode === 'off') return { rows: [], unavailable: [], simulated: false };
  if (opts.mode === 'simulation') return { rows: dedupe(simulatedSuiteTasks(opts.today)), unavailable: [], simulated: true };
  if (!opts.personId) return { rows: [], unavailable: [], simulated: false };
  try {
    const r = await db.execute(sql`select ${sql.raw(PUB_TACHES_COLUMNS.join(', '))} from ${sql.raw(SUITE_TASKS_VIEWS.tasks)}
      where personne_id::text = ${opts.personId} or pour_le_compte_de::text = ${opts.personId}`);
    const rows = dedupe((r.rows as Record<string, unknown>[]).map(taskRowOf).filter((x): x is TaskRow => !!x));
    let unavailable: string[] = [];
    try {
      const s = await db.execute(sql`select outil from ${sql.raw(SUITE_TASKS_VIEWS.sources)} where etat <> 'ok' order by outil`);
      unavailable = (s.rows as { outil: string }[]).map((x) => x.outil);
    } catch {
      unavailable = [];
    }
    return { rows, unavailable, simulated: false };
  } catch (e) {
    log.warn('matrix.pub_taches not read', { component: 'matrix', error: e instanceof Error ? e.message : String(e) });
    return { rows: [], unavailable: ['matrix'], simulated: false };
  }
}
