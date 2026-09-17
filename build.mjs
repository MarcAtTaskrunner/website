// Stellt aus den Quelldateien den auslieferbaren Ordner dist/ zusammen.
// Voraussetzung: assets/style.css wurde vorher von Tailwind erzeugt (npm run css).
//
// Kopiert wird bewusst ueber Lesen+Schreiben statt ueber cp: auf Rechnern,
// auf denen der Ordner nicht geloescht werden darf, wuerde cp am Entfernen
// der alten Datei scheitern. Ueberschreiben klappt dort dagegen.
import { rm, mkdir, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const AUS = 'dist';
// Alle HTML-Seiten im Wurzelverzeichnis werden automatisch mitgenommen -
// eine neue Seite muss hier also nicht eingetragen werden.
const DATEIEN = [
  ...(await readdir('.')).filter((d) => d.endsWith('.html')).sort(),
  'favicon.svg', 'favicon-96.png', 'apple-touch-icon.png',
  '_redirects', '_headers',
];
// Dazu die Jahresordner: Blogbeitraege liegen wie im alten WordPress unter
// JJJJ/MM/TT/titel/index.html, damit ihre Adressen gleich bleiben.
const ORDNER = [
  'assets', 'images', 'videos',
  ...(await readdir('.')).filter((d) => /^\d{4}$/.test(d)).sort(),
];

try {
  await rm(AUS, { recursive: true, force: true });
} catch (fehler) {
  console.warn(`Hinweis: dist/ konnte nicht geleert werden (${fehler.code}) - es wird ueberschrieben.`);
}
await mkdir(AUS, { recursive: true });

async function kopiere(quelle, ziel) {
  await mkdir(path.dirname(ziel), { recursive: true });
  await writeFile(ziel, await readFile(quelle));
}

async function kopiereOrdner(quelle, ziel) {
  for (const e of await readdir(quelle, { withFileTypes: true })) {
    const q = path.join(quelle, e.name), z = path.join(ziel, e.name);
    if (e.isDirectory()) await kopiereOrdner(q, z);
    else if (/^\d{4}$/.test(quelle.split(path.sep)[0]) && e.name.endsWith('.html')) await kopiereSeite(q, z);
    else await kopiere(q, z);
  }
}

// Interne Links zeigen im Quelltext auf kontakt.html, damit die Vorschau per
// Doppelklick funktioniert. Live leitet Cloudflare kontakt.html auf /kontakt
// um; damit Besucher und Google diesen Umweg nicht gehen, bekommen die Seiten
// in dist/ gleich die saubere Adresse.
function saubereLinks(html, datei) {
  const ordner = path.posix.dirname(datei);
  return html.replace(/href="([^"]*)"/g, (ganz, ziel) => {
    const m = ziel.match(/^([^#?]*\.html)([#?].*)?$/);
    if (!m || /^[a-z][a-z0-9+.-]*:|^\/\//i.test(ziel)) return ganz;
    let p = m[1].startsWith('/') ? m[1] : '/' + path.posix.join(ordner, m[1]);
    p = p.endsWith('/index.html') ? p.slice(0, -'index.html'.length) : p.slice(0, -'.html'.length);
    return `href="${p}${m[2] || ''}"`;
  });
}

async function kopiereSeite(quelle, ziel) {
  const datei = path.relative(AUS, ziel).split(path.sep).join('/');
  await mkdir(path.dirname(ziel), { recursive: true });
  await writeFile(ziel, saubereLinks(await readFile(quelle, 'utf8'), datei));
}

let n = 0;
for (const d of DATEIEN) {
  try { await stat(d); } catch { console.warn('fehlt, uebersprungen:', d); continue; }
  await (d.endsWith('.html') ? kopiereSeite : kopiere)(d, path.join(AUS, d)); n++;
}
for (const o of ORDNER) await kopiereOrdner(o, path.join(AUS, o));
console.log(`dist/ gebaut (${n} Einzeldateien + ${ORDNER.join(', ')}).`);
