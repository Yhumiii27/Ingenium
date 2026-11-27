import { describe, expect, it } from 'vitest';
import { simulatedKeystoneRegister } from '@/server/integrations/keystone/register-demo';
import { planRegisterTransfer } from './transfer';

const projects = new Set(['HLT-026', 'NDC-031', 'RDP-072']);

describe('transfer of the engineering register from Keystone', () => {
  it('the demonstration register is kept whole (Keystone’s short codes mapped)', () => {
    const p = planRegisterTransfer(simulatedKeystoneRegister('2026-11-24'), projects);
    expect(p.refusals).toEqual([]);
    expect(p.counts).toMatchObject({ rules: 6, deliverables: 16, inputs: 14, checks: 11, outputs: 6, changes: 4, refused: 0 });
    expect(p.records.deliverables.find((d) => d.number === 'BOM-MEC-026')).toMatchObject({ discipline: 'mechanical', status: 'frozen', recipients: ['purchasing'] });
    expect(p.records.inputs.find((i) => i.documentNumber === 'BOD-CLI-026')).toMatchObject({ externalParty: 'client', externalTitle: 'Basis of design du client' });
    expect(p.records.checks.find((c) => c.number === 'C-10')).toMatchObject({ status: 'resolved', closedByName: 'Marc Lenoir' });
  });
  it('a gap is a motivated refusal, never an overwrite', () => {
    const p = planRegisterTransfer([
      { nature: 'livrable', projet_code: 'ZZZ-999', keystone_id: 1, donnees: {} },
      { nature: 'livrable', projet_code: 'HLT-026', keystone_id: 2, donnees: { numero: 'bad number', titre: 'x', discipline: 'process', revision: 'A', etat: 'draft', date: '2026-11-01', auteur: 'X' } },
      { nature: 'controle', projet_code: 'HLT-026', keystone_id: 3, donnees: { numero: 'C-01', regle: 'unknown', gravite: 'info', titre: 'x', discipline: 'elec', etat: 'Open' } },
      { nature: 'entree', projet_code: 'HLT-026', keystone_id: 4, donnees: { consommateur: 'elec', document: 'PID-HLT-026', revision: 'C' } },
      { nature: 'entree', projet_code: 'HLT-026', keystone_id: 5, donnees: { consommateur: 'elec', document: 'PID-HLT-026', revision: 'D' } },
      { nature: 'mystery', projet_code: 'HLT-026', keystone_id: 6, donnees: {} },
    ], projects);
    expect(p.refusals.map((r) => r.reason)).toEqual(['Project not published by Keystone', 'A value is outside its format', 'Unknown consistency rule', 'Duplicate', 'Unknown nature']);
    expect(p.records.inputs).toHaveLength(1);
    expect(p.counts).toMatchObject({ read: 6, refused: 5 });
  });
});
