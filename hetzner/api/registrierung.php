<?php
// Handwerker-Formular von kontakt.html, Hetzner-Fassung.
// Tut dasselbe wie der Cloudflare-Worker auf main (worker/index.js) -
// aendert sich dort die Logik, hier nachziehen:
//
// POST /api/registrierung
//   Nimmt das Formular als JSON an und schreibt es als Zeile in eine
//   Google-Tabelle: ueber ein Apps-Script an der Tabelle (Code und
//   Einrichtung in werkzeuge/google-tabelle.gs).
//   Die zwei Zugangswerte stehen in geheim.php neben dieser Datei. Die
//   Datei schreibt der Deploy aus den GitHub-Secrets SHEET_URL und
//   SHEET_GEHEIMNIS (.github/workflows/deploy-hetzner.yml) - nie ins Repo.
//   Die Tabelle ist das einzige Ziel: hakt Google, bekommt das Formular
//   einen Fehler und der Handwerker kann es noch einmal abschicken.
//
// Bewusst schlicht geschrieben (laeuft ab PHP 7.2), weil auf dem
// Webhosting die PHP-Version in konsoleH eingestellt wird.

$FELDER  = array('Gewerke', 'PLZ', 'Ort', 'Einsatzradius', 'Name', 'Firma', 'Telefon', 'E-Mail');
$PFLICHT = array('Gewerke', 'PLZ', 'Name', 'Telefon', 'E-Mail');

function antwort($status, $daten) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($daten, JSON_UNESCAPED_UNICODE);
    exit;
}

// Wie String(wert ?? "") im Worker
function als_text($wert) {
    if ($wert === null) return '';
    if (is_bool($wert)) return $wert ? 'true' : 'false';
    if (is_scalar($wert)) return (string) $wert;
    if (is_array($wert)) return implode(',', array_map('als_text', array_values($wert)));
    return '';
}

// Zeilenumbrueche raus (eine Anmeldung, eine Zeile), Rand weg, hoechstens
// 300 Zeichen. Zeichenweise statt byteweise, sonst zerschneidet der
// Schnitt ein ae/oe/ue und json_encode scheitert.
function saeubern($text) {
    $text = preg_replace('/[\r\n]+/', ' ', $text);
    $sauber = preg_replace('/^\s+|\s+$/u', '', $text);
    if ($sauber === null) return ''; // kein gueltiges UTF-8
    if (preg_match('/^.{0,300}/us', $sauber, $m)) return $m[0];
    return '';
}

// Telefonnummer international: "0201 1234567" mit +49 -> "+49 201 1234567".
// Beginnt die Eingabe schon mit + oder 00, bleibt sie, wie sie ist. Ohne
// Vorwahl ("Andere" im Formular, aber kein + getippt) bleibt die Nummer
// unveraendert - lieber so als mit einer geratenen Vorwahl.
function telefon($nummer, $vorwahl) {
    $n = trim($nummer);
    if (preg_match('/^(\+|00)/', $n)) return preg_replace('/^00/', '+', $n);
    if (!preg_match('/^\+[0-9]{1,4}\z/', $vorwahl)) return $n;
    return $vorwahl . ' ' . preg_replace('/^0+/', '', $n);
}

// Eine Zeile in die Google-Tabelle (werkzeuge/google-tabelle.gs);
// true, wenn sie angekommen ist. Fehler landen im PHP-Fehlerprotokoll
// (konsoleH -> Logs) unter "Tabelle-Fehler".
function in_tabelle($geheim, $daten, $zeit) {
    if (!function_exists('curl_init')) {
        error_log('Tabelle-Fehler: PHP-Erweiterung curl fehlt');
        return false;
    }
    $zeile = array_merge(array('geheimnis' => $geheim['SHEET_GEHEIMNIS'], 'Eingang' => $zeit), $daten);
    $c = curl_init($geheim['SHEET_URL']);
    curl_setopt_array($c, array(
        // POST ueber CURLOPT_POST (nicht CUSTOMREQUEST): Apps Script
        // antwortet mit einer Weiterleitung, die per GET abgeholt wird.
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($zeile, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => array('Content-Type: application/json'),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 5,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 25,
    ));
    $text   = curl_exec($c);
    $status = (int) curl_getinfo($c, CURLINFO_HTTP_CODE);
    $fehler = curl_error($c);
    curl_close($c);
    if ($text === false) {
        error_log('Tabelle-Fehler: ' . $fehler);
        return false;
    }
    if ($status >= 200 && $status < 300 && strpos($text, '"ok":true') !== false) return true;
    error_log('Tabelle-Fehler ' . $status . ' ' . substr($text, 0, 300));
    return false;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') antwort(405, array('ok' => false, 'fehler' => 'Nur POST'));

$geheim = @include __DIR__ . '/geheim.php';
if (!is_array($geheim) || empty($geheim['SHEET_URL']) || empty($geheim['SHEET_GEHEIMNIS'])) {
    antwort(503, array('ok' => false, 'fehler' => 'Versand nicht eingerichtet'));
}

// Das Formular schickt wenige hundert Zeichen; mehr als 20 KB ist kein Formular
$roh = file_get_contents('php://input', false, null, 0, 20001);
$eingang = (is_string($roh) && strlen($roh) <= 20000) ? json_decode($roh, true) : null;
if (!is_array($eingang)) antwort(400, array('ok' => false, 'fehler' => 'Ungueltige Daten'));

// Falle fuer Bots: ein Feld, das Menschen nicht sehen und nicht fuellen
// (feld_x7 in quellen/kontakt.html; "Webseite" war der alte Name)
$falle = (isset($eingang['feld_x7']) ? als_text($eingang['feld_x7']) : '')
       . (isset($eingang['Webseite']) ? als_text($eingang['Webseite']) : '');
if ($falle !== '') antwort(200, array('ok' => true));

$daten = array();
foreach ($FELDER as $feld) {
    $daten[$feld] = saeubern(als_text(isset($eingang[$feld]) ? $eingang[$feld] : null));
}
foreach ($PFLICHT as $feld) {
    if ($daten[$feld] === '') antwort(400, array('ok' => false, 'fehler' => $feld . ' fehlt'));
}
if (!preg_match('/^[0-9]{4,5}\z/', $daten['PLZ'])) antwort(400, array('ok' => false, 'fehler' => 'PLZ ungueltig'));
// Wie im Formular (assets/app.js, [data-vorwahl]): nur Ziffern, Leerzeichen
// und + - / ( ), mindestens sechs Ziffern
if (!preg_match('/^[0-9 +()\/-]+\z/', $daten['Telefon']) || strlen(preg_replace('/[^0-9]/', '', $daten['Telefon'])) < 6) {
    antwort(400, array('ok' => false, 'fehler' => 'Telefon ungueltig'));
}
// Grob wie type="email" im Formular: etwas@etwas.etwas, ohne Leerzeichen
if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+\z/', $daten['E-Mail'])) {
    antwort(400, array('ok' => false, 'fehler' => 'E-Mail ungueltig'));
}
$daten['Telefon'] = telefon($daten['Telefon'], isset($eingang['Vorwahl']) ? als_text($eingang['Vorwahl']) : '');

$jetzt = new DateTime('now', new DateTimeZone('Europe/Berlin'));
$zeit  = $jetzt->format('j.n.Y, H:i:s'); // wie toLocaleString("de-DE") im Worker

if (!in_tabelle($geheim, $daten, $zeit)) {
    antwort(502, array('ok' => false, 'fehler' => 'Speichern fehlgeschlagen'));
}
antwort(200, array('ok' => true));
