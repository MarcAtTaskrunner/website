<?php
// Entpackt matomo.zip neben dieser Datei - einmalig, bei der Erstinstallation.
//
// Auf dem Webhosting gibt es keine Shell, und 13.000 Dateien einzeln per
// FTP hochzuladen dauert sehr lange. Deshalb laedt der Workflow
// (.github/workflows/matomo-hetzner.yml) das eine Archiv hoch und ruft
// diese Datei auf, bis alles entpackt ist: je Aufruf rund zwoelf Sekunden
// Arbeit, die Antwort nennt die Stelle, an der es weitergeht.
//
// Schutz: nur mit dem Token, das der Workflow fuer genau diesen Lauf
// erzeugt und hier eintraegt. Am Ende loescht sich die Datei selbst
// (samt Archiv); der Workflow raeumt zusaetzlich per FTP auf. Ist Matomo
// schon eingerichtet (config/config.ini.php), tut sie nichts.

$TOKEN = '@@TOKEN@@';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function raus($status, $daten) {
    http_response_code($status);
    echo json_encode($daten);
    exit;
}

if (strlen($TOKEN) < 32 || !isset($_GET['t']) || !is_string($_GET['t']) || !hash_equals($TOKEN, $_GET['t'])) {
    raus(403, array('ok' => false));
}

$hier   = __DIR__;
$archiv = $hier . '/matomo.zip';
$umgebung = array('php' => PHP_VERSION);
foreach (array('zip', 'pdo_mysql', 'mysqli', 'mbstring', 'gd', 'curl', 'xml', 'json') as $e) {
    $umgebung[$e] = extension_loaded($e);
}

if (file_exists($hier . '/config/config.ini.php')) {
    raus(409, array('ok' => false, 'fehler' => 'Matomo ist schon eingerichtet', 'umgebung' => $umgebung));
}
if (!class_exists('ZipArchive')) raus(500, array('ok' => false, 'fehler' => 'PHP-Erweiterung zip fehlt', 'umgebung' => $umgebung));
if (!is_file($archiv)) raus(500, array('ok' => false, 'fehler' => 'matomo.zip fehlt', 'umgebung' => $umgebung));

$zip = new ZipArchive();
if ($zip->open($archiv) !== true) raus(500, array('ok' => false, 'fehler' => 'matomo.zip nicht lesbar'));

$ab    = isset($_GET['ab']) ? max(0, (int) $_GET['ab']) : 0;
$zahl  = $zip->numFiles;
$ende  = microtime(true) + 12;
$i     = $ab;
@set_time_limit(60);

for (; $i < $zahl && microtime(true) < $ende; $i++) {
    $name = $zip->getNameIndex($i);
    // Im Archiv liegt alles im Ordner matomo/; daneben nur eine Anleitung.
    if ($name === false || strpos($name, 'matomo/') !== 0) continue;
    $rel = substr($name, 7);
    if ($rel === '' || strpos($rel, '..') !== false || $rel[0] === '/') continue;
    $ziel = $hier . '/' . $rel;
    if (substr($rel, -1) === '/') {
        if (!is_dir($ziel) && !mkdir($ziel, 0755, true)) raus(500, array('ok' => false, 'fehler' => 'Ordner nicht anlegbar: ' . $rel));
        continue;
    }
    $ordner = dirname($ziel);
    if (!is_dir($ordner) && !mkdir($ordner, 0755, true)) raus(500, array('ok' => false, 'fehler' => 'Ordner nicht anlegbar: ' . $rel));
    $ein = $zip->getStream($name);
    $aus = $ein ? fopen($ziel, 'wb') : false;
    if (!$ein || !$aus) raus(500, array('ok' => false, 'fehler' => 'Datei nicht schreibbar: ' . $rel));
    stream_copy_to_stream($ein, $aus);
    fclose($ein);
    fclose($aus);
}
$zip->close();

if ($i < $zahl) raus(200, array('ok' => true, 'fertig' => false, 'weiter' => $i, 'von' => $zahl, 'umgebung' => $umgebung));

@unlink($archiv);
@unlink(__FILE__);
raus(200, array('ok' => true, 'fertig' => true, 'von' => $zahl, 'umgebung' => $umgebung));
