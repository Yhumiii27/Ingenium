// The connectors of Ingenium and their state (docs/spec/05). Pure list: what each reads or writes, how, the mode variable and
// the request that opens it. EN source strings. Shown on « Activity and integrations ».
export interface ConnectorDef {
  tool: string;
  object: string;
  nature: 'read' | 'write';
  how: string;
  /** Variable of the mode (off | simulation | views), or null when the connector is not built yet. */
  variable: string | null;
  delivery: number;
  request: string;
}

export const CONNECTORS: readonly ConnectorDef[] = [
  { tool: 'Clavis', object: 'clavis.pub_acces', nature: 'read', how: 'Roles Ingenium.* at sign-in and on every request', variable: 'INGENIUM_ACCESS_FROM_CLAVIS', delivery: 1, request: 'DI-C1, DI-M1' },
  { tool: 'Keystone', object: 'keystone.pub_projets, pub_affectations', nature: 'read', how: 'Projects and engineering teams (project scope)', variable: 'INGENIUM_KEYSTONE', delivery: 1, request: 'DI-M1' },
  { tool: 'Clavis', object: 'clavis.pub_personnes', nature: 'read', how: 'E-mail of a team member by employee number', variable: 'INGENIUM_KEYSTONE', delivery: 1, request: 'DI-M1' },
  { tool: 'Matrix', object: 'matrix.pub_taches, pub_taches_sources', nature: 'read', how: 'Tasks and approvals of the whole suite', variable: 'INGENIUM_SUITE_TASKS', delivery: 1, request: 'TA-1 (Matrix)' },
  { tool: 'Matrix', object: 'POST /api/declarations (matrix.schema/1)', nature: 'write', how: 'Declaration of Ingenium’s schema to the data catalogue', variable: 'MATRIX_URL', delivery: 1, request: 'DI-M1' },
  { tool: 'Codex', object: 'codex.pub_documents, POST /api/documents', nature: 'write', how: 'Deliverables and P&ID sheets (references only)', variable: null, delivery: 2, request: 'DI-X1' },
  { tool: 'Vigie', object: 'vigie.pub_ordres_modification, pub_signaler_avancement_eco', nature: 'write', how: 'ECO keys and change requests', variable: null, delivery: 3, request: 'DI-V1' },
  { tool: 'Modulus', object: 'modulus.pub_catalogue_machines, sold BOM', nature: 'read', how: 'Standard machine of an equipment, start of the BOM', variable: null, delivery: 3, request: 'DI-O1' },
];
