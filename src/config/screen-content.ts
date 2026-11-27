// What each screen built in a later delivery will hold (docs/spec/03-menus-ecrans.md § 3–4), shown by its placeholder. EN
// source strings, translated through t(). Pure.
import type { ScreenId } from './screens';

export const SCREEN_CONTENT: Partial<Record<ScreenId, readonly string[]>> = {
  projectSummary: [
    'Who waits for what between disciplines',
    'Progress of the deliverables by discipline',
    'Open consistency checks and recent changes with their impact',
    'Card of the engineering pack',
  ],
  process: ['Inputs consumed (document, discipline of origin, frozen or released revision)', 'Deliverables up to release (Codex references)', 'Generated lists, checks of the discipline, import assistant'],
  mechanical: ['Inputs consumed (document, discipline of origin, frozen or released revision)', 'Deliverables up to release (Codex references)', 'Generated lists, checks of the discipline, import assistant'],
  electrical: ['Inputs consumed (document, discipline of origin, frozen or released revision)', 'Deliverables up to release (Codex references)', 'Generated lists, checks of the discipline, import assistant'],
  automation: ['Inputs consumed (document, discipline of origin, frozen or released revision)', 'Deliverables up to release (Codex references)', 'Generated lists, checks of the discipline, import assistant'],
  pid: ['Tags of a sheet and their scope (client, project, overlay)', 'Each tag tied to a validated part', 'Steps up to approved for construction', 'Import of a tag list (import plan before any write), revision gap with Codex'],
  bom: ['Flat list, assembly tree, where-used, comparison of revisions', 'Each line tied to an equipment of the project', 'Gap with the sold BOM of Modulus (without prices: they stay in Keystone)'],
  interfaces: ['IF-nn: side, other party, expected data, need date, received on, state, owner'],
  pack: ['Completeness by family (weight, minimum)', 'Expected items', 'Publication for Arche (G2 criterion)'],
  ceFile: ['Essential requirements and sections of the technical file', 'One file per equipment', 'Safety studies of Vigie linked'],
  parts: ['Part sheet: technical data, revision, status, equivalents, structure, linked drawings, ECO', 'Request a change (ECR in Vigie)', 'Validation by the engineering lead'],
  structures: ['Assemblies: parent, child, quantity, position'],
  spares: ['Wear and spare parts of each part'],
  drawings: ['Mirror of the PDM / 3DEXPERIENCE vault (number, title, revision, state, linked part)', 'Open in PDM', 'State of the synchronisation (simulated until the IT department validates the connector)'],
  changes: ['Change orders and requests of Vigie on the parts (read, deep link)'],
  rules: ['Consistency rules between disciplines (ING-D2)'],
  importTools: ['Import tools and column mappings (EPLAN, TIA Portal, SolidWorks, AutoCAD P&ID)'],
  packTemplates: ['Template of the engineering pack per machine type (families, weights, minimum)'],
  ceLists: ['Lists of the CE technical file (essential requirements, sections)'],
};
