# Livraison 1 — Plateforme (27 novembre 2026)

Accord du propriétaire : « oui lance 1 » (27 novembre 2026). Périmètre : `docs/PLAN.md`, ligne « 1 — Plateforme ». Socle
copié de Modulus (`docs/SOCLE.md`, ING-28) ; aucun module métier de Modulus.

## 1. Ce qui est construit

| Sujet | Où |
| --- | --- |
| Configuration validée au démarrage (une variable invalide arrête l'outil en production), toutes les variables dans `.env.example` | `src/server/config/parse.ts` |
| PostgreSQL seul, schéma `ingenium` (`pgSchema` jamais exporté, aucune migration ne crée de schéma), migrations générées `drizzle/0000_platform.sql`, déclencheur d'ajout seul du journal d'audit `drizzle/0001_append_only.sql`, chaque colonne contrainte | `src/server/db/` |
| Tables : `users`, `app_settings`, `audit_entries` (ajout seul), `job_runs` ; référentiel `disciplines` (process, mécanique, électrique, automatisme) ; miroirs `project_mirror`, `team_mirror` (écrits seulement par le connecteur Keystone) ; `sync_runs` (journal des lectures des autres outils) | `src/server/db/schema/` |
| Une horloge métier (`INGENIUM_CLOCK`, la date réelle par défaut) | `src/server/clock.ts` |
| Connexion par Clavis (OpenID Connect, `ENTRA_ISSUER`), droits lus dans `clavis.pub_acces` à la connexion et à chaque requête (`INGENIUM_ACCESS_FROM_CLAVIS=on`, lecture impossible = refus) ; « Voir en tant que » en démonstration | `src/server/auth/`, `src/server/integrations/clavis/access.ts` |
| Rôles d'ING-19 (clés de Clavis `Ingenium.EngineeringLead`, `Engineer`, `Designer`, `DocumentController`, `Reader`, `Admin`), droits cumulables, portée par projet dans la couche d'accès aux données (hors périmètre = 404) | `src/config/roles.ts`, `src/domain/rights.ts`, `src/server/dal/projects.ts` |
| Coque commune de Norma 3.1 : barre latérale (logo, recherche ⌘K, **tronc commun** `BaseNav` : Accueil, Mes tâches, Mes approbations, Mes projets, Référentiel technique, avec les pastilles de toute la suite), sections Projet (sélecteur de projet, projet courant en ligne de contexte), Référentiel technique, Administration ; en-tête de page avec la paire FR / EN sur sombre / clair en dernier ; barre supérieure ≤ 1024 px ; favicon | `src/components/app/shell/`, `src/app/icon.svg` |
| Accueil « Ma discipline » (ING-23) : projets de l'équipe, tâches et approbations, encart « À traiter », blocs de la discipline annoncés avec leur livraison (aucun chiffre inventé) | `src/app/(app)/page.tsx` |
| Mes tâches (liste, kanban, calendrier ; « Toute la suite » / « Cet outil », état dans l'URL) et Mes approbations, par les composants `MyTasks` / `MyApprovals` de la charte, sur `matrix.pub_taches` (`INGENIUM_SUITE_TASKS`) | `src/app/(app)/my/`, `src/features/tasks/`, `src/server/integrations/matrix/tasks.ts` |
| Mes projets : projets de l'équipe d'ingénierie, code des bureaux d'études d'abord puis code Keystone (ING-22), équipe par discipline | `src/app/(app)/my/projects/page.tsx` |
| Connecteur Keystone (`INGENIUM_KEYSTONE` off · simulation · views) : `keystone.pub_projets`, `keystone.pub_affectations`, e-mail du membre d'équipe par `clavis.pub_personnes` ; tâche `keystone-sync` toutes les heures ; « Lire Keystone maintenant » (administrateur, journalisé) ; source illisible = état affiché, miroir gardé | `src/server/integrations/keystone/`, `src/domain/keystone.ts`, `src/app/(app)/admin/activity/` |
| Tous les écrans du registre (`docs/spec/03` § 3), navigables : ceux des livraisons 2 à 4 disent ce qu'ils porteront et quand | `src/config/screens.ts`, `src/config/screen-content.ts`, `src/features/pages/placeholder.tsx` |
| Administration : Disciplines et référents (lecture), Activité et intégrations (connecteurs, lectures, « Lire maintenant »), Journal (filtres, export CSV) ; les autres écrans en attente de leur livraison | `src/app/(app)/admin/`, `src/app/(app)/journal/` |
| API `/api/v1/` (squelette) : index sans point d'entrée ouvert, liste des points prévus ; 404 JSON ailleurs | `src/domain/api.ts`, `src/app/api/v1/` |
| Requête de référence de `ingenium.pub_journal` (contrat D18), aucune vue `pub_` dans une migration (test) | `src/server/publications/definitions.ts` |
| i18n : chaînes sources anglaises, français par défaut, test de complétude (littéraux) et des registres ; français du tronc commun repris de la charte (`TACHES_FR`) | `src/i18n/` |
| Jeu de démonstration (`INGENIUM_SEED=demo`) : six personnes « Voir en tant que » et deux collègues (`demo.example`), cinq projets aux codes du jeu de Keystone (HLT-026, NDC-031, EWA-051, PRS-038, WSA-044) et leurs équipes, servis par la simulation du connecteur | `src/server/db/seed/`, `src/server/integrations/keystone/demo.ts` |
| Tâches planifiées : sauvegarde du schéma, lecture de Keystone, déclaration du schéma à Matrix | `src/server/jobs/registry.ts`, `npm run worker` |
| Déploiement Coolify en un conteneur (port 4000, `deploy/start.sh`, `HEALTHCHECK /api/health`) ; variante Compose sur le serveur commun | `Dockerfile`, `deploy/` |
| CI : Norma, typecheck, lint, tests sur PostgreSQL 16, migration et jeu de démonstration, build, test de fumée, image | `.github/workflows/ci.yml` |

Vérifications : `npx next typegen && npm run typecheck && npm run lint && npm test && npm run norma:check && npm run build`,
puis `npm run test:smoke` contre `next start` (port 4010, ou un autre port libre).

## 2. Écarts et choix

- **Écrans en attente** : toutes les entrées du registre existent et s'ouvrent ; leur contenu vient avec la livraison
  indiquée (registre et P&ID : 2 ; référentiel et nomenclature : 3 ; interfaces, pack, CE : 4). Les écrans « Revues de
  conception » (ING-15) et « Charge » (ING-17) ne sont pas dans le registre tant que ces questions ne sont pas tranchées.
- **Mes tâches** : les tâches propres à Ingenium (calculées depuis ses objets) et les tâches libres d'ING-25 viennent avec les
  registres de la livraison 2 ; la livraison 1 montre celles de toute la suite (`matrix.pub_taches`). En démonstration, des
  tâches fictives d'autres outils sont simulées, datées depuis le jour métier. Aucune décision ni déplacement depuis Ingenium
  (phase 1 du contrat `taches-v1` : « Ouvrir dans <outil> »).
- **Membre d'équipe ↔ personne connectée** : l'adresse publiée par Keystone (`pub_equipes_projets.email`), sinon celle de
  `clavis.pub_personnes` par le matricule. Sans elle, la personne ne retrouve pas ses projets (ING-30, § 5).
- **Portée** : voir § 5 (ING-29, réponse du propriétaire).
- **Administration** : écrans visibles du responsable ingénierie et de l'administrateur ; « Lire maintenant » réservé à
  l'administrateur.
- **`deploy/compose.shared.yaml`** n'a pas de valeur par défaut pour l'hôte et la base du serveur commun (Ingenium n'en écrit
  aucun nom) : `ATRIUM_PG_HOST` et `ATRIUM_PG_DB` sont obligatoires.

## 3. Ce qu'attendent les autres outils

| Outil | Quoi | Demande |
| --- | --- | --- |
| Matrix | rôle `ingenium_app` (mot de passe), schéma `ingenium` ; liens de lecture `clavis.pub_acces`, `clavis.pub_personnes`, `keystone.pub_projets`, `keystone.pub_affectations`, `matrix.pub_taches`, `matrix.pub_taches_sources` ; publication `ingenium.pub_journal` (requête de référence) | DI-M1 (+ `matrix.pub_taches`, `pub_journal`) |
| Clavis | application `ingenium` (rôles et profils déjà dans son catalogue), client OpenID Connect sur `https://ingenium.projectdirection.fr/api/auth/callback` | DI-C1 |
| Coolify | application `ingenium` (Dockerfile, `main`, port 4000, authentification HTTP pendant la bêta) | `docs/PLAN.md`, mise en service |

Variables de l'application Coolify (noms) : `DATABASE_URL`, `INGENIUM_SINGLE_CONTAINER=on`, `INGENIUM_SEED`, `INGENIUM_AUTH`,
`INGENIUM_KEYSTONE`, `INGENIUM_SUITE_TASKS`, `INGENIUM_CLOCK` (facultative) ; connexion réelle : `INGENIUM_SESSION_SECRET`,
`ENTRA_ISSUER`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_REDIRECT_URI`, `INGENIUM_ACCESS_FROM_CLAVIS` ; facultatives :
`INGENIUM_BACKUP_DIR`, `MATRIX_URL`, `MATRIX_TOKEN`, `NEXT_PUBLIC_KEYSTONE_URL`, `NEXT_PUBLIC_CODEX_URL`,
`NEXT_PUBLIC_VIGIE_URL`, `LOG_LEVEL`.

## 4. Questions ouvertes (à porter dans `decisions/ingenium.json` de Norma)

| Id | Question | Réponse par défaut appliquée | Autres choix |
| --- | --- | --- | --- |
| ING-31 | Tâches libres de « Mes tâches » (ING-25) | avec les registres, livraison 2 | dès une livraison 1 bis |

## 5. Lot 1 bis — Liste des projets et projets confidentiels (ING-29, ING-30 ; 27 novembre 2026)

Réponses du propriétaire du 27 novembre 2026 (texte dans `docs/DECISIONS.md` § 1).

| Sujet | Où |
| --- | --- |
| Règle de visibilité, pure et testée : un projet confidentiel pour son équipe seulement, quel que soit le rôle ; un autre projet pour tous s'il est en cours, sinon pour son équipe et les rôles `all_projects` | `src/domain/confidential.ts` (`projectVisible`) |
| La même règle en SQL dans la couche d'accès : un projet hors périmètre n'est jamais lu (listes, compteurs de l'Accueil, recherche ⌘K et sélecteur de projet de la barre latérale, pages : 404) | `src/server/dal/projects.ts` (`projectVisibility`) |
| Journal et export CSV sans les entrées d'un projet confidentiel pour qui n'est pas de son équipe ; requête de référence de `ingenium.pub_journal` sans elles (à reprendre par Matrix avec DI-M1) | `src/server/dal/journal.ts` (`hiddenProjectCodes`), `src/server/publications/definitions.ts` |
| « Mes projets » : filtre « Mes projets » par défaut, « Tous les projets en cours » sans filtre (`?projets=tous`, `FilterChips` de la charte dans la barre d'outils de l'en-tête), mention « Confidentiel » | `src/app/(app)/my/projects/page.tsx` |
| Fiche projet : confidentialité, équipe projet avec son origine (affecté à une tâche, partie prenante) | `src/app/(app)/projects/[code]/page.tsx` |
| Connecteur Keystone : `confidentialite` lue en fin de `keystone.pub_projets` si publiée (`select *`) ; équipe lue dans `keystone.pub_equipes_projets` (affectations et parties prenantes) si accordée, sinon `keystone.pub_affectations` ; jamais d'écriture dans Keystone | `src/domain/keystone.ts`, `src/server/integrations/keystone/sync.ts` |
| Migration `0002_keystone_team_confidentiality` : `project_mirror.confidential` (faux par défaut), `team_mirror.origin` (`assignment` \| `stakeholder`, contrainte) | `drizzle/` |
| Démonstration : projet R&D confidentiel **RDP-072** « Compact Separator Test Rig », équipe Anne Duval (partie prenante, chef de projet), Claire Renaud, Hugo Lemaire ; Marc Lenoir (responsable ingénierie), Paul Vasseur (administrateur) et Julien Faure ne le voient pas | `src/server/integrations/keystone/demo.ts` |

- **Pas d'indicateur ni de liste propres à Ingenium** : Keystone donne le niveau de confidentialité et l'équipe (le
  responsable du projet y ouvre l'accès) ; Ingenium les lit. Tant que Keystone ne publie ni `confidentialite` ni
  `pub_equipes_projets` (brouillon **DI-K5**, `docs/DEMANDES.md`), aucun projet n'est confidentiel et l'équipe se limite aux
  affectations.
- Une base de démonstration déjà remplie reçoit RDP-072 confidentiel à la prochaine lecture de la simulation (tâche
  `keystone-sync` ou « Lire Keystone maintenant »).
- Le journal des lectures (`sync_runs`, écran Activité) compte les lignes lues dans Keystone, projets confidentiels compris,
  sans jamais les nommer.
