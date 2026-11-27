// Ingenium's publications (docs/spec/05 § 2). Matrix defines and applies the `pub_` views (decision M-18): these are the
// reference queries given to Matrix (request DI-M3), executed as they are by ./definitions.test.ts. No migration creates a
// `pub_` view. A column is never removed or renamed; a new one goes at the end; an incompatible change is a `_v2`.
// Delivery 1 publishes the journal; lot 2a adds pub_taches (contract taches-v1) and pub_avancement_ingenierie; pub_articles, pub_structures_articles, pub_nomenclatures, pub_pack_ingenierie,
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

/**
 * ingenium.pub_taches — contract norma/contrats/taches-v1.md § 2 (Norma 2.4): Ingenium's open tasks and approvals and those
 * closed in the last 30 days, one row per recipient, from the projection `published_tasks` (rewritten by
 * src/server/tasks/projection.ts). Only the recipients known to Clavis are published (`personne_id` = their `oid`, set once they
 * have signed in to Ingenium). No decision from another tool yet (phase 1): `decision_a_distance` is false.
 */
export const PUB_TACHES = `SELECT 'ingenium'::text           AS outil,
       t.task_id                  AS tache_id,
       t.nature                   AS nature,
       t.type                     AS type,
       t.type_label               AS type_libelle,
       t.type_label_en            AS type_libelle_en,
       t.object_ref               AS objet_ref,
       t.title                    AS titre,
       t.person_id                AS personne_id,
       NULL::uuid                 AS pour_le_compte_de,
       t.state                    AS etat,
       NULL::text                 AS resultat,
       t.due_on                   AS echeance,
       t.priority                 AS priorite,
       t.actions                  AS actions,
       false                      AS decision_a_distance,
       t.sensitive                AS sensible,
       t.project_code             AS projet,
       NULL::text                 AS site,
       NULL::text                 AS filiale,
       t.link                     AS lien,
       t.version                  AS version,
       t.created_at               AS cree_le,
       t.updated_at               AS maj_le
FROM ingenium.published_tasks t
WHERE t.person_id IS NOT NULL`;

/** Columns of ingenium.pub_avancement_ingenierie v1, in order (read by Keystone on the project sheet, docs/spec/05 § 2). */
export const AVANCEMENT_COLUMNS = [
  'projet_code', 'discipline', 'livrables', 'livrables_figes', 'livrables_diffuses', 'entrees', 'entrees_a_confirmer', 'controles_ouverts',
  'controles_bloquants', 'maj_le',
] as const;

/**
 * ingenium.pub_avancement_ingenierie — progress of the engineering register by project and discipline (counts only; the
 * shares are computed by the reader). Published only once Ingenium holds the register (switch-over): before it, Keystone is
 * the source. A project confidential in Keystone is never published (ING-29). `entrees_a_confirmer` counts the inputs not yet
 * confirmed by the discipline (the « outdated » state is computed by Ingenium on read and not published here).
 */
export const PUB_AVANCEMENT_INGENIERIE = `WITH held AS (SELECT 1 FROM ingenium.object_switchovers WHERE object = 'register'),
pd AS (
  SELECT p.code AS projet_code, d.code AS discipline
  FROM ingenium.project_mirror p CROSS JOIN ingenium.disciplines d
  WHERE NOT p.confidential AND d.active AND EXISTS (SELECT 1 FROM held)
)
SELECT pd.projet_code,
       pd.discipline,
       (SELECT count(*) FROM ingenium.register_deliverables x WHERE x.project_code = pd.projet_code AND x.discipline = pd.discipline AND x.status <> 'obsolete')::int AS livrables,
       (SELECT count(*) FROM ingenium.register_deliverables x WHERE x.project_code = pd.projet_code AND x.discipline = pd.discipline AND x.status IN ('frozen', 'release_proposed'))::int AS livrables_figes,
       (SELECT count(*) FROM ingenium.register_deliverables x WHERE x.project_code = pd.projet_code AND x.discipline = pd.discipline AND x.status = 'released')::int AS livrables_diffuses,
       (SELECT count(*) FROM ingenium.register_inputs x WHERE x.project_code = pd.projet_code AND x.consumer = pd.discipline)::int AS entrees,
       (SELECT count(*) FROM ingenium.register_inputs x WHERE x.project_code = pd.projet_code AND x.consumer = pd.discipline AND x.acknowledged_at IS NULL)::int AS entrees_a_confirmer,
       (SELECT count(*) FROM ingenium.register_checks x WHERE x.project_code = pd.projet_code AND x.owner = pd.discipline AND x.status IN ('open', 'in_progress', 'sent_back'))::int AS controles_ouverts,
       (SELECT count(*) FROM ingenium.register_checks x WHERE x.project_code = pd.projet_code AND x.owner = pd.discipline AND x.status IN ('open', 'in_progress', 'sent_back') AND x.severity = 'blocking')::int AS controles_bloquants,
       greatest(
         (SELECT max(x.updated_at) FROM ingenium.register_deliverables x WHERE x.project_code = pd.projet_code AND x.discipline = pd.discipline),
         (SELECT max(x.updated_at) FROM ingenium.register_inputs x WHERE x.project_code = pd.projet_code AND x.consumer = pd.discipline),
         (SELECT max(x.updated_at) FROM ingenium.register_checks x WHERE x.project_code = pd.projet_code AND x.owner = pd.discipline)
       ) AS maj_le
FROM pd`;

export const PUBLICATIONS = { pub_journal: PUB_JOURNAL, pub_taches: PUB_TACHES, pub_avancement_ingenierie: PUB_AVANCEMENT_INGENIERIE } as const;
