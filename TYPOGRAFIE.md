# Typografie taskrunner

Verbindliche Regeln für die Website. Umgesetzt in `tailwind/input.css`
(Abschnitt „Typografie-Skala"). Bei Änderungen: dort ändern, dann
`assets/style.css` neu bauen.

## Grundlage

- **Schrift:** DIN Pro, selbst gehostet (`assets/fonts/dinpro-*.woff2`),
  Quelle `Font/DINPro-*.ttf` im Projektordner.
- **Überschriften:** Bold (700).
- **Fließtext:** Medium (500), 17 px.
- **Zeilenhöhen, Laufweiten und Breakpoints** sind an apple.com orientiert.
  Apple setzt SF Pro; übernommen sind die Metriken, nicht die Schriftfamilie.

## Skala

Drei Breakpoints, wie bei Apple: bis 734 px, 735–1068 px, ab 1069 px.
Fließtext skaliert nicht mit — 17 px auf allen Größen.

| Klasse | ≤734 | 735–1068 | ≥1069 | line-height | letter-spacing | Gewicht |
|---|---|---|---|---|---|---|
| `.t-h1` | 48 px | 64 px | **80 px** | 1.05 | −0.015em | 700 |
| `.t-h2` | 40 px | 48 px | **56 px** | 1.0714 | −0.016em | 700 |
| `.t-h3` | 28 px | 32 px | **40 px** | 1.1 | −0.012em | 700 |
| `.t-h4` | 21 px | 24 px | **28 px** | 1.1429 | −0.014em | 700 |
| `.t-intro` | 19 px | 21 px | 21 px | 1.1905 | 0.011em | 500 |
| `.t-body` | 17 px | 17 px | 17 px | 1.4706 | −0.022em | 500 |
| `.t-caption` | 14 px | 14 px | 14 px | 1.4286 | −0.016em | 500 |
| `.t-body-tight` | 17 px | 17 px | 17 px | 1.2353 | −0.022em | 500 |
| `.t-eyebrow` | 17 px | 17 px | 17 px | 1.2353 | −0.022em | 400 |

Die fett gesetzten Werte sind die von dir vorgegebenen Größen.

`.t-body-tight` und `.t-eyebrow` sind für Karten: Apple setzt Fließtext dort
enger als im Lauftext (1.235 statt 1.471) und die Kategoriezeile darüber in
Regular statt Medium.

`h1` bis `h4` haben diese Größen als Standard — `<h2>` ist ohne weitere Klasse
automatisch 56 px. Eine `.t-*`-Klasse am Element schlägt den Standard, weil
Klassen-Selektoren höher gewichten als Element-Selektoren. Ein
`<h3 class="t-h4">` bleibt also semantisch eine Ebene 3, wird aber wie Ebene 4
gesetzt.

## Einsatz auf der Startseite

| Stelle | Element | Stufe |
|---|---|---|
| Hero-Headline | `h1` | `.t-h1` — 80 px |
| Sektions-Headlines | `h2` | `.t-h2` — 56 px |
| Hero-Subline, Sektions-Lead | `p` | `.t-intro` — 21 px |
| Titel Leistungskarten | `h3` | `.t-h4` — 28 px |
| Titel Prozessschritte | `h3` | `.t-intro` bold — 21 px |
| Zahlen im Bento-Grid | `p` | `.t-h4` — 28 px |
| Footer-Spaltentitel | `h2` | `.t-h4` — 28 px |
| Kategoriezeile über Kartentiteln | `p` | `.t-eyebrow` — 17 px Regular |
| Fließtext in Karten | `p` | `.t-body-tight` — 17 px, lh 1.235 |
| Fließtext sonst | `p`, `li` | `.t-body` — 17 px, lh 1.471 |
| Navigation, Copyright | `a`, `p` | `.t-caption` — 14 px |
| Buttons | `a` | 17 px, Medium |

### Warum drei Stellen eine Stufe tiefer gesetzt sind

- **Leistungskarten** sind 362 px breit. „Full Service Dienstleistungen" bei
  40 px läuft dort über drei Zeilen und drückt die Illustration aus der Karte.
  Bei 28 px sind es zwei Zeilen.
- **Prozessschritte** haben ganze Sätze als Titel („Das Fachpersonal oder
  Handwerksbetriebe wird digital und automatisiert von Taskrunner beauftragt.").
  Bei 28 px wären das sieben Zeilen pro Karte.
- **Footer-Spalten** bei 56 px wären so groß wie eine Sektions-Headline und
  würden den Footer optisch über die Seite stellen.

Die 40-px-Stufe (`.t-h3`) ist damit auf der Startseite unbenutzt. Sie steht
bereit, sobald es Unterseiten mit einer dritten Gliederungsebene gibt.

## Was noch offen ist

Der Figma-Frame setzt die Hero-Headline bei rund 50 px, diese Regel bei 80 px.
Bei 1440 px Breite läuft sie damit über zwei Zeilen statt über eine. Das ist
die Folge der Regel, kein Fehler — falls die Headline einzeilig bleiben soll,
ist die Vorgabe für `.t-h1` der Punkt zum Nachjustieren.


## Farbdisziplin

Nach dem Vorbild von apple.com: dort steht die komplette Sektion in einer
einzigen Textfarbe (`#1D1D1F`), Blau kommt nur im Link und in der
Strichzeichnung vor. Übertragen heißt das hier:

| Rolle | Farbe |
|---|---|
| Sektions-Headline | `--color-blue` `#4285f4` — der eine Markenmoment |
| Alle übrigen Texte auf hellem Grund | `--color-ink` `#1a4081` |
| Kategoriezeile (Eyebrow) | `--color-ink` bei 75 % Deckung |
| Bedienelemente (Pfeile, Links, Buttons) | `--color-blue` |

Damit trägt Farbe wieder Bedeutung: Blau heißt „Marke oder anklickbar".
Vorher stand die ganze Sektion in Blau, wodurch Farbe keine Hierarchie mehr
herstellen konnte.

## Abstände

Aus dem Apple-Screenshot gemessen (1710 px Viewport):

| | Wert |
|---|---|
| Karte | 372 × 540 px → 1 : 1.45 |
| Innenabstand Karte | 36 px |
| Abstand zwischen Karten | 18 px |
| Eyebrow → Titel | 20 px |
| Titel → Text | 20 px |
| Headline → Karten | 48 px |
| Karten → Karussell-Pfeile | 40 px |
| Pfeil-Durchmesser | 36 px |
| Inhaltsbreite | ~1260 px (hier: 1240 px) |

Nicht messbar war das Sektions-Padding, weil der Screenshot oben angeschnitten
ist. Dafür gilt Apples üblicher Rhythmus, umgesetzt als `.section-y`:

| Breakpoint | Padding oben/unten |
|---|---|
| ≤734 px | 60 px |
| 735–1068 px | 90 px |
| ≥1069 px | 120 px |

Karten tragen keinen Schlagschatten – bei Apple trennt allein der Kontrast
zwischen `#F5F5F7` und Weiß.

## Hero-Höhe

Die Hero-Sektion ist genau so hoch wie der Bildschirm abzüglich des Headers:

```css
.hero-viewport {
  height: calc(100vh  - var(--header-h));   /* Rückfall */
  height: calc(100dvh - var(--header-h));   /* zählt Browserleisten mobil mit */
  min-height: fit-content;
}
```

`--header-h` ist 65 px (64 px Leiste + 1 px Trennlinie). Innerhalb der Sektion
hat das Textband seine natürliche Höhe, das Bild nimmt den Rest auf.

`min-height: fit-content` ist nur die Notbremse: auf sehr flachen Fenstern
(unter ~700 px Höhe) würde der Inhalt sonst aus der Sektion in die nächste
laufen. Dort wächst der Hero stattdessen mit.

**Konsequenz:** Weil die Höhe fest ist und das Bild unten bündig sitzt, wird es
auf niedrigen Fenstern oben angeschnitten – auf 1440 × 900 bleiben ihm 347 px
statt der vollen 605 px, der Laptop ist dann oberhalb des Displays geschnitten.
Das ist die bewusste Kehrseite der festen Bildschirmhöhe. Wer stattdessen das
ganze Bild will, ersetzt `height` durch `min-height`; dann ragt der Hero auf
flachen Fenstern über den Falz.

## Bento-Grid

5-Spalten-Raster, Zeile 1 = 3 + 2, Zeile 2 = 2 + 3. Alle vier Kacheln 420 px hoch
(200 px mobil, dort einspaltig), Innenabstand 36 px, Abstand 18 px, Inhaltsbreite
1240 px wie alle anderen Sektionen.

Aufbau je Kachel: Zahl auf `.t-h2`, Label auf `.t-body` darunter, beides links
unten — Ausnahme ist die Techniker-Kachel, dort steht beides mittig.

### Standorte-Kachel

Die Punktekarte liegt absolut hinter dem Text und läuft nach unten weich aus
(`mask-image`, Verlauf ab 58 % Höhe). Dadurch überlappt sie die Zahl sichtbar,
ohne die Lesbarkeit zu kosten. Erzeugt wird sie aus einem Umriss-Polygon:
749 Punkte, alle mit Radius 4.4, auf versetztem Sechseckraster (12 × 10.4),
Farbe Dark Grey. Kein Zufall im Bild.

### Techniker-Kachel als Netzwerk

Die Zahl ist die Nabe, acht Gewerke-Icons sind die Knoten, Linien verbinden
beides — das Bild sagt „ein Anlaufpunkt, viele Techniker dahinter".

- Knoten auf einer Ellipse, Radius 38 % der Breite und 36 % der Höhe, 45° Abstand
- Linien starten am Rand des Textblocks, nicht im Mittelpunkt: für jeden Strahl
  wird der Austrittspunkt aus dem Rechteck von Zahl und Label berechnet. Deshalb
  läuft keine Linie unter der Schrift durch.
- Linien enden 30 % vor dem Icon
- SVG mit `viewBox="0 0 100 100"` und `preserveAspectRatio="none"`, damit die
  Koordinaten Prozent sind und mitskalieren; `vector-effect="non-scaling-stroke"`
  hält die Strichstärke bei 1.5 px konstant
- Icons flächengleich normiert: die Motive haben Seitenverhältnisse von 0.65 bis
  1.53, deshalb wird die Breite aus der Zielfläche geteilt durch die Wurzel des
  Verhältnisses berechnet. Sonst wirken hohe Motive doppelt so groß wie breite.

Die Icons liegen in `images/technicians/` (13 Stück, Quelle
`Images/Icons/Icons Technicians/`, auf Dark Blue eingefärbt). Acht sind im
Einsatz, die übrigen stehen zum Tauschen bereit. Alle tragen `aria-hidden` und
keinen Alt-Text — Screenreader lesen nur Zahl und Label.
