// Generalprobe auf dem echten Server, ohne die laufende Seite anzufassen.
//
// Liegt die Datei hetzner/PROBE im Zweig, ruft fertig.mjs am Ende dieses
// Skript auf. Es schiebt die fertige Hetzner-Fassung nach dist/_probe/ -
// hochgeladen wird dann nur der Unterordner, erreichbar unter
// https://<adresse>/_probe/. Im Web-Root selbst landet ausser dem
// Unterordner nur api/geheim.php (schreibt der Workflow, gibt nichts aus).
//
// Geprueft wird damit, was sich lokal nicht pruefen laesst: ob Hetzner die
// .htaccess annimmt, ob PHP laeuft und ob das Formular die Google-Tabelle
// erreicht. Danach hetzner/PROBE loeschen und pushen: der naechste Lauf
// laedt die Seite in den Web-Root und raeumt _probe/ von selbst wieder ab.
import { rename, mkdir, readFile, writeFile } from 'node:fs/promises';

const P = '_probe';
await rename('dist', 'dist_probe_tmp');
await mkdir('dist/api', { recursive: true });
await rename('dist_probe_tmp', `dist/${P}`);

const ersetze = (text, alt, neu, was) => {
  if (!text.includes(alt)) { console.error('FEHLER: Probe -', was, 'nicht gefunden.'); process.exit(1); }
  return text.replaceAll(alt, neu);
};

// Regeln auf den Unterordner beziehen und Suchmaschinen fernhalten
let h = await readFile(`dist/${P}/.htaccess`, 'utf8');
h = ersetze(h, '\nRewriteBase /\n', `\nRewriteBase /${P}/\n`, 'RewriteBase');
h = ersetze(h, 'm#^/images/#', `m#^/${P}/images/#`, 'Cache-Regel Bilder');
h = ersetze(h, 'm#^/assets/fonts/#', `m#^/${P}/assets/fonts/#`, 'Cache-Regel Schriften');
h += '\n# Generalprobe: nicht in Suchmaschinen\n<IfModule mod_headers.c>\nHeader set X-Robots-Tag "noindex, nofollow"\n</IfModule>\n';
await writeFile(`dist/${P}/.htaccess`, h);

// geheim.php schreibt der Workflow nach dist/api/ - von der Probe aus zwei Ebenen hoeher
const php = `dist/${P}/api/registrierung.php`;
await writeFile(php, ersetze(await readFile(php, 'utf8'), "__DIR__ . '/geheim.php'", "__DIR__ . '/../../api/geheim.php'", 'Pfad zu geheim.php'));

console.log(`GENERALPROBE: dist/ enthaelt nur ${P}/ - der Web-Root bleibt unberuehrt.`);
