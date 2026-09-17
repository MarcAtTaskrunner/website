// Verkleinert Fotos fuer die Auslieferung, direkt an Ort und Stelle.
//
//   node werkzeuge/bilder.mjs images/blog/neues-foto.jpg [weitere …]
//   node werkzeuge/bilder.mjs --max 1600 images/gross.webp
//
// JPEG und WebP mit Qualitaet 78, Seitenlaenge hoechstens 2400 px (oder --max).
// Format und Dateiname bleiben, damit kein Verweis angepasst werden muss.
// Ersetzt wird nur, wenn die Datei mindestens 10 % kleiner wird. Wird ein Bild
// kleiner skaliert, muessen width/height im HTML nachgezogen werden - das
// Skript meldet es. Die Originale liegen in der Git-Historie.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
let max = 2400;
const i = args.indexOf('--max');
if (i >= 0) { max = Number(args[i + 1]); args.splice(i, 2); }
if (!args.length) { console.log('Aufruf: node werkzeuge/bilder.mjs [--max 2400] datei …'); process.exit(1); }

for (const datei of args) {
  const alt = await readFile(datei);
  const m = await sharp(alt).metadata();
  let bild = sharp(alt).rotate();
  if (Math.max(m.width, m.height) > max) {
    bild = bild.resize(m.width >= m.height ? { width: max } : { height: max });
  }
  if (/\.webp$/i.test(datei)) bild = bild.webp({ quality: 78, effort: 6 });
  else if (/\.jpe?g$/i.test(datei)) bild = bild.jpeg({ quality: 78, mozjpeg: true, progressive: true });
  else { console.log('uebersprungen (nur JPEG/WebP):', datei); continue; }

  const neu = await bild.toBuffer();
  const n = await sharp(neu).metadata();
  const kb = (b) => Math.round(b / 1024) + ' kB';
  if (neu.length > alt.length * 0.9) { console.log(`unveraendert  ${kb(alt.length)}  ${datei}`); continue; }
  await writeFile(datei, neu);
  const mass = n.width !== m.width ? `  ${m.width}x${m.height} -> ${n.width}x${n.height} (width/height im HTML anpassen!)` : '';
  console.log(`${kb(alt.length)} -> ${kb(neu.length)}  ${datei}${mass}`);
}
