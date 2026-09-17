#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Holt die offenen Stellen aus Personio und schreibt sie als Baustein.

    python3 werkzeuge/stellen.py

Ergebnis ist quellen/bausteine/stellen.html, eingebaut in karriere.html.
Die Datei ist Bauergebnis dieses Skripts - von Hand geaendert wird sie
nicht, Titel und Texte der Stellen pflegt man in Personio.

Die Ausgabe haengt nur vom Feed ab (keine Uhrzeit, feste Reihenfolge).
So aendert sich die Datei nur, wenn sich bei Personio etwas geaendert
hat - daran erkennt der GitHub-Zeitplan (.github/workflows/stellen.yml),
ob neu gebaut werden muss.

Ist Personio nicht erreichbar oder der Feed kaputt, bricht das Skript ab
und laesst die bestehende Datei stehen. Eine leere Liste schreibt es nur,
wenn Personio wirklich null Stellen meldet.
"""
import html
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

FEED = 'https://taskrunner.jobs.personio.de/xml?language=de'
STELLE = 'https://taskrunner.jobs.personio.de/job/%s?language=de'
WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(WURZEL, 'quellen', 'bausteine', 'stellen.html')

UMFANG = {
    'full-time': 'Vollzeit',
    'part-time': 'Teilzeit',
    'full-or-part-time': 'Voll- oder Teilzeit',
}
UMFANG_GOOGLE = {
    'full-time': ['FULL_TIME'],
    'part-time': ['PART_TIME'],
    'full-or-part-time': ['FULL_TIME', 'PART_TIME'],
}
# Anschriften fuer die strukturierten Daten (Google for Jobs). Ein Standort,
# der hier fehlt, erscheint dort nur mit Ortsnamen.
ANSCHRIFTEN = {
    'Essen': ('Kettwiger Straße 45', '45127', 'Essen'),
    'Berlin': ('Mühlenstr. 8a', '14167', 'Berlin'),
}


class Saeuberung(HTMLParser):
    """Laesst vom Personio-Editor nur die Struktur uebrig: Absaetze, Listen,
    Fett, Kursiv, Umbrueche, Links. Alle style-Attribute, Schriften und
    Farben fallen weg. Loser Text ausserhalb von Absatz oder Liste (Personio
    setzt gern ein nacktes <span>) wird zu einem eigenen Absatz."""
    BLOCK = {'p': 'p', 'div': 'p', 'ul': 'ul', 'ol': 'ol', 'li': 'li',
             'h1': 'p', 'h2': 'p', 'h3': 'p', 'h4': 'p', 'h5': 'p', 'h6': 'p'}
    INLINE = {'strong': 'strong', 'b': 'strong', 'em': 'em', 'i': 'em'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.aus = []
        self.bloecke = []      # offene Blockelemente (bereits umbenannt)
        self.inline = []       # offene Inline-Elemente
        self.loser_absatz = False

    def _absatz_zu(self):
        if self.loser_absatz:
            self._inline_zu()
            self.aus.append('</p>')
            self.loser_absatz = False

    def _inline_zu(self):
        while self.inline:
            self.aus.append('</%s>' % self.inline.pop())

    def _fuer_text(self):
        if not self.bloecke and not self.loser_absatz:
            self.aus.append('<p>')
            self.loser_absatz = True

    def handle_starttag(self, tag, attrs):
        if tag in self.BLOCK:
            self._absatz_zu()
            self._inline_zu()
            neu = self.BLOCK[tag]
            # <p> in <p> gibt es nicht - der innere Absatz faellt weg.
            if neu == 'p' and 'p' in self.bloecke:
                return
            self.aus.append('<%s>' % neu)
            self.bloecke.append(neu)
        elif tag in self.INLINE:
            self._fuer_text()
            neu = self.INLINE[tag]
            self.aus.append('<%s>' % neu)
            self.inline.append(neu)
        elif tag == 'br':
            if self.bloecke or self.loser_absatz:
                self.aus.append('<br>')
        elif tag == 'a':
            ziel = dict(attrs).get('href') or ''
            self._fuer_text()
            if re.match(r'^(https?:|mailto:)', ziel):
                self.aus.append('<a href="%s">' % html.escape(ziel, quote=True))
                self.inline.append('a')

    def handle_endtag(self, tag):
        if tag in self.BLOCK:
            neu = self.BLOCK[tag]
            if neu in self.bloecke:
                self._inline_zu()
                while self.bloecke:
                    offen = self.bloecke.pop()
                    self.aus.append('</%s>' % offen)
                    if offen == neu:
                        break
        elif tag in self.INLINE or tag == 'a':
            neu = self.INLINE.get(tag, 'a')
            if neu in self.inline:
                while self.inline:
                    offen = self.inline.pop()
                    self.aus.append('</%s>' % offen)
                    if offen == neu:
                        break

    def handle_data(self, text):
        text = re.sub(r'\s+', ' ', text.replace('\xa0', ' '))
        if not text.strip():
            if self.aus and not self.aus[-1].startswith('<'):
                self.aus.append(' ')
            return
        self._fuer_text()
        self.aus.append(html.escape(text, quote=False))

    def ergebnis(self):
        self._absatz_zu()
        self._inline_zu()
        while self.bloecke:
            self.aus.append('</%s>' % self.bloecke.pop())
        t = ''.join(self.aus)
        # Leerzeichen an Blockgrenzen, Umbrueche am Absatzende, leere Bloecke
        t = re.sub(r'\s*(</?(?:p|ul|ol|li)>)\s*', r'\1', t)
        t = re.sub(r'(?:<br>\s*)+(</(?:p|li)>)', r'\1', t)
        t = re.sub(r'(<(?:p|li)>)(?:\s*<br>)+', r'\1', t)
        vorher = None
        while vorher != t:
            vorher = t
            t = re.sub(r'<(p|li|ul|ol|strong|em)>\s*</\1>', '', t)
        return t


def saeubern(roh):
    s = Saeuberung()
    s.feed(roh or '')
    s.close()
    return s.ergebnis()


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
        teile = []
        for b in p.findall('jobDescriptions/jobDescription'):
            text = saeubern(b.findtext('value'))
            if text:
                teile.append(((b.findtext('name') or '').strip(), text))
        stellen.append({
            'id': (p.findtext('id') or '').strip(),
            'titel': (p.findtext('name') or '').strip(),
            'ort': (p.findtext('office') or '').strip(),
            'umfang': (p.findtext('schedule') or '').strip(),
            'seit': (p.findtext('createdAt') or '').strip(),
            'teile': teile,
        })
        if not stellen[-1]['id'] or not stellen[-1]['titel']:
            raise SystemExit('Stelle ohne id oder Titel im Feed')
    # Neueste zuerst; bei gleichem Datum entscheidet die id.
    stellen.sort(key=lambda s: (s['seit'], s['id']), reverse=True)
    return stellen


def google_daten(s):
    """JobPosting nach schema.org - daraus baut Google die Stellenanzeige
    in der Suche."""
    beschreibung = ''.join('<p><strong>%s</strong></p>%s' % (html.escape(n), t) if n else t
                           for n, t in s['teile'])
    orte = []
    for name, (strasse, plz, stadt) in ANSCHRIFTEN.items():
        if name in s['ort']:
            orte.append({'@type': 'Place', 'address': {
                '@type': 'PostalAddress', 'streetAddress': strasse, 'postalCode': plz,
                'addressLocality': stadt, 'addressCountry': 'DE'}})
    if not orte:
        orte.append({'@type': 'Place', 'address': {
            '@type': 'PostalAddress', 'addressLocality': s['ort'], 'addressCountry': 'DE'}})
    d = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        'title': s['titel'],
        'description': beschreibung,
        'identifier': {'@type': 'PropertyValue', 'name': 'Taskrunner GmbH', 'value': s['id']},
        'datePosted': s['seit'][:10],
        'hiringOrganization': {
            '@type': 'Organization', 'name': 'Taskrunner GmbH',
            'sameAs': 'https://www.taskrunner.de',
            'logo': 'https://www.taskrunner.de/apple-touch-icon.png'},
        'jobLocation': orte,
        'url': STELLE % s['id'],
    }
    if s['umfang'] in UMFANG_GOOGLE:
        d['employmentType'] = UMFANG_GOOGLE[s['umfang']]
    if 'remote' in s['ort'].lower():
        d['jobLocationType'] = 'TELECOMMUTE'
        d['applicantLocationRequirements'] = {'@type': 'Country', 'name': 'DE'}
    return d


def baustein(stellen):
    z = ['<!-- Erzeugt von werkzeuge/stellen.py aus dem Personio-Feed - nicht von Hand aendern. -->']
    if not stellen:
        z.append('<p class="t-intro text-ink/80">Gerade ist keine Stelle ausgeschrieben. '
                 'Schauen Sie gern bald wieder vorbei oder schreiben Sie uns über die '
                 '<a href="kontakt.html" class="text-blue-600 underline decoration-blue-600/30 '
                 'underline-offset-4 transition-colors hover:decoration-blue-600">Kontaktseite</a>.</p>')
        return '\n'.join(z) + '\n'
    z.append('<div class="stellen-liste">')
    for s in stellen:
        angaben = ' · '.join(x for x in (s['ort'], UMFANG.get(s['umfang'], '')) if x)
        z.append('<details class="stelle" name="stellen">')
        z.append('<summary><span class="stelle-kopf"><h3 class="hyphens-auto break-words t-h4">%s</h3>'
                 '<span class="t-caption text-ink/75">%s</span></span></summary>'
                 % (html.escape(s['titel'], quote=False), html.escape(angaben, quote=False)))
        z.append('<div class="stelle-inhalt">')
        for name, text in s['teile']:
            if name:
                z.append('<h4 class="stelle-abschnitt t-body">%s</h4>' % html.escape(name, quote=False))
            z.append('<div class="stelle-text t-body">%s</div>' % text)
        z.append('<p class="mt-8"><a href="%s" class="btn btn-primary">Jetzt bewerben</a></p>'
                 % html.escape(STELLE % s['id'], quote=True))
        z.append('</div>')
        z.append('</details>')
    z.append('</div>')
    daten = [google_daten(s) for s in stellen]
    # </ im JSON entschaerfen, damit kein Text das Skript-Element beendet.
    json_text = json.dumps(daten, ensure_ascii=False, indent=1).replace('</', '<\\/')
    z.append('<script type="application/ld+json">\n%s\n</script>' % json_text)
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
