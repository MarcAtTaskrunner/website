# taskrunner – Startseite (statisch, ohne Build)

Umsetzung des Figma-Frames `151-1502` aus *Website Taskrunner*.
**`index.html` doppelklicken genügt** – kein Node, kein npm, kein Build.
Zum Veröffentlichen den kompletten Ordnerinhalt hochladen.

```
index.html            die ganze Seite
assets/style.css      fertig kompiliertes CSS (Tailwind)
assets/app.js         Mobile-Menü + Karussell, lesbares Vanilla-JS
assets/fonts/         DIN Pro als woff2, Light bis Black
images/               Hero, Werkzeuge, Kontaktfoto, Karte, Logo
favicon.svg
tailwind/input.css    Quelle für style.css – Farben und Typografie stehen hier
TYPOGRAFIE.md         die verbindlichen Schriftregeln
package.json          nur für den optionalen CSS-Befehl
```

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

Direkt in `index.html`. Normales HTML, keine Template-Syntax.

## Arbeitsablauf

Dieser Ordner ist der Arbeitsstand. Tailwind ist hier lokal installiert, es
wird nichts mehr hin- und hergeschoben:

```bash
npm run css          # einmal bauen
npm run css:watch    # beim Arbeiten mitlaufen lassen
```

`index.html` in Chrome offen lassen (Doppelklick reicht, `file://` funktioniert
inklusive Schriften) und nach jeder Änderung Cmd+R drücken.

> Reihenfolge: erst HTML speichern, dann CSS bauen. Tailwind liest die
> benutzten Klassen aus `index.html`.

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
