# Hetzner-Fassung

Diesen Ordner und `.github/workflows/deploy-hetzner.yml` gibt es nur im Zweig
`hetzner-version`. `main` ist und bleibt die Cloudflare-Fassung; hier kommt nur dazu,
was das Hetzner-Webhosting (taskrunner.de) zusätzlich braucht. Der Zweig
ändert keine Datei aus `main`, er fügt nur welche hinzu – deshalb lässt sich
`main` jederzeit ohne Konflikte übernehmen.

Auf dem Mac liegt der Zweig in einem eigenen Ordner neben `website/`:
`website-hetzner/` (ein zweiter Arbeitsordner desselben Repositorys). In
`website/` wird wie bisher gearbeitet.

## Hetzner auf den neuesten Stand bringen

Erst `main` wie gewohnt pushen (`website/hochladen.sh`), dann:

    ~/Desktop/"Website Taskrunner"/website-hetzner/hetzner/aktualisieren.sh

Das übernimmt `main` von GitHub in diesen Zweig und pusht ihn. Der Push
startet auf GitHub „Deploy auf Hetzner“: bauen, per FTPS in den Web-Root
(`public_html/`) laden. Hochgeladen wird nur, was sich geändert hat.

Von allein kommt nichts nach Hetzner: Auch die Stellen, die GitHub stündlich
aus Personio nach `main` holt, erscheinen dort erst nach dem nächsten
`aktualisieren.sh`.

## Was hier liegt

| Datei | Wofür |
|---|---|
| `.htaccess` | Adressen ohne `.html`, Weiterleitungen (auch die Adressen des alten WordPress), Header, Sperren – das, was bei Cloudflare `_headers`, `_redirects` und die Plattform selbst erledigen |
| `api/registrierung.php` | Handwerker-Formular; gleiche Logik wie `worker/index.js` |
| `fertig.mjs` | macht nach `npm run build` aus `dist/` die Hetzner-Fassung: legt `.htaccess` und `api/` hinein, schreibt `sitemap.xml` und `robots.txt`, trägt den Search-Console-Nachweis in die Seiten ein |
| `aktualisieren.sh` | siehe oben |

Zwei Dinge holt `fertig.mjs` beim Bau aus `main`, sie werden hier nicht
gepflegt: die **Adresse** (aus `DOMAIN` in `werkzeuge/bauen.py`, derzeit
`https://www.taskrunner.de`; die Variante ohne www leitet dorthin) und die
**Content-Security-Policy** (aus `_headers`).

Was bei Änderungen auf `main` von Hand nachzuziehen ist:

- Logik in `worker/index.js` geändert → `api/registrierung.php`
- neue Zeile in `_redirects` oder ein anderer Header als die CSP in `_headers`
  → `.htaccess`

Lokal bauen (im Ordner `website-hetzner/`, braucht dort einmal `npm install`):

    npm run build && node hetzner/fertig.mjs

## Generalprobe ohne Risiko

Liegt die Datei `hetzner/PROBE` im Zweig, lädt der Deploy die Seite nicht in
den Web-Root, sondern nur in den Unterordner `/_probe/` (siehe
`hetzner/probe.mjs`). So lässt sich auf dem echten Server prüfen, ob die
`.htaccess` angenommen wird, PHP läuft und das Formular die Google-Tabelle
erreicht. `hetzner/PROBE` löschen und pushen schaltet auf den Web-Root um;
`_probe/` räumt der Deploy dabei von selbst ab.

## Einmalig einrichten

GitHub → Repo → Settings → Secrets and variables → Actions, fünf Secrets:

| Secret | Wert |
|---|---|
| `HETZNER_FTP_HOST` | `wwwNNN.your-server.de` (konsoleH → Zugangsdaten), nicht `taskrunner.de` |
| `HETZNER_FTP_USER` | FTP-Benutzer |
| `HETZNER_FTP_PASSWORD` | FTP-Passwort |
| `SHEET_URL` | Web-App-URL des Apps-Scripts an der Google-Tabelle |
| `SHEET_GEHEIMNIS` | Script-Property `GEHEIMNIS` desselben Scripts (`werkzeuge/google-tabelle.gs`) |

Optional ein sechstes für den Bot-Schutz im Handwerker-Formular:

| Secret | Wert |
|---|---|
| `TURNSTILE_GEHEIMNIS` | Secret Key des Turnstile-Widgets (Cloudflare-Dashboard → Turnstile). Erst eintragen, wenn der Sitekey in `quellen/kontakt.html` (`data-turnstile`) live ist – sonst lehnt der Server jede Anmeldung ab. Wirkt ab dem nächsten Deploy. Ohne das Secret wird nicht geprüft. |

Solange die drei HETZNER-Secrets fehlen, lädt der Workflow nichts hoch. Live
geht die Seite mit dem ersten Lauf, bei dem sie eingetragen sind: entweder
beim nächsten Push auf `hetzner-version` oder über GitHub → Actions → letzter Lauf →
„Re-run all jobs“.

Liegt der Web-Root für den FTP-Benutzer nicht unter `public_html/`: unter
Variables (nicht Secrets) `HETZNER_FTP_DIR` anlegen, mit Schrägstrich am Ende.

## Das alte WordPress

Die Dateien liegen weiter im selben Web-Root, werden aber von der
`.htaccess` stillgelegt: kein PHP, kein Login. Erreichbar bleiben nur die
Medien unter `/wp-content/uploads/`, damit alte Bildlinks nicht brechen.

Die Datenbank des WordPress wurde am 2. Oktober 2026 gelöscht (das
Webhosting erlaubt nur eine, sie wird jetzt für Matomo gebraucht). Einen
Weg zurück zum alten WordPress gibt es damit nicht mehr; die Datei
`.htaccess-wordpress` im Web-Root ist nur noch ein Überbleibsel. Ein
SQL-Export der alten Datenbank liegt bei Marc.

## Besucherstatistik (Matomo)

Matomo läuft auf demselben Webhosting unter `https://stats.taskrunner.de`,
auf dem Server im Ordner `public_html/stats/` (konsoleH lässt Ziele für
Subdomains nur unterhalb von `public_html` zu). Der Website-Deploy fasst
den Ordner nicht an.

| Datei | Zweck |
|---|---|
| `hetzner/matomo/VERSION` | Matomo-Version für die Erstinstallation |
| `hetzner/matomo/htaccess` | wird zu `stats/.htaccess`: nimmt für Matomo zurück, was die Website-`.htaccess` sperrt (PHP, CSP), und sperrt Matomos Interna. Steht für sich allein: unter `stats.taskrunner.de` gilt die Website-`.htaccess` auf Hetzner nicht mit |
| `hetzner/matomo/entpacken.php` | entpackt das Archiv auf dem Server, nur bei der Erstinstallation, löscht sich danach selbst |
| `.github/workflows/matomo-hetzner.yml` | läuft, wenn sich eine dieser Dateien im Zweig `hetzner-version` ändert |

Der Workflow lädt das Archiv von `builds.matomo.org`, prüft die Signatur
und spielt es ein – aber nur, solange Matomo noch nicht eingerichtet ist
(`stats/config/config.ini.php` fehlt). Danach lädt er nur noch die
`.htaccess` hoch.

**Updates** macht Matomo selbst: im Matomo-Admin anmelden, den
Update-Hinweis oben anklicken. Etwa monatlich nachsehen – Matomo ist eine
öffentlich erreichbare Anwendung mit Login.

Datenbank: dieselbe Zugangsart wie früher WordPress (konsoleH →
MariaDB/MySQL), Tabellenpräfix `matomo_`. Die Zugangsdaten stehen nur in
`stats/config/config.ini.php` auf dem Server.

## Wenn taskrunner.de zu Cloudflare umzieht

Dann wird dieser Zweig nicht mehr gebraucht: Ordner `website-hetzner/`
entfernen (`git worktree remove ../website-hetzner` im Ordner `website/`),
Zweig `hetzner-version` und die Secrets auf GitHub löschen. Matomo müsste dann woanders weiterlaufen oder ersetzt werden. An `main` ist nichts
zurückzubauen.
