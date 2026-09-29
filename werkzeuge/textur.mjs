// Papiertextur fuer den Kopf (Kopfband der Unterseiten, Hero der Startseite)
//
//   node werkzeuge/textur.mjs images/Texturelabs_Paper_346L.jpg
//
// Schreibt images/textur-papier.jpg (1600 px) und textur-papier-1200.jpg
// (Handy). Eingebunden in tailwind/input.css ("Papiertextur im Kopf").
//
// Aus dem Foto wird nur die Oberflaeche uebernommen:
//   - Raender ab (3 %), dort sind Scans oft dunkler
//   - entsaettigt: der Kopf behaelt sein eigenes Blau
//   - grosse Hell-Dunkel-Verlaeufe herausgerechnet (Bild minus stark
//     weichgezeichnete Fassung) - uebrig bleibt Faser und Koernung
//   - Ausreisser weich gekappt (tanh): einzelne helle Fasern blitzten
//     sonst im Blau weiss auf
//   - auf mittleres Grau 128 mit Streuung 22 gebracht, damit hard-light
//     den Verlauf im Mittel weder aufhellt noch abdunkelt
// Die Staerke auf der Seite regelt allein opacity in input.css.

import sharp from "sharp";

const quelle = process.argv[2];
if (!quelle) {
  console.log("Aufruf: node werkzeuge/textur.mjs images/<papierfoto>.jpg");
  process.exit(1);
}

const { width: W, height: H } = await sharp(quelle).metadata();
const rand = 0.03;
const zuschnitt = {
  left: Math.round(W * rand),
  top: Math.round(H * rand),
  width: Math.round(W * (1 - 2 * rand)),
  height: Math.round(H * (1 - 2 * rand)),
};

for (const [breite, ziel, qualitaet] of [
  [1600, "images/textur-papier.jpg", 60],
  [1200, "images/textur-papier-1200.jpg", 62],
]) {
  const { data, info } = await sharp(quelle).extract(zuschnitt).greyscale().resize({ width: breite })
    .raw().toBuffer({ resolveWithObject: true });
  const weich = await sharp(data, { raw: info }).blur(breite / 40).raw().toBuffer();

  const d = new Float32Array(data.length);
  let summe = 0;
  for (let i = 0; i < d.length; i++) { d[i] = data[i] - weich[i]; summe += d[i] * d[i]; }
  const grenze = 1.2 * Math.sqrt(summe / d.length);

  summe = 0;
  for (let i = 0; i < d.length; i++) { d[i] = grenze * Math.tanh(d[i] / grenze); summe += d[i] * d[i]; }
  const faktor = 22 / Math.sqrt(summe / d.length);

  const aus = Buffer.alloc(d.length);
  for (let i = 0; i < d.length; i++) aus[i] = Math.max(0, Math.min(255, Math.round(128 + d[i] * faktor)));
  await sharp(aus, { raw: info }).jpeg({ quality: qualitaet, mozjpeg: true }).toFile(ziel);
  console.log(`${ziel}  ${info.width}x${info.height}`);
}
