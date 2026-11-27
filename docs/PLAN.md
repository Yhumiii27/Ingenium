# Ingenium — plan des livraisons

| Livraison | Contenu | Questions à trancher avant | Dépend de |
| --- | --- | --- | --- |
| **0 — Cadrage** (faite, 27 nov. 2026) | `docs/spec/00`–`06`, `docs/DECISIONS.md`, `docs/PLAN.md`, `docs/DEMANDES.md` (brouillons), `docs/DONNEES.md`, `docs/ANALYSE-KEYSTONE.md`, `CLAUDE.md`, copie de Norma 3.1.0 et sa vérification en CI ; inscription dans Norma (registre, logo, tronc commun, reste à faire) | ING-01, ING-02 (faites) | Norma 3.1.0 |
| **1 — Plateforme** (construite, 27 nov. 2026, `docs/DELIVERY-1.md`) | socle copié de Modulus `main` (`docs/SOCLE.md`, commit d'origine noté ; jamais ses modules métier) : PostgreSQL seul, schéma `ingenium`, migrations générées, journal d'audit en ajout seul, une horloge métier, configuration validée au démarrage, connexion par Clavis et droits lus dans `clavis.pub_acces` à chaque requête, coque commune et logo, tronc commun (Accueil « Ma discipline », Mes tâches liste / kanban / calendrier, Mes approbations, Mes projets, Référentiel technique), i18n (anglais source, français par défaut), tâches planifiées, API `/api/v1/` (squelette), jeu de démonstration fictif aligné sur les codes du jeu de Keystone, CI (typecheck, lint, tests, build, `norma:check`), déploiement Coolify (conteneur unique, port 4000) | ING-03, ING-19, ING-22 à ING-25, ING-28 | rôle `ingenium_app` et schéma (Matrix, DI-M1), application `ingenium` dans Clavis (DI-C1), application Coolify |
| **2 — Registre d'ingénierie, P&ID, plans** (lot 2a construit le 27 nov. 2026, `docs/DELIVERY-2.md` ; 2b P&ID et import, 2c plans à faire) | disciplines, entrées, livrables jusqu'à la diffusion (références Codex, circuit du type), listes générées, contrôles de cohérence, changements, assistant d'import (lecture des exports natifs selon ING-04 et ING-D3) ; validation P&ID ; miroir des plans et connecteur PDM / 3DX (simulé jusqu'à l'accord de la DSI) ; d'abord en lecture des vues de reprise de Keystone, puis import journalisé et écritures objet par objet | ING-04, ING-05, ING-09, ING-20, ING-21, ING-26 | vues de reprise (DI-K2, DI-M2), dépôt Codex (DI-X1) ; données ING-D1 à ING-D3 |
| **3 — Référentiel technique et nomenclature d'ingénierie** | articles (données techniques, validation, équivalents, structures, pièces d'usure et de rechange), numérotation (fichier XML, 3DX), demandes de modification vers Vigie ; nomenclature rattachée aux équipements, amorcée par la BOM vendue de Modulus, écart calculé ; requêtes de référence de `pub_articles`, `pub_structures_articles`, `pub_nomenclatures` | ING-06, ING-07, ING-08, ING-13, ING-17 | A-1b, D9-18 et R-185 de Keystone ; DI-K3, DI-V1, DI-O1 ; donnée ING-D5 |
| **4 — Pack, interfaces, dossier CE, revues** | pack ingénierie (liste type réelle, publication sous le contrat K-08), registre des interfaces, dossier technique et conformité CE (sans rien retarder avant le 20 janvier 2027), revues de conception si retenues, études de Vigie montrées | ING-10, ING-11, ING-12, ING-14, ING-15 | donnée ING-D4 ; DI-M3 |
| **5 — Bascule des lecteurs et retrait dans Keystone** | Arche, Vigie, Modulus, Vector et Keystone lisent les vues d'Ingenium ; Keystone passe ses écrans d'ingénierie en lecture puis les retire ; Matrix retire les vues de Keystone ; Keystone supprime ou archive ses tables par une nouvelle migration | ING-16, ING-18, ING-27 | DI-K4, DI-V2, DI-R1, DI-A1, DI-O1, DI-M4 |

## Correspondance avec la transition (`docs/spec/06-transition.md`)

| Phase | Livraisons |
| --- | --- |
| 0 — Décisions et mise en place | 0, 1 |
| 1 — Ingenium lit Keystone | 1 à 4, en lecture, avec le pilote (ING-21) |
| 2 — Ingenium reprend les écritures, objet par objet (registre → P&ID → plans → pack → interfaces → CE → articles → nomenclature) | 2 à 4 |
| 3 — Les lecteurs basculent | 5 |
| 4 — Retrait dans Keystone | 5 |

Chaque livraison : branche, PR fusionnée une fois la CI verte. Reste à faire : `reste-a-faire/ingenium.json` dans Norma
(page « Suivi Atrium », https://claude.ai/artifact/Rs7kooJdowShdYUqNS8jQf) ; Ingenium ne tient pas de liste propre.

## Mise en service (à faire par le propriétaire, avec Matrix et Clavis)

1. **Coolify** : créer l'application `ingenium` (type Dockerfile, dépôt `Yhumiii27/Ingenium`, branche `main`), domaine
   `ingenium.projectdirection.fr` (supposé sur le modèle des autres outils), authentification HTTP de Coolify pendant la
   bêta, comme Modulus. Variables : `docs/DELIVERY-1.md` § 3.
2. **Matrix** : rôle `ingenium_app` et schéma `ingenium` sur le serveur commun, liens de lecture (brouillon DI-M1).
3. **Clavis** : application `ingenium`, rôles `Ingenium.*`, profils, client OpenID Connect (brouillon DI-C1).
