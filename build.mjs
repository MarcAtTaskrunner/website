// Stellt aus den Quelldateien den auslieferbaren Ordner dist/ zusammen.
// Voraussetzung: assets/style.css wurde vorher von Tailwind erzeugt (npm run css).
import { cp, rm, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const AUS = 'dist';
const DATEIEN = [
  'index.html', 'dienstleistungen.html', 'foerderungen.html',
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
