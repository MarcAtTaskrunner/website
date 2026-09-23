# Arbeitsanleitung für dieses Projekt

Statische Website, kein Framework. Tailwind erzeugt das CSS, ein kleines
Python-Skript setzt die Seiten aus wiederverwendeten Bausteinen zusammen.

## Die eine Regel

**Bearbeitet wird nur `quellen/`.** Die HTML-Dateien im Wurzelverzeichnis und
`assets/schaubilder.js` sind Bauergebnis und werden überschrieben.

Nach jeder Änderung an `quellen/` oder `tailwind/input.css`:

```bash
python3 werkzeuge/bauen.py && npm run css
```

In dieser Reihenfolge: Tailwind schreibt nur die Klassen ins CSS, die zu
dem Zeitpunkt im gebauten HTML stehen.

Node ist installiert (v24, über den Installer von nodejs.org). Die
Cloudflare-CI baut beim Push ohnehin neu; lokal gebaut wird, damit sich
Vorschau und Live-Stand nicht unterscheiden. Die gebauten Seiten liegen
mit im Git.

## Wo liegt was

| Ich will ändern … | Datei |
|---|---|
| Navigation, Logo, Mobilmenü | `quellen/bausteine/kopfzeile.html` |
| Fußzeile, Rechtslinks, Telefonnummer | `quellen/bausteine/fusszeile.html` |
| Meta-Tags, Favicon, Open Graph | `quellen/bausteine/seitenkopf.html` |
| Domain für Canonical und `og:url` | `DOMAIN` in `werkzeuge/bauen.py` |
| Sicherheits-Header, Content-Security-Policy | `_headers`. Die CSP erlaubt nur Skripte aus eigenen Dateien plus das eine Inline-Skript `js-auf` per Hash. Ein neues Inline-Skript oder eine fremde Quelle (Analytics, Karten, Videos) wird live blockiert, bis es dort eingetragen ist |
| Welche Bilder live gehen | `build.mjs` nimmt nur Bilder mit, deren Pfad `images/…` in einer Seite, im CSS oder in einem Skript ausgeschrieben steht |
| Links `kontakt.html` → `/kontakt` für live | `build.mjs` schreibt sie nur in `dist/` um; die Seiten im Wurzelverzeichnis behalten `.html` für die Vorschau |
| Titel/Beschreibung einer Seite | Kopfblock `<!--werte …-->` in `quellen/<seite>.html` |
| Inhalt einer Seite | `quellen/<seite>.html` |
| Ein Canvas-Schaubild | `quellen/schaubilder/<motiv>.js` |
| Farben, Schrift, Komponentenklassen | `tailwind/input.css` |
| Eckenradius | Überall 20 px über `--radius-card`/`--radius-tile`/`--radius-xl` im `@theme` von `tailwind/input.css`. Ausnahmen: Buttons (`.btn`) sind Pillen, Kreise bleiben Kreise |
| Schriftgrößen | **eine** Skala in `input.css` (`@layer components`), dokumentiert in `TYPOGRAFIE.md` – es gibt keine zweite mehr |
| Mobilmenü-Verhalten, Karussell | `assets/app.js` (keine Quelle, direkt bearbeiten) |
| Stellenangebote (Jobs) | Nur die Liste steht auf der Website, jeder Eintrag verlinkt zu Personio. Titel **in Personio** pflegen. `werkzeuge/stellen.py` holt sie nach `quellen/bausteine/stellen.html` (Bauergebnis, nicht von Hand ändern); Rahmen der Seite: `quellen/karriere.html`; Aussehen: `.stelle` in `tailwind/input.css` |
| Bildergalerie im Blogbeitrag (Laufband, Lightbox) | Aussehen: `.laufband`/`.lightbox` in `tailwind/input.css`; Ziehen, Pfeiltasten, Mitlaufen, Lightbox: `assets/app.js` (`[data-laufband]`, `[data-lightbox]`) |
| Förder-Check (Förderungen): Fragen | `quellen/foerderungen.html` |
| Kontaktseite (Vertrieb links hell, Techniker rechts dunkel) | Texte, Telefon, Adressen: `quellen/kontakt.html`; Aufteilung 2/3 zu 1/3: `.kontakt-teilung`/`.kontakt-flaeche` in `tailwind/input.css` |
| Handwerker-Formular (Kontakt): Vorschläge im Feld | Verhalten: `[data-vorschlag]` in `assets/app.js`; Gewerke-Liste: `<datalist id="gewerke">` in `quellen/kontakt.html`; Orte: `assets/orte.js` ist Bauergebnis von `werkzeuge/orte.py` (alle Gemeinden DE/AT, Quellen und Aufruf im Kopf des Skripts) |
| Förder-Check: Quoten, Obergrenzen, Ergebnistexte | `assets/foerdercheck.js` (keine Quelle, direkt bearbeiten). Dieselben Werte stehen als Text in `quellen/foerderungen.html` unter „Die Programme im Einzelnen“ – bei neuen Richtlinien **beide** anpassen |

Suchen statt lesen: die Seiten sind zeilenweise umgebrochen, `grep -n` findet
die Stelle. Ganze Dateien nur öffnen, wenn es wirklich nötig ist.

## Nach jeder Änderung: zweimal bauen

```bash
python3 werkzeuge/bauen.py     # quellen/ -> Seiten im Wurzelverzeichnis
npm run css                    # tailwind/input.css -> assets/style.css
```

`assets/style.css` ist reines Bauergebnis – **nie von Hand ändern**. Tailwind
schreibt nur die Klassen hinein, die zu diesem Zeitpunkt im HTML stehen;
deshalb erst `bauen.py`, dann `npm run css`. In der umgekehrten Reihenfolge
fehlen genau die Klassen, die gerade dazugekommen sind.

Eigene Regeln (alles, was keine Tailwind-Klasse ist) gehören nach
`tailwind/input.css` – ungeschachtelt am Dateiende, wenn sie gegen die
Skala gewinnen sollen.

## Vorlagensyntax (mehr kann `bauen.py` nicht)

```html
<!--werte
titel:        Seitentitel – taskrunner
beschreibung: Ein Satz für Google und die Vorschau in sozialen Netzen.
-->
<!--einbau: kopfzeile.html-->     <!-- setzt quellen/bausteine/… ein -->
{{titel}}                          <!-- Wert aus dem Kopfblock -->
```

Werte mit Vorgabe, nur bei Abweichung nötig: `start` (Ziel des Logos,
Vorgabe `index.html`), `kontakt` (Vorgabe `kontakt.html`), `robots`
(leer; für Vorschauseiten das komplette `<meta name="robots" …>`),
`ogbeschreibung` (Vorgabe: wie `beschreibung`).

Der `<body>`-Tag steht bewusst in der Seite selbst, weil er sich je Seite
unterscheidet. Die Startseite trägt `class="variante-b"` – daran hängen ihre
eigene Typografie-Skala, die durchsichtige Kopfzeile mit Logowechsel und die
Einblendungen (alles in `tailwind/input.css`). Inzwischen tragen es auch alle
Unterseiten außer `blog.html` und `kontakt.html` (beide ohne dunkles Kopfband) – dazu das dunkle Kopfband `seitenkopf
verlauf-nacht mit-korn` (Muster ohne Foto: `quellen/impressum.html`). Die
Startseite benutzt außerdem `bausteine/kopfzeile-start.html` statt
`kopfzeile.html`.

Menüpunkte tragen in der Kopfzeile ein `data-aktiv="…"`. Baut `bauen.py` die
Seite, auf die ein Punkt zeigt, ersetzt es dessen `class` durch diesen Wert
und ergänzt `aria-current="page"`. Neuer Menüpunkt mit eigener Seite: beide
Klassenlisten dort eintragen, sonst nichts.

## Neue Seite anlegen

1. `quellen/neue-seite.html` nach dem Muster von `quellen/impressum.html`
2. `python3 werkzeuge/bauen.py` – trägt die Seite auch in `tailwind/input.css`
   für die Klassensuche ein
3. Link in `quellen/bausteine/kopfzeile.html` und/oder `fusszeile.html`

## Blogbeitrag anlegen

Beiträge behalten die Adresse aus dem alten WordPress, damit Links und
Suchtreffer nach dem Umzug weiter funktionieren:
`/2025/03/20/was-fuer-ein-erfolg-auf-der-proptech-summit-2025-in-hamburg/`.

1. `quellen/JJJJ/MM/TT/<titel>/index.html` nach dem Muster des ersten
   Beitrags; Datum und Titel exakt wie in der alten URL
2. Relative Pfade (`images/…`, `blog.html`) so schreiben, als läge die
   Seite im Wurzelverzeichnis – `bauen.py` setzt je Ordnerebene `../` davor
3. `menue: blog.html` im Kopfblock markiert „Blog“ in der Kopfzeile
4. Kachel in `quellen/blog.html` auf `JJJJ/MM/TT/<titel>/index.html`
   verlinken – mit `index.html`, sonst zeigt der Doppelklick-Aufruf
   (`file://`) nur den Ordnerinhalt. Cloudflare leitet live auf
   `…/<titel>/` um, genau wie `blog.html` auf `/blog`.

Die gebauten Jahresordner im Wurzelverzeichnis (`2025/` …) sind Bauergebnis
wie die übrigen Seiten; `build.mjs` und `pruefen.mjs` nehmen sie mit.
Auf Cloudflare liefert `…/titel/` die `index.html` aus, `…/titel` ohne
Schrägstrich leitet dorthin um.

## Stellen aus Personio

Ein GitHub-Zeitplan (`.github/workflows/stellen.yml`) ruft stündlich
`werkzeuge/stellen.py` auf. Nur wenn sich `quellen/bausteine/stellen.html`
dadurch ändert, baut er die Seiten, committet als `github-actions[bot]`
und pusht – Cloudflare veröffentlicht dann wie gewohnt.

Deshalb **vor jeder Arbeit `git pull`**, sonst wird der eigene Push
abgelehnt. Von Hand abholen geht lokal mit `python3 werkzeuge/stellen.py`
(danach wie immer bauen) oder auf GitHub unter Actions → „Stellen aus
Personio“ → Run workflow.

## Neues Schaubild anlegen

1. `quellen/schaubilder/<motiv>.js` nach dem Muster von `notdienst.js`
2. In `quellen/schaubilder/kern.js` drei Stellen ergänzen: die Namensliste im
   Konstruktor sowie je eine Zeile in `saeen()` und `zeichnen()`
3. `<canvas data-schaubild="<motiv>"></canvas>` in die Seite

`kern.js` stellt gemeinsame Werkzeuge bereit (`Schaubild.wuerfelAb`,
`Schaubild.ruhig`, `Schaubild.SCHATTEN`, Markenfarben). `start.js` läuft
zuletzt und startet alle Canvas-Elemente.

Eingebaut sind `rad`, `gewerke`, `kosten`, `dashboard`, `team`, `notdienst`
(alle auf der Startseite). `orbit` ist der Rückfall im Kern, falls ein Canvas
einen unbekannten Namen trägt. Frühere Motive (`hero`, `welle`, `posten`,
`standorte`, `pruefung`) sind entfernt und stehen bei Bedarf in der Historie:
`git show 06d2228:quellen/schaubilder/welle.js`.

## Kontrolle vor dem Ausliefern

```bash
node werkzeuge/pruefen.mjs           # alle Seiten, ohne Fenster
node werkzeuge/pruefen.mjs index.html
```

Prüft je Seite: Fehler in der Konsole, Anfragen ins Leere,
Barrierefreiheit nach WCAG AA (samt Kontrastwerten mit Zahlen),
seitlichen Überlauf bei 375/768/1440 px, Inhaltsbreite 1280 und ob die
randlosen Schaubilder bündig sitzen. Gibt nur Text aus – das ist der
schnellste Weg, etwas zu prüfen, und sollte vor dem Browser kommen.

Wenn wirklich ein Bild nötig ist, dann klein und als Ausschnitt:

```bash
node werkzeuge/bild.mjs dienstleistungen.html "#handwerk" /tmp/a.png
```

Ein Bild bleibt im Gespräch liegen und wird in **jeder folgenden Runde**
erneut gelesen. Ein ganzer Bildschirm in voller Auflösung kostet rund
2.200 Tokens – mal mehrere hundert Runden. Ein Ausschnitt in halber
Auflösung kostet davon ein Zwanzigstel. Deshalb: erst messen, nur im
Zweifel schauen, und dann nur den fraglichen Ausschnitt.

Zum Anschauen:

```bash
python3 -m http.server 8765          # dann http://localhost:8765 öffnen
```

Doppelklick auf die HTML-Datei geht auch, aber absolute Links (`/kontakt`)
laufen dann ins Leere.

## Deployen

`git push` – die Cloudflare-CI baut mit `npm run build` (Tailwind + `dist/`)
und veröffentlicht. Einzelheiten in `DEPLOY.md`.

## Werkzeuge

- `werkzeuge/bauen.py` – setzt die Seiten zusammen, hält die Tailwind-Liste
  aktuell, fügt `assets/schaubilder.js` zusammen
- `werkzeuge/htmlformat.py` – bricht HTML lesbar um; bricht nur dort, wo
  Leerraum unsichtbar ist, und ist umkehrbar (`entformatiere`)
- `werkzeuge/pruefen.mjs` – prüft die gebauten Seiten in einem Browser
  ohne Fenster (Playwright + axe-core), Ausgabe nur als Text
- `werkzeuge/schriftbild.mjs` – zeigt, welche Größe und Stärke jede
  Textklasse auf welcher Seite bekommt; zum Vergleichen zweier Seiten
- `werkzeuge/bilder.mjs` – verkleinert neue Fotos vor dem Einbau
  (`node werkzeuge/bilder.mjs images/…jpg`); JPEG/WebP, max. 2400 px,
  Dateiname bleibt
- `werkzeuge/bild.mjs` – Ausschnitt einer Seite als Bild, standardmäßig
  in halber Auflösung
