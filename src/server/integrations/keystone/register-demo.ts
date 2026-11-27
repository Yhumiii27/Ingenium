// Keystone's engineering register as simulated in the demonstration (INGENIUM_KEYSTONE=simulation): rows shaped like the
// transfer view keystone.pub_reprise_registre_ingenierie asked in DI-K2 (`nature`, `projet_code`, `keystone_id`, `donnees`),
// with Keystone's own short discipline codes (meca, elec, auto, achats). Built on Keystone's demonstration register of HLT-026
// (12 inputs, 13 deliverables, 6 rules, 10 checks, 6 lists, 4 changes), a few rows of NDC-031 and of the confidential R&D
// project RDP-072. Entirely fictitious; the authors are the demonstration people of Ingenium (demo.example). Dates are counted
// back from the business day, so the data set never goes stale. Never served on the shared server.
import { addDays } from '@norma/charte/ds/task-rules';

type Row = { nature: string; projet_code: string | null; keystone_id: string; donnees: Record<string, unknown> };

const AUTHOR = { process: 'Claire Renaud', meca: 'Julien Faure', elec: 'Inès Barbier', auto: 'Hugo Lemaire' } as const;

export function simulatedKeystoneRegister(today: string): Row[] {
  const d = (n: number) => addDays(today, -n);
  let k = 0;
  const row = (nature: string, projet_code: string | null, donnees: Record<string, unknown>): Row => ({ nature, projet_code, keystone_id: `ks-${++k}`, donnees });
  const rules: Row[] = [
    ['process-mechanical', 'Process ↔ Mécanique'], ['process-electrical', 'Process ↔ Électrique'], ['electrical-automation', 'Électrique ↔ Automatisme'],
    ['process-automation', 'Process ↔ Automatisme'], ['mechanical-electrical', 'Mécanique ↔ Électrique'], ['revision', 'Alignement des révisions'],
  ].map(([code, libelle]) => row('regle', null, { code, libelle }));

  const H = 'HLT-026';
  const deliverables: Row[] = ([
    ['PFD-HLT-026', 'process', 'Schéma de procédé', 'B', 'released', 70, ['meca']],
    ['PID-HLT-026', 'process', 'P&ID', 'D', 'released', 55, ['meca', 'elec', 'auto', 'client']],
    ['LST-INS-026', 'process', 'Liste des instruments', 'D', 'released', 55, ['elec', 'auto', 'achats']],
    ['GA-HLT-026', 'meca', 'Plan d’ensemble', 'C', 'released', 65, ['process', 'elec', 'site']],
    ['BOM-MEC-026', 'meca', 'Nomenclature mécanique', 'D', 'frozen', 58, ['achats']],
    ['LST-MOT-026', 'meca', 'Liste des moteurs', 'B', 'released', 62, ['elec']],
    ['SCH-ELE-026', 'elec', 'Schémas électriques', 'B', 'draft', 57, ['auto', 'site']],
    ['BOM-ELE-026', 'elec', 'Nomenclature électrique', 'B', 'draft', 57, ['achats']],
    ['LST-IO-026', 'elec', 'Liste des entrées / sorties', 'B', 'frozen', 60, ['auto']],
    ['LST-CAB-026', 'elec', 'Liste des câbles', 'A', 'draft', 56, ['site']],
    ['FDS-HLT-026', 'auto', 'Analyse fonctionnelle', 'A', 'frozen', 61, ['client', 'elec']],
    ['VAR-PLC-026', 'auto', 'Table des variables de l’automate (export TIA)', 'A', 'draft', 57, ['elec']],
    ['HMI-HLT-026', 'auto', 'Spécification de l’IHM', 'A', 'draft', 58, ['client']],
  ] as const).map(([numero, discipline, titre, revision, etat, ago, destinataires]) =>
    row('livrable', H, { numero, discipline, titre, revision, etat, date: d(ago), auteur: AUTHOR[discipline], destinataires: [...destinataires] }));

  const inputs: Row[] = ([
    ['process', 'BOD-CLI-026', '2', true, 'client', 'Basis of design du client'],
    ['process', 'GA-HLT-026', 'C', true],
    ['meca', 'PID-HLT-026', 'D', false],
    ['meca', 'LST-INS-026', 'D', false],
    ['meca', 'BOD-CLI-026', '2', true, 'client', 'Basis of design du client'],
    ['elec', 'PID-HLT-026', 'C', true],
    ['elec', 'LST-INS-026', 'C', true],
    ['elec', 'LST-MOT-026', 'B', true],
    ['elec', 'GA-HLT-026', 'C', true],
    ['auto', 'PID-HLT-026', 'C', true],
    ['auto', 'LST-IO-026', 'B', true],
    ['auto', 'FDS-HLT-026', 'A', true],
  ] as const).map(([consommateur, document, revision, confirmee, fournisseur, titre]) =>
    row('entree', H, { consommateur, document, revision, confirmee, ...(fournisseur ? { fournisseur, titre } : {}) }));

  const checks: Row[] = ([
    ['C-01', 'process-electrical', 'blocking', '3 repères du P&ID rév. D absents des schémas électriques', 'LSL-201, XV-112, TT-201 ajoutés en rév. D · schémas rév. B faits sur la rév. C', 'elec', 'open'],
    ['C-02', 'process-automation', 'blocking', '3 repères du P&ID rév. D absents de la table des variables', 'LSL-201, XV-112, TT-201 · aucune variable dans l’export TIA', 'auto', 'open'],
    ['C-03', 'mechanical-electrical', 'blocking', 'Moteur de levage M-310 : 160 kW dans la liste des moteurs, 132 kW dans les schémas', 'LST-MOT-026 rév. B / SCH-ELE-026 rév. B · câble et protection à reprendre', 'elec', 'open'],
    ['C-04', 'electrical-automation', 'blocking', 'DI 4.3 (ZS-310) dans la liste des E/S sans variable d’automate', 'LST-IO-026 rév. B / VAR-PLC-026 rév. A', 'auto', 'open'],
    ['C-05', 'electrical-automation', 'warning', 'Variable FT110_Flow (AI) sans E/S dans les schémas', 'VAR-PLC-026 rév. A · vérifier le câblage de FT-110 ou retirer la variable', 'elec', 'open'],
    ['C-06', 'process-automation', 'warning', 'XV-111 câblée à l’automate sans retour d’état', 'Pas de ZSO/ZSC sur le P&ID rév. D', 'process', 'in_progress'],
    ['C-07', 'process-mechanical', 'info', 'Frein HST-BRK-160 dans la nomenclature mécanique sans repère P&ID', 'BOM-MEC-026 rév. D · confirmer qu’il fait partie de M-310', 'meca', 'open'],
    ['C-08', 'revision', 'warning', 'Schémas électriques rév. B faits sur le P&ID rév. C — rév. D diffusée', 'Réimporter la liste des instruments rév. D et confirmer l’entrée', 'elec', 'open'],
    ['C-09', 'revision', 'warning', 'Table des variables rév. A faite sur le P&ID rév. C — rév. D diffusée', 'Réimporter la liste des instruments rév. D et confirmer l’entrée', 'auto', 'open'],
    ['C-10', 'process-electrical', 'blocking', 'LT-201 : plage 0–6 m dans la liste des instruments, 0–5 m dans les schémas', null, 'elec', 'resolved'],
  ] as const).map(([numero, regle, gravite, titre, detail, discipline, etat]) =>
    row('controle', H, {
      numero, regle, gravite, titre, detail, discipline, etat,
      ...(etat === 'resolved' ? { note: 'Aligné sur 0–6 m dans SCH-ELE-026 rév. B', ferme_par: 'Marc Lenoir', ferme_le: `${d(59)}T09:00:00Z` } : {}),
    }));

  const outputs: Row[] = [
    row('liste', H, { numero: 'O-01', discipline: 'process', nom: 'Liste des instruments', destinataires: ['elec', 'auto'], source: 'Repères du P&ID', document_source: 'PID-HLT-026', genere_le: `${d(55)}T10:00:00Z`, genere_par: AUTHOR.process, revision_source: 'D' }),
    row('liste', H, { numero: 'O-02', discipline: 'meca', nom: 'Liste des moteurs', destinataires: ['elec'], source: 'Nomenclature mécanique · moteurs et variateurs', document_source: 'BOM-MEC-026', genere_le: `${d(62)}T10:00:00Z`, genere_par: AUTHOR.meca, revision_source: 'C' }),
    row('liste', H, { numero: 'O-03', discipline: 'elec', nom: 'Liste des E/S', destinataires: ['auto'], source: 'Liste des appareils des schémas · signaux', document_source: 'SCH-ELE-026' }),
    row('liste', H, { numero: 'O-04', discipline: 'meca', nom: 'Nomenclature d’achat', destinataires: ['achats'], source: 'Nomenclatures mécanique et électrique · articles figés', genere_le: `${d(58)}T10:00:00Z`, genere_par: AUTHOR.meca }),
    row('liste', H, { numero: 'O-05', discipline: 'elec', nom: 'Liste des câbles', destinataires: ['site'], source: 'Schémas · câbles et cheminements' }),
    row('liste', H, { numero: 'O-06', discipline: 'auto', nom: 'Index du dossier BPE', destinataires: ['site', 'client'], source: 'Documents diffusés · révision et date', document_source: 'FDS-HLT-026' }),
  ];

  const changes: Row[] = ([
    [55, 'P&ID rév. D diffusé · 3 repères ajoutés (LSL-201, XV-112, TT-201)', ['elec', 'auto']],
    [57, 'Table des variables rév. A importée · 2 écarts avec la liste des E/S', ['elec']],
    [58, 'Nomenclature mécanique rév. D figée · 148 articles', ['achats']],
    [62, 'Liste des moteurs rév. B · M-310 confirmé à 160 kW', ['elec']],
  ] as const).map(([ago, texte, destinataires]) => row('changement', H, { date: d(ago), texte, destinataires: [...destinataires] }));

  // A few rows of NDC-031 and of the confidential R&D project RDP-072 (seen by its team only).
  const others: Row[] = [
    row('livrable', 'NDC-031', { numero: 'SCH-ELE-031', discipline: 'elec', titre: 'Schémas du tableau TGBT', revision: 'A', etat: 'frozen', date: d(9), auteur: AUTHOR.elec, destinataires: ['auto', 'site'] }),
    row('livrable', 'NDC-031', { numero: 'VAR-PLC-031', discipline: 'auto', titre: 'Table des variables de l’automate', revision: 'A', etat: 'draft', date: d(6), auteur: AUTHOR.auto, destinataires: ['elec'] }),
    row('entree', 'NDC-031', { consommateur: 'auto', document: 'SCH-ELE-031', revision: 'A', confirmee: false }),
    row('livrable', 'RDP-072', { numero: 'PID-RDP-072', discipline: 'process', titre: 'P&ID du banc d’essai', revision: 'A', etat: 'frozen', date: d(12), auteur: AUTHOR.process, destinataires: ['auto'] }),
    row('entree', 'RDP-072', { consommateur: 'auto', document: 'PID-RDP-072', revision: 'A', confirmee: false }),
    row('controle', 'RDP-072', { numero: 'C-01', regle: 'process-automation', gravite: 'warning', titre: 'Séquence de purge absente de l’analyse fonctionnelle', discipline: 'auto', etat: 'open' }),
  ];
  return [...rules, ...deliverables, ...inputs, ...checks, ...outputs, ...changes, ...others];
}
