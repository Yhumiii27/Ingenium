# Ingenium — analyse des éléments d'ingénierie de Keystone

> Relevé du 27 novembre 2026, fait en lecture sur `origin/main` de chaque dépôt : Keystone `9a6f882`, Norma `238b655`,
> Modulus `0204c68`, Vector `afb2a04`, Vigie `71760b9`, Codex `61000e7`, Crucible `97370df`, Arche `dde8d65`,
> Matrix `a01da74`, Clavis `4f12a70`. Décision du propriétaire du même jour : « Nous allons sortir certains éléments
> d'ingénierie de Keystone pour faire un soft dédié aux équipes d'ingénierie. Prépare tout cela. » Les chemins sont
> relatifs au dépôt cité (Keystone sauf mention). Les recommandations ci-dessous sont les réponses par défaut des questions
> ING-03 à ING-28 (`docs/DECISIONS.md`) ; le périmètre retenu est dans `docs/spec/01-perimetre.md`, la transition dans
> `docs/spec/06-transition.md`. Les identifiants de démonstration cités (HLT-026…) sont ceux du jeu fictif de Keystone.

## 0. En bref

- Keystone porte aujourd'hui **onze écrans d'ingénierie** (section « Projet › Ingénierie projet » : Synthèse, Process,
  Mécanique, Électrique, Automatisme, Validation P&ID, Nomenclature projet ; section « Référentiel technique » : Articles
  (PLM), Ordres de modification (ECO), Plans (coffre PDM) ; « Administration › Types de machines »), **≈ 35 tables**
  (`src/server/db/schema/engineering.ts` 13 tables, `plm.ts` 7, `catalogue.ts` 5, une partie de `portfolio.ts`,
  `documents.ts`, `conformity.ts`, `operations.ts`) et **quatre vues `pub_`** lues par d'autres outils
  (`pub_articles`, `pub_nomenclatures`, `pub_pack_ingenierie`, et pour partie `pub_livrables`).
- **À sortir vers l'outil d'ingénierie** (recommandation) : le registre d'ingénierie par discipline (entrées, livrables
  jusqu'à la diffusion, listes générées, contrôles de cohérence, assistant d'import), la validation P&ID, le référentiel
  technique des articles et leurs structures, la **nomenclature d'ingénierie** du projet, le miroir des plans PDM, le
  pack ingénierie (critère G2 d'Arche), le registre des interfaces techniques et, à confirmer, le dossier technique CE.
- **À garder dans Keystone** : tout ce qui relève de l'exécution du projet — planning, heures, budget, achats (prix,
  manquants à commander, valorisation), stock, expéditions (vers Vector), livrables client et PV, ITP, réserves, mise en
  service, parc installé et SAV, types de machines comme **modèles de projet**.
- **Déjà tenu par un autre outil** : ECR / ECO → **Vigie** (décision CV-06 du 05/11/2026) ; documents, types et circuits
  → **Codex** ; catalogue machines, options et BOM standard → **Modulus** (transition en cours) ; essais R&D →
  **Crucible** ; expéditions → **Vector** ; études de sécurité des procédés → **Vigie** ; feuilles de temps → **Cursus**.
- Le couplage le plus fort est la **nomenclature projet** (`project_bom_lines`) : lue par 8 modules de Keystone (achats,
  budget, parc, P&ID, équipements, import) et par Vigie et Vector. C'est le point dur de la transition (`docs/spec/06-transition.md`).

## 1. Méthode

- Écrans : registre `src/config/screens.ts` (61 écrans, section `project` groupe « Project engineering », sections `tech`,
  `catalogue`, `admin`) ; droits de navigation `src/config/role-screens.ts`.
- Règles pures `src/domain/`, lectures et écritures `src/server/dal/`, Server Functions `src/features/<écran>/actions.ts`,
  tables `src/server/db/schema/*.ts`, vues `pub_` des migrations `drizzle/0035` à `0071` (toutes créées avant M-18 ; Matrix
  les possède depuis).
- Lecteurs : recherche de `keystone.pub_*` (et des noms nus) dans les dépôts des autres outils.
- Spécification d'origine : `docs/spec/09-engineering-plm.md` (950 lignes, écrans 1 à 9 et entités § 10), décisions
  `docs/DECISIONS.md` (E-1a à E-9, A-1b, P-7c, D9-18, L9-E1, X-15, NEW-D5-1), notes `docs/delivery-8/notes-supply-engineering.md`,
  `docs/delivery-9/notes-r191-engineering-pack.md`, `notes-vigie-d12-d13.md`, `notes-r185-equipments.md`, `notes-r186-catalogue.md`.
- Reste à faire : `reste-a-faire/keystone.json` de Norma (219 points ; ≈ 25 touchent l'ingénierie, § 4).

## 2. Inventaire détaillé

Légende de la recommandation : **→ Ingenium** (sort de Keystone) · **Keystone** (reste) · **Vigie / Codex / Modulus /
Crucible / Vector / Cursus** (déjà tenu ailleurs) · **à trancher** (question de `docs/DECISIONS.md`).

### 2.1 Registre d'ingénierie : Synthèse et quatre disciplines — **→ Ingenium**

| | |
|---|---|
| Écrans | `eng` « Synthèse ingénierie » `/projects/[code]/engineering` ; `eng-process`, `eng-meca`, `eng-elec`, `eng-auto` `/projects/[code]/engineering/[discipline]` (`src/app/(app)/projects/[code]/engineering/…`) |
| Ce qu'il fait | Pour chaque discipline (Process, Mécanique, Électrique, Automatisme) : **entrées** consommées (quel document, de quelle discipline, à quelle révision figée ou diffusée — E-5), **livrables** jusqu'à la diffusion BPE (fiches de l'index Codex, statuts partagés avec l'écran Documents), **listes générées** pour le service suivant (bloquée → prête, calculé), **contrôles de cohérence** entre disciplines (règles « process ↔ électrique », « révision »), **changements récents et impact**, **assistant d'import** d'une liste (outil source : TIA Portal, EPLAN, SolidWorks, Excel ; correspondance des colonnes ; écarts ; « figer cette révision comme entrée ») ; matrice « qui attend quoi », carte de passage d'étape, carte du pack ingénierie |
| Code | règles `src/domain/engineering.ts` (720 l.), DAL `src/server/dal/engineering.ts` (379 l.), `eng-screen.ts` ; écrans `src/features/eng/` (`synthesis-view.tsx`, `discipline-view.tsx`, `import-wizard.tsx`, `pack-card.tsx`, `row-actions.tsx`) ; actions `src/features/eng/actions.ts` (`confirmInputAction`, `closeCheckAction`, `deliverableStepAction`, `generateOutputAction`, `importListAction`) |
| Tables | `eng_disciplines`, `eng_inputs`, `eng_consistency_rules`, `eng_checks`, `eng_outputs`, `eng_changes`, `eng_import_tools`, `eng_column_mappings`, `eng_import_deltas`, `eng_imports` (`schema/engineering.ts`) ; livrables = lignes de `documents` (service = discipline) |
| Qui | navigation : directeur, CP, responsable ingénierie, qualité (`role-screens.ts`, constante `ENG`) ; écriture `ctx.canEdit(screen)` ; « Valider la diffusion » réservée au CP / directeur (`canValidateRelease`, P-7c) |
| Liens | Codex (livrables = fiches de l'index ; circuit d'approbation, R-106 partiel), P&ID (contrôles), pack ingénierie, Mes approbations (étapes de circuit Codex) |
| Volumes de démonstration | HLT-026 seul : 4 disciplines, 12 entrées, 13 livrables (`ENG_DOCS`), 6 règles, 10 contrôles, 6 listes générées, 4 changements, 4 outils d'import, 6 correspondances, 4 écarts (`src/server/prototype/prototype-data.json`) |
| Reste à faire | R-106 (circuit Codex lancé par « Valider la diffusion »), R-107 (lire les exports natifs EPLAN / TIA / SolidWorks : aujourd'hui l'assistant ne lit aucun fichier), R-172 (TODO(db) de l'import) |
| Pourquoi sortir | C'est le cœur du travail quotidien des bureaux d'études, indépendant du pilotage coûts / délais ; les écrans ne servent qu'aux rôles d'ingénierie ; aucune autre partie de Keystone n'écrit dans ces tables (`engInputs` n'est lu que par `dal/engineering.ts`) |

### 2.2 Validation P&ID — **→ Ingenium**

| | |
|---|---|
| Écran | `pid` « P&ID — repères, surcouche et validation du process » `/projects/[code]/pid` |
| Ce qu'il fait | Liste des repères (instruments, équipements) d'une feuille P&ID, périmètre (client / Keystone / surcouche), rattachement de chaque repère du périmètre de l’ingénierie à une référence **validée** de la nomenclature avant « bon pour construction », étapes de validation du process (repères extraits → rattachement → surcouche convenue → revue → BPE), import structuré d'une liste de repères (CSV / TSV / xlsx, plan d'import avant écriture), recherche d'article dans tout le catalogue (E-6, R-108), écart de révision avec Codex (R-109) |
| Code | `src/domain/pid.ts` (379 l.), `pid-import.ts` (406 l.), `pid-search` ; DAL `src/server/dal/pid.ts`, `pid-import.ts` ; `src/features/pid/` (`pid-view.tsx`, `tag-drawer.tsx`, `import-dialog.tsx`, `xlsx.ts`) ; actions `mapPidTagAction`, `unlinkPidTagAction`, `stagePidImportAction`, `applyPidImportAction` |
| Tables | `pid_sheets`, `pid_tags`, `pid_validation_steps` |
| Qui | directeur, responsable ingénierie, qualité (le CP ne l'a pas dans sa navigation, spec 09 § 0.2) |
| Liens | **écrit dans la nomenclature projet** (« ajouter à la nomenclature » au rattachement, `canEditBom`) ; Codex (feuille et révision) ; activités du planning (colonne Activité de l'import) |
| Volumes | 1 feuille (`PID`), 24 repères, 5 étapes |
| Pourquoi sortir | Outil de bureau d'études pur ; son seul couplage fort est la nomenclature, qui sort avec lui (§ 2.4) |

### 2.3 Référentiel des articles (PLM) — **→ Ingenium** (données techniques) ; prix et stock restent dans Keystone — **à trancher** (A-1b)

| | |
|---|---|
| Écrans | `plm` « PLM — catalogue articles » `/reference/parts` ; fiche article (tiroir partagé avec la nomenclature) |
| Ce qu'il fait | Articles (référence `ART-…`, nom, type, fabriqué / acheté, fabricant et référence, code HS, restriction et contrôle export, statut Non validé → Validé → Périmé / Obsolète, révision, délai, pièce d'usure / de rechange, unité), équivalents, structure (liens d'assemblage parent × enfant × quantité), listes de pièces d'usure et de rechange par système ; validation par l'ingénierie (R-102, E-1a / E-1b : refusée sans HS, export, délai, référence fabricant ; Périmé / Obsolète seulement par un ECO libéré dans Vigie) ; doublon possible (R-111) |
| Code | `src/domain/parts.ts` (540 l., `canValidatePart`), DAL `src/server/dal/parts.ts`, `plm.ts` ; `src/features/plm/` (actions `createPartAction`, `registerEquivalentAction`, `completePartRecordAction`, `validatePartAction`) |
| Tables | `parts`, `part_equivalents`, `assembly_links`, `spare_list_lines` (`schema/catalogue.ts`) ; **`part_last_prices`** (dernier prix d'achat) et `list_price_eur` relèvent des achats |
| Vue publiée | **`keystone.pub_articles`** (`ref, name, revision, status, part_type, make_buy`, migration 0035) — lue par **Vigie** (effectivité des ECO, `src/server/integrations/keystone/views.ts` de Vigie, 16 occurrences), **Modulus** (BOM préfaites, décision D-5), **Vector** (colisage), **Matrix** (registre) |
| Qui | navigation : directeur, CP, responsable ingénierie, qualité, achats ; validation : responsable ingénierie (et directeur, à confirmer) |
| Liens | nomenclature, P&ID, ECO (Vigie), plans PDM (article lié), stock (positions par article), achats (lignes de commande), SAV (révision montée `machine_part_revisions`), Modulus, Vector |
| Volumes | 54 articles, 15 derniers prix, 3 assemblages racine (`TREE`), listes de 5 systèmes ; jeu de charge `scripts/load/seed-volume.ts` |
| Points ouverts | **A-1b** « qui est maître du référentiel articles » (le propriétaire pense que les numéros viennent de SolidWorks 3DX, à confirmer par l'ingénierie), **D9-18 / R-214** numérotation par un fichier XML sur un serveur local, R-101 |
| Recommandation | Le référentiel technique sort vers Ingenium, qui portera aussi le connecteur 3DX / PDM (R-035) et la lecture du fichier XML (R-214) : c'est l'outil des personnes qui créent les articles. Keystone garde ses données d'achat (dernier prix, prix catalogue d'achat, stock) dans ses tables, rattachées par la référence. Si A-1b répond « 3DX maître », Ingenium devient un miroir de 3DX enrichi des données que 3DX n'a pas (export, HS, pièces d'usure) — même place dans la suite |

### 2.4 Nomenclature projet (BOM) — **→ Ingenium** pour la nomenclature d'ingénierie ; Keystone garde l'usage achats — **à trancher**

| | |
|---|---|
| Écran | `bom` « Nomenclature projet — équipements et articles » `/projects/[code]/bom` : liste à plat, arbre d'assemblage valorisé, cas d'emploi, comparaison de révisions, liste PU / PR (pièces d'usure et de rechange), « Ajouter un article », rattachement à un équipement (R-185), commande de pièces de rechange (E-3b) |
| Code | `src/domain/bom.ts` (565 l. : filtres, arbre, valorisation au dernier prix, manquants à commander), `bom-valuation` ; DAL `src/server/dal/bom.ts` (533 l.), `bom-screen.ts` ; `src/features/bom/` (actions `addBomArticleAction`, `setBomLineEquipmentAction`, `spares-order-actions.ts`) |
| Tables | `project_bom_lines` (projet × article × quantité, activité, périmètre client / keystone / overlay, équipement), `project_assembly_roots`, `revision_diffs`, `revision_diff_lines` (`schema/plm.ts`) |
| Vue publiée | **`keystone.pub_nomenclatures`** (`project_code, stage, part_ref, quantity`, migration 0035) — lue par **Vigie** (proposition d'effectivité des ECO, `proposeEffectivity`), **Vector** (contrôle colisage), **Matrix** |
| Lecteurs internes | `dal/bom.ts`, `dal/budget.ts`, `dal/fleet.ts`, `dal/parts.ts`, `dal/pid.ts`, `dal/project-equipment.ts`, `dal/purchasing.ts` (manquants à commander), `interchange/table-import.ts` ; écran Expéditions (contrôle du colisage contre la nomenclature) |
| Qui | navigation : directeur, CP, responsable ingénierie, qualité, achats, logistique (lecture, `LOGISTICS_READ_ONLY_SCREENS`) |
| Volumes | 59 lignes sur 6 projets (35 pour HLT-026) |
| Recommandation | Ingenium tient la **nomenclature d'ingénierie** (structure, quantités, révisions, rattachement aux repères P&ID et aux équipements) et la publie ; Keystone la **lit** (vue `pub_nomenclatures` d'Ingenium, contrat de Keystone repris, colonnes nouvelles en fin) et garde ce qu'il en fait : valorisation, manquants à commander, commandes de rechange, contrôle colisage (puis Vector), configuration livrée du parc (R-144). Option : nomenclature entière dans Ingenium avec un écran de lecture dans Keystone (défaut) ; ou nomenclature laissée dans Keystone, Ingenium la lisant (alternative, moins de risque, moins de valeur) |

### 2.5 Plans — coffre PDM — **→ Ingenium**

| | |
|---|---|
| Écran | `drawings` « Plans — coffre PDM » `/reference/drawings` ; bouton « Ouvrir dans PDM », « Synchroniser le coffre » |
| Ce qu'il fait | Miroir en lecture du coffre SolidWorks PDM (numéro, titre, révision, état, article lié, ECO) ; synchronisation simulée (recopie du volume précédent) |
| Code | `src/domain/drawings.ts`, DAL `src/server/dal/drawings.ts`, écrans `src/features/eco/drawings/` |
| Tables | `drawings`, `drawing_revisions`, `pdm_vault_syncs` |
| Qui | directeur, CP, responsable ingénierie, qualité |
| Reste à faire | **R-035** brancher SolidWorks PDM / 3DEXPERIENCE (données + aperçu PDF chaque heure, E-7, X-15), bloqué par un système externe |
| Volumes | 13 plans |
| Pourquoi sortir | Le connecteur PDM / 3DX est un outil d'ingénieurs ; Keystone n'a besoin que du lien vers un plan depuis un article ou un ECO |

### 2.6 Pack ingénierie (critère G2 d'Arche) — **→ Ingenium**

| | |
|---|---|
| Où | carte « Pack ingénierie · part ingénierie » de la Synthèse (`src/features/eng/pack-card.tsx`) ; liste type par type de machine sur l'écran Types de machines (`mtype-editor.tsx`, `setMachineTypePack`, `src/server/dal/mtypes.ts`) |
| Code | `src/domain/engineering-pack.ts`, `src/server/dal/engineering-pack.ts` ; notes `docs/delivery-9/notes-r191-engineering-pack.md` |
| Tables | `machine_type_pack_families` (type × famille `pid`, `bom`, `layout`, `electrique`, `analyse_fonctionnelle`, poids, minimum), colonne `document_types.pack_family` |
| Vue publiée | **`keystone.pub_pack_ingenierie`** (migration 0060, contrat K-08 d'Arche) — lue par **Arche** (`src/domain/pack.ts`, page `/capex/[code]/pack`, critère « Pack ingénierie > 80 % » du jalon G2, C-9) |
| Données | liste type **provisoire** (5 familles à 20 %, 1 pièce attendue) en attendant la vraie liste (C-9, L9-E1) |
| Pourquoi sortir | La complétude du pack mesure le travail des bureaux d'études ; elle se calcule sur l'index Codex des livrables d'ingénierie, que tient Ingenium (§ 2.1) |

### 2.7 Registre des interfaces — **à trancher** (défaut : → Ingenium, le CP en lecture)

| | |
|---|---|
| Écran | `interfaces` « Registre des interfaces » `/projects/[code]/interfaces` (groupe « Équipe et échanges ») |
| Ce qu'il fait | Interfaces `IF-nn` d'un projet : côté ingénierie (électrique, mécanique, site, process, automatisme), autre partie, donnée attendue, date de besoin, reçue le, état (ouverte, figée, reçue), responsable |
| Code / table | `src/server/dal/interfaces.ts` (162 l.) ; `project_interfaces` (`schema/operations.ts`) |
| Qui | CP, responsable ingénierie |
| Raison | Quatre côtés sur cinq sont des disciplines ; les données attendues sont des **entrées** d'ingénierie (§ 2.1). Le côté « site » reste du ressort du CP : l'interface peut rester dans Keystone si le propriétaire voit le registre comme un outil de pilotage contractuel |

### 2.8 Conformité CE et dossier technique machine (R-160) — **à trancher** (défaut : → Ingenium)

| | |
|---|---|
| Où | cartes CE de la mise en service et du portefeuille (`src/features/ce/`), listes de Paramètres |
| Code / tables | `src/domain/ce-conformity.ts`, `src/server/dal/ce-conformity.ts` ; `ce_checklist_items` (exigences essentielles annexe III, rubriques du dossier technique annexe IV), `ce_files` (un dossier par équipement, R-185) — `schema/conformity.ts` |
| Contexte | Règlement Machines (UE) 2023/1230 applicable le **20 janvier 2027** ; réponse du propriétaire D9-32 (10/11/2026) |
| Raison | L'analyse de risques machine, les exigences essentielles et le dossier technique sont produits par l'ingénierie ; Keystone n'a besoin que de l'état « dossier complet » pour la mise en service. **Ne pas retarder** la mise en conformité : si la transition n'est pas prête avant janvier 2027, le module reste dans Keystone jusque-là |

### 2.9 Ordres et demandes de modification (ECO / ECR) — **Vigie** (déjà décidé)

| | |
|---|---|
| Keystone | écran `eco` `/reference/eco` = **miroir en lecture** des ECO de Vigie (`vigie_ecos`, `vigie_eco_approvals`, `vigie_eco_parts`, `vigie_eco_projects`, `vigie_eco_effectivity`, `vigie_eco_progress` — `schema/vigie.ts`) ; décision des clés **englead** et **pm** déposée chez Vigie par `vigie.pub_signaler_avancement_eco` (`src/server/integrations/vigie/eco-connector.ts`, `src/server/approvals/ecos.ts`) ; règles `src/domain/eco.ts` (444 l.) |
| Vigie | module « Modifications techniques » construit le 05/11/2026 (décision CV-06, `docs/specs/modifications-techniques.md` de Vigie, migration 0029) : numéros `ECO-AAAA-NNN` / `ECR-AAAA-NNN`, clés, effectivité proposée d'après `keystone.pub_nomenclatures` et `pub_parc_machines`, écritures reçues par `vigie.pub_signaler_avancement_eco` (Keystone) et `vigie.pub_creer_demande_modification` (Codex) |
| Recommandation | ECO / ECR restent dans Vigie. Ingenium **reprend la clé « englead »** (responsable ingénierie) et l'ouverture d'une demande (ECR) depuis un article, un plan ou une nomenclature, par les fonctions `pub_` de Vigie (lien d'exécution à déclarer à Matrix, `ingenium_app` ajouté à `inbound_callers` de Vigie). La clé « pm » reste dans Keystone. Volumes : 6 ECO de démonstration |

### 2.10 Index des documents, types et circuits — **Codex** (déjà décidé)

| | |
|---|---|
| Keystone | « Documents · Codex » `/projects/[code]/documents`, « Registre des types de documents (Codex) » `/admin/document-types` ; tables `documents`, `document_revisions`, `document_approvals`, `document_types` (miroir), `document_deposits`, `codex_document_outbox`… (`schema/documents.ts`, DAL `src/server/dal/documents.ts`, 1 036 l.) |
| Codex | 69 types dont **11 de la famille `ingenierie_conception`** (`EXG`, `FDS`, `HMI`, `VAR`, `LDC`, `PID`, `PFD`, `SCH`, `GA`, `LST`, `BOM` — `src/db/registry.ts` de Codex) ; dépôt par une application `POST /api/documents` |
| Recommandation | Ingenium n'héberge aucun fichier : il garde, comme Keystone, une **référence** aux fiches de Codex pour ses livrables et entrées, lit `codex.pub_documents` (état et révision) et dépose par l'API de Codex. Keystone garde son index de projet (tous les documents, toutes familles) |

### 2.11 Types de machines standard — **Keystone** (modèles de projet) ; catalogue → **Modulus**

| | |
|---|---|
| Keystone | écran `mtypes` `/admin/machine-types` ; tables `machine_types`, `machine_type_phases`, `machine_type_cost_categories`, `machine_type_itp_systems`, `machine_type_pack_families`, `rex_references` (`schema/portfolio.ts`) ; catalogue `machine_catalogue_entries` et vue `pub_catalogue_machines` (K-01) |
| Modulus | reprend catalogue, options, BOM standard et prix (`docs/spec/05-echanges.md` § 4 de Modulus) |
| Recommandation | Phases, catégories de coût et systèmes ITP sont des **modèles de projet** : ils restent dans Keystone. Seule la liste type du pack (§ 2.6) sort vers Ingenium. Ingenium lit le catalogue dans Modulus (`modulus.pub_catalogue_machines`) pour rattacher un équipement à une machine standard ; la **BOM standard** reste à Modulus, Ingenium la lit pour démarrer la nomenclature d'ingénierie d'un projet (question ING-08) |

### 2.12 ITP, réserves, mise en service — **Keystone**

`itp` et `commissioning` (`src/domain/itpcom.ts`, `src/server/dal/itp.ts` 602 l., tables `itp_plans`, `itp_plan_systems`,
`itp_inspections`, `punch_items`, `commissioning_systems`, `commissioning_steps`, `sat_plans`, `handover_items`) : contrôle et
réception sur site, tenus par la qualité et le CP ; Q-6a donne la saisie des résultats à « la qualité et le responsable
ingénierie » (R-112). Reste dans Keystone ; Ingenium lit l'état des systèmes (vue à demander, facultatif) et le
responsable ingénierie saisit ses résultats dans Keystone.

### 2.13 Livrables client et PV de réception — **Keystone**

`quality` « Qualité — NC et livrables » (`schema/quality.ts` : `deliverables`, `deliverable_raci`, `deliverable_reviews` ;
`src/server/approvals/deliverables.ts`) et vue `pub_livrables` (lue par Arche et Vigie) : engagement contractuel envers le
client, tenu par le CP. Reste dans Keystone. Un livrable client qui est un document d'ingénierie garde sa référence Codex ;
Ingenium en montre l'état de diffusion côté bureau d'études.

### 2.14 Heures, charge, ressources et compétences — **Keystone / Cursus**

Heures (`hours`, rapprochement Lucca, puis feuilles de Cursus), plan de charge, demandes de ressources, compétences
(`schema/resources.ts`, `work.ts`) : pilotage du projet et RH. Restent. Ingenium peut afficher la charge par discipline en
lecture (vue `keystone.pub_affectations` existante) — facultatif (ING-17).

### 2.15 Sécurité machine (R-192 : HazOp / AMDEC, ATEX, PSSR) — **Vigie** (études) + **Keystone** (blocage de la mise en service)

Vigie tient les études de sécurité des procédés (`process_safety_studies`, vue `vigie.pub_etudes_securite`) ; l'AMDEC machine
de conception pourrait relever d'Ingenium (question ING-14, défaut : Vigie).

### 2.16 Autres éléments relevés

| Élément | Où | Recommandation |
| --- | --- | --- |
| Parc installé, configuration telle que construite (`machines`, `machine_part_revisions`, R-144, E-8) | `schema/aftersales.ts`, écrans `fleet`, `sav` | **Keystone** (SAV) ; lit la nomenclature d'Ingenium à la livraison |
| Codes d'activité, plannings fournisseurs (`schema/multilevel.ts`) | Plan | **Keystone** |
| Demandes de modification de projet (CR, `schema/change.ts`) | Change control | **Keystone** (contrat, coût, délai) — ne pas confondre avec les ECO |
| Essais R&D, réservations de moyens | Crucible (`keystone.pub_jalons`) | **Crucible** ; une demande d'essai depuis Ingenium par l'API de Crucible, plus tard (ING-18) |
| Notes de calcul, analyses fonctionnelles | aucun écran dans Keystone : documents Codex (`FDS`, `EXG`, `LDC`) | **Codex** (fichiers) + livrables d'Ingenium (suivi) |
| Revues de conception | aucun objet dédié dans Keystone (étapes de validation P&ID, `deliverable_reviews` du livrable client) | **à construire dans Ingenium** si le propriétaire le veut (ING-15) |
| Mes tâches, Mes approbations | `src/features/mywork/`, `src/server/approvals/` | **Keystone** pour ses objets ; Ingenium a les siens (proposition Norma TA, menus de base) |

## 3. Vues `pub_` de Keystone concernées et leurs lecteurs

| Vue (migration) | Colonnes | Lecteurs relevés | Après la transition |
| --- | --- | --- | --- |
| `keystone.pub_articles` (0035) | `ref, name, revision, status, part_type, make_buy` | Vigie, Modulus, Vector, Matrix | `ingenium.pub_articles` mêmes colonnes ; Keystone garde la sienne tant qu'un lecteur en dépend, puis Matrix la retire |
| `keystone.pub_nomenclatures` (0035) | `project_code, stage, part_ref, quantity` | Vigie, Vector, Matrix | `ingenium.pub_nomenclatures` mêmes colonnes (+ `equipment`, `revision` en fin) |
| `keystone.pub_pack_ingenierie` (0060) | contrat K-08 d'Arche | Arche | `ingenium.pub_pack_ingenierie` mêmes colonnes |
| `keystone.pub_livrables` (0035, 0038) | livrables client | Arche, Vigie | **reste** à Keystone |
| `keystone.pub_parc_machines` (0035, 0040) | parc | Vigie, Arche | **reste** à Keystone |
| `keystone.pub_catalogue_machines` (0046) | K-01 | Arche, Modulus | **vers Modulus** (transition de Modulus) |
| `keystone.pub_projets`, `pub_jalons_projets`, `pub_affectations` | projets, jalons, affectations | toute la suite | **restent** ; Ingenium les lit |

Matrix possède ces vues depuis M-18 (aucune migration ne les recrée) ; une colonne publiée ne se retire ni ne se renomme ;
un changement incompatible passe par une vue `…_v2`.

## 4. Points du reste à faire de Keystone qui suivraient l'ingénierie

Transférés vers la liste d'Ingenium si le périmètre par défaut est retenu (`reste-a-faire/keystone.json` → nouveau
`reste-a-faire/ingenium.json`) : R-035 (PDM / 3DX), R-101 (maître du référentiel articles), R-102 (validation des
articles), R-106 (circuit Codex des livrables), R-107 (exports natifs EPLAN / TIA / SolidWorks), R-108 (recherche P&ID),
R-109 (écart de révision P&ID), R-111 (doublon), R-172 en partie (import P&ID), R-191 (pack, si la liste réelle arrive),
R-214 (fichier XML de numérotation), R-160 (CE, si ING-11 = défaut).

Restent dans Keystone : R-053 (standard par type de machine), R-057 (systèmes ITP figés), R-103 (valorisation au prix
commandé), R-104 (chiffrage des remplacements), R-110 (pièces protégées pour le parc), R-112 (résultats ITP), R-113, R-117,
R-144 (configuration livrée), R-185 (multi-équipements : à traiter **avant** la transition de la nomenclature, ou dans
Ingenium dès le départ).

## 5. Personas et rôles concernés

Keystone a neuf rôles (`RoleKey`, `src/config/screens.ts`) ; un seul est propre à l'ingénierie : **`englead`**
(responsable ingénierie). Les ingénieurs de discipline, projeteurs et dessinateurs n'ont pas de rôle : ils sont
`member` (ils ne voient ni la Synthèse ni les disciplines) ou n'utilisent pas Keystone. C'est l'argument principal pour
un outil dédié : **les personnes qui produisent l'ingénierie n'ont aujourd'hui pas d'écran pour elle**.

## 6. Couplages à surveiller

1. Nomenclature ↔ achats (manquants à commander, `dal/purchasing.ts`), budget (`dal/budget.ts`), parc (`dal/fleet.ts`),
   expéditions (contrôle colisage) : Keystone doit lire la nomenclature d'Ingenium **dans la même forme** qu'aujourd'hui.
2. Articles ↔ stock, lignes de commande, révisions montées : la clé commune est la **référence** `ART-…` (jamais l'`id`).
3. P&ID ↔ activités du planning (colonne Activité de l'import) : Ingenium lit `keystone.pub_activites` (existe).
4. Livrables d'ingénierie ↔ index Codex de Keystone : deux outils lisent les mêmes fiches de Codex ; un seul (Codex) les
   fait évoluer.
5. Clés d'ECO : la clé « englead » passe de Keystone à Ingenium ; Vigie doit accepter le nouvel appelant.
6. Code projet : les équipes d'ingénierie utilisent le format `#000`, l'analytique le format `XXX000` (NEW-SYS-1, en
   attente) — Ingenium doit afficher en premier le code des bureaux d'études.
