// GET /api/v1 — index of Ingenium's business API (skeleton of delivery 1, src/domain/api.ts). Public: it carries no data.
import { apiIndex } from '@/domain/api';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(apiIndex(), { headers: { 'Cache-Control': 'no-store' } });
}
