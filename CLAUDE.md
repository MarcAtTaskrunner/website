# Arbeitsanleitung für dieses Projekt

Statische Website, kein Framework. Tailwind erzeugt das CSS, ein kleines
Python-Skript setzt die Seiten aus wiederverwendeten Bausteinen zusammen.

## Die eine Regel

**Bearbeitet wird nur `quellen/`.** Die HTML-Dateien im Wurzelverzeichnis und
`assets/schaubilder.js` sind Bauergebnis und werden überschrieben.

Nach jeder Änderung an `quellen/`:

```bash
python3 werkzeuge/bauen.py
```

Node ist auf diesem Rechner nicht installiert; `npm run build` läuft nur in
der Cloudflare-CI. Deshalb liegen die gebauten Seiten im Git.

## Wo liegt was

| Ich will ändern … | Datei |
|---|---|
| Navigation, Logo, Mobilmenü | `quellen/bausteine/kopfzeile.html` |
| Fußzeile, Rechtslinks, Telefonnummer | `quellen/bausteine/fusszeile.html` |
| Meta-Tags, Favicon, Open Graph | `quellen/bausteine/seitenkopf.html` |
| Titel/Beschreibung einer Seite | Kopfblock `<!--werte …-->` in `quellen/<seite>.html` |
| Inhalt einer Seite | `quellen/<seite>.html` |
| Ein Canvas-Schaubild | `quellen/schaubilder/<motiv>.js` |
| Farben, Schrift, Komponentenklassen | `tailwind/input.css` |
| Mobilmenü-Verhalten, Karussell | `assets/app.js` (keine Quelle, direkt bearbeiten) |

Suchen statt lesen: die Seiten sind zeilenweise umgebrochen, `grep -n` findet
die Stelle. Ganze Dateien nur öffnen, wenn es wirklich nötig ist.

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
Vorgabe `index.html`), `kontakt` (Vorgabe `index.html#kontakt`), `robots`
(leer; für Vorschauseiten das komplette `<meta name="robots" …>`),
`ogbeschreibung` (Vorgabe: wie `beschreibung`).

Der `<body>`-Tag steht bewusst in der Seite selbst, weil er sich je Seite
unterscheidet. Die Startseite trägt `class="variante-b"` – daran hängen ihre
eigene Typografie-Skala, die durchsichtige Kopfzeile mit Logowechsel und die
Einblendungen (alles in `tailwind/input.css`). Die Unterseiten haben das nicht.
Sie benutzt außerdem `bausteine/kopfzeile-start.html` statt `kopfzeile.html`.

Menüpunkte tragen in der Kopfzeile ein `data-aktiv="…"`. Baut `bauen.py` die
Seite, auf die ein Punkt zeigt, ersetzt es dessen `class` durch diesen Wert
und ergänzt `aria-current="page"`. Neuer Menüpunkt mit eigener Seite: beide
Klassenlisten dort eintragen, sonst nichts.

## Neue Seite anlegen

1. `quellen/neue-seite.html` nach dem Muster von `quellen/impressum.html`
2. `python3 werkzeuge/bauen.py` – trägt die Seite auch in `tailwind/input.css`
   für die Klassensuche ein
3. Link in `quellen/bausteine/kopfzeile.html` und/oder `fusszeile.html`

## Neues Schaubild anlegen

1. `quellen/schaubilder/<motiv>.js` nach dem Muster von `notdienst.js`
2. In `quellen/schaubilder/kern.js` drei Stellen ergänzen: die Namensliste im
   Konstruktor sowie je eine Zeile in `saeen()` und `zeichnen()`
3. `<canvas data-schaubild="<motiv>"></canvas>` in die Seite

`kern.js` stellt gemeinsame Werkzeuge bereit (`Schaubild.wuerfelAb`,
`Schaubild.ruhig`, `Schaubild.SCHATTEN`, Markenfarben). `start.js` läuft
zuletzt und startet alle Canvas-Elemente.

Nicht mehr eingebaute Motive: `hero`, `posten`, `standorte`, `pruefung` –
liegen als Dateien bereit, kosten aber Ladezeit. Löschen ist gefahrlos.

## Kontrolle vor dem Ausliefern

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
