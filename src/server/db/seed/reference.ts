// Reference data of every new database, demonstration or production: the four engineering disciplines (docs/spec/01; the real
// list, leads and headcount come with ING-D1). Labels in French, typed data (shown as typed).
import { DISCIPLINE_CODES, type DisciplineCode } from '@/domain/vocab';
import { disciplines } from '../schema';
import type { Tx } from '../types';

export const DISCIPLINE_SEEDS: Readonly<Record<DisciplineCode, string>> = {
  process: 'Process', mechanical: 'Mécanique', electrical: 'Électrique', automation: 'Automatisme',
};

export async function seedReference(tx: Tx): Promise<void> {
  let position = 0;
  for (const code of DISCIPLINE_CODES) await tx.insert(disciplines).values({ code, label: DISCIPLINE_SEEDS[code], position: ++position });
}
