# taskrunner – Website (statisch)

Umsetzung des Figma-Frames `151-1502` aus *Website Taskrunner*.
Kein Framework, keine Laufzeitabhängigkeit. Zum Anschauen genügt die fertige
HTML-Datei im Wurzelverzeichnis; bearbeitet wird `quellen/`.

```
quellen/              HIER wird gearbeitet
  bausteine/          Kopfzeile, Fußzeile, Meta-Tags – einmal für alle Seiten
  <seite>.html        der eigene Inhalt je Seite
  schaubilder/        je Canvas-Motiv eine Datei
werkzeuge/bauen.py    setzt daraus die Seiten zusammen
werkzeuge/htmlformat.py

index.html, agb.html …  Bauergebnis, nicht von Hand ändern
assets/style.css      fertig kompiliertes CSS (Tailwind)
assets/schaubilder.js Bauergebnis aus quellen/schaubilder/
assets/app.js         Mobile-Menü + Karussell, lesbares Vanilla-JS
assets/fonts/         DIN Pro als woff2, Light bis Black
images/               Hero, Werkzeuge, Kontaktfoto, Karte, Logo
tailwind/input.css    Quelle für style.css – Farben und Typografie stehen hier
TYPOGRAFIE.md         die verbindlichen Schriftregeln
CLAUDE.md             Kurzanleitung: was liegt wo, wie wird gebaut
```

## Wie gebaut wird

```bash
python3 werkzeuge/bauen.py     # quellen/ -> Seiten im Wurzelverzeichnis
npm run css                    # tailwind/input.css -> assets/style.css
```

Kopfzeile und Fußzeile stehen dadurch genau einmal im Projekt statt neunmal.
Was `bauen.py` an Vorlagensyntax versteht – drei Dinge – steht in `CLAUDE.md`.
Die gebauten Seiten liegen mit im Git, damit die Cloudflare-CI nur noch
ausliefern muss.

## Herkunft der Assets

Alles kommt aus deinem Projektordner, nichts ist nachgebaut:

| Datei hier | Quelle |
|---|---|
| `images/hero.webp` | `Images/screen bheance.png`, unten auf 1920x1000 beschnitten |
| `images/feature-tools.png` | `Images/Tools_v3.png` (freigestellt, auf 760 px verkleinert) |
| `images/contact.webp` | `Images/CTA Bild Startseite Melanie.webp` |
| `images/germany-dots.svg` | `Images/karte-394-punkte-klein.svg` |
| `images/logo.svg` / `logo-white.svg` | `Images/Logo Taskrunner/Logo Color.svg` bzw. `Logo Color White Font.svg` |
| `assets/fonts/dinpro-*.woff2` | `Font/DINPro-*.ttf`, nach woff2 konvertiert |

## Farben

Alle Markenfarben stehen im `@theme`-Block in `tailwind/input.css`:

```css
--color-navy:     #022470;   /* exakt die Farbe der Hero-Bildunterkante */
--color-blue:     #4285f4;   /* aus deiner styles.css */
--color-blue-600: #2a6fdb;   /* aus deiner styles.css */
--color-yellow:   #f9ba00;   /* aus dem Logo-SVG */
--color-ink:      #1a4081;   /* Logo-Dunkelblau */
--color-stone:    #f0f1f5;
--color-blue-300: #5b93f6;   /* GESCHÄTZT: helle Kachel im Bento-Grid */
--color-ice:      #eaf0fd;   /* GESCHÄTZT: helle Sektions-Hintergründe */
```

Die beiden mit GESCHÄTZT markierten Werte habe ich aus dem Prototyp abgelesen,
nicht aus einer Datei übernommen. Wenn du die echten Werte hast: hier ändern,
dann `assets/style.css` neu bauen.

### Warum `--color-navy` an der Bildkante hängt

Das Hero-Bild enthält den dunklen Bereich unten selbst. Es ist genau dort
abgeschnitten, wo die Fläche einheitlich wird, und die letzten 40 Bildzeilen
laufen exakt in `#022470` aus. Das Textband darunter setzt dieselbe Farbe fort –
deshalb sieht man keine Kante. Wenn du das Hero-Bild austauschst, musst du
`--color-navy` auf die Unterkante des neuen Bildes anpassen, sonst entsteht
genau diese Kante wieder.

## Typografie

Größen, Zeilenhöhen und Laufweiten sind in `TYPOGRAFIE.md` dokumentiert und in
`tailwind/input.css` im Abschnitt „Typografie-Skala" umgesetzt. Kurzfassung:
DIN Pro, Überschriften Bold, Fließtext Medium 17 px, Größen h1 80 / h2 56 /
h3 40 / h4 28 px ab 1069 px Breite, darunter zwei Abstufungen.

## Texte ändern

In `quellen/<seite>.html`, danach `python3 werkzeuge/bauen.py`. Normales HTML;
die einzige Vorlagensyntax sind `<!--einbau: …-->`, `{{werte}}` und der
`<!--werte …-->`-Kopfblock.

## Arbeitsablauf

```bash
python3 werkzeuge/bauen.py     # nach jeder Änderung in quellen/
npm run css                    # nach jeder Änderung an input.css oder an Klassen
python3 -m http.server 8765    # Vorschau unter http://localhost:8765
```

Seite im Browser offen lassen und nach jeder Änderung Cmd+R drücken. Der
lokale Server ist dem Doppelklick vorzuziehen, weil absolute Links wie
`/kontakt` sonst ins Leere laufen.

> Reihenfolge: erst `bauen.py`, dann das CSS. Tailwind liest die benutzten
> Klassen aus den gebauten Seiten im Wurzelverzeichnis.

## CSS neu bauen

Nötig, wenn du **Farben änderst** oder eine **Tailwind-Klasse benutzt, die
bisher nirgends im HTML steht**. Für reine Textänderungen ist nichts zu tun.

> Wichtig: erst das HTML speichern, dann das CSS bauen. Tailwind liest die
> benutzten Klassen aus `index.html` – in der umgekehrten Reihenfolge fehlen
> genau die Klassen, die du gerade neu eingebaut hast.

**Variante A – ohne Node**, Standalone-Binary von
<https://github.com/tailwindlabs/tailwindcss/releases> (`tailwindcss-macos-arm64`):

```bash
./tailwindcss -i tailwind/input.css -o assets/style.css --minify
```

**Variante B – mit npm:**

```bash
npm install          # einmalig
npm run css          # einmal bauen
npm run css:watch    # oder beim Arbeiten mitlaufen lassen
```

## Verhältnis zum Astro-Projekt

Dieser Ordner ist der aktuelle Stand und wird alleine weiterentwickelt. Das
früher gelieferte Astro-Projekt ist damit **veraltet** – Typografie-Skala und
alle Änderungen ab diesem Punkt stecken nur hier drin.

Falls später doch auf Astro oder ein CMS umgestellt wird: Markup und
Klassennamen sind unverändert Tailwind, `tailwind/input.css` lässt sich
unverändert als `global.css` übernehmen, `assets/app.js` entspricht den beiden
Script-Blöcken. Der Umzug bleibt also überschaubar.

## Was noch offen ist

- Die Leistungskarten 2–4 haben im Figma-Frame keine Illustration und sind
  deshalb auch hier ohne Bild. In `Images/Icons/` liegen passende SVGs
  (Service-Truck, Financial-App, Strategy, Help), falls sie doch welche
  bekommen sollen.
- Die Navigationslinks zeigen auf `/dienstleistungen`, `/blog` usw. – diese
  Seiten gibt es noch nicht. Beim Öffnen per Doppelklick laufen absolute Pfade
  ins Leere, auf einem Webserver stimmen sie.
- Kein externer Request: DIN Pro liegt lokal, es geht nichts an Google oder ein
  CDN. DSGVO-seitig also unbedenklich.

## Barrierefreiheit

Skip-Link, semantische Landmarks, Alt-Texte, sichtbarer Fokus-Ring,
`aria-expanded` am Mobile-Menü, `prefers-reduced-motion` wird respektiert.
