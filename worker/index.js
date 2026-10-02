// Cloudflare-Worker der Website. Alles ausser /api/* liefert Cloudflare
// direkt aus dist/ aus (run_worker_first in wrangler.jsonc) - dieser Code
// laeuft also nur fuer die eine Adresse, die das Formular braucht.
//
// POST /api/registrierung
//   Nimmt das Handwerker-Formular von kontakt.html als JSON an und
//   schreibt es als Zeile in eine Google-Tabelle: ueber ein Apps-Script
//   an der Tabelle (Code und Einrichtung in werkzeuge/google-tabelle.gs).
//   Dafuer zwei Secrets im Cloudflare-Dashboard (Worker -> Settings ->
//   Variables and Secrets): SHEET_URL (Adresse der Web-App) und
//   SHEET_GEHEIMNIS (dasselbe Wort wie im Script) - nie ins Repo.
//   Die Tabelle ist das einzige Ziel: hakt Google, bekommt das Formular
//   einen Fehler und der Handwerker kann es noch einmal abschicken.
//
//   Bot-Schutz: Ist das Secret TURNSTILE_GEHEIMNIS gesetzt (Secret Key des
//   Turnstile-Widgets), muss das Formular ein gueltiges Turnstile-Token
//   mitschicken (Feld cf-turnstile-response, legt assets/app.js an). Ohne
//   das Secret wird nicht geprueft. Reihenfolge beim Einschalten: erst den
//   Sitekey in quellen/kontakt.html (data-turnstile) veroeffentlichen, dann
//   das Secret setzen - sonst lehnt der Server jede Anmeldung ab.

const FELDER = ["Gewerke", "PLZ", "Ort", "Einsatzradius", "Name", "Firma", "Telefon", "E-Mail"];
// Telefonnummer international: "0201 1234567" mit +49 -> "+49 201 1234567".
// Beginnt die Eingabe schon mit + oder 00, bleibt sie, wie sie ist. Ohne
// Vorwahl ("Andere" im Formular, aber kein + getippt) bleibt die Nummer
// unveraendert - lieber so als mit einer geratenen Vorwahl.
function telefon(nummer, vorwahl) {
  const n = nummer.trim();
  if (/^(\+|00)/.test(n)) return n.replace(/^00/, "+");
  if (!/^\+\d{1,4}$/.test(vorwahl)) return n;
  return `${vorwahl} ${n.replace(/^0+/, "")}`;
}
const PFLICHT = ["Gewerke", "PLZ", "Name", "Telefon", "E-Mail"];

function antwort(status, daten) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Eine Zeile in die Google-Tabelle (werkzeuge/google-tabelle.gs);
// true, wenn sie angekommen ist
async function inTabelle(env, daten, zeit) {
  try {
    const antwort = await fetch(env.SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geheimnis: env.SHEET_GEHEIMNIS, Eingang: zeit, ...daten }),
    });
    const text = await antwort.text();
    if (antwort.ok && text.includes('"ok":true')) return true;
    console.log("Tabelle-Fehler", antwort.status, text.slice(0, 300));
  } catch (fehler) {
    console.log("Tabelle-Fehler", String(fehler));
  }
  return false;
}

// Fragt Cloudflare, ob das Turnstile-Token echt und unverbraucht ist
async function menschGeprueft(env, token, ip) {
  try {
    const frage = { secret: env.TURNSTILE_GEHEIMNIS, response: token };
    if (ip) frage.remoteip = ip;
    const antwort = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(frage),
    });
    const ergebnis = await antwort.json();
    if (ergebnis.success) return true;
    console.log("Turnstile abgelehnt", JSON.stringify(ergebnis["error-codes"] || []));
  } catch (fehler) {
    console.log("Turnstile-Fehler", String(fehler));
  }
  return false;
}

async function registrierung(request, env) {
  if (request.method !== "POST") return antwort(405, { ok: false, fehler: "Nur POST" });
  if (!env.SHEET_URL || !env.SHEET_GEHEIMNIS) return antwort(503, { ok: false, fehler: "Versand nicht eingerichtet" });

  let eingang;
  try {
    eingang = await request.json();
  } catch {
    return antwort(400, { ok: false, fehler: "Ungueltige Daten" });
  }
  // Falle fuer Bots: ein Feld, das Menschen nicht sehen und nicht fuellen
  // (feld_x7 in quellen/kontakt.html; "Webseite" war der alte Name)
  if (eingang.feld_x7 || eingang.Webseite) return antwort(200, { ok: true });

  const daten = {};
  for (const feld of FELDER) {
    // Zeilenumbrueche raus: eine Anmeldung, eine Zeile
    daten[feld] = String(eingang[feld] ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 300);
  }
  for (const feld of PFLICHT) {
    if (!daten[feld]) return antwort(400, { ok: false, fehler: `${feld} fehlt` });
  }
  if (!/^\d{4,5}$/.test(daten.PLZ)) return antwort(400, { ok: false, fehler: "PLZ ungueltig" });
  // Wie im Formular (assets/app.js, [data-vorwahl]): nur Ziffern, Leerzeichen
  // und + - / ( ), mindestens sechs Ziffern
  if (!/^[0-9 +()\/-]+$/.test(daten.Telefon) || daten.Telefon.replace(/\D/g, "").length < 6) {
    return antwort(400, { ok: false, fehler: "Telefon ungueltig" });
  }
  // Grob wie type="email" im Formular: etwas@etwas.etwas, ohne Leerzeichen
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(daten["E-Mail"])) {
    return antwort(400, { ok: false, fehler: "E-Mail ungueltig" });
  }
  daten.Telefon = telefon(daten.Telefon, String(eingang.Vorwahl ?? ""));

  // Erst nach der Feldpruefung: ein Token gilt nur einmal
  if (env.TURNSTILE_GEHEIMNIS) {
    const token = String(eingang["cf-turnstile-response"] ?? "").slice(0, 4096);
    if (!token || !(await menschGeprueft(env, token, request.headers.get("CF-Connecting-IP")))) {
      return antwort(403, { ok: false, fehler: "Sicherheitspruefung fehlgeschlagen" });
    }
  }

  const zeit = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  if (!(await inTabelle(env, daten, zeit))) {
    return antwort(502, { ok: false, fehler: "Speichern fehlgeschlagen" });
  }
  return antwort(200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/registrierung") return registrierung(request, env);
    return env.ASSETS.fetch(request);
  },
};
