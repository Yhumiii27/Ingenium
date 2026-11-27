# 04 — Modèle de données (grandes lignes)

> Esquisse pour la livraison 1 et suivantes ; les noms définitifs sont fixés à la construction. Toutes les tables sont dans
> le schéma `ingenium` (`pgSchema('ingenium').table(…)`, objet jamais exporté), créées par migrations générées et jamais
> modifiées. Chaque colonne a sa contrainte (Norma § 4).

## 1. Principes

- **Identifiants métier stables** : référence d'article `ART-…`, numéro de plan, repère P&ID, `IF-nn`, numéro de fiche
  Codex, code projet de Keystone. Ils servent de clé d'échange ; l'`id` technique n'est jamais publié. Une ligne reprise de
  Keystone garde son `keystone_id` en alias pour le journal de reprise.
- **Rattachement à un équipement dès le départ** : ligne de nomenclature, repère, livrable et dossier CE portent
  l'équipement du projet (`equipment_ref`, lu dans `keystone.pub_equipements_projet`), pour les projets à plusieurs machines
  (R-185 de Keystone).
- **Calculé, jamais stocké** : avancement des livrables, état des listes générées, couverture P&ID, complétude du pack,
  écarts de révision, tâches, charge.
- **Journal d'audit en ajout seul** (déclencheur) ; pas de suppression physique d'un objet tracé : archivage ou annulation
  motivés. Une révision figée (entrée, livrable diffusé, nomenclature d'une révision) est immuable (déclencheur).
- **Origine de chaque ligne** : `source` (`ingenium`, `keystone` pour une reprise, `import` pour un import de liste), date.
- **Une seule horloge métier**.

## 2. Domaines

| Domaine | Tables (esquisse) | Remarques |
| --- | --- | --- |
| Référentiels | `disciplines`, `consistency_rules`, `import_tools`, `column_mappings`, `pack_families`, `pack_templates` (type de machine × famille, poids, minimum), `ce_requirements` | type de machine lu dans Modulus / Keystone par son code |
| Projets (miroir) | `project_mirror`, `team_mirror`, `milestone_mirror`, `equipment_mirror` | écrits seulement par les connecteurs, depuis les vues de Keystone |
| Registre d'ingénierie | `eng_inputs`, `eng_deliverables` (référence Codex, discipline, équipement, révision, état de diffusion), `eng_outputs`, `eng_checks`, `eng_changes`, `eng_imports`, `eng_import_deltas` | livrable = référence d'une fiche Codex, jamais un fichier |
| P&ID | `pid_sheets` (référence Codex, révision), `pid_tags` (périmètre, article, équipement, activité), `pid_validation_steps` | rattachement à un article **validé** avant le bon pour construction |
| Référentiel technique | `parts` (sans prix ni stock), `part_revisions`, `part_equivalents`, `assembly_links` (parent × enfant × quantité × position), `spare_lists`, `part_validations` | statut Non validé → Validé → Périmé / Obsolète (les deux derniers seulement par un ECO libéré dans Vigie) |
| Nomenclature d'ingénierie | `bom_revisions`, `bom_lines` (projet, équipement, article, quantité, périmètre, activité, révision), `bom_roots`, `bom_diffs` | amorcée par la BOM vendue (Modulus, ING-08) ; publiée sous le contrat de Keystone |
| Plans | `drawings`, `drawing_revisions`, `pdm_syncs` | miroir du coffre PDM / 3DX, écrit seulement par le connecteur |
| Interfaces | `interfaces` (`IF-nn`, côté, autre partie, donnée attendue, date de besoin, reçue le, état, responsable) | |
| CE | `ce_files` (un par équipement), `ce_checklist_items` | |
| Revues de conception (si ING-15) | `design_reviews`, `review_participants`, `review_findings` | constats = tâches |
| Tâches | `tasks` (libres), tâches calculées non stockées ; requête de référence de `ingenium.pub_taches` (contrat `norma/contrats/taches-v1.md`) | |
| Intégrations | `codex_outbox` (dépôts), `vigie_outbox` (clés, demandes), `sync_runs` | file d'envoi, reprises espacées, jamais bloquant |
| Reprise | `transfer_runs`, `transfer_lines` (objet, à blanc / appliqué, écarts) | import unique et journalisé par objet |
| Plateforme | `audit_entries`, `app_settings`, `api_clients`, `jobs` (socle de Modulus) | |

## 3. Publications (requêtes de référence, `src/server/publications/definitions.ts`)

Voir `05-echanges.md` § 2 : `pub_articles`, `pub_structures_articles`, `pub_nomenclatures`, `pub_pack_ingenierie`,
`pub_plans`, `pub_avancement_ingenierie`, `pub_taches`, `pub_journal`. Aucune vue `pub_` dans une migration (Matrix M-18).
