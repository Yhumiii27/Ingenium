# Ingenium — données à fournir

Le propriétaire (ou les équipes qu'il désigne) fournira ces données. Elles sont aussi sur la page « Suivi Atrium »
(questions `ingenium:ING-D1` à `ING-D5`, réponse saisie en note). Les fichiers réels ne vont pas dans Git s'ils nomment des
personnes, des clients ou des projets réels : ils se déposent dans Codex et leur référence est notée ici. **Aucun nom de
personne** : un rôle (« responsable process ») suffit.

| # | Donnée | Contenu attendu | Exemple de forme | Qui la tient sans doute | Livraison |
| --- | --- | --- | --- | --- | --- |
| ING-D1 | Disciplines, référents et effectifs | Une ligne par discipline : code, libellé, rôle du référent (pas de nom ici), nombre d'ingénieurs et de projeteurs, outils utilisés. | process ; Process ; responsable process ; 4 ingénieurs ; 2 projeteurs ; AutoCAD P&ID, Excel / … | responsable ingénierie | L2 |
| ING-D2 | Règles de cohérence entre disciplines | Une ligne par règle : disciplines concernées, ce qui est comparé, gravité (bloquante ou non). Keystone en a 6 de démonstration. | process ↔ électrique ; puissance des moteurs de la liste process = bilan de puissance ; bloquante / … | ingénieurs de discipline | L2 |
| ING-D3 | Exemples d'exports natifs (EPLAN, TIA Portal, SolidWorks, AutoCAD P&ID) | Pour construire la lecture réelle des listes (R-107) : un fichier anonymisé par outil et par type de liste, et où ils sont déposés (Codex). | EPLAN ; liste des matériels ; .xlsx ; référence Codex … / TIA Portal ; table des variables API ; .xlsx ; … | ingénieurs de discipline, projeteurs | L2 |
| ING-D4 | Liste type réelle du pack ingénierie (C-9) | Par type de machine : familles, poids (total 100 %), nombre minimal de pièces attendues. La liste actuelle est provisoire (5 familles à 20 %). | EMP ; pid 25 % (1) ; bom 25 % (1) ; layout 20 % (1) ; electrique 20 % (2) ; analyse_fonctionnelle 10 % (1) / … | responsable ingénierie, direction de portefeuille | L4 |
| ING-D5 | Fichier XML de numérotation des articles (D9-18) et système maître (A-1b) | Le fichier XML (anonymisé) ou sa structure, son emplacement sur le serveur local, et la réponse de l'ingénierie : 3DEXPERIENCE ou SolidWorks PDM attribue-t-il les numéros ? | Système maître : … / Emplacement du fichier : … / Structure : <article ref=… /> | ingénierie, DSI | L3 |

## Comment les transmettre

1. Remplir un tableau (CSV `;` ou Excel) avec les colonnes de l'exemple, ou déposer les fichiers d'origine anonymisés.
2. Le déposer dans Codex (ou le transmettre dans la session) en indiquant le numéro ING-Dn.
3. Claude contrôle le fichier (colonnes, codes, doublons), signale les écarts, puis l'utilise dans la livraison concernée
   (import journalisé, rejouable).
