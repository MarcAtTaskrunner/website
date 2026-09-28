/* Handwerker-Registrierungen in eine Google-Tabelle
 *
 * Dieses Script gehoert NICHT auf die Website. Es liegt in der Google-
 * Tabelle selbst (Erweiterungen -> Apps Script) und nimmt dort die Zeilen
 * an, die der Worker (worker/index.js, inTabelle) nach jeder erfolgreichen
 * Registrierung schickt. Hier liegt es nur, damit der Code nicht verloren
 * geht.
 *
 * Einrichtung, einmalig:
 *   1. Google-Tabelle anlegen (Konto m.gronenberg@taskrunner.de), z. B.
 *      "Handwerker-Registrierungen".
 *   2. Erweiterungen -> Apps Script, den Inhalt dieser Datei einfuegen,
 *      speichern.
 *   3. Projekteinstellungen (Zahnrad) -> Script-Properties -> Property
 *      hinzufuegen: Name GEHEIMNIS, Wert ein langes Zufallswort.
 *   4. Bereitstellen -> Neue Bereitstellung -> Typ "Web-App":
 *        Ausfuehren als:  Ich
 *        Zugriff:         Jeder
 *      Berechtigungen bestaetigen, die Web-App-URL kopieren.
 *   5. Cloudflare-Dashboard -> Worker "taskrunner" -> Settings ->
 *      Variables and Secrets -> zwei Secrets:
 *        SHEET_URL        die Web-App-URL aus Schritt 4
 *        SHEET_GEHEIMNIS  dasselbe Wort wie in Schritt 3
 *
 * "Jeder" heisst: jeder, der die URL kennt, kann sie aufrufen. Schreiben
 * kann trotzdem nur, wer auch das Geheimnis mitschickt - also nur der
 * Worker. Aendert sich dieser Code, unter Bereitstellen -> Bereitstellungen
 * verwalten eine neue Version anlegen; die URL bleibt dabei gleich.
 */

var SPALTEN = ["Eingang", "Gewerke", "PLZ", "Ort", "Einsatzradius", "Name", "Firma", "Telefon"];

function doPost(e) {
  var daten;
  try {
    daten = JSON.parse(e.postData.contents);
  } catch (fehler) {
    return antwort({ ok: false, fehler: "Ungueltige Daten" });
  }
  var geheimnis = PropertiesService.getScriptProperties().getProperty("GEHEIMNIS");
  if (!geheimnis || daten.geheimnis !== geheimnis) {
    return antwort({ ok: false, fehler: "Nicht erlaubt" });
  }

  /* Gleichzeitige Anmeldungen nacheinander schreiben */
  var sperre = LockService.getScriptLock();
  sperre.waitLock(10000);
  try {
    var blatt = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    /* Leere Tabelle: erst die Kopfzeile */
    if (blatt.getLastRow() === 0) {
      blatt.appendRow(SPALTEN);
      blatt.setFrozenRows(1);
      blatt.getRange(1, 1, 1, SPALTEN.length).setFontWeight("bold");
    }
    /* Als Text schreiben ("'"): sonst macht die Tabelle aus der PLZ 01067
       eine Zahl ohne Null und aus +49 ... eine Formel */
    blatt.appendRow(SPALTEN.map(function (spalte) {
      var wert = String(daten[spalte] || "");
      return wert ? "'" + wert : "";
    }));
  } finally {
    sperre.releaseLock();
  }
  return antwort({ ok: true });
}

function antwort(inhalt) {
  return ContentService.createTextOutput(JSON.stringify(inhalt))
    .setMimeType(ContentService.MimeType.JSON);
}
