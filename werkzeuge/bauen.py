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
"""
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)
QUELLEN = os.path.join(WURZEL, 'quellen')
BAUSTEINE = os.path.join(QUELLEN, 'bausteine')

sys.path.insert(0, HIER)
from htmlformat import formatiere  # noqa: E402

# Werte, die jede Seite hat, solange sie nichts anderes sagt.
VORGABEN = {
    'start': 'index.html',        # Ziel des Logos oben links
    'kontakt': 'index.html#kontakt',
    'robots': '',                 # z.B. <meta name="robots" content="noindex, nofollow">
}
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


def menue_markieren(text, datei):
    """Auf der eigenen Seite bekommt der Menuepunkt aria-current und die
    hervorgehobenen Klassen aus data-aktiv."""
    def ersetzen(m):
        ziel, aktivklassen, rest = m.group(1), m.group(2), m.group(3)
        if ziel == datei:
            rest = re.sub(r'class="[^"]*"', 'class="%s"' % aktivklassen, rest, count=1)
            return '<a href="%s" aria-current="page"%s' % (ziel, rest)
        return '<a href="%s"%s' % (ziel, rest)
    return re.sub(r'<a href="([^"]*)" data-aktiv="([^"]*)"([^>]*)', ersetzen, text)


def seite_bauen(datei):
    with open(os.path.join(QUELLEN, datei), encoding='utf-8') as d:
        text = d.read()
    werte, text = werte_lesen(text)
    text = einbauen(text)
    text = werte_einsetzen(text, werte, datei)
    text = menue_markieren(text, datei)
    text = formatiere(text)
    marke = HINWEIS % datei
    if text.lstrip().lower().startswith('<!doctype'):
        kopf, _, rest = text.partition('\n')
        text = kopf + '\n' + marke + '\n' + rest
    else:
        text = marke + '\n' + text
    with open(os.path.join(WURZEL, datei), 'w', encoding='utf-8') as d:
        d.write(text)
    return len(text)


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
    seiten = sorted(d for d in os.listdir(QUELLEN) if d.endswith('.html'))
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
