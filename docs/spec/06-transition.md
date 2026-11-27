# 06 — Transition hors de Keystone

> Cadrage du 27 novembre 2026, rien n'est construit. Modèle : la transition du catalogue de Keystone vers Modulus
> (`docs/spec/05-echanges.md` § 4 de Modulus) et celle des expéditions vers Vector. Périmètre par défaut :
> `01-perimetre.md`. Les phases ci-dessous correspondent aux livraisons de `docs/PLAN.md`.

## 1. Principes

1. **Une seule source par objet** à tout moment : Keystone jusqu'à la bascule de l'objet, Ingenium ensuite. La date de
   bascule de chaque objet (registre, P&ID, articles, nomenclature, plans, pack, interfaces, CE) est notée dans le journal
   des deux outils et dans `reste-a-faire/<outil>.json` de Norma.
2. **Lecture par les vues `pub_` seulement** (M-17, M-18) : Ingenium lit Keystone par des vues définies par Matrix ;
   jamais par ses tables. Les vues de reprise sont **temporaires** (un seul lecteur : `ingenium_app`) et retirées après
   l'import (ING-26).
3. **Migrations jamais modifiées** : Keystone ne touche aucune migration appliquée. Les tables d'ingénierie de Keystone
   restent en place tant qu'une vue `pub_` les lit ; leur retrait se fait par **une nouvelle migration**, après que Matrix
   a retiré ou fait évoluer la vue qui en dépend (sinon la migration échoue : la vue appartient à `matrix_gestion`).
4. **Contrats publiés conservés** : `ingenium.pub_articles`, `pub_nomenclatures` et `pub_pack_ingenierie` reprennent
   **exactement** les colonnes des vues de Keystone, dans le même ordre, colonnes nouvelles en fin ; un lecteur bascule en
   changeant seulement le schéma. Un changement incompatible passe par une vue `…_v2`.
5. **Les identifiants métier ne changent pas** : références d'articles `ART-…`, numéros de plans, repères P&ID, numéros
   `IF-nn`, numéros de livrables (fiches de Codex), codes projet de Keystone. L'`id` technique de Keystone est gardé en
   alias (`keystone_id`) pour le journal de reprise, jamais publié.
6. **Import unique et journalisé** par objet, rejouable à blanc (« ce qui serait importé ») puis appliqué une fois ;
   chaque ligne importée porte son origine (`source = 'keystone'`, date d'import) ; un écart est un refus motivé, jamais un
   écrasement.
7. **Rien d'écrit chez Keystone par Ingenium** : Keystone lit Ingenium ; une demande de Keystone (ex. article à créer)
   passe par l'API d'Ingenium.
8. Pendant la transition, **aucune nouvelle fonction d'ingénierie dans Keystone** (ING-03) : les points R-035, R-101,
   R-102, R-106, R-107, R-108, R-109, R-111, R-214 sont construits dans Ingenium.

## 2. Phases

Échelle d'effort (pour `echelle_effort` de `reste-a-faire/ingenium.json` dans Norma) : **S** ≤ 2 jours de session, **M** 3 à 5,
**L** 6 à 10, **XL** > 10. Chaque phase va sur `main` par une PR par dépôt touché, fusionnée CI verte.

### Phase 0 — Décisions et mise en place (effort S)

| Qui | Quoi |
| --- | --- |
| Propriétaire | nom (ING-01) et dépôt `Yhumiii27/ingenium` (ING-02) **faits le 27 novembre 2026** ; répond aux questions de la page « Suivi Atrium » (périmètre, équipe pilote, calendrier) ; crée l'application Coolify `ingenium.projectdirection.fr` |
| Norma | **fait en 3.1.0** : ligne du registre, tableau § 1 de `REGLES.md`, logo et `ToolLogo`, tronc commun des menus, `reste-a-faire/ingenium.json`, ING-01 et ING-02 décidées |
| Matrix | rôle `ingenium_app`, schéma `ingenium` (créé par Matrix, aucune migration ne crée de schéma) dans la base commune ; liens de lecture de la phase 1 |
| Clavis | application `ingenium` : catalogue de rôles (`ROLE_CATALOGUE`, `KNOWN_APPS` de `src/domain/app-roles.ts`), correspondance des niveaux, profils (ingénieur, projeteur), `npm run oidc:client -- ingenium <adresse de retour>` |
| Ingenium | socle copié de Modulus (`docs/SOCLE.md`), `CLAUDE.md` (`@norma/REGLES.md`), `norma.config.json`, `docs/spec/00`–`06`, `docs/DECISIONS.md`, `docs/PLAN.md`, `docs/DEMANDES.md`, `docs/DONNEES.md` (livraison 0) ; questions sur la page « Suivi Atrium », pas de questionnaire propre |

### Phase 1 — Ingenium lit Keystone (effort L)

Ingenium est construit sur un jeu de démonstration fictif aligné sur celui de Keystone (HLT-026, NDC-031…), puis lit
Keystone en vrai.

| Qui | Quoi |
| --- | --- |
| Ingenium | livraisons 1 (coque, menus de base, Accueil, Mes tâches liste / kanban / calendrier, Mes approbations, droits par Clavis, Mes projets) puis, objet par objet, les écrans des livraisons 2 à 4 (registre d'ingénierie et disciplines, P&ID, plans ; référentiel technique, nomenclature ; pack, interfaces, CE) d'abord en **lecture** des données de Keystone |
| Keystone | publie (requêtes de référence fournies à Matrix, aucune vue dans une migration) les **vues de reprise** temporaires : `keystone.pub_reprise_registre_ingenierie` (entrées, livrables, contrôles, listes, changements, imports, disciplines, règles), `pub_reprise_pid` (feuilles, repères, étapes), `pub_reprise_articles` (toutes les colonnes de `parts` sauf prix, équivalents, liens d'assemblage, listes de rechange), `pub_reprise_nomenclatures` (lignes avec périmètre, activité, équipement, note ; racines ; comparaisons), `pub_reprise_plans`, `pub_reprise_pack`, `pub_reprise_interfaces`, `pub_reprise_ce` ; et la vue durable `pub_equipements_projet` (R-185) |
| Matrix | définit et applique ces vues ; liens de lecture `ingenium_app` → `keystone.pub_projets`, `pub_affectations`, `pub_jalons_projets`, `pub_activites`, `pub_articles`, `pub_nomenclatures`, `pub_pack_ingenierie`, `pub_reprise_*` ; `codex.pub_documents` ; `vigie.pub_ordres_modification`, `pub_eco_approbations`, `pub_eco_effectivite`, `pub_etudes_securite` ; `modulus.pub_catalogue_machines` ; `clavis.pub_acces`, `pub_personnes` ; `matrix.pub_sites`, `pub_filiales` |
| Pilote | l'équipe pilote (ING-21) utilise Ingenium **en lecture** à côté de Keystone ; retours notés dans `docs/RETOURS-PILOTE.md` |

Sortie de phase : les écrans d'Ingenium montrent, pour les projets du pilote, exactement ce que montre Keystone
(contrôle automatisé : mêmes nombres d'entrées, livrables, contrôles, repères, lignes, couvertures et pack).

### Phase 2 — Ingenium reprend les écritures (effort XL, par objet)

Ordre proposé, du moins couplé au plus couplé : **registre d'ingénierie et disciplines** → **P&ID** → **plans** → **pack** →
**interfaces** → **dossier CE** → **articles** → **nomenclature**.

Pour chaque objet :

| Étape | Qui | Quoi |
| --- | --- | --- |
| a | Ingenium | import unique et journalisé depuis la vue de reprise (à blanc, puis appliqué) |
| b | Keystone | l'écran de l'objet passe en **lecture seule** avec le bandeau « Tenu dans Ingenium depuis le … » et le lien profond ; ses Server Functions d'écriture refusent (« tenu dans Ingenium ») ; aucun changement de schéma |
| c | Ingenium | écritures ouvertes ; journal d'audit en ajout seul ; dépôts Codex par `POST /api/documents` |
| d | Matrix | publie la vue durable d'Ingenium de l'objet (`ingenium.pub_articles`, `pub_nomenclatures`, `pub_pack_ingenierie`, `pub_plans`, `pub_avancement_ingenierie`) |

Cas particuliers :

- **Articles** : Keystone garde dans ses tables les **données d'achat** (`part_last_prices`, prix catalogue d'achat) et le
  stock, rattachés par la référence ; les colonnes techniques de `parts` ne sont plus écrites par Keystone (lecture seule
  dans l'écran), puis alimentées par la lecture de `ingenium.pub_articles` (miroir dans Keystone, écrit seulement par le
  connecteur `src/server/integrations/ingenium/`). Si A-1b désigne 3DX comme maître, Ingenium porte le connecteur 3DX et le
  fichier XML (R-214) ; Keystone n'en sait rien.
- **Nomenclature** : c'est l'étape la plus risquée (8 lecteurs internes, § 2.4 d'`docs/ANALYSE-KEYSTONE.md`). Keystone remplace l'écriture
  de `project_bom_lines` par un **miroir** alimenté depuis `ingenium.pub_nomenclatures` (connecteur, toutes les 15 minutes et
  à la demande), sans changer la forme lue par `dal/purchasing.ts`, `dal/budget.ts`, `dal/fleet.ts`, l'écran Expéditions.
  Les tests dorés de Keystone (`src/features/bom/bom.golden.json`, `src/domain/bom.test.ts`) doivent passer à l'identique
  sur le miroir. R-185 (multi-équipements) doit être tranché **avant** cette étape.
- **Clé « englead » des ECO** : Ingenium dépose la décision par `vigie.pub_signaler_avancement_eco` (Vigie ajoute
  `ingenium_app` à `inbound_callers`, Matrix accorde l'exécution) ; Keystone retire la clé « englead » de « Mes approbations »
  (garde la clé « pm »).
- **Diffusion d'un livrable** : le circuit de Codex fait foi (R-106, P-7c) ; si la validation reste au CP (ING-20), le CP la
  donne depuis « Mes approbations » de Keystone (tâche publiée par Ingenium, décision par l'API d'Ingenium — proposition
  Norma TA, phase 4) ou en ouvrant Ingenium.

### Phase 3 — Les lecteurs basculent vers Ingenium (effort M)

| Lecteur | Ce qui change | Dépôt |
| --- | --- | --- |
| Arche | `keystone.pub_pack_ingenierie` → `ingenium.pub_pack_ingenierie` (colonnes identiques ; critère G2) | PR dans Arche |
| Vigie | `keystone.pub_articles`, `pub_nomenclatures` → `ingenium.pub_articles`, `pub_nomenclatures` (effectivité des ECO, `src/server/integrations/keystone/views.ts` → `…/ingenium/views.ts`, contrats `test/fixtures/contracts/`) ; `ingenium_app` dans `inbound_callers` | PR dans Vigie |
| Modulus | `keystone.pub_articles` → `ingenium.pub_articles` (BOM préfaites, D-5) ; structure par `pub_structures_articles` | PR dans Modulus |
| Vector | `keystone.pub_nomenclatures`, `pub_articles` → vues d'Ingenium (contrôle colisage) | PR dans Vector |
| Keystone | connecteur `src/server/integrations/ingenium/` (miroirs en lecture des articles, de la nomenclature, de l'avancement, du pack) ; « source indisponible » affichée, jamais une erreur de page (Norma § 5) | PR dans Keystone |
| Matrix | liens de lecture des nouveaux lecteurs ; registre des publications | PR dans Matrix |

### Phase 4 — Retrait dans Keystone (effort M)

| Qui | Quoi |
| --- | --- |
| Matrix | retire `keystone.pub_articles`, `pub_nomenclatures`, `pub_pack_ingenierie` **quand plus aucun lien de lecture n'en dépend**, et les vues `pub_reprise_*` dès la fin de chaque import |
| Keystone | retire de la navigation Synthèse, disciplines, P&ID, Plans, Interfaces (et CE selon ING-11) ; la fiche projet garde l'avancement lu ; une **nouvelle migration** supprime les tables devenues inutiles (`eng_*`, `pid_*`, `drawings`, `drawing_revisions`, `pdm_vault_syncs`, `machine_type_pack_families`, `project_interfaces`, `ce_*`) ou les garde en archive selon ING-27, après la sauvegarde ; les seeds, tests dorés et scripts (`scripts/proto-golden-*.ts`, `scripts/db-check.ts`, `share-contracts.ts`) sont mis à jour avec la référence de la décision |
| Norma | `reste-a-faire/keystone.json` : points transférés marqués « transféré vers Ingenium » ; historique |

## 3. Ce que chaque dépôt doit changer

| Dépôt | Phase | Changements |
| --- | --- | --- |
| **Ingenium** | 0–3 | tout l'outil ; connecteurs `src/server/integrations/{keystone,codex,vigie,modulus,clavis,matrix}/` ; requêtes de référence de ses publications `src/server/publications/definitions.ts` (aucune vue `pub_` dans ses migrations) ; API `/api/v1/` pour Keystone |
| **Keystone** | 1–4 | requêtes de référence des vues de reprise et de `pub_equipements_projet` (fournies à Matrix) ; écrans en lecture seule objet par objet ; connecteur Ingenium et miroirs ; retrait de la clé « englead » ; retrait final par nouvelle migration ; `CLAUDE.md` (frontière, tableau « System boundaries ») |
| **Matrix** | 0–4 | rôle et schéma ; vues de reprise puis vues d'Ingenium (écran « Publications ») ; liens de lecture et d'exécution ; retrait des vues de Keystone |
| **Norma** | 0, 4 | registre, `REGLES.md` § 1, logo, `reste-a-faire/ingenium.json` (fait en 3.1.0) ; en phase 4, points de `keystone.json` marqués transférés ; page de suivi republiée |
| **Clavis** | 0 | application, rôles, profils, client OpenID Connect |
| **Codex** | 2 | client d'API pour le dépôt par Ingenium (`POST /api/documents`), lien de lecture `codex.pub_documents` ; éventuellement l'application « Ingenium » comme origine d'un document |
| **Vigie** | 2–3 | `ingenium_app` appelant de `pub_signaler_avancement_eco` (et d'une fonction de création d'ECR) ; lecture des articles et nomenclatures dans Ingenium ; lien profond « Ouvrir dans Ingenium » depuis un article d'ECO |
| **Modulus** | 3 | lecture des articles et structures dans Ingenium ; publication d'une vue de BOM standard lue par Ingenium (si ING-08 = défaut) |
| **Vector** | 3 | lecture de la nomenclature et des articles dans Ingenium |
| **Arche** | 3 | lecture du pack dans Ingenium |
| **Crucible**, **Cursus** | — | rien (Crucible : plus tard, ING-18) |

## 4. Risques

| Risque | Effet | Parade |
| --- | --- | --- |
| Deux sources pour un même objet pendant la transition | données divergentes, ECO proposés sur une mauvaise nomenclature | bascule **par objet**, écrans en lecture seule dans Keystone le jour de la bascule, contrôle automatisé de l'égalité des nombres |
| Nomenclature : Keystone en dépend pour ses achats, son budget, son parc, le colisage | régression sur les manquants à commander, la valorisation, la configuration livrée | miroir de même forme, tests dorés de Keystone inchangés, bascule en dernier |
| A-1b (3DX maître ?) et D9-18 (fichier XML) non tranchés | refonte du référentiel après coup | trancher avant la phase 2 « articles » ; Ingenium porte le connecteur quelle que soit la réponse |
| R-185 (projets multi-équipements) non tranché | nomenclature et pack à refaire | le modèle d'Ingenium rattache dès le départ chaque ligne, repère et livrable à un **équipement** du projet |
| Livraison 9 de Keystone en cours | conflits sur les mêmes fichiers, double travail | gel des fonctions d'ingénierie dans Keystone dès la décision (ING-03) ; seuls les changements de transition y sont faits |
| Contrats `pub_` cassés | Arche, Vigie, Modulus, Vector en panne | colonnes identiques, nouvelles en fin, `…_v2` sinon ; contrats testés dans chaque lecteur |
| Les ingénieurs n'ouvrent pas un outil de plus | adoption faible | Mes tâches / Mes approbations de toute la suite (proposition Norma TA), liens profonds dans les deux sens, pilote d'abord |
| Règlement Machines au 20 janvier 2027 | dossier CE en retard si sa transition glisse | le module CE ne bascule qu'une fois prêt ; sinon il reste dans Keystone jusqu'après l'échéance (ING-11) |
| Droits : rôle `englead` de Keystone ≠ rôles d'Ingenium | accès refusés ou trop larges | rôles d'Ingenium dans Clavis dès la phase 0, profils « ingénieur » et « projeteur » ; lecture impossible de `clavis.pub_acces` = refus |
| Données de démonstration non alignées | essais faussés entre outils | jeu fictif d'Ingenium bâti sur les mêmes codes que celui de Keystone (HLT-026…), comme Arche (`keystone-demo.ts`) |
| Connecteurs externes (PDM, 3DX, EPLAN, TIA) non validés par la DSI | fonctions simulées plus longtemps | simulation honnête (état « simulé » affiché), aucune donnée hors du serveur sans accord (Norma § 9) |

## 5. Calendrier indicatif

| Phase | Effort | Dépend de |
| --- | --- | --- |
| 0 | S | ING-01, ING-02 (faites), ING-03 ; rôle, schéma et application Clavis |
| 1 | L | phase 0 ; vues de reprise publiées par Matrix |
| 2 registre, P&ID, plans, pack, interfaces | L | phase 1 ; R-106 (circuit Codex) pour la diffusion |
| 2 CE | M | ING-11 ; échéance du 20 janvier 2027 |
| 2 articles | L | A-1b, D9-18 |
| 2 nomenclature | L | R-185 ; articles basculés |
| 3 | M | vues d'Ingenium publiées |
| 4 | M | plus aucun lecteur des vues de Keystone |
