#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Setzt die Seiten im Wurzelverzeichnis aus quellen/ zusammen.

    python3 werkzeuge/bauen.py

Bearbeitet wird ausschliesslich quellen/. Was hier herauskommt - die
HTML-Dateien im Wurzelverzeichnis und assets/schaubilder.js - ist
Bauergebnis; direkte Aenderungen daran gehen beim naechsten Lauf verloren.

Drei Regeln, mehr kann die Vorlage nicht:

  <!--einbau: kopfzeile.html-->   setzt quellen/bausteine/kopfzeile.html ein
  {{titel}}                       setzt einen Wert aus dem Kopfblock ein
  data-aktiv="KLASSEN"            markiert auf der eigenen Seite den Menuepunkt

Der Kopfblock steht am Anfang der Quelldatei:

  <!--werte
  titel:        Beispielseite - taskrunner
  beschreibung: Ein Satz fuer Google und die Vorschau in sozialen Netzen.
  -->

Seiten duerfen in Unterordnern liegen (Blogbeitraege unter
JJJJ/MM/TT/titel/index.html, wie im alten WordPress). Relative Pfade
schreibt man dort trotzdem so, als laege die Seite im Wurzelverzeichnis;
der Bau stellt ihnen die passende Zahl ../ voran.
"""
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
QUELLEN = os.path.join(WURZEL, 'quellen')
BAUSTEINE = os.path.join(QUELLEN, 'bausteine')
# Ordner unter quellen/, die keine Seiten enthalten.
KEINE_SEITEN = {'bausteine', 'schaubilder'}

sys.path.insert(0, HIER)
from htmlformat import formatiere  # noqa: E402

# Werte, die jede Seite hat, solange sie nichts anderes sagt.
VORGABEN = {
    'start': 'index.html',        # Ziel des Logos oben links
    'kontakt': 'kontakt.html',
    'robots': '',                 # z.B. <meta name="robots" content="noindex, nofollow">
}
# Live-Adresse; daraus entstehen Canonical und og:url jeder Seite.
DOMAIN = 'https://www.taskrunner.de'
HINWEIS = '<!-- Erzeugt aus quellen/%s - Aenderungen bitte dort vornehmen. -->'


def werte_lesen(text):
    m = re.search(r'<!--werte\s*\n(.*?)-->\s*', text, re.S)
    if not m:
        return dict(VORGABEN), text
    w = dict(VORGABEN)
    for zeile in m.group(1).splitlines():
        if not zeile.strip():
            continue
        if ':' not in zeile:
            raise SystemExit('Kopfblock: "%s" ist kein "name: wert"' % zeile.strip())
        name, wert = zeile.split(':', 1)
        w[name.strip()] = wert.strip()
    # Ohne eigene Angabe zeigt die Vorschau in sozialen Netzen denselben
    # Satz wie die Suchmaschine.
    w.setdefault('ogbeschreibung', w.get('beschreibung', ''))
    return w, text[:m.start()] + text[m.end():]


def einbauen(text, tiefe=0):
    if tiefe > 5:
        raise SystemExit('Bausteine bauen sich gegenseitig ein.')

    def ersetzen(m):
        pfad = os.path.join(BAUSTEINE, m.group(1).strip())
        if not os.path.exists(pfad):
            raise SystemExit('Baustein fehlt: ' + pfad)
        with open(pfad, encoding='utf-8') as d:
            return einbauen(d.read().strip(), tiefe + 1)

    return re.sub(r'[ \t]*<!--einbau:\s*([^>]+?)\s*-->', ersetzen, text)


def werte_einsetzen(text, werte, datei):
    def ersetzen(m):
        name = m.group(1)
        if name not in werte:
            raise SystemExit('%s: kein Wert fuer {{%s}}' % (datei, name))
        return werte[name]
    return re.sub(r'\{\{([a-z0-9_-]+)\}\}', ersetzen, text)


def menue_markieren(text, datei, bereich):
    """Der Menuepunkt, der auf `bereich` zeigt, bekommt die hervorgehobenen
    Klassen aus data-aktiv. `bereich` ist die Seite selbst, ausser der
    Kopfblock sagt mit `menue:` etwas anderes (ein Blogbeitrag gehoert zu
    blog.html). aria-current="page" nur auf der Seite selbst."""
    def ersetzen(m):
        ziel, aktivklassen, rest = m.group(1), m.group(2), m.group(3)
        if ziel == bereich:
            rest = re.sub(r'class="[^"]*"', 'class="%s"' % aktivklassen, rest, count=1)
            aktuell = 'page' if ziel == datei else 'true'
            return '<a href="%s" aria-current="%s"%s' % (ziel, aktuell, rest)
        return '<a href="%s"%s' % (ziel, rest)
    return re.sub(r'<a href="([^"]*)" data-aktiv="([^"]*)"([^>]*)', ersetzen, text)


# Schon absolut oder kein Dateipfad: https:, mailto:, tel:, /kontakt, #inhalt
NICHT_RELATIV = re.compile(r'^(?:[a-z][a-z0-9+.-]*:|/|#|$)', re.I)


def pfade_anpassen(text, datei):
    """Fuer Seiten in Unterordnern: relative Pfade in href, src, srcset und
    poster zeigen im Quelltext auf das Wurzelverzeichnis und bekommen hier
    je Ordnerebene ein ../ vorangestellt."""
    tiefe = datei.count('/')
    if not tiefe:
        return text
    hoch = '../' * tiefe

    def pfad(p):
        return p if NICHT_RELATIV.match(p) else hoch + p

    def ersetzen(m):
        name, wert = m.group(1), m.group(2)
        if name == 'srcset':
            wert = ', '.join(pfad(teil.strip()) for teil in wert.split(','))
        else:
            wert = pfad(wert)
        return '%s="%s"' % (name, wert)
    return re.sub(r'(?<![\w-])(href|src|srcset|poster)="([^"]*)"', ersetzen, text)


def adresse(datei):
    """Oeffentliche Adresse einer Seite, so wie Cloudflare sie ausliefert:
    index.html -> /, kontakt.html -> /kontakt, a/b/index.html -> /a/b/"""
    if datei == 'index.html' or datei.endswith('/index.html'):
        return DOMAIN + '/' + datei[:-len('index.html')]
    return DOMAIN + '/' + datei[:-len('.html')]


def seite_bauen(datei):
    with open(os.path.join(QUELLEN, datei), encoding='utf-8') as d:
        text = d.read()
    werte, text = werte_lesen(text)
    werte.setdefault('adresse', adresse(datei))
    text = einbauen(text)
    text = werte_einsetzen(text, werte, datei)
    text = menue_markieren(text, datei, werte.get('menue', datei))
    text = pfade_anpassen(text, datei)
    text = formatiere(text)
    marke = HINWEIS % datei
    if text.lstrip().lower().startswith('<!doctype'):
        kopf, _, rest = text.partition('\n')
        text = kopf + '\n' + marke + '\n' + rest
    else:
        text = marke + '\n' + text
    ziel = os.path.join(WURZEL, datei)
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    with open(ziel, 'w', encoding='utf-8') as d:
        d.write(text)
    return len(text)


def seiten_finden():
    """Alle .html unter quellen/ ausser in bausteine/ und schaubilder/,
    als Pfad relativ zu quellen/ mit / als Trenner."""
    seiten = []
    for ordner, unterordner, dateien in os.walk(QUELLEN):
        if ordner == QUELLEN:
            unterordner[:] = [u for u in unterordner if u not in KEINE_SEITEN]
        for d in dateien:
            if d.endswith('.html'):
                pfad = os.path.relpath(os.path.join(ordner, d), QUELLEN)
                seiten.append(pfad.replace(os.sep, '/'))
    return sorted(seiten)


def schaubilder_bauen():
    """Haengt quellen/schaubilder/*.js in fester Reihenfolge zu einer Datei
    zusammen - kern.js zuerst, danach die Motive alphabetisch."""
    ordner = os.path.join(QUELLEN, 'schaubilder')
    if not os.path.isdir(ordner):
        return None
    teile = sorted(d for d in os.listdir(ordner) if d.endswith('.js'))
    if not teile:
        return None
    # kern.js legt die Klasse an, start.js startet - dazwischen die Motive.
    teile.sort(key=lambda d: (d != 'kern.js', d == 'start.js', d))
    aus = ['/* Erzeugt aus quellen/schaubilder/ - Aenderungen bitte dort.\n'
           '   Reihenfolge: %s */\n' % ', '.join(teile)]
    for t in teile:
        with open(os.path.join(ordner, t), encoding='utf-8') as d:
            aus.append('\n/* == %s %s */\n%s' % (t, '=' * (68 - len(t)), d.read().rstrip() + '\n'))
    ziel = os.path.join(WURZEL, 'assets', 'schaubilder.js')
    with open(ziel, 'w', encoding='utf-8') as d:
        d.write(''.join(aus))
    return len(teile)


def quellenliste_schreiben(seiten):
    """Traegt in tailwind/input.css ein, welche Seiten Tailwind durchsuchen
    muss. Fehlt eine Seite dort, fehlen hinterher ihre Klassen im CSS -
    deshalb macht das der Bau und nicht die Hand."""
    pfad = os.path.join(WURZEL, 'tailwind', 'input.css')
    with open(pfad, encoding='utf-8') as d:
        css = d.read()
    anfang, ende = '/* seiten:anfang */', '/* seiten:ende */'
    if anfang not in css or ende not in css:
        print('  Hinweis: Markierungen in tailwind/input.css fehlen, '
              'Seitenliste unveraendert.')
        return
    zeilen = ''.join('@source "../%s";\n' % s for s in seiten)
    neu = css[:css.index(anfang) + len(anfang)] + '\n' + zeilen + css[css.index(ende):]
    if neu != css:
        with open(pfad, 'w', encoding='utf-8') as d:
            d.write(neu)
        print('  %-26s %6d Seiten' % ('tailwind/input.css', len(seiten)))


def main():
    seiten = seiten_finden()
    for s in seiten:
        print('  %-26s %6d Zeichen' % (s, seite_bauen(s)))
    # Nur Seiten, die das Tailwind-CSS ueberhaupt einbinden.
    mit_css = []
    for s in seiten:
        with open(os.path.join(WURZEL, s), encoding='utf-8') as d:
            if 'assets/style.css' in d.read():
                mit_css.append(s)
    quellenliste_schreiben(mit_css)

    n = schaubilder_bauen()
    if n:
        print('  %-26s %6d Teile' % ('assets/schaubilder.js', n))
    print('%d Seiten gebaut.' % len(seiten))


if __name__ == '__main__':
    main()
