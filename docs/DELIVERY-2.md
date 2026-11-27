# Livraison 2 — Registre d'ingénierie, P&ID, plans (lot 2a : registre et tâches, 27 novembre 2026)

Consigne du propriétaire : « lance tous les dev qui sont en attente sans action de ma part » (27 novembre 2026). Périmètre :
`docs/PLAN.md`, ligne « 2 ». Les questions ouvertes gardent leur réponse par défaut (ING-04, ING-05, ING-09, ING-20, ING-21,
ING-26), appliquée tant que le propriétaire n'a pas répondu.

La livraison 2 est trop large pour une seule PR cohérente ; elle est découpée en lots :

| Lot | Contenu | État |
| --- | --- | --- |
| **2a** | registre d'ingénierie (entrées, livrables jusqu'à la diffusion, listes générées, règles et contrôles de cohérence, modifications récentes), synthèse et écrans de discipline, reprise du registre depuis Keystone (à blanc puis appliquée), tâches propres d'Ingenium et tâches libres (ING-25, ING-31), publications `pub_taches` et `pub_avancement_ingenierie` | **construit** (ce document) |
| 2b | validation P&ID (feuilles, repères, rattachement, étapes, import d'une liste), assistant d'import des listes (outils, correspondances, écarts, « figer cette révision comme entrée ») avec la lecture des exports natifs (ING-04, ING-D3), lecture de l'état des livrables dans `codex.pub_documents` et dépôt par `POST /api/documents` (DI-X1) | à faire |
| 2c | miroir des plans et connecteur PDM / 3DEXPERIENCE (simulé jusqu'à l'accord de la DSI, ING-09), `pub_plans` | à faire |

## 1. Ce que construit le lot 2a

| Sujet | Où |
| --- | --- |
| Règles pures du registre, testées par valeur : états et étapes d'un livrable (Brouillon → Figé → Diffusion proposée → Diffusé ; nouvelle révision, obsolète), révision de référence d'une entrée (dernière révision figée ou diffusée, E-5 de Keystone) et son état (à jour, à confirmer, périmée), état calculé d'une liste générée (bloquée, à générer, périmée, à jour), étapes d'un contrôle, matrice « qui attend quoi », avancement par discipline, droits (un ingénieur écrit dans sa discipline et lit les autres ; le responsable ingénierie propose la diffusion et clôt les contrôles ; le gestionnaire documentaire enregistre la diffusion décidée dans Codex) | `src/domain/register.ts` |
| Tables (chaque colonne contrainte) : `consistency_rules` (référentiel de l'administration), `register_inputs`, `register_deliverables` (numéro Codex, équipement du projet, verrou optimiste), `deliverable_revisions` (historique, ajout seul), `register_outputs`, `register_checks`, `register_changes` (ajout seul pour les lignes d'Ingenium), `transfer_runs` (ajout seul), `object_switchovers`, `free_tasks`, `published_tasks` (projection des tâches) | `src/server/db/schema/register.ts`, `transfer.ts`, `tasks.ts` ; migrations `drizzle/0003_register.sql`, `0004_register_triggers.sql` |
| Déclencheurs : une révision figée ne change plus (numéro, titre, discipline ; une nouvelle révision repart en brouillon depuis une révision figée ou diffusée) ; pas de suppression physique d'une ligne tenue par Ingenium ; historique, reprises et modifications en ajout seul | `drizzle/0004_register_triggers.sql` |
| Une seule source par objet (`docs/spec/06`) : tant que Keystone tient le registre, ses lignes sont un miroir (source `keystone` ou `simulation`) réécrit à chaque lecture de Keystone et toute Server Function du registre refuse (« Tenu dans Keystone ») ; la **bascule** est une reprise appliquée une fois, après un essai à blanc, depuis la vue temporaire `keystone.pub_reprise_registre_ingenierie` (DI-K2, DI-M2) ; ensuite le connecteur ne touche plus le registre | `src/domain/transfer.ts` (`planRegisterTransfer` : refus motivés, jamais d'écrasement), `src/server/integrations/keystone/register.ts`, écran Activité et intégrations (« Registre à blanc », « Basculer le registre », journal des reprises) |
| Lectures : registre dérivé d'un projet du périmètre (hors périmètre = 404 avant toute lecture) | `src/server/dal/register.ts` |
| Server Functions (entrée validée, droit, projet dans le périmètre, objet relu dans la transaction, verrou optimiste, journal d'audit, historique, modification récente, projection des tâches réécrite dans la même transaction) : confirmer une entrée, ajouter une entrée, ajouter un livrable, étape d'un livrable, déclarer une liste, enregistrer une génération (refusée tant qu'un contrôle bloquant de la discipline est ouvert), ouvrir un contrôle, étape d'un contrôle, enregistrer une modification ; règles de cohérence (administration) ; reprise à blanc et appliquée (administrateur) ; tâches libres (créer, déplacer sur le tableau, annuler avec motif) | `src/features/register/actions.ts`, `src/features/admin/actions.ts`, `src/features/tasks/actions.ts` |
| Écrans : Synthèse du projet (indicateurs, qui attend quoi, avancement par discipline, contrôles ouverts, modifications récentes ; « Ouvrir un contrôle », « Enregistrer une modification ») ; Process, Mécanique, Électrique, Automatisme (entrées consommées, livrables et leurs étapes, listes générées, contrôles de la discipline ; « Ajouter un livrable » en action principale, puis entrées, listes, contrôles) ; Règles de cohérence ; formulaires en panneau latéral | `src/features/register/views.tsx`, `forms.tsx`, `src/app/(app)/projects/[code]/`, `src/app/(app)/admin/rules/page.tsx` |
| Accueil « Ma discipline » : entrées périmées, livrables figés à diffuser, contrôles ouverts (dont bloquants) calculés sur les projets montrés, dans les disciplines de la personne ; avancement des livrables par discipline sur chaque carte de projet ; P&ID (2b), articles et clés d'ECO (3) annoncés avec leur lot | `src/app/(app)/page.tsx` |
| Tâches propres d'Ingenium (ING-25), calculées seulement pour un objet tenu par Ingenium : entrée à confirmer (ingénieurs de la discipline consommatrice), contrôle à traiter (discipline responsable ; bloquant = priorité haute), liste à générer ou à régénérer, proposition de diffusion d'un livrable figé (approbation des responsables ingénierie de l'équipe du projet) ; tâches libres (ING-31) ; tâches d'un projet confidentiel marquées `sensible` | `src/domain/own-tasks.ts`, `src/server/tasks/projection.ts`, tâche planifiée `tasks-projection` (15 min) |
| Mes tâches et Mes approbations : tâches d'Ingenium et de toute la suite, chacune comptée une fois ; « Nouvelle tâche » ; une tâche libre se déplace sur le tableau (kanban) | `src/server/dal/tasks.ts` (`allTasksOf`), `src/features/tasks/` |
| Publications (requêtes de référence, testées ; aucune vue dans une migration) : `ingenium.pub_taches` (contrat `taches-v1`, seules les lignes dont le destinataire est connu de Clavis), `ingenium.pub_avancement_ingenierie` (comptes par projet et discipline, une fois le registre basculé, sans projet confidentiel) | `src/server/publications/definitions.ts` |
| Configuration : `INGENIUM_PUBLIC_URL` (liens profonds absolus des tâches publiées) | `src/server/config/parse.ts`, `.env.example` |
| Démonstration : registre simulé de Keystone (HLT-026 : 12 entrées, 13 livrables, 6 règles, 10 contrôles, 6 listes, 4 modifications ; quelques lignes de NDC-031 et du projet confidentiel RDP-072), dates comptées depuis le jour métier, **basculé vers Ingenium par le jeu de démonstration** (reprise appliquée et journalisée) ; trois tâches libres | `src/server/integrations/keystone/register-demo.ts`, `src/server/db/seed/demo.ts` |
| i18n : chaînes sources anglaises, français dans `src/i18n/fr/register.json`, registres contrôlés | `src/i18n/` |
| Essais : règles pures, reprise, tâches ; Server Functions sur une base de démonstration (droits par discipline, verrou optimiste, révision figée, historique en ajout seul, liste bloquée, tâches) et bascule sur une base de production (miroir en lecture, essai à blanc sans effet, application unique, connecteur arrêté ensuite) ; publications ; test de fumée étendu | `src/**/*.test.ts`, `tests/smoke/run.ts` |

Vérifications : `npx next typegen && npm run typecheck && npm run lint && npm test && npm run norma:check && npm run build`, puis
`npm run test:smoke` contre `next start`.

## 2. Écarts et choix

- **Diffusion (ING-20, réponse par défaut)** : le responsable ingénierie propose la diffusion dans Ingenium ; le circuit du type
  de document dans Codex fait foi. Tant que le connecteur Codex n'existe pas (lot 2b, DI-X1), la diffusion décidée dans Codex
  est **enregistrée** dans Ingenium par le responsable ingénierie ou le gestionnaire documentaire (ING-33).
- **Démonstration basculée** : le jeu de démonstration montre le registre tenu par Ingenium (phase 2 pour cet objet) ; une base
  de production démarre avec le registre tenu dans Keystone (ING-32).
- **Responsable ingénierie d'un projet** (destinataire des propositions de diffusion) : le membre de l'équipe publiée par
  Keystone dont l'activité est « Responsable ingénierie » (ING-34). Les rôles de Clavis ne sont lus que pour la personne connectée.
- **Personne destinataire d'une tâche publiée** : l'adresse de l'équipe publiée par Keystone ; `personne_id` (l'`oid` de Clavis)
  n'est connu qu'une fois la personne connectée à Ingenium : `pub_taches` ne publie que ces lignes. Une vue de Clavis donnant
  l'identifiant par adresse lèverait la limite (à demander avec DM-2 de Clavis, s'il le faut).
- **Clôture d'un contrôle** : réservée au responsable ingénierie (ING-19 : « ferme les contrôles ») ; les ingénieurs de la
  discipline le prennent en charge ou le renvoient à leur outil (ING-35).
- **Équipement** : `equipment_ref` est saisi tel quel tant que Keystone ne publie pas `pub_equipements_projet` (DI-K3).
- **Contrôles** : ouverts à la main dans le lot 2a ; leur détection à l'import vient avec l'assistant (lot 2b, ING-D2).
- **Pas de clé étrangère vers `project_mirror`** : le miroir est réécrit par le connecteur ; un projet retiré de la publication
  de Keystone ne supprime jamais de données d'ingénierie.
- **`pub_avancement_ingenierie`** : `entrees_a_confirmer` compte les entrées non confirmées ; l'état « périmée », calculé à la
  lecture, n'est pas publié.

## 3. Ce qu'attendent les autres outils

| Outil | Quoi | Demande |
| --- | --- | --- |
| Keystone | requête de référence de `keystone.pub_reprise_registre_ingenierie` : une ligne par objet, colonnes `nature` (`regle`, `entree`, `livrable`, `liste`, `controle`, `changement`), `projet_code`, `keystone_id`, `donnees` (jsonb ; clés lues par `planRegisterTransfer`, `src/domain/transfer.ts`) | DI-K2 (précisée) |
| Matrix | application de cette vue (lecteur `ingenium_app`) ; publications `ingenium.pub_taches` et `ingenium.pub_avancement_ingenierie` (requêtes de référence) ; `ingenium.pub_taches` dans la réunion `matrix.pub_taches` | DI-M2, DI-M3 |
| Coolify | variable `INGENIUM_PUBLIC_URL=https://ingenium.projectdirection.fr` | mise en service |

## 4. Questions ouvertes (à porter dans `decisions/ingenium.json` de Norma)

| Id | Question | Réponse par défaut appliquée | Autres choix |
| --- | --- | --- | --- |
| ING-32 | Le jeu de démonstration montre-t-il le registre déjà basculé vers Ingenium ? | oui (la reprise est appliquée par le jeu de démonstration ; une base de production démarre tenue dans Keystone) | non : la démonstration commence tenue dans Keystone, l'administrateur bascule |
| ING-33 | Qui enregistre dans Ingenium la diffusion décidée par le circuit de Codex, tant que le connecteur Codex n'existe pas ? | le responsable ingénierie ou le gestionnaire documentaire | le responsable ingénierie seul ; attendre le connecteur Codex (pas de diffusion enregistrée d'ici là) |
| ING-34 | Qui reçoit les propositions de diffusion d'un projet ? | les membres de l'équipe publiée par Keystone dont l'activité est « Responsable ingénierie » | toutes les personnes ayant le rôle `Ingenium.EngineeringLead` dans Clavis |
| ING-35 | Qui clôt un contrôle de cohérence ? | le responsable ingénierie (ING-19) ; les ingénieurs de la discipline le prennent en charge ou le renvoient à leur outil | aussi l'ingénieur de la discipline responsable |

ING-31 (tâches libres) est appliquée avec ce lot (réponse par défaut : avec les registres).

## 5. Lots suivants de la livraison 2

- **2b** : P&ID (`pid_sheets`, `pid_tags`, `pid_validation_steps`, rattachement à un article validé — dépend de la livraison 3
  pour les articles : en attendant, référence lue dans `keystone.pub_articles`), import de listes (outils, correspondances,
  écarts, révision figée comme entrée, détection des contrôles), lecture des exports natifs selon ING-04 et ING-D3, lecture de
  `codex.pub_documents` et dépôt `POST /api/documents` (DI-X1), bascule de l'objet `pid`.
- **2c** : miroir des plans (`drawings`, `drawing_revisions`, `pdm_syncs`), connecteur PDM / 3DEXPERIENCE simulé, `pub_plans`,
  bascule de l'objet `drawings`.
