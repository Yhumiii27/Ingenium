# 03 — Menus et écrans

> Tronc commun des menus : décision du propriétaire du 27 novembre 2026, `norma/charte/COQUE.md` § 2 bis (Norma 3.1.0 y
> porte la ligne d'Ingenium). Contenu par défaut : ING-23 (Accueil), ING-24 (menus propres), ING-25 (Mes tâches).

## 1. Coque

Coque commune de Norma : barre latérale (marque `ToolLogo code="ingenium"`, recherche de pages ⌘K, tronc commun, sections
par thème), en-tête de page (fil d'Ariane sans « Ingenium », titre, recherche globale, actions — la principale la plus à
droite, « Actions » au-delà de trois —, cloche, paire FR / EN sur sombre / clair en dernier), barre supérieure et tiroir
jusqu'à 1024 px. Tout formulaire s'ouvre dans un panneau latéral, fermé au succès. Interface web seule au démarrage.

## 2. Tronc commun

| # | Entrée | Icône | Chemin | Contenu dans Ingenium |
| --- | --- | --- | --- | --- |
| 1 | **Accueil** — « Ma discipline » | `House` | `/` | entrées attendues bloquantes, livrables à diffuser cette semaine, contrôles de cohérence ouverts, repères P&ID non rattachés, articles à valider, clés d'ECO attendues ; puis une carte par projet de l'équipe (avancement des livrables, couverture P&ID, pack ingénierie) ; encart « À traiter » vers Mes tâches |
| 2 | **Mes tâches** — liste, kanban, calendrier | `CheckSquare` | `/my/tasks` | tâches d'Ingenium calculées depuis ses objets (entrée à confirmer, contrôle à fermer, livrable à produire ou à diffuser, liste à générer, repère à rattacher, article à compléter), plus des tâches libres ; **liste** groupée et triable, **kanban** par état (à faire, en cours, en attente, fait — déplacement seulement par une transition de l'outil propriétaire), **calendrier** mois / semaine par échéance (date de besoin d'une interface, jalon du livrable lu dans Keystone) ; puis les tâches de toute la suite par `matrix.pub_taches` |
| 3 | **Mes approbations** | `Stamp` | `/my/approvals` | validation d'articles, proposition de diffusion d'un livrable, étape de validation P&ID, clé « responsable ingénierie » d'ECO (décision déposée chez Vigie), étapes de circuit Codex des livrables ; puis les approbations de toute la suite |
| 4 | **Mes projets** | `FolderUser` | `/my/projects` | projets dont la personne fait partie de l'équipe d'ingénierie (lus dans Keystone), avancement par discipline |
| 5 | **Référentiel technique** | `Gear` | `/reference` | articles, structures, plans, recherche technique |

Pastilles de Mes tâches et Mes approbations : tâches et approbations ouvertes de la personne **dans toute la suite**.
Composants de la charte : `BaseNav`, `MyTasks`, `MyApprovals` (`@norma/charte/ds`).

## 3. Sections par thème

| Section | Écrans |
| --- | --- |
| **Projet** (sélecteur de projet, comme Keystone) | Synthèse · Process · Mécanique · Électrique · Automatisme · P&ID · Nomenclature · Interfaces · Pack ingénierie · Dossier technique CE · Revues de conception (si ING-15) · Charge (lecture, si ING-17) |
| **Référentiel technique** | Articles · Structures · Pièces d'usure et de rechange · Plans (PDM) · Modifications techniques (lecture de Vigie, lien profond) |
| **Administration** | Disciplines et référents · Règles de cohérence · Outils d'import et correspondances · Listes types du pack · Listes CE · Activité et intégrations |

## 4. Écrans principaux

| Écran | Ce qu'on y fait |
| --- | --- |
| Synthèse du projet | matrice « qui attend quoi » entre disciplines, avancement des livrables par discipline, contrôles ouverts, changements récents et leur impact, carte du pack |
| Discipline | entrées consommées (document, discipline d'origine, révision figée ou diffusée), livrables jusqu'à la diffusion, listes générées (bloquée → prête, calculé), contrôles de la discipline, assistant d'import (outil source, correspondance des colonnes, écarts, « figer cette révision comme entrée ») |
| P&ID | repères d'une feuille, périmètre (client / projet / surcouche), rattachement à un article validé, étapes jusqu'au bon pour construction, import d'une liste de repères (plan d'import avant écriture), écart de révision avec Codex |
| Nomenclature | liste à plat, arbre d'assemblage, cas d'emploi, comparaison de révisions, rattachement à un équipement, écart avec la BOM vendue (ING-08) ; sans prix (les prix restent dans Keystone) |
| Articles | fiche article (données techniques, révision, statut, équivalents, structure, plans liés, ECO), « Demander une modification » (ECR chez Vigie), validation |
| Plans | miroir du coffre PDM / 3DX (numéro, titre, révision, état, article lié), « Ouvrir dans PDM », état de la synchronisation (simulée tant que la DSI n'a pas validé le connecteur) |
| Interfaces | `IF-nn` : côté, autre partie, donnée attendue, date de besoin, reçue le, état, responsable |
| Pack ingénierie | complétude par famille (poids, minimum), pièces attendues, publication pour Arche |
| Dossier technique CE | exigences essentielles, rubriques du dossier technique, un dossier par équipement, études de Vigie liées |

## 5. Ce que Keystone garde, en écrans (ING-27)

| Écran Keystone | Après la transition |
| --- | --- |
| Synthèse, disciplines, P&ID | retirés de la navigation ; la fiche projet montre l'avancement lu dans `ingenium.pub_avancement_ingenierie` et « Ouvrir dans Ingenium » |
| Articles | lecture des articles d'Ingenium + données d'achat et de stock de Keystone ; « Nouvel article » devient « Demander un article » (API d'Ingenium) |
| Nomenclature projet | lecture de la nomenclature d'Ingenium avec les colonnes de Keystone (prix, commandé, manquant, stock) |
| Plans, Interfaces, CE | retirés ; lien depuis la fiche article ou la fiche projet |
| Types de machines | inchangé, sans la carte « Pack ingénierie » |
| Modifications techniques | inchangé (miroir de Vigie), sans la clé « responsable ingénierie » |
