@norma/REGLES.md

The line above imports the suite's common rules (Norma, versioned copy in `norma/`, `norma/VERSION`): they change in the
`Yhumiii27/Norma` repository only, never here (`node norma/outils/norma.mjs verifier` refuses a modified copy). The rules
below are Ingenium's own.

# Ingenium — instructions for Claude sessions

Ingenium is the tool of the **engineering teams** (process, mechanical, electrical, automation): what each discipline
expects from the others and at which revision, what it produces up to release, the consistency checks between
disciplines, the P&ID and its tags, the technical reference of parts and their structures, the engineering bill of
materials of each project, the drawings of the PDM vault, the completeness of the engineering pack and the machine
technical file. It is built by taking the engineering elements out of Keystone (owner, 27 Nov 2026).

## Where the project stands

- **Delivery 0 (framing) is done** (27 Nov 2026): `docs/spec/00`–`06`, `docs/DECISIONS.md` (decisions taken and open
  questions with their default answer), `docs/PLAN.md`, `docs/DEMANDES.md` (drafts to the other tools: nothing is sent
  without the owner's « validé »), `docs/DONNEES.md` (data expected, ING-D1 to ING-D5), `docs/ANALYSE-KEYSTONE.md`.
- **Delivery 1 (platform) is built** (27 Nov 2026, owner: « oui lance 1 »; `docs/DELIVERY-1.md`, `docs/SOCLE.md`): platform
  from Modulus (`0204c68` + `61048a8`), PostgreSQL only, schema `ingenium` (`src/server/db/schema/`: platform tables,
  `disciplines`, mirrors `project_mirror` / `team_mirror` written only by the Keystone connector, `sync_runs`), migrations
  `drizzle/` (audit trail append-only by trigger), sign-in through Clavis and roles read in `clavis.pub_acces`
  (`INGENIUM_ACCESS_FROM_CLAVIS`, fail closed; demo « View as »), roles `src/config/roles.ts` (Clavis keys
  `Ingenium.EngineeringLead`, `Engineer`, `Designer`, `DocumentController`, `Reader`, `Admin`), rights and project scope
  `src/domain/rights.ts` + `src/server/dal/projects.ts` (outside the scope = 404; ING-29 / ING-30: every role reads the projects
  in progress, « My projects » = the team Keystone publishes, a project confidential in Keystone is seen by its team only —
  rule `src/domain/confidential.ts`, applied in SQL by `projectVisibility`; Ingenium keeps no confidentiality flag nor member
  list of its own, request DI-K5), common shell of Norma 3.1 with the common
  block `BaseNav` (Home « Ma discipline », My tasks, My approvals, My projects, Technical reference), sections Project
  (project switcher) / Technical reference / Administration; screen registry `src/config/screens.ts` (screens of later
  deliveries are navigable placeholders, `src/config/screen-content.ts`); My tasks / My approvals with the charter's
  `MyTasks` / `MyApprovals` on `matrix.pub_taches` (`INGENIUM_SUITE_TASKS` off | simulation | views,
  `src/server/integrations/matrix/tasks.ts`); Keystone connector (`INGENIUM_KEYSTONE`, `src/server/integrations/keystone/`,
  job `keystone-sync`, « Read Keystone now » on `/admin/activity`); API skeleton `/api/v1/` (`src/domain/api.ts`); reference
  query `ingenium.pub_journal` (`src/server/publications/definitions.ts`, no `pub_` view in a migration); demo data set
  `INGENIUM_SEED=demo` (Keystone's demo project codes HLT-026, NDC-031, EWA-051, PRS-038, WSA-044, and the confidential R&D project RDP-072; people of demo.example).
  Next: delivery 2 (engineering register, P&ID, drawings) once ING-04, ING-05, ING-09, ING-20, ING-21, ING-26 are answered.
- Decided (27 Nov 2026): name **Ingenium** (ING-01), repository `Yhumiii27/Ingenium` created by the owner (ING-02),
  registered in Norma 3.1.0 (code `ingenium`, schema `ingenium`, role `ingenium_app`, ports 4000 / 4010, address
  `ingenium.projectdirection.fr`, logo `ToolLogo code="ingenium"`). Web only at first; local apps later.
- **Owner's questions**: Ingenium has **no questionnaire page of its own**. Its questions are in Norma's
  `decisions/ingenium.json`, shown on the suite's single tracking page « Suivi Atrium »
  (https://claude.ai/artifact/Rs7kooJdowShdYUqNS8jQf, tab « À décider »; answers in the page's database, collection
  `answers`). Before each delivery read the answers, apply them to `docs/DECISIONS.md` and to `decisions/ingenium.json`.
- **Remaining work**: Norma's `reste-a-faire/ingenium.json` (same page); Ingenium keeps no list of its own. After every
  development, update it in Norma (items' state, a `history` line, `updated`), run `npm run suivi` there, open Norma's PR
  and republish the page.

## Rules specific to Ingenium

- **Keystone keeps the execution of the project**: costs, budget, schedule, hours, purchasing (prices, last price,
  shortages, spare orders, BOM valuation), stock, client deliverables and acceptance, ITP and punch list, commissioning,
  installed base and after-sales, machine types as project templates. Ingenium never writes in Keystone; Keystone reads
  Ingenium through its `pub_` views and asks through Ingenium's API (`/api/v1/`).
- **Ingenium owns the engineering registers** (once each object is switched over, `docs/spec/06-transition.md`): engineering
  register by discipline, P&ID validation, technical reference of parts, engineering BOM, drawings mirror and PDM / 3DX
  connector, engineering pack, interface register, CE technical file, design reviews if retained.
- **One source per object at any time**: Keystone until the object's switch-over, Ingenium afterwards; never two writers.
- **Published contracts are kept**: `ingenium.pub_articles`, `pub_nomenclatures` and `pub_pack_ingenierie` take exactly the
  columns of Keystone's views, in the same order, new columns at the end. Ingenium only writes reference queries
  (`src/server/publications/definitions.ts`); Matrix defines and applies the views.
- **Business identifiers never change**: part references `ART-…`, drawing numbers, P&ID tags, `IF-nn`, Codex document
  numbers, Keystone project codes.
- **ECR / ECO stay in Vigie** (CV-06): Ingenium gives the engineering lead's key and opens a request only through Vigie's
  `pub_` functions. **Codex hosts every document**: Ingenium stores no file, only Codex references, and deposits through
  `POST /api/documents`. **Modulus owns the machine catalogue**, options, standard BOM and sale prices: Ingenium reads them.
- **Every engineering line is tied to an equipment of the project** from the start (Keystone R-185, multi-equipment
  projects).
- External systems (PDM, 3DEXPERIENCE, EPLAN, TIA Portal, SolidWorks) are simulations, shown as such, until the IT
  department validates them; no data leaves the internal server.
- Demo data are fictitious and aligned on Keystone's demo set (same project codes); never a real person, company or project.
- Platform (delivery 1): copied from Modulus `main` (origin commit recorded in `docs/SOCLE.md`), never business modules;
  charte from `norma/charte` (`@norma/charte/...`), never a local copy. Next.js 16 (read `node_modules/next/dist/docs/` before
  writing code), Drizzle, PostgreSQL only, Vitest.
- The suite is called **Atrium**: never write a former name of the suite or the company's name in any file.
- Ports on the owner's Mac: **4000** (Ingenium) and **4010** (tests). Never use or kill another tool's port of Norma's
  registry.
- Commit messages in English.

## Setup and checks

```bash
npm ci && npm run db:local && npm run db:migrate   # .env.local: see .env.example (PostgreSQL only)
npx next typegen && npm run typecheck && npm run lint && npm test && npm run norma:check
npm run build && npm run test:smoke                 # against `next start --port 4010`
npm run dev                                         # http://localhost:4000 (demo: "View as")
```

- Tests get a fresh database per file (`src/test/db.ts`, `INGENIUM_TEST_ADMIN_URL`) and never drop it: never run `DROP DATABASE`.
- UI strings are English source strings translated through `src/i18n` (French by default; `completeness.test.ts`,
  `registries.test.ts`); typed text and data are shown as typed, never through `t()`.
- Every Server Function validates its input and the viewer's rights server-side; a project outside the viewer's scope is a 404.

Refresh the Norma copy from a clone of Norma: `node <Norma clone>/outils/norma.mjs copier` (records the version in
`norma/MANIFEST.json`).
