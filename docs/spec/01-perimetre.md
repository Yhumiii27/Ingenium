# 01 — Périmètre et frontière

> Périmètre par défaut, tant que les questions ING-04 à ING-18 ne sont pas tranchées (`docs/DECISIONS.md`). Détail de
> l'existant dans Keystone (écrans, code, tables, volumes) : `docs/ANALYSE-KEYSTONE.md` § 2.

## 1. Ce qui sort de Keystone vers Ingenium

| Objet | Écran Keystone aujourd'hui | Tables de Keystone | Question |
| --- | --- | --- | --- |
| Registre d'ingénierie : disciplines, entrées, livrables jusqu'à la diffusion, listes générées, contrôles de cohérence, changements, assistant d'import (avec la lecture réelle des exports natifs EPLAN, TIA Portal, SolidWorks) | Synthèse + Process / Mécanique / Électrique / Automatisme | `eng_*` (10 tables), livrables = fiches de l'index Codex | ING-04 |
| Validation P&ID : feuilles, repères, rattachement, étapes, import | P&ID | `pid_sheets`, `pid_tags`, `pid_validation_steps` | ING-05 |
| Référentiel technique des articles : données techniques, statut, révision, équivalents, structures, pièces d'usure et de rechange, validation ; connecteur 3DX / PDM et fichier XML de numérotation | Articles (PLM) | `parts` (hors prix), `part_equivalents`, `assembly_links`, `spare_list_lines` | ING-06 |
| Nomenclature d'ingénierie du projet : lignes, racines d'assemblage, comparaisons de révisions, rattachement aux équipements | Nomenclature projet (partie ingénierie) | `project_bom_lines`, `project_assembly_roots`, `revision_diffs`, `revision_diff_lines` | ING-07, ING-08 |
| Plans : miroir du coffre PDM / 3DX, connecteur | Plans | `drawings`, `drawing_revisions`, `pdm_vault_syncs` | ING-09 |
| Registre des interfaces techniques | Interfaces | `project_interfaces` | ING-10 |
| Dossier technique et conformité CE (règlement (UE) 2023/1230, 20 janvier 2027) | cartes CE de la mise en service | `ce_checklist_items`, `ce_files` | ING-11 |
| Pack ingénierie : liste type par type de machine, mesure par projet (critère G2 d'Arche, contrat K-08) | cartes de la Synthèse et des Types de machines | `machine_type_pack_families`, `document_types.pack_family` | ING-12 |

## 2. Ce qui reste dans Keystone

Planning, WBS, heures, budget et coûts, contrat et facturation, risques, demandes de modification de projet (CR), achats
(prix, dernier prix, manquants à commander, commandes de rechange, valorisation de la nomenclature), stock, livrables client
et PV de réception, ITP et réserves (ING-16), mise en service et dossier de transfert, parc installé et SAV (configuration
telle que construite), types de machines comme **modèles de projet** (phases, catégories de coût, systèmes ITP), index de
**tous** les documents du projet, réunions, parties prenantes, ressources et charge (lue par Ingenium, ING-17).

Keystone **lit** Ingenium : nomenclature (achats, budget, parc, colisage), articles, état des livrables d'ingénierie et du
pack sur la fiche projet.

## 3. Déjà tenu par un autre outil

| Objet | Outil | Ce qu'Ingenium en fait |
| --- | --- | --- |
| ECR / ECO, clés, effectivité | Vigie | lit ; donne la clé « responsable ingénierie » et ouvre une demande (ECR) depuis un article, un plan ou une nomenclature par les fonctions `pub_` de Vigie (ING-13) ; la clé du chef de projet reste dans Keystone |
| Études de sécurité (AMDEC, HazOp, ATEX) | Vigie | lit et montre sur le projet et le dossier CE (ING-14) |
| Documents, types, circuits | Codex | référence seulement ; dépôt par `POST /api/documents` ; le circuit du type fait foi pour la diffusion (ING-20) |
| Machines standard, options, BOM standard, configuration vendue | Modulus | lit ; la BOM figée de la configuration vendue amorce la nomenclature d'un projet (ING-08) |
| Essais R&D | Crucible | plus tard, demande par l'API de Crucible (ING-18) |

## 4. Nouveau dans Ingenium (à valider : rien hors du cahier des charges sans accord)

| Ajout | Pourquoi | Question |
| --- | --- | --- |
| Revues de conception (préliminaire, détaillée, P&ID) : participants, constats, actions, clôture | aucun objet aujourd'hui ; les constats deviennent des tâches | ING-15 |
| Lecture réelle des exports natifs EPLAN, TIA Portal, SolidWorks | l'assistant de Keystone ne lit aucun fichier (R-107) | ING-04, donnée ING-D3 |
| Connecteur 3DX / PDM et fichier XML de numérotation | ce sont les outils des ingénieurs (R-035, R-214) | ING-06, ING-09 |
| Charge par discipline, en lecture | les bureaux d'études veulent voir leur charge | ING-17 |

## 5. Frontière : qui écrit, qui lit

| Objet | Tenu par (écrit) | Lu par | Comment |
| --- | --- | --- | --- |
| Projet, équipe, jalons, activités | Keystone | Ingenium | `keystone.pub_projets`, `pub_affectations`, `pub_jalons_projets`, `pub_activites` |
| Équipements d'un projet | Keystone | Ingenium | vue à demander `keystone.pub_equipements_projet` |
| Registre d'ingénierie, P&ID, interfaces, revues | **Ingenium** | Keystone (état), Arche (pack) | `ingenium.pub_avancement_ingenierie`, `pub_pack_ingenierie` |
| Article : données techniques, statut, révision, structure | **Ingenium** | Keystone, Vigie, Modulus, Vector | `ingenium.pub_articles` (contrat de `keystone.pub_articles`), `pub_structures_articles` |
| Article : prix d'achat, dernier prix, stock | Keystone | Modulus | tables de Keystone, rattachées par la référence `ART-…` |
| Nomenclature d'ingénierie | **Ingenium** | Keystone, Vigie, Vector | `ingenium.pub_nomenclatures` (contrat de `keystone.pub_nomenclatures`) |
| Valorisation, manquants à commander, rechange | Keystone | — | calculés dans Keystone d'après la nomenclature lue |
| Plans (miroir PDM) | **Ingenium** | Keystone, Vigie | `ingenium.pub_plans` |
| Fichiers | Codex | tous | `codex.pub_documents`, `POST /api/documents` |
| ECR / ECO | Vigie | Ingenium, Keystone, Codex | `vigie.pub_ordres_modification`… ; écritures `vigie.pub_signaler_avancement_eco`, `pub_creer_demande_modification` |
| Catalogue, BOM standard, configuration vendue | Modulus | Ingenium | `modulus.pub_catalogue_machines`, vue de BOM vendue à demander |
| Livrables client, PV, parc installé | Keystone | Arche, Vigie | `keystone.pub_livrables`, `pub_parc_machines` (inchangés) |
| ITP, réserves, mise en service | Keystone | Ingenium (facultatif) | vue à demander |
| Personnes, droits | Clavis | Ingenium | `clavis.pub_personnes`, `clavis.pub_acces` |
| Sites, filiales | Matrix | Ingenium | `matrix.pub_sites`, `matrix.pub_filiales` |

Règle de transition : **une seule source par objet** à tout moment — Keystone jusqu'à la bascule de l'objet, Ingenium
ensuite (`06-transition.md`).
