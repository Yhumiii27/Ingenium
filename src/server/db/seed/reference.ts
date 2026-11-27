// Reference data of every new database, demonstration or production: the four engineering disciplines (docs/spec/01; the real
// list, leads and headcount come with ING-D1). Labels in French, typed data (shown as typed).
import { DISCIPLINE_CODES, type DisciplineCode } from '@/domain/vocab';
import { consistencyRules, disciplines } from '../schema';
import type { Tx } from '../types';

export const DISCIPLINE_SEEDS: Readonly<Record<DisciplineCode, string>> = {
  process: 'Process', mechanical: 'Mécanique', electrical: 'Électrique', automation: 'Automatisme',
};

/** Consistency rules between disciplines (Keystone's six rules; ING-D2 gives the real list). French labels, typed data. */
export const RULE_SEEDS: readonly [string, string][] = [
  ['process-mechanical', 'Process ↔ Mécanique'], ['process-electrical', 'Process ↔ Électrique'], ['electrical-automation', 'Électrique ↔ Automatisme'],
  ['process-automation', 'Process ↔ Automatisme'], ['mechanical-electrical', 'Mécanique ↔ Électrique'], ['revision', 'Alignement des révisions'],
];

export async function seedReference(tx: Tx): Promise<void> {
  let position = 0;
  for (const code of DISCIPLINE_CODES) await tx.insert(disciplines).values({ code, label: DISCIPLINE_SEEDS[code], position: ++position });
  position = 0;
  for (const [code, label] of RULE_SEEDS) await tx.insert(consistencyRules).values({ code, label, position: ++position });
}
