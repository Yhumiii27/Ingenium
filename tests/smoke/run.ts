// Smoke test of a running Ingenium (production build, demo data set): health, the common shell of Norma (common block of the
// menus, language / display pair, one <h1>), every screen of the registry for the engineering lead, the project scope of a
// discipline engineer (404 outside it), the administration closed to the other roles, « My tasks » in its three views, the
// API skeleton, the security headers and the French rendering.
//   INGENIUM_SMOKE_URL=http://127.0.0.1:4010 npx tsx tests/smoke/run.ts
const BASE = (process.env.INGENIUM_SMOKE_URL || 'http://127.0.0.1:4010').replace(/\/+$/, '');

let failures = 0;
function check(ok: boolean, what: string): void {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures++;
}

async function get(path: string, role?: string): Promise<{ status: number; body: string; headers: Headers }> {
  const r = await fetch(BASE + path, { headers: role ? { cookie: `ingenium-role=${role}` } : {}, redirect: 'manual' });
  return { status: r.status, body: await r.text(), headers: r.headers };
}

async function main(): Promise<void> {
  const health = await get('/api/health');
  check(health.status === 200, 'GET /api/health answers 200');

  const home = await get('/', 'engineering_lead');
  check(home.status === 200 && home.body.includes('Ma discipline'), 'the home page « Ma discipline » opens in French by default');
  check(home.body.includes('#026 · HLT-026'), 'the home page shows the projects of the team (design office number first, ING-22)');
  check(home.body.includes('Bêta'), 'a discreet beta mark');
  const csp = home.headers.get('content-security-policy') ?? '';
  check(csp.includes("default-src 'self'") && csp.includes('nonce-'), 'the page carries a Content-Security-Policy with a nonce');
  check(home.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff');
  // Norma's common shell (norma/charte/COQUE.md): the language / display pair stacked, in the page header and the top bar
  // (≤ 1024 px) and never in the sidebar; the common block of the menus right under the page search.
  const prefs = home.body.match(/class="coque-prefs"/g) ?? [];
  const aside = /<aside[^>]*id="coque-sidebar"[\s\S]*?<\/aside>/.exec(home.body)?.[0] ?? '';
  check(prefs.length === 2 && home.body.includes('aria-label="Langue"') && home.body.includes('aria-label="Affichage"'), 'language over display pair, in the page header and the top bar');
  check(aside.length > 0 && !aside.includes('coque-prefs') && aside.includes('coque-pagesearch'), 'the sidebar has the ⌘K page search and no language / display pair');
  const base = /class="coque-nav coque-base-nav"[\s\S]*?<\/nav>/.exec(aside)?.[0] ?? '';
  const order = ['Accueil', 'Mes tâches', 'Mes approbations', 'Mes projets', 'Référentiel technique'].map((x) => base.indexOf(x));
  check(order.every((i, n) => i >= 0 && (n === 0 || i > order[n - 1])), 'the common block: Accueil, Mes tâches, Mes approbations, Mes projets, Référentiel technique');
  check(aside.includes('coque-logo-mark') && home.body.includes('rel="icon"'), 'Ingenium’s logo and favicon');
  check(home.body.includes('id="coque-nav-toggle"') && home.body.includes('aria-controls="coque-sidebar"'), 'menu button of the top bar (compact layout)');
  check((home.body.match(/<h1[ >]/g) ?? []).length === 1 && home.body.includes('class="coque-title"'), 'one page title <h1>');
  const crumb = /class="coque-crumb">([\s\S]*?)<\/div>/.exec(home.body)?.[1] ?? '';
  check(!crumb.includes('Ingenium'), 'the breadcrumb does not repeat the tool name');

  for (const [path, text] of [
    ['/my/tasks', 'Toute la suite'], ['/my/tasks?vue=kanban', 'En cours'], ['/my/tasks?vue=calendrier', 'Calendrier'], ['/my/approvals', 'Mes approbations'],
    ['/my/projects', 'Harbor Line Terminal Expansion'], ['/reference', 'Articles'], ['/reference/parts', 'Livraison 3'], ['/reference/drawings', 'Ouvrir dans PDM'],
    ['/projects/HLT-026', 'Équipe d’ingénierie'], ['/projects/HLT-026/pid', 'bon pour construction'], ['/projects/HLT-026/ce-file', 'Dossier technique CE'],
    ['/admin/disciplines', 'Mécanique'], ['/admin/rules', 'Règles de cohérence'], ['/admin/activity', 'keystone.pub_projets'], ['/journal', 'Exporter (CSV)'],
  ] as const) {
    const r = await get(path, 'engineering_lead');
    check(r.status === 200 && r.body.includes(text), `${path} opens for the engineering lead`);
  }
  check((await get('/projects', 'engineering_lead')).status === 307, '/projects leads to My projects');

  // Project scope (spec 02 § 2): a discipline engineer sees the projects of their team only; a project outside it is a 404.
  check((await get('/projects/HLT-026', 'engineer')).status === 200, 'a discipline engineer opens a project of their team');
  check((await get('/projects/NDC-031', 'engineer')).status === 404, 'a project outside the team is not found');
  check((await get('/projects/NDC-031/pid', 'engineer')).status === 404, 'nor any of its screens');
  check((await get('/projects/HLT-026/nothing', 'engineering_lead')).status === 404, 'an unknown project screen is not found');
  check((await get('/projects/ZZZ-999', 'engineering_lead')).status === 404, 'an unknown project is not found');
  check((await get('/admin/activity', 'engineer')).status === 404 && (await get('/journal', 'designer')).status === 404, 'the administration is closed to the other roles');
  check((await get('/admin/disciplines', 'reader')).status === 404, 'the disciplines are closed to a reader');

  const api = await get('/api/v1');
  check(api.status === 200 && api.body.includes('"api":"ingenium"'), 'the API index answers');
  check((await get('/api/v1/part-requests')).status === 404, 'an API endpoint not built yet answers 404');

  const en = await fetch(BASE + '/', { headers: { cookie: 'ingenium-role=engineering_lead; ingenium-lang=en' } }).then((r) => r.text());
  check(en.includes('My discipline') && en.includes('My tasks'), 'the English rendering');
  check((await get('/nowhere', 'engineering_lead')).status === 404, 'an unknown path is not found');
  check((await get('/sign-in')).status === 307, 'the sign-in page leads home in demo mode');

  if (failures) {
    console.error(`\n${failures} smoke check(s) failed`);
    process.exit(1);
  }
  console.log('\nSmoke test passed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
