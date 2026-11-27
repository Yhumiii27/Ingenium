// Ingenium's business API (/api/v1/, docs/spec/05 § 3), skeleton of delivery 1: the index says what the API is and that no
// endpoint is open yet; every other path answers a JSON 404. The endpoints (« Request a part » for Keystone, the task sheet
// and decision of the contract taches-v1 § 6) come with their registers, each with its API client key, rights and audit.
export const API_VERSION = 'v1';

export interface ApiIndex {
  api: 'ingenium';
  version: typeof API_VERSION;
  endpoints: { method: string; path: string; delivery: number; description: string }[];
}

export const PLANNED_ENDPOINTS: ApiIndex['endpoints'] = [
  { method: 'POST', path: '/api/v1/part-requests', delivery: 3, description: 'Request a part (Keystone, « Demander un article »)' },
  { method: 'GET', path: '/api/v1/taches/{tache_id}', delivery: 2, description: 'Task sheet (contract taches-v1 § 6, phase 2)' },
  { method: 'POST', path: '/api/v1/taches/{tache_id}/decision', delivery: 2, description: 'Decision on a task (contract taches-v1 § 6, phase 2)' },
];

/** The index of the API: no endpoint open in delivery 1, the planned ones listed. */
export const apiIndex = (): ApiIndex & { planned: ApiIndex['endpoints'] } => ({ api: 'ingenium', version: API_VERSION, endpoints: [], planned: PLANNED_ENDPOINTS });

export const API_NOT_FOUND = { error: 'not_found', message: 'No such endpoint of the Ingenium API' } as const;
