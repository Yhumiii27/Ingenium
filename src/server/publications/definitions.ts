// Ingenium's publications (docs/spec/05 § 2). Matrix defines and applies the `pub_` views (decision M-18): these are the
// reference queries given to Matrix (request DI-M3), executed as they are by ./definitions.test.ts. No migration creates a
// `pub_` view. A column is never removed or renamed; a new one goes at the end; an incompatible change is a `_v2`.
// Delivery 1 publishes the journal only; pub_articles, pub_structures_articles, pub_nomenclatures, pub_pack_ingenierie,
// pub_plans, pub_avancement_ingenierie and pub_taches come with the registers (deliveries 2 to 4), keeping Keystone's
// contracts column for column.
import { PG_FORMATS } from '@/domain/vocab';

/** Columns of the journal contract D18 (matrix.journal_unifie), in order. */
export const D18_COLUMNS = ['ref_source', 'nature', 'quand', 'qui', 'qui_ref', 'qui_role', 'action', 'objet', 'detail', 'projet', 'qui_matricule'] as const;

/**
 * ingenium.pub_journal — contract D18 v1: Ingenium's audit trail with the common columns, read by matrix_app for the unified
 * journal of the suite. `projet` is the Keystone code when the object is a project; `qui_matricule` stays null (Ingenium keeps
 * no employee number of its users). The entries of a project confidential in Keystone are never published (ING-29: such a
 * project is seen by its team only).
 */
export const PUB_JOURNAL = `SELECT 'audit_entries:' || a.id::text AS ref_source,
       'audit'::text                                       AS nature,
       a.occurred_at                                       AS quand,
       a.actor_name                                        AS qui,
       a.actor_user_id::text                               AS qui_ref,
       a.actor_role                                        AS qui_role,
       a.area                                              AS action,
       a.object_ref                                        AS objet,
       a.change                                            AS detail,
       CASE WHEN a.object_ref ~ '${PG_FORMATS.projectCode}' THEN a.object_ref END AS projet,
       NULL::text                                          AS qui_matricule
FROM ingenium.audit_entries a
WHERE NOT EXISTS (SELECT 1 FROM ingenium.project_mirror p WHERE p.confidential AND p.code = a.object_ref)`;

export const PUBLICATIONS = { pub_journal: PUB_JOURNAL } as const;
