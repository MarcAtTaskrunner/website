#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Holt die offenen Stellen aus Personio und schreibt sie als Baustein.

    python3 werkzeuge/stellen.py

Ergebnis ist quellen/bausteine/stellen.html, eingebaut in karriere.html:
eine Liste mit Titel, Standort und Umfang. Jeder Eintrag verlinkt auf die
Ausschreibung bei Personio; die Beschreibung steht nur dort. Die Datei
ist Bauergebnis dieses Skripts - Titel pflegt man in Personio.

Die Ausgabe haengt nur vom Feed ab (keine Uhrzeit, feste Reihenfolge).
So aendert sich die Datei nur, wenn sich bei Personio etwas geaendert
hat - daran erkennt der GitHub-Zeitplan (.github/workflows/stellen.yml),
ob neu gebaut werden muss.

Ist Personio nicht erreichbar oder der Feed kaputt, bricht das Skript ab
und laesst die bestehende Datei stehen. Eine leere Liste schreibt es nur,
wenn Personio wirklich null Stellen meldet.
"""
import html
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET

FEED = 'https://taskrunner.jobs.personio.de/xml?language=de'
STELLE = 'https://taskrunner.jobs.personio.de/job/%s?language=de'
WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(WURZEL, 'quellen', 'bausteine', 'stellen.html')

UMFANG = {
    'full-time': 'Vollzeit',
    'part-time': 'Teilzeit',
    'full-or-part-time': 'Voll- oder Teilzeit',
}


def feed_holen():
    anfrage = urllib.request.Request(FEED, headers={'User-Agent': 'taskrunner-website'})
    with urllib.request.urlopen(anfrage, timeout=30) as antwort:
        if antwort.status != 200:
            raise SystemExit('Personio antwortet mit %s' % antwort.status)
        return antwort.read()


def stellen_lesen(xml):
    wurzel = ET.fromstring(xml)
    if wurzel.tag != 'workzag-jobs':
        raise SystemExit('Unerwarteter Feed: <%s> statt <workzag-jobs>' % wurzel.tag)
    stellen = []
    for p in wurzel.findall('position'):
        s = {
            'id': (p.findtext('id') or '').strip(),
            'titel': (p.findtext('name') or '').strip(),
            'ort': (p.findtext('office') or '').strip(),
            'umfang': (p.findtext('schedule') or '').strip(),
            'seit': (p.findtext('createdAt') or '').strip(),
        }
        if not s['id'] or not s['titel']:
            raise SystemExit('Stelle ohne id oder Titel im Feed')
        stellen.append(s)
    # Neueste zuerst; bei gleichem Datum entscheidet die id.
    stellen.sort(key=lambda s: (s['seit'], s['id']), reverse=True)
    return stellen


def baustein(stellen):
    z = ['<!-- Erzeugt von werkzeuge/stellen.py aus dem Personio-Feed - nicht von Hand aendern. -->']
    if not stellen:
        z.append('<p class="t-intro text-ink/80">Gerade ist keine Stelle ausgeschrieben. '
                 'Schauen Sie gern bald wieder vorbei oder schreiben Sie uns über die '
                 '<a href="kontakt.html" class="text-blue-600 underline decoration-blue-600/30 '
                 'underline-offset-4 transition-colors hover:decoration-blue-600">Kontaktseite</a>.</p>')
        return '\n'.join(z) + '\n'
    z.append('<ul class="stellen-liste">')
    for s in stellen:
        angaben = ' · '.join(x for x in (s['ort'], UMFANG.get(s['umfang'], '')) if x)
        z.append('<li><a href="%s" class="stelle">'
                 '<span class="stelle-kopf"><span class="stelle-titel hyphens-auto break-words t-h4">%s</span>'
                 '<span class="t-caption text-ink/75">%s</span></span></a></li>'
                 % (html.escape(STELLE % s['id'], quote=True),
                    html.escape(s['titel'], quote=False),
                    html.escape(angaben, quote=False)))
    z.append('</ul>')
    return '\n'.join(z) + '\n'


def main():
    stellen = stellen_lesen(feed_holen())
    neu = baustein(stellen)
    alt = None
    if os.path.exists(ZIEL):
        with open(ZIEL, encoding='utf-8') as d:
            alt = d.read()
    if neu == alt:
        print('Stellen unveraendert (%d).' % len(stellen))
        return
    with open(ZIEL, 'w', encoding='utf-8') as d:
        d.write(neu)
    print('Stellen aktualisiert (%d):' % len(stellen))
    for s in stellen:
        print('  %s  %s' % (s['id'], s['titel']))


if __name__ == '__main__':
    try:
        main()
    except (OSError, ET.ParseError) as fehler:
        sys.exit('Personio-Feed nicht lesbar, Stellen bleiben unveraendert: %s' % fehler)
