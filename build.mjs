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
// images/ fehlt hier absichtlich: Mit geht nur, was eine Seite, das CSS oder
// ein Skript tatsaechlich verwendet (siehe unten). Unbenutzte Originale
// bleiben so lokal und werden nicht oeffentlich.
const ORDNER = [
  'assets', 'videos',
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

// Verwendete Bilder: jeder Pfad images/… in den ausgelieferten HTML-, CSS-
// und JS-Dateien. Ein Bild, das nur per zusammengesetztem String geladen
// wird, fehlt live - dann den vollen Pfad irgendwo ausschreiben.
async function textdateien(ordner) {
  const aus = [];
  for (const e of await readdir(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) aus.push(...await textdateien(p));
    else if (/\.(html|css|js)$/.test(e.name)) aus.push(p);
  }
  return aus;
}
const bilder = new Set();
for (const d of await textdateien(AUS)) {
  for (const m of (await readFile(d, 'utf8')).matchAll(/images\/[^"'\s,)|;<>]+/g)) {
    bilder.add(decodeURIComponent(m[0].replace(/[?#].*$/, '')));
  }
}
let b = 0;
for (const bild of [...bilder].sort()) {
  let info;
  try { info = await stat(bild); } catch { console.warn('Bild fehlt:', bild); continue; }
  // Ein Ordnerpfad (etwa "images/mitarbeiter/" in einem Kommentar) ist kein
  // Bild - ohne diese Pruefung brach der Build mit EISDIR ab.
  if (!info.isFile()) continue;
  await kopiere(bild, path.join(AUS, bild)); b++;
}
console.log(`dist/ gebaut (${n} Einzeldateien + ${ORDNER.join(', ')} + ${b} Bilder).`);
