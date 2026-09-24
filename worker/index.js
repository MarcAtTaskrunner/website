// Cloudflare-Worker der Website. Alles ausser /api/* liefert Cloudflare
// direkt aus dist/ aus (run_worker_first in wrangler.jsonc) - dieser Code
// laeuft also nur fuer die eine Adresse, die das Formular braucht.
//
// POST /api/registrierung
//   Nimmt das Handwerker-Formular von kontakt.html als JSON an und
//   schickt es als Mail an EMPFAENGER. Versand ueber die Gmail-API von
//   Google Workspace - kein zusaetzlicher Dienst, die Mail geht ueber
//   dasselbe Google Workspace wie alle anderen taskrunner-Mails.
//
//   Anmeldung bei Google mit einem Dienstkonto (Service Account) mit
//   domainweiter Delegierung, Bereich gmail.send. Es verschickt im Namen
//   von ABSENDER (ein echtes Postfach in Workspace).
//   Aus wrangler.jsonc ("vars"):  EMPFAENGER, ABSENDER
//   Secrets im Cloudflare-Dashboard (Worker -> Settings -> Variables
//   and Secrets), nie ins Repo:
//     GOOGLE_DIENSTKONTO  "client_email" aus der JSON-Schluesseldatei
//     GOOGLE_SCHLUESSEL   "private_key" aus derselben Datei
//                         (mit -----BEGIN PRIVATE KEY----- ... END)

const FELDER = ["Gewerke", "PLZ", "Ort", "Einsatzradius", "Name", "Firma", "Telefon"];
const PFLICHT = ["Gewerke", "PLZ", "Name", "Telefon"];

function antwort(status, daten) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Base64 fuer UTF-8-Text bzw. Bytes; "url" = Variante ohne + / =
function base64(eingabe, url = false) {
  const bytes = typeof eingabe === "string" ? new TextEncoder().encode(eingabe) : new Uint8Array(eingabe);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return url ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
}

// Zugangstoken von Google: ein mit dem Dienstkonto-Schluessel signiertes
// JWT gegen ein kurzlebiges Token tauschen (OAuth 2.0 Server-zu-Server).
async function googleToken(env) {
  const pem = env.GOOGLE_SCHLUESSEL.replace(/\\n/g, "\n");
  const inhalt = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(inhalt), (z) => z.charCodeAt(0));
  const schluessel = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);

  const jetzt = Math.floor(Date.now() / 1000);
  const kopf = base64(JSON.stringify({ alg: "RS256", typ: "JWT" }), true);
  const angaben = base64(JSON.stringify({
    iss: env.GOOGLE_DIENSTKONTO,
    sub: env.ABSENDER,
    scope: "https://www.googleapis.com/auth/gmail.send",
    aud: "https://oauth2.googleapis.com/token",
    iat: jetzt,
    exp: jetzt + 600,
  }), true);
  const signatur = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", schluessel,
    new TextEncoder().encode(`${kopf}.${angaben}`));
  const jwt = `${kopf}.${angaben}.${base64(signatur, true)}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!r.ok) throw new Error(`Google-Anmeldung ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function gmailSenden(env, betreff, text) {
  const token = await googleToken(env);
  // Mail im Rohformat (RFC 5322); Betreff und Text als UTF-8, damit
  // Umlaute ankommen
  const mail = [
    `From: taskrunner Website <${env.ABSENDER}>`,
    `To: ${env.EMPFAENGER}`,
    `Subject: =?UTF-8?B?${base64(betreff)}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64(text).replace(/.{76}/g, "$&\r\n"),
  ].join("\r\n");
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64(mail, true) }),
  });
  if (!r.ok) throw new Error(`Gmail ${r.status}: ${await r.text()}`);
}

async function registrierung(request, env) {
  if (request.method !== "POST") return antwort(405, { ok: false, fehler: "Nur POST" });
  if (!env.GOOGLE_DIENSTKONTO || !env.GOOGLE_SCHLUESSEL) {
    return antwort(503, { ok: false, fehler: "Versand nicht eingerichtet" });
  }

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
    // Zeilenumbrueche raus: nichts soll in die Kopfzeilen der Mail rutschen
    daten[feld] = String(eingang[feld] ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 300);
  }
  for (const feld of PFLICHT) {
    if (!daten[feld]) return antwort(400, { ok: false, fehler: `${feld} fehlt` });
  }
  if (!/^\d{4,5}$/.test(daten.PLZ)) return antwort(400, { ok: false, fehler: "PLZ ungueltig" });

  const text = [
    "Neue Registrierung über das Handwerker-Formular auf der Kontaktseite",
    "",
    ...FELDER.map((f) => `${f.padEnd(14)} ${daten[f] || "-"}`),
    "",
    `Eingang: ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`,
  ].join("\n");
  const betreff = `Registrierung Handwerker: ${daten.Name}, ${daten.PLZ} ${daten.Ort}`.trim();

  try {
    await gmailSenden(env, betreff, text);
  } catch (fehler) {
    console.log("Versand fehlgeschlagen:", fehler.message);
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
