# Ingenium — demandes aux autres outils (brouillons)

> **Brouillons seulement** (27 novembre 2026). Rien n'est envoyé : chaque demande est d'abord présentée au propriétaire
> (dépôt cible, demande, raison, conséquence d'un refus) et n'est écrite dans le `REQUESTS.md` du dépôt cible qu'après son
> « validé » explicite (Norma § 3 et § 10). Les demandes des phases 2 et 3 dépendent des réponses aux questions ING-nn
> (`docs/DECISIONS.md`).
>
> Forme reprise des `REQUESTS.md` existants : `## [date] Ingenium → <outil> — <titre>`, `- Statut : OUVERTE`, puis la
> demande, la raison, la conséquence d'un refus.

## Récapitulatif

| N° | Cible | Objet | Phase | Dépend de |
| --- | --- | --- | --- | --- |
| DI-N1 | Norma | inscrire l'outil (registre, REGLES § 1, logo, reste à faire) — **faite** (Norma 3.1.0, PR Norma#20) | 0 | ING-01, ING-02 |
| DI-C1 | Clavis | application, rôles, profils, client OpenID Connect | 0 | ING-01, ING-19 |
| DI-M1 | Matrix | rôle `ingenium_app`, schéma, liens de lecture de base | 0–1 | ING-01 |
| DI-K1 | Keystone | gel des fonctions d'ingénierie, points transférés | 0 | ING-03 |
| DI-K2 | Keystone | requêtes de référence des vues de reprise | 1 | ING-26 |
| DI-K3 | Keystone | vue durable `pub_equipements_projet` | 1 | R-185 |
| DI-M2 | Matrix | vues de reprise `keystone.pub_reprise_*` et `pub_equipements_projet` | 1 | DI-K2, DI-K3 |
| DI-X1 | Codex | client d'API de dépôt, lien de lecture | 2 | — |
| DI-V1 | Vigie | Ingenium appelant des fonctions d'avancement et de demande | 2 | ING-13 |
| DI-M3 | Matrix | publications d'Ingenium | 2 | — |
| DI-K4 | Keystone | écrans en lecture seule, connecteur Ingenium, miroirs | 2–3 | ING-27 |
| DI-O1 | Modulus | vue de la BOM figée des configurations vendues ; bascule des lectures | 2–3 | ING-08 |
| DI-V2 | Vigie | bascule des lectures (articles, nomenclatures) | 3 | DI-M3 |
| DI-R1 | Vector | bascule des lectures | 3 | DI-M3 |
| DI-A1 | Arche | bascule de la lecture du pack | 3 | DI-M3 |
| DI-M4 | Matrix | retrait des vues de Keystone | 4 | phase 3 finie |

---

## DI-N1 · Norma — Inscrire Ingenium dans la suite (faite)

- **État** : faite le 27 novembre 2026 dans Norma 3.1.0 (PR Norma#20, le propriétaire ayant autorisé les changements dans Norma) ; dans `keystone.json`, les points transférés ne seront marqués qu'une fois ING-03 tranchée.

- **Dépôt** : `Yhumiii27/Norma`.
- **Demande** :
  1. `registre/outils.json` : une ligne `ingenium` (nom Ingenium ; `role_metier` « Ingénierie : registre des disciplines,
     P&ID, référentiel technique des articles, nomenclatures d'ingénierie, plans, pack et dossier technique » ; dépôt
     `Yhumiii27/Ingenium` ; schéma `ingenium` ; rôle `ingenium_app` ; ports `dev` 4000, `tests` 4010 ; Clavis
     `ENTRA_ISSUER`, `INGENIUM_ACCESS_FROM_CLAVIS=on` ; commits en anglais) ;
  2. `REGLES.md` § 1 : la ligne du tableau ;
  3. `charte/logos/ingenium.svg` et le code `ingenium` de `ToolLogo` ;
  4. `reste-a-faire/ingenium.json` (points repris de `reste-a-faire/keystone.json` : R-035, R-101, R-102, R-106, R-107,
     R-108, R-109, R-111, R-214, R-191, et R-160 selon ING-11), et dans `keystone.json` ces points marqués transférés ;
  5. version mineure de Norma, `CHANGELOG.md`.
- **Raison** : décision du 27 novembre 2026 ; tout outil de la suite est au registre (ports, rôle, connexion), et
  `norma:check` refuse un outil absent.
- **Sans elle** : pas de `norma:check` vert dans le nouveau dépôt, ports non réservés, pas de logo dans la coque.

## DI-C1 · Clavis — Enregistrer l'application Ingenium

- **Dépôt** : `Yhumiii27/Clavis`.
- **Demande** :
  1. application `ingenium` dans `KNOWN_APPS` et `ROLE_CATALOGUE` (`src/domain/app-roles.ts`) : rôles
     `Ingenium.EngineeringLead`, `Ingenium.Engineer`, `Ingenium.Designer`, `Ingenium.DocumentController`,
     `Ingenium.Reader`, `Ingenium.Admin`, avec la correspondance des sept niveaux communs ;
  2. profils standard : « ingénieur de discipline » et « projeteur / dessinateur » (Ingenium + lecture de Keystone et de
     Codex), « responsable ingénierie » (Ingenium + `englead` de Keystone) ; suggestion du profil d'après l'intitulé de poste ;
  3. client OpenID Connect : `npm run oidc:client -- ingenium <adresse de retour>` (adresse de retour sur `https://ingenium.projectdirection.fr`, donnée à la mise en service).
- **Raison** : connexion et droits par Clavis (Norma § 6) ; Ingenium lit ses rôles dans `clavis.pub_acces`.
- **Sans elle** : personne ne peut se connecter à Ingenium hors démonstration.

## DI-M1 · Matrix — Rôle, schéma et liens de lecture de base

- **Dépôt** : `Yhumiii27/Matrix`.
- **Demande** :
  1. rôle `ingenium_app` (NOLOGIN jusqu'à la pose du mot de passe), schéma `ingenium` dans la base commune (`atrium` après le renommage annoncé par Matrix), comme pour
     `modulus_app` et `vector_app` ;
  2. liens de lecture (lecteur `ingenium_app`, nature `lecture`) : `keystone.pub_projets`, `keystone.pub_affectations`,
     `keystone.pub_jalons_projets`, `keystone.pub_activites`, `keystone.pub_articles`, `keystone.pub_nomenclatures`,
     `keystone.pub_pack_ingenierie`, `codex.pub_documents`, `vigie.pub_ordres_modification`, `vigie.pub_eco_approbations`,
     `vigie.pub_eco_effectivite`, `vigie.pub_demandes_recues`, `vigie.pub_etudes_securite`,
     `modulus.pub_catalogue_machines`, `clavis.pub_acces`, `clavis.pub_personnes`, `matrix.pub_sites`, `matrix.pub_filiales`,
     `matrix.pub_taches`, `matrix.pub_taches_sources` (ajoutés à la livraison 1 : Mes tâches et Mes approbations de toute la
     suite) ; raison commune : affichage et contrôle des données d'ingénierie, jamais de copie durable hors des miroirs en lecture ;
  3. publication `ingenium.pub_journal` (contrat D18, lecteur `matrix_app`) d'après la requête de référence de
     `src/server/publications/definitions.ts` (livraison 1).
- **Raison** : Matrix décide de tout accès entre outils (M-17, M-18).
- **Sans elle** : Ingenium fonctionne seulement sur son jeu de démonstration (sources « indisponibles »).

## DI-K1 · Keystone — Geler les fonctions d'ingénierie et transférer les points (selon ING-03)

- **Dépôt** : `Yhumiii27/Keystone`.
- **Demande** : ne plus construire de fonction nouvelle sur les écrans Synthèse, disciplines, P&ID, Articles, Plans,
  Nomenclature (partie ingénierie), Interfaces, pack ingénierie (et CE selon ING-11) ; les points R-035, R-101, R-102, R-106,
  R-107, R-108, R-109, R-111, R-214, R-191 passent à Ingenium ; mention dans `CLAUDE.md` (« System boundaries » : une
  ligne pour Ingenium) ; corrections de défauts toujours admises.
- **Raison** : éviter de construire deux fois (ING-03).
- **Sans elle** : travail fait dans Keystone puis refait dans Ingenium, et données divergentes à la reprise.

## DI-K2 · Keystone — Requêtes de référence des vues de reprise

- **Dépôt** : `Yhumiii27/Keystone`.
- **Demande** : fournir à Matrix (aucune vue dans une migration de Keystone, M-18) les requêtes de référence, testées par
  Keystone, de vues **temporaires** à un seul lecteur (`ingenium_app`) :
  `pub_reprise_registre_ingenierie` (tables `eng_*` et livrables de `documents` par discipline), `pub_reprise_pid`
  (`pid_sheets`, `pid_tags`, `pid_validation_steps`), `pub_reprise_articles` (`parts` sans prix, `part_equivalents`,
  `assembly_links`, `spare_list_lines`), `pub_reprise_nomenclatures` (`project_bom_lines` avec périmètre, activité,
  équipement, note ; `project_assembly_roots` ; `revision_diffs`, `revision_diff_lines`), `pub_reprise_plans` (`drawings`,
  `drawing_revisions`), `pub_reprise_pack` (`machine_type_pack_families`, `document_types.pack_family`),
  `pub_reprise_interfaces` (`project_interfaces`), `pub_reprise_ce` (`ce_checklist_items`, `ce_files`). Identifiants métier
  seulement (références, numéros, codes projet), aucun `id` technique publié sauf en colonne `keystone_id` pour le
  journal de reprise ; aucune donnée personnelle hors nom du responsable déjà visible dans Keystone.
- **Raison** : Ingenium ne lit Keystone que par des vues `pub_` (ING-26).
- **Sans elle** : pas de reprise des projets en cours ; seuls les nouveaux projets passeraient par Ingenium.

## DI-K3 · Keystone — Vue durable des équipements d'un projet

- **Dépôt** : `Yhumiii27/Keystone`.
- **Demande** : requête de référence de `keystone.pub_equipements_projet` (projet, référence d'équipement, type de machine,
  quantité, position, code catalogue Modulus si connu, `maj_le`), lecteur `ingenium_app` (et `vigie_app` si utile).
- **Raison** : R-185, chaque ligne de nomenclature, repère et livrable d'Ingenium se rattache à un équipement.
- **Sans elle** : Ingenium ne sait pas à quel équipement se rattache une ligne ; nomenclature multi-équipements
  impossible.

## DI-M2 · Matrix — Appliquer les vues de reprise

- **Dépôt** : `Yhumiii27/Matrix`.
- **Demande** : définir et appliquer `keystone.pub_reprise_*` (DI-K2) et `keystone.pub_equipements_projet` (DI-K3) d'après
  les requêtes de référence, avec les liens de lecture `ingenium_app` ; les vues de reprise sont marquées temporaires et
  retirées à la demande d'Ingenium après chaque import.
- **Raison / sans elle** : comme DI-K2.

## DI-X1 · Codex — Dépôt de documents par Ingenium

- **Dépôt** : `Yhumiii27/Codex`.
- **Demande** : un client d'API pour Ingenium sur `POST /api/documents` (dépôt d'un livrable ou d'une nouvelle révision,
  types de la famille `ingenierie_conception` : `PID`, `PFD`, `SCH`, `GA`, `LST`, `BOM`, `FDS`, `EXG`, `HMI`, `VAR`,
  `LDC`), « Ingenium » comme application d'origine ; et, quand elle existera, l'API de décision d'une étape de circuit
  (`POST /api/documents/:numéro/approvals`, aujourd'hui `TODO(codex)` côté Keystone) pour les étapes des livrables
  d'ingénierie.
- **Raison** : Codex héberge tous les documents ; Ingenium n'en garde que les références.
- **Sans elle** : les livrables se déposent à la main dans Codex ; Ingenium ne peut que les lire.

## DI-V1 · Vigie — Ingenium appelant des fonctions de modification technique

- **Dépôt** : `Yhumiii27/Vigie`.
- **Demande** :
  1. ajouter `ingenium_app` à `inbound_callers` pour `vigie.pub_signaler_avancement_eco` (clé `englead` seulement ; la clé
     `pm` reste à `keystone_app`) ;
  2. permettre à Ingenium d'ouvrir une demande de modification (ECR) depuis un article, un plan ou une nomenclature : soit
     `ingenium_app` appelant de `vigie.pub_creer_demande_modification` (aujourd'hui pour Codex), avec `source = 'ingenium'`
     et `part_ref` / `keystone_project_code`, soit une nouvelle fonction `vigie.pub_demander_modification` ;
  3. lien profond « Ouvrir dans Ingenium » depuis un article d'ECO (adresse `INGENIUM_URL/reference/parts/<ref>`).
- **Raison** : ING-13 — Vigie garde les ECO ; la clé du responsable ingénierie se donne dans son outil.
- **Sans elle** : la clé « englead » reste dans Keystone, et les ingénieurs ouvrent Vigie pour toute demande.

## DI-M3 · Matrix — Publications d'Ingenium

- **Dépôt** : `Yhumiii27/Matrix`.
- **Demande** : définir et appliquer, d'après les requêtes de référence d'Ingenium (`src/server/publications/definitions.ts`),
  `ingenium.pub_articles` et `ingenium.pub_nomenclatures` (**mêmes colonnes, même ordre** que les vues de Keystone,
  colonnes nouvelles en fin), `ingenium.pub_pack_ingenierie` (contrat K-08 d'Arche), `ingenium.pub_structures_articles`,
  `ingenium.pub_plans`, `ingenium.pub_avancement_ingenierie`, `ingenium.pub_journal` (journal unifié) et, quand la
  proposition Norma TA sera retenue, `ingenium.pub_taches` ; liens de lecture : `keystone_app`, `vigie_app`, `modulus_app`,
  `vector_app`, `arche_app` selon la vue (`PERIMETRE.md` § 5.1) ; lien d'exécution `ingenium_app` →
  `vigie.pub_signaler_avancement_eco` (et la fonction de demande, DI-V1).
- **Raison** : Matrix possède les vues `pub_` (M-18).
- **Sans elle** : aucun lecteur ne peut basculer ; Keystone reste la source.

## DI-K4 · Keystone — Lecture d'Ingenium et écrans en lecture seule

- **Dépôt** : `Yhumiii27/Keystone`.
- **Demande** (objet par objet, à la bascule) : écran en lecture seule avec bandeau « Tenu dans Ingenium depuis le … » et lien
  profond, Server Functions d'écriture refusées ; connecteur `src/server/integrations/ingenium/` (miroirs en lecture des
  articles, de la nomenclature, de l'avancement, du pack ; « source indisponible » affichée) ; nomenclature : miroir de même
  forme que `project_bom_lines` pour `dal/purchasing.ts`, `dal/budget.ts`, `dal/fleet.ts` et l'écran Expéditions, tests dorés
  inchangés ; retrait de la clé « englead » de « Mes approbations » ; « Nouvel article » → « Demander un article » (API
  d'Ingenium) ; liens de lecture `keystone_app` → vues d'Ingenium (à déclarer à Matrix) ; en phase 4, retrait de la
  navigation et nouvelle migration de suppression ou d'archivage (ING-27) après le retrait des vues par Matrix.
- **Raison** : une seule source par objet.
- **Sans elle** : double saisie et données divergentes.

## DI-O1 · Modulus — BOM vendue et lecture des articles

- **Dépôt** : `Yhumiii27/modulus`.
- **Demande** :
  1. (si ING-08 = défaut) lecteur `ingenium_app` de `modulus.pub_budgets_configurations` ou d'une vue
     `modulus.pub_bom_configurations_vendues` sans budget (BOM figée de la configuration vendue, par article et quantité),
     pour amorcer la nomenclature d'ingénierie d'un projet ;
  2. en phase 3, bascule de `keystone.pub_articles` vers `ingenium.pub_articles` (D-5 : « un article manquant se crée dans
     Keystone » devient « … dans Ingenium ») et lecture des structures par `ingenium.pub_structures_articles`.
- **Raison** : la nomenclature d'un projet part de ce qui a été vendu ; le référentiel technique change de propriétaire.
- **Sans elle** : nomenclature saisie depuis rien ; Modulus lit une vue de Keystone qui finira retirée.

## DI-V2 · Vigie — Bascule des lectures d'articles et de nomenclatures

- **Dépôt** : `Yhumiii27/Vigie`.
- **Demande** : lire `ingenium.pub_articles` et `ingenium.pub_nomenclatures` à la place des vues de Keystone pour la
  proposition d'effectivité des ECO (`proposeEffectivity`, `src/server/integrations/keystone/views.ts` → dossier
  `ingenium/`, contrats `test/fixtures/contracts/`, `src/db/foreign.ts`) ; colonnes identiques.
- **Raison / sans elle** : la vue de Keystone sera retirée ; l'effectivité serait calculée sur une nomenclature figée.

## DI-R1 · Vector — Bascule des lectures

- **Dépôt** : `Yhumiii27/vector`.
- **Demande** : `keystone.pub_nomenclatures` et `keystone.pub_articles` → vues d'Ingenium pour le contrôle du colisage
  (`src/server/integrations/connectors.ts`) ; colonnes identiques.
- **Raison / sans elle** : comme DI-V2.

## DI-A1 · Arche — Bascule de la lecture du pack ingénierie

- **Dépôt** : `Yhumiii27/Arche`.
- **Demande** : `keystone.pub_pack_ingenierie` → `ingenium.pub_pack_ingenierie` (contrat K-08 inchangé) dans
  `src/server/integrations/keystone/` (ou un dossier `ingenium/`), `src/domain/pack.ts`, simulation de démonstration ;
  `docs/CONTRATS.md` mis à jour.
- **Raison / sans elle** : critère G2 « pack ingénierie > 80 % » calculé sur une vue retirée.

## DI-M4 · Matrix — Retrait des vues de Keystone

- **Dépôt** : `Yhumiii27/Matrix`.
- **Demande** : quand plus aucun lien de lecture n'en dépend, retirer `keystone.pub_articles`, `keystone.pub_nomenclatures`,
  `keystone.pub_pack_ingenierie` ; retirer chaque `keystone.pub_reprise_*` dès la fin de son import.
- **Raison** : Keystone ne peut supprimer ses tables d'ingénierie (nouvelle migration) qu'une fois les vues qui les lisent
  retirées.
- **Sans elle** : les tables restent dans Keystone (archive de fait) ; aucun effet pour les utilisateurs.
