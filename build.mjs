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
const ORDNER = ['assets', 'images'];

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
    else await kopiere(q, z);
  }
}

let n = 0;
for (const d of DATEIEN) {
  try { await stat(d); } catch { console.warn('fehlt, uebersprungen:', d); continue; }
  await kopiere(d, path.join(AUS, d)); n++;
}
for (const o of ORDNER) await kopiereOrdner(o, path.join(AUS, o));
console.log(`dist/ gebaut (${n} Einzeldateien + ${ORDNER.join(', ')}).`);
