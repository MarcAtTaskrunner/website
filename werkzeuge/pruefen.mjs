/* Prueft die gebauten Seiten in einem Browser ohne Fenster.
 *
 *     node werkzeuge/pruefen.mjs                 alle Seiten
 *     node werkzeuge/pruefen.mjs index.html      nur eine
 *
 * Vier Dinge je Seite, alle als Text - kein Bildschirmfoto noetig:
 *   1. Fehler in der Konsole und Anfragen, die ins Leere gehen
 *   2. Barrierefreiheit nach WCAG AA ueber axe, samt Kontrasten
 *   3. Seitlicher Ueberlauf bei 375, 768 und 1440 Pixeln Breite
 *   4. Hauswerte: Inhaltsbreite 1280, randlose Schaubilder buendig
 *
 * Der Server laeuft im Skript selbst, es braucht also keinen zweiten
 * Befehl daneben.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

/* fileURLToPath statt .pathname: der Projektpfad enthaelt ein
   Leerzeichen, das sonst als %20 stehen bliebe. */
const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

const server = createServer(async (anfrage, antwort) => {
  const pfad = decodeURIComponent(anfrage.url.split('?')[0]);
  const datei = path.join(WURZEL, pfad === '/' ? 'index.html' : pfad);
  try {
    const inhalt = await readFile(datei);
    antwort.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream' });
    antwort.end(inhalt);
  } catch {
    antwort.writeHead(404).end('fehlt');
  }
});
await new Promise((f) => server.listen(0, f));
const basis = 'http://localhost:' + server.address().port;

/* Interne Seiten: werden geprueft, aber ihr Befund ist erklaerbar und
   kein Auftrag. entwuerfe.html ist eine Werkbank mit fester Spaltenbreite
   zum Vergleichen von Schaubild-Entwuerfen, nicht Teil der Website.
   Faellt die Seite weg, kann der Eintrag hier mit weg. */
const INTERN = { 'entwuerfe.html': 'Werkbank mit fester Breite, nicht verlinkt' };

const seiten = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(WURZEL).filter((d) => d.endsWith('.html')).sort();

const browser = await chromium.launch();
let probleme = 0;

for (const seite of seiten) {
  const zeilen = [];
  const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const blatt = await kontext.newPage();

  const konsole = [], tot = [];
  blatt.on('console', (m) => m.type() === 'error' && konsole.push(m.text().slice(0, 120)));
  blatt.on('pageerror', (e) => konsole.push(String(e).slice(0, 120)));
  blatt.on('response', (r) => r.status() >= 400 && tot.push(r.status() + ' ' + r.url().replace(basis, '')));

  await blatt.goto(basis + '/' + seite, { waitUntil: 'networkidle' });
  await blatt.waitForTimeout(400);

  if (konsole.length) zeilen.push('  Konsole: ' + konsole.join(' | '));
  if (tot.length) zeilen.push('  Ins Leere: ' + tot.join(' | '));

  /* --- Barrierefreiheit --------------------------------------------- */
  const { violations } = await new AxeBuilder({ page: blatt })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  for (const v of violations) {
    zeilen.push(`  ${v.id} (${v.impact}, ${v.nodes.length}x): ${v.help}`);
    /* Bei Kontrasten die Zahlen gleich mitliefern - sonst muesste man
       sie doch wieder von Hand nachmessen. Gleiche Farbpaare nur einmal. */
    const gesehen = new Set();
    for (const n of v.nodes) {
      const d = v.id === 'color-contrast' && n.any[0] && n.any[0].data;
      const stelle = n.target.join(' ').slice(0, 52);
      if (!d) { if (gesehen.size < 2) { gesehen.add(stelle); zeilen.push('      ' + stelle); } continue; }
      const schluessel = d.fgColor + d.bgColor;
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      zeilen.push(`      ${stelle}`);
      zeilen.push(`         ${d.fgColor} auf ${d.bgColor} = ${d.contrastRatio} (noetig ${d.expectedContrastRatio}, ${d.fontSize} ${d.fontWeight})`);
    }
  }

  /* --- Seitlicher Ueberlauf ----------------------------------------- */
  for (const breite of [375, 768, 1440]) {
    await blatt.setViewportSize({ width: breite, height: 900 });
    await blatt.waitForTimeout(250);
    const ueber = await blatt.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ueber > 1) zeilen.push(`  Ueberlauf bei ${breite} px: ${ueber} px zu breit`);
  }

  /* --- Hauswerte ----------------------------------------------------- */
  await blatt.setViewportSize({ width: 1440, height: 900 });
  await blatt.waitForTimeout(250);
  const haus = await blatt.evaluate(() => {
    const innen = (e) => {
      const cs = getComputedStyle(e);
      return Math.round(e.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    const breiten = [...new Set(Array.from(document.querySelectorAll('.container-wide'))
      .filter((e) => !e.closest('[hidden]')).map(innen))];
    const schief = Array.from(document.querySelectorAll('canvas[class*="-mx-"]')).map((c) => {
      const k = c.closest('li');
      if (!k) return null;
      const a = c.getBoundingClientRect(), b = k.getBoundingClientRect();
      return Math.abs(a.left - b.left) > 1 || Math.abs(a.right - b.right) > 1
        ? `${c.dataset.schaubild}: ${Math.round(a.left - b.left)}/${Math.round(b.right - a.right)}` : null;
    }).filter(Boolean);
    return { breiten, schief };
  });
  const falsch = haus.breiten.filter((b) => b !== 1280);
  if (falsch.length) zeilen.push('  Inhaltsbreite nicht 1280: ' + falsch.join(', '));
  if (haus.schief.length) zeilen.push('  Schaubild nicht buendig: ' + haus.schief.join(', '));

  const notiz = INTERN[seite] ? `  (intern: ${INTERN[seite]})` : '';
  console.log(zeilen.length ? `${seite}${notiz}\n${zeilen.join('\n')}` : `${seite}  ohne Befund`);
  if (!INTERN[seite]) probleme += zeilen.length;
  await kontext.close();
}

await browser.close();
server.close();
console.log(probleme ? `\n${probleme} Zeilen zu pruefen.` : '\nAlles ohne Befund.');
process.exit(0);
