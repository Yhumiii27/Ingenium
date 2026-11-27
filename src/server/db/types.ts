import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import type * as schema from './schema';

type Schema = typeof schema;

/** The part of a raw query result Ingenium reads. */
export interface QueryRows<T> {
  rows: T[];
}

/** Raw query results: node-postgres's `QueryResult` carries `rows`, which is all Ingenium reads from `db.execute()`. */
export interface IngeniumQueryResultHKT extends PgQueryResultHKT {
  type: QueryRows<this['row']>;
}

/** Typed Drizzle handle over the Ingenium schema over a node-postgres pool. */
export type DB = PgDatabase<IngeniumQueryResultHKT, Schema>;

/** Transaction handle (same query API as DB). */
export type Tx = PgTransaction<IngeniumQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
