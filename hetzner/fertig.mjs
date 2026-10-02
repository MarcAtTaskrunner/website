// Macht aus dist/ (gebaut von build.mjs) die Fassung fuer Hetzner Webhosting.
// Nur im Zweig "hetzner-version"; main und die Cloudflare-Fassung bleiben unberuehrt.
//
//     npm run build && node hetzner/fertig.mjs
//
// 1. legt hetzner/.htaccess und hetzner/api/ nach dist/ und setzt in die
//    .htaccess ein, was aus main kommt: die Adresse (aus dem Canonical der
//    Startseite, also DOMAIN in werkzeuge/bauen.py) und die
//    Content-Security-Policy (aus _headers)
// 2. nimmt _headers und _redirects heraus - die versteht nur Cloudflare
// 3. traegt in jede Seite den Nachweis fuer die Google Search Console ein,
//    den das alte WordPress im Kopf hatte
// 4. schreibt sitemap.xml und robots.txt (das alte WordPress hatte beides,
//    Google kennt die Adressen)
//
// Geaendert wird nur dist/. Keine Datei aus main wird angefasst, deshalb
// laesst sich main jederzeit ohne Konflikte in diesen Zweig uebernehmen.
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const AUS = 'dist';
const VON = 'hetzner';
// Nachweis fuer die Search Console, vom alten WordPress uebernommen
const GOOGLE_NACHWEIS = 'DD_LD71L2Ic34eI-9svxmoEBHsqIsre6G4whYGstydI';

function abbruch(text) {
  console.error('FEHLER:', text);
  process.exit(1);
}

async function dateien(ordner) {
  const aus = [];
  for (const e of await readdir(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) aus.push(...await dateien(p));
    else aus.push(p);
  }
  return aus;
}

// Die Seiten: Canonical lesen, Nachweis eintragen
const seiten = (await dateien(AUS)).filter((d) => d.endsWith('.html')).sort();
const adressen = [];
for (const d of seiten) {
  let html = await readFile(d, 'utf8');
  const m = html.match(/^([ \t]*)<link\s+rel="canonical"\s+href="([^"]+)">[ \t]*$/im);
  if (m && !html.includes('google-site-verification')) {
    html = html.replace(m[0], `${m[0]}\n${m[1]}<meta name="google-site-verification" content="${GOOGLE_NACHWEIS}">`);
    await writeFile(d, html);
  }
  // In die Sitemap nur, was Suchmaschinen sehen duerfen
  if (/<meta\s+name="robots"[^>]*noindex/i.test(html)) continue;
  if (m) adressen.push(m[2]);
  else console.warn('ohne Canonical, nicht in der Sitemap:', d);
}
const start = adressen.find((a) => new URL(a).pathname === '/');
if (!start) abbruch('Keine Startseite mit Canonical in dist/ gefunden - lief vorher "npm run build"?');
const ursprung = new URL(start).origin;
if (!ursprung.startsWith('https://')) abbruch(`Die Adresse der Seiten ist nicht https: ${ursprung}`);
const haupt = new URL(start).host;
const neben = haupt.startsWith('www.') ? haupt.slice(4) : 'www.' + haupt;
const muster = (name) => name.replace(/\./g, '\\.');

// Content-Security-Policy aus _headers (dort wird sie gepflegt)
let headers = '';
try { headers = await readFile('_headers', 'utf8'); } catch { /* fehlt */ }
const csp = ((headers.match(/^\s*Content-Security-Policy:\s*(.+?)\s*$/m) || [])[1] || '');
if (!csp) abbruch('In _headers steht keine Content-Security-Policy - ohne sie geht die Seite nicht auf Hetzner.');
if (csp.includes('"')) abbruch('Die Content-Security-Policy in _headers enthaelt ein Anfuehrungszeichen (").');

// .htaccess und api/ nach dist/ (Lesen+Schreiben statt cp, wie in build.mjs)
const htaccess = (await readFile(path.join(VON, '.htaccess'), 'utf8'))
  .replaceAll('@@HAUPT_MUSTER@@', muster(haupt))
  .replaceAll('@@NEBEN_MUSTER@@', muster(neben))
  .replaceAll('@@HAUPT@@', haupt)
  .replaceAll('@@CSP@@', csp);
if (htaccess.includes('@@')) abbruch('In hetzner/.htaccess ist ein @@Platzhalter@@ uebrig, den fertig.mjs nicht kennt.');
await writeFile(path.join(AUS, '.htaccess'), htaccess);
const api = await dateien(path.join(VON, 'api'));
for (const quelle of api) {
  const ziel = path.join(AUS, path.relative(VON, quelle));
  await mkdir(path.dirname(ziel), { recursive: true });
  await writeFile(ziel, await readFile(quelle));
}

// Cloudflare-Dateien heraus
for (const d of ['_headers', '_redirects']) {
  try { await rm(path.join(AUS, d), { force: true }); }
  catch (f) { console.warn(`Hinweis: dist/${d} konnte nicht entfernt werden (${f.code}).`); }
}

// sitemap.xml: Startseite zuerst, dann alphabetisch
adressen.sort((a, b) => (a === start ? -1 : b === start ? 1 : a.localeCompare(b)));
await writeFile(path.join(AUS, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  adressen.map((a) => `  <url><loc>${a.replace(/&/g, '&amp;')}</loc></url>\n`).join('') +
  '</urlset>\n');
await writeFile(path.join(AUS, 'robots.txt'),
  `User-agent: *\nDisallow:\n\nSitemap: ${ursprung}/sitemap.xml\n`);

console.log(`dist/ fuer Hetzner fertig: Adresse ${ursprung} (${neben} leitet dorthin), ` +
  `${api.length} Dateien in api/, sitemap.xml mit ${adressen.length} Adressen, robots.txt.`);
