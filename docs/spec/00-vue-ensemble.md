# 00 — Vue d'ensemble d'Ingenium

> Cadrage du 27 novembre 2026 (livraison 0). Rien n'est construit. Chaque choix qui n'est pas encore décidé est la
> **réponse par défaut** d'une question `ING-nn` (`docs/DECISIONS.md`), appliquée tant que le propriétaire n'a pas répondu
> sur la page « Suivi Atrium ». Inventaire de départ : `docs/ANALYSE-KEYSTONE.md`.

## 1. Pourquoi

Décision du propriétaire (27 novembre 2026) : « Nous allons sortir certains éléments d'ingénierie de Keystone pour faire un
soft dédié aux équipes d'ingénierie. » L'outil s'appelle **Ingenium** (ING-01, même jour).

Keystone porte aujourd'hui onze écrans d'ingénierie, environ 35 tables et quatre vues `pub_` lues par d'autres outils.
Mais un seul de ses rôles est propre à l'ingénierie (`englead`, le responsable ingénierie) : les ingénieurs de discipline,
projeteurs et dessinateurs y sont de simples membres et ne voient **aucun** écran d'ingénierie. Les personnes qui
produisent l'ingénierie n'ont pas d'outil pour elle ; Keystone, lui, doit rester l'outil du pilotage du projet (coûts,
délais, achats, chantier).

## 2. Ce que fait Ingenium

Ingenium est l'outil **des bureaux d'études** (process, mécanique, électrique, automatisme) :

1. le **registre d'ingénierie** par discipline : ce que chaque discipline attend des autres et à quelle révision (entrées),
   ce qu'elle produit jusqu'à la diffusion (livrables, fiches de Codex), les listes générées pour le service suivant, les
   contrôles de cohérence entre disciplines, les changements et leur impact, l'assistant d'import des listes ;
2. la **validation P&ID** : feuilles, repères, rattachement de chaque repère à un article validé, étapes jusqu'au bon pour
   construction ;
3. le **référentiel technique des articles** : données techniques, statut et révision, équivalents, structures
   d'assemblage, pièces d'usure et de rechange, validation par l'ingénierie ;
4. la **nomenclature d'ingénierie** de chaque projet, rattachée aux équipements du projet ;
5. le **miroir des plans** du coffre PDM / 3DEXPERIENCE et son connecteur ;
6. le **pack ingénierie** (complétude mesurée, lue par Arche pour le jalon G2), le **registre des interfaces** techniques,
   le **dossier technique et la conformité CE**, et, si le propriétaire le retient, les **revues de conception**.

## 3. Ce qu'Ingenium ne fait pas

| Sujet | Tenu par |
| --- | --- |
| Planning, heures, budget et coûts, contrat, achats (prix, manquants, commandes), stock, livrables client et PV, ITP et réserves, mise en service, parc installé et SAV, types de machines comme modèles de projet | Keystone |
| Fichiers (plans PDF, schémas, notes de calcul), types de documents et circuits d'approbation | Codex |
| Demandes et ordres de modification (ECR / ECO), études de sécurité des procédés | Vigie (décision CV-06) |
| Machines standard, options, BOM standard, prix de vente, configurations vendues | Modulus |
| Expéditions, colisage | Vector |
| Essais R&D | Crucible |
| Personnes, droits, connexion | Clavis |
| Sites, filiales, publications, liens entre outils | Matrix |

## 4. Qui l'utilise

Responsables ingénierie, ingénieurs de discipline, projeteurs et dessinateurs, gestionnaire documentaire d'ingénierie ; en
lecture, chefs de projet, qualité, achats, logistique et direction (`02-roles.md`). Les droits sont donnés dans Clavis et
lus dans `clavis.pub_acces` ; Ingenium applique en plus un périmètre par projet et par discipline.

## 5. Place dans la suite Atrium

| Champ du registre de Norma | Valeur |
| --- | --- |
| Code, schéma | `ingenium` |
| Rôle PostgreSQL | `ingenium_app` (créé par Matrix) |
| Dépôt | `Yhumiii27/Ingenium` |
| Ports (Mac du propriétaire) | 4000 (développement), 4010 (tests) |
| Adresse | `ingenium.projectdirection.fr` (application Coolify, comme les autres outils) |
| Connexion | Clavis : `ENTRA_ISSUER`, `INGENIUM_ACCESS_FROM_CLAVIS=on` |
| Langue des commits | anglais |
| Logo | `ToolLogo code="ingenium"` (Norma 3.1.0) |

Pile : Next.js 16, Drizzle, PostgreSQL seul, Vitest ; socle copié de Modulus (ING-28) ; coque commune et tronc commun des
menus de Norma. **Interface web seule** au démarrage ; des applications locales viendront plus tard.

## 6. Documents du cadrage

| Fichier | Contenu |
| --- | --- |
| `01-perimetre.md` | ce qui sort de Keystone, ce qui y reste, ce qui est nouveau ; frontière objet par objet |
| `02-roles.md` | rôles, clés Clavis, portée |
| `03-menus-ecrans.md` | tronc commun (Accueil « Ma discipline », Mes tâches, Mes approbations, Mes projets, Référentiel technique), sections et écrans |
| `04-modele-donnees.md` | grandes lignes du modèle de données |
| `05-echanges.md` | vues `pub_` lues et publiées, écritures entre outils |
| `06-transition.md` | phases de la sortie de Keystone, risques |
| `../DECISIONS.md` | décisions prises, questions ouvertes et réponses par défaut |
| `../PLAN.md` | livraisons |
| `../DEMANDES.md` | brouillons de demandes aux autres outils |
| `../DONNEES.md` | données attendues du propriétaire |
| `../ANALYSE-KEYSTONE.md` | inventaire détaillé de l'existant dans Keystone |
