# 05 — Échanges avec les autres outils

> Règles de la suite (Norma § 5, décisions M-17, M-18, M-19 de Matrix) : lecture par les vues `pub_` seulement ; écriture
> chez un autre outil par son API ou une fonction `pub_` qu'il fournit ; Matrix définit, applique et possède les vues
> `pub_` (Ingenium fournit les requêtes de référence) ; un besoin d'accès se déclare comme un lien du registre de Matrix.
> Un connecteur vit dans `src/server/integrations/<outil>/` ; une source illisible est un état affiché, jamais une erreur
> de page. Demandes correspondantes : `docs/DEMANDES.md`.

## 1. Ce qu'Ingenium lit

| Vue | Outil | Pour quoi |
| --- | --- | --- |
| `keystone.pub_projets`, `pub_affectations`, `pub_jalons_projets`, `pub_activites` | Keystone | projets, équipes (portée), jalons des livrables, activités (colonne Activité des imports P&ID) |
| `keystone.pub_equipements_projet` (à demander) | Keystone | équipements d'un projet (R-185) |
| `keystone.pub_articles`, `pub_nomenclatures`, `pub_pack_ingenierie` | Keystone | phase 1 : lecture avant la bascule |
| `keystone.pub_reprise_*` (temporaires, à demander) | Keystone | reprise des données (ING-26) |
| `codex.pub_documents` et types | Codex | état et révision des livrables et des feuilles P&ID |
| `vigie.pub_ordres_modification`, `pub_eco_approbations`, `pub_eco_effectivite`, `pub_demandes_recues`, `pub_etudes_securite` | Vigie | ECO sur un article, clés attendues, études de sécurité |
| `modulus.pub_catalogue_machines`, vue de la BOM vendue (à demander) | Modulus | rattacher un équipement à une machine standard ; amorcer la nomenclature (ING-08) |
| `clavis.pub_acces`, `clavis.pub_personnes` | Clavis | droits, annuaire |
| `matrix.pub_sites`, `matrix.pub_filiales` | Matrix | sites, filiales |
| `matrix.pub_taches` | Matrix | Mes tâches et Mes approbations de toute la suite |

## 2. Ce qu'Ingenium publie (requêtes de référence ; vues appliquées par Matrix)

| Vue | Lecteurs | Contenu |
| --- | --- | --- |
| `ingenium.pub_articles` | `keystone_app`, `vigie_app`, `modulus_app`, `vector_app` | mêmes colonnes, même ordre que `keystone.pub_articles` (`ref, name, revision, status, part_type, make_buy`), puis en fin `hs_code`, `export_restriction`, `unit`, `wear_spare`, `lead_weeks`, `maj_le` |
| `ingenium.pub_structures_articles` | `keystone_app`, `modulus_app` | parent, enfant, quantité, position |
| `ingenium.pub_nomenclatures` | `keystone_app`, `vigie_app`, `vector_app` | mêmes colonnes que `keystone.pub_nomenclatures` (`project_code, stage, part_ref, quantity`), puis `equipment_ref`, `scope`, `revision`, `maj_le` |
| `ingenium.pub_pack_ingenierie` | `arche_app`, `keystone_app` | mêmes colonnes que `keystone.pub_pack_ingenierie` (contrat K-08 d'Arche) |
| `ingenium.pub_plans` | `keystone_app`, `vigie_app` | numéro, titre, révision, état, article lié, lien PDM |
| `ingenium.pub_avancement_ingenierie` | `keystone_app` | par projet et discipline : livrables prévus et diffusés, entrées bloquantes, contrôles ouverts, couverture P&ID |
| `ingenium.pub_taches` | `matrix_app` | contrat commun `norma/contrats/taches-v1.md` |
| `ingenium.pub_journal` | `matrix_app` | journal unifié de la suite |

Une colonne publiée ne se retire ni ne se renomme ; un changement incompatible passe par une vue `…_v2`. Aucune donnée
personnelle hors nom déjà visible dans l'outil.

## 3. Écritures

| Sens | Comment |
| --- | --- |
| Ingenium → Codex | dépôt d'un livrable ou d'une révision : `POST /api/documents` (client d'API d'Ingenium), avant la transaction d'écriture ; Ingenium garde la référence seulement ; décision d'une étape de circuit par l'API de Codex quand elle existera |
| Ingenium → Vigie | clé « responsable ingénierie » d'un ECO : `vigie.pub_signaler_avancement_eco` ; demande de modification (ECR) depuis un article, un plan ou une nomenclature : `vigie.pub_creer_demande_modification` élargie, ou une nouvelle fonction de Vigie |
| Keystone → Ingenium | aucune écriture SQL ; « Demander un article » et autres demandes par l'API d'Ingenium (`/api/v1/`, sur le modèle de `docs/API.md` d'Arche) |
| Ingenium → Keystone | aucune : Keystone lit les vues d'Ingenium |
| Ingenium → Crucible | plus tard : demande d'essai par l'API de Crucible (ING-18) |

## 4. Systèmes externes

SolidWorks PDM / 3DEXPERIENCE (plans, numérotation), fichier XML de numérotation sur un serveur local, exports natifs
EPLAN, TIA Portal, SolidWorks, AutoCAD P&ID : simulés et affichés comme tels tant que la DSI n'a pas validé le connecteur ;
aucune donnée ne sort du serveur interne sans son accord (Norma § 9).
