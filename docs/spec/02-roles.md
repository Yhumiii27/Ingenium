# 02 — Rôles et droits

> Réponse par défaut d'ING-19 (rôles), ING-20 (diffusion) et ING-22 (code projet affiché).

## 1. Rôles (donnés dans Clavis, lus dans `clavis.pub_acces`, cumulables)

| Rôle Ingenium | Clé Clavis | Qui | Droits principaux |
| --- | --- | --- | --- |
| Responsable ingénierie | `Ingenium.EngineeringLead` | responsable du bureau d'études (rôle `englead` de Keystone aujourd'hui) | tout le périmètre ; valide les articles, ferme les contrôles, propose la diffusion, clé « responsable ingénierie » des ECO |
| Ingénieur de discipline | `Ingenium.Engineer` | ingénieurs process, mécanique, électrique, automatisme | sa discipline sur les projets de son équipe : entrées, livrables, imports, contrôles, nomenclature, repères P&ID |
| Projeteur / dessinateur | `Ingenium.Designer` | projeteurs, dessinateurs | articles (création, données techniques), plans, nomenclature ; pas de diffusion |
| Gestionnaire documentaire d'ingénierie | `Ingenium.DocumentController` | si la fonction existe | dépôts vers Codex, suivi des révisions |
| Lecteur | `Ingenium.Reader` | chefs de projet, qualité, achats, logistique, direction de portefeuille | lecture ; décisions qui leur reviennent par « Mes approbations » |
| Administrateur | `Ingenium.Admin` | DSI, responsable ingénierie | disciplines, règles de cohérence, outils d'import, listes types du pack et CE |

Alternatives d'ING-19 : trois rôles seulement (responsable, ingénieur, lecteur) ; ou un « responsable de discipline » en
plus par discipline.

## 2. Portée

- Par **projet** : l'équipe nommée du projet, lue dans `keystone.pub_affectations` ; un responsable ingénierie voit tous
  les projets de son périmètre.
- Par **discipline** : un ingénieur écrit dans sa discipline et lit les autres.
- Un objet hors périmètre est un **404** (Norma § 6) ; le contrôle se fait dans la couche d'accès aux données.
- Lecture impossible de `clavis.pub_acces` = refus ; un rôle retiré dans Clavis vaut à la page suivante.

## 3. Décisions sensibles

| Décision | Qui | Où elle fait foi |
| --- | --- | --- |
| Diffusion d'un livrable | proposée par le responsable ingénierie ; étapes du circuit du type de document dans Codex, dont celle du chef de projet (ING-20) | Codex |
| Validation d'un article | responsable ingénierie (refusée sans code HS, contrôle export, délai, référence fabricant) | Ingenium |
| Article périmé ou obsolète | seulement par un ECO libéré dans Vigie | Vigie |
| Clé « responsable ingénierie » d'un ECO | responsable ingénierie, déposée par `vigie.pub_signaler_avancement_eco` | Vigie |
| Bon pour construction d'une feuille P&ID | responsable ingénierie, après toutes les étapes | Ingenium |

## 4. Code projet affiché

Les bureaux d'études utilisent le code `#000`, l'analytique le code de Keystone. Par défaut (ING-22) Ingenium affiche
d'abord le code des bureaux d'études, puis celui de Keystone ; la clé d'échange entre outils reste le code de Keystone
publié dans `keystone.pub_projets`.
