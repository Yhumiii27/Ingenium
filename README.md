# Ingenium

Outil des équipes d'ingénierie de la suite Atrium (process, mécanique, électrique, automatisme) : registre d'ingénierie
par discipline, validation P&ID, référentiel technique des articles, nomenclatures d'ingénierie, plans du coffre PDM, pack
ingénierie et dossier technique. Il reprend les éléments d'ingénierie de Keystone ; Keystone garde le pilotage du projet
(coûts, délais, achats, chantier).

État : **livraison 1 (plateforme)** construite (`docs/DELIVERY-1.md`) : connexion par Clavis, coque commune et tronc commun de
Norma, Mes tâches / Mes approbations de toute la suite, projets et équipes lus dans Keystone, tous les écrans du registre
navigables. Lire `docs/spec/00-vue-ensemble.md`, puis `docs/DECISIONS.md` et `docs/PLAN.md`.

```bash
npm ci && npm run db:local && npm run db:migrate   # .env.local : voir .env.example (PostgreSQL seul)
npm run dev                                         # http://localhost:4000 (démonstration : « Voir en tant que »)
```
Questions et reste à faire : page « Suivi Atrium » de Norma. Règles communes de la suite : `norma/REGLES.md`
(copie de Norma, contrôlée par `node norma/outils/norma.mjs verifier`).

Ports sur le Mac du propriétaire : 4000 (Ingenium), 4010 (tests). Adresse prévue : `https://ingenium.projectdirection.fr`.
