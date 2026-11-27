// Every other path of /api/v1/ answers a JSON 404 until its endpoint is built (src/domain/api.ts).
import { API_NOT_FOUND } from '@/domain/api';

export const dynamic = 'force-dynamic';

const notFound = () => Response.json(API_NOT_FOUND, { status: 404, headers: { 'Cache-Control': 'no-store' } });
export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
