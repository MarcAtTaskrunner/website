// Stellt aus den Quelldateien den auslieferbaren Ordner dist/ zusammen.
// Voraussetzung: assets/style.css wurde vorher von Tailwind erzeugt (npm run css).
import { cp, rm, mkdir, access, readdir } from 'node:fs/promises';
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

await rm(AUS, { recursive: true, force: true });
await mkdir(AUS, { recursive: true });

for (const d of DATEIEN) {
  try { await access(d); } catch { console.warn('fehlt, uebersprungen:', d); continue; }
  await cp(d, path.join(AUS, d));
}
for (const o of ORDNER) {
  await cp(o, path.join(AUS, o), { recursive: true });
}
console.log('dist/ gebaut.');
