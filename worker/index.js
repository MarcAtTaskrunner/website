// Cloudflare-Worker der Website. Alles ausser /api/* liefert Cloudflare
// direkt aus dist/ aus (run_worker_first in wrangler.jsonc) - dieser Code
// laeuft also nur fuer die eine Adresse, die das Formular braucht.
//
// POST /api/registrierung
//   Nimmt das Handwerker-Formular von kontakt.html als JSON an und
//   schickt es als Mail an EMPFAENGER (wrangler.jsonc, "vars").
//   Versand ueber Resend (resend.com), Schluessel als Secret
//   RESEND_API_KEY im Cloudflare-Dashboard (Worker -> Settings ->
//   Variables and Secrets) - nie ins Repo.
//   Absender: ABSENDER aus "vars". Ohne eigene, bei Resend bestaetigte
//   Domain geht nur onboarding@resend.dev, und das nur an die Adresse,
//   mit der das Resend-Konto angelegt ist - fuer den Test reicht das.

const FELDER = ["Gewerke", "PLZ", "Ort", "Einsatzradius", "Name", "Firma", "Telefon"];
const VORWAHLEN = ["+49", "+43", "+41"];

// Telefonnummer international: "0201 1234567" mit +49 -> "+49 201 1234567".
// Beginnt die Eingabe schon mit + oder 00, bleibt sie, wie sie ist.
function telefon(nummer, vorwahl) {
  const n = nummer.trim();
  if (/^(\+|00)/.test(n)) return n.replace(/^00/, "+");
  const v = VORWAHLEN.includes(vorwahl) ? vorwahl : "+49";
  return `${v} ${n.replace(/^0+/, "")}`;
}
const PFLICHT = ["Gewerke", "PLZ", "Name", "Telefon"];

function antwort(status, daten) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function registrierung(request, env) {
  if (request.method !== "POST") return antwort(405, { ok: false, fehler: "Nur POST" });
  if (!env.RESEND_API_KEY) return antwort(503, { ok: false, fehler: "Versand nicht eingerichtet" });

  let eingang;
  try {
    eingang = await request.json();
  } catch {
    return antwort(400, { ok: false, fehler: "Ungueltige Daten" });
  }
  // Falle fuer Bots: ein Feld, das Menschen nicht sehen und nicht fuellen
  if (eingang.Webseite) return antwort(200, { ok: true });

  const daten = {};
  for (const feld of FELDER) {
    // Zeilenumbrueche raus: nichts soll in den Betreff der Mail rutschen
    daten[feld] = String(eingang[feld] ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 300);
  }
  for (const feld of PFLICHT) {
    if (!daten[feld]) return antwort(400, { ok: false, fehler: `${feld} fehlt` });
  }
  if (!/^\d{4,5}$/.test(daten.PLZ)) return antwort(400, { ok: false, fehler: "PLZ ungueltig" });
  daten.Telefon = telefon(daten.Telefon, String(eingang.Vorwahl ?? ""));

  const text = [
    "Neue Registrierung über das Handwerker-Formular auf der Kontaktseite",
    "",
    ...FELDER.map((f) => `${f.padEnd(14)} ${daten[f] || "-"}`),
    "",
    `Eingang: ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`,
  ].join("\n");

  const versand = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.ABSENDER,
      to: [env.EMPFAENGER],
      subject: `Registrierung Handwerker: ${daten.Name}, ${daten.PLZ} ${daten.Ort}`.trim(),
      text,
    }),
  });
  if (!versand.ok) {
    console.log("Resend-Fehler", versand.status, await versand.text());
    return antwort(502, { ok: false, fehler: "Versand fehlgeschlagen" });
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
