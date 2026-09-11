/* Nimmt einen Ausschnitt einer gebauten Seite auf - klein.
 *
 *     node werkzeuge/bild.mjs <seite> <selektor> <zieldatei> [skalierung]
 *     node werkzeuge/bild.mjs dienstleistungen.html "#handwerk" /tmp/a.png
 *
 * Warum klein: ein Bild bleibt im Gespraech liegen und wird in jeder
 * folgenden Runde erneut gelesen. Ein Ausschnitt in halber Aufloesung
 * kostet rund ein Viertel eines vollen Bildschirmfotos - und das bei
 * jeder Runde bis zum Ende. Deshalb ist die Vorgabe 0.5, und deshalb
 * nimmt das Werkzeug einen Selektor statt der ganzen Seite.
 *
 * Es startet seinen eigenen Server; ein zweiter Befehl daneben ist
 * nicht noetig.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const [seite, selektor, ziel, skala = '0.5'] = process.argv.slice(2);
if (!seite || !selektor || !ziel) {
  console.error('node werkzeuge/bild.mjs <seite> <selektor> <zieldatei> [skalierung]');
  process.exit(1);
}
const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4' };

const server = createServer(async (a, b) => {
  try {
    const f = path.join(WURZEL, decodeURIComponent(a.url.split('?')[0]));
    b.writeHead(200, { 'Content-Type': TYPEN[path.extname(f)] || 'application/octet-stream' });
    b.end(await readFile(f));
  } catch { b.writeHead(404).end(); }
});
await new Promise((f) => server.listen(0, f));

const browser = await chromium.launch();
const blatt = await browser.newPage({
  viewport: { width: 1300, height: 1000 },
  deviceScaleFactor: Number(skala),        /* halbe Aufloesung = ein Viertel der Bildpunkte */
});
await blatt.goto('http://localhost:' + server.address().port + '/' + seite, { waitUntil: 'networkidle' });
/* Die Einblendungen beim Scrollen ueberspringen, sonst ist der
   Ausschnitt leer. */
await blatt.evaluate(() => {
  document.querySelectorAll('[data-auf]').forEach((e) => { e.style.opacity = 1; e.style.transform = 'none'; });
  document.querySelectorAll('img[loading]').forEach((i) => { i.loading = 'eager'; });
});
const teil = blatt.locator(selektor).first();
await teil.scrollIntoViewIfNeeded();
await blatt.waitForTimeout(700);
await teil.screenshot({ path: ziel });
const r = await teil.boundingBox();
console.log('%s  %dx%d Punkte bei Skalierung %s', ziel, Math.round(r.width * skala), Math.round(r.height * skala), skala);
await browser.close(); server.close(); process.exit(0);
