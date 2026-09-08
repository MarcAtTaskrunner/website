# -*- coding: utf-8 -*-
"""Bricht HTML lesbar um, ohne die Darstellung zu veraendern.

Umgebrochen wird nur, wo Leerraum unsichtbar ist: direkt neben einem
Element, das im Seitenfluss als Block liegt. Zwischen Inline-Elementen
(<a>, <span>, <strong> ...) wird nie umgebrochen - dort waere der Umbruch
als Leerzeichen sichtbar. Elemente ohne Block-Kinder (Ueberschriften,
Absaetze, Listenpunkte) bleiben komplett auf einer Zeile; so findet ein
grep die ganze Stelle statt nur eines Bruchstuecks.

`entformatiere()` nimmt genau das wieder heraus, was `formatiere()`
eingefuegt hat - beides hintereinander ergibt wieder die Ausgangsdatei.
"""
import re

# Als Block gerenderte Elemente. img/svg/canvas/video stehen hier, weil
# Tailwinds Preflight ihnen display:block gibt.
BLOCK = {
    'html', 'head', 'body', 'meta', 'link', 'title', 'base', 'script', 'style',
    'div', 'section', 'header', 'footer', 'main', 'nav', 'article', 'aside',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
    'form', 'fieldset', 'legend', 'figure', 'figcaption', 'blockquote', 'hr',
    'details', 'summary', 'address', 'noscript', 'template',
    'img', 'svg', 'canvas', 'video', 'audio', 'iframe', 'picture', 'source',
}
LEER = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr'}
ROH = {'script', 'style', 'pre', 'textarea'}   # Inhalt bleibt unangetastet
ATOMAR = {'svg'}                                # bleibt am Stueck auf einer Zeile
INLINE_KLASSE = re.compile(r'(^|:)(inline|inline-block|inline-flex|inline-grid|contents)$')

MARKE = re.compile(r'<!--.*?-->|<!DOCTYPE[^>]*>|</?[a-zA-Z][^>]*>', re.S)


class Knoten:
    __slots__ = ('art', 'text', 'name', 'kinder', 'block', 'ende')

    def __init__(self, art, text='', name=None, block=False):
        self.art = art        # 'wurzel' | 'element' | 'text' | 'marke' | 'roh'
        self.text = text      # bei 'element': das oeffnende Tag
        self.name = name
        self.kinder = []
        self.block = block
        self.ende = ''        # schliessendes Tag, falls vorhanden


def _blockig(tag, name):
    if name not in BLOCK:
        return False
    k = re.search(r'\bclass="([^"]*)"', tag)
    if k and any(INLINE_KLASSE.search(t) for t in k.group(1).split()):
        return False
    return True


def _baum(html):
    wurzel = Knoten('wurzel', block=True)
    stapel = [wurzel]
    i = 0
    while i < len(html):
        m = MARKE.search(html, i)
        if not m:
            if html[i:]:
                stapel[-1].kinder.append(Knoten('text', html[i:]))
            break
        if m.start() > i:
            stapel[-1].kinder.append(Knoten('text', html[i:m.start()]))
        tag = m.group(0)
        i = m.end()
        if tag.startswith('<!'):
            stapel[-1].kinder.append(Knoten('marke', tag))
            continue
        name = re.match(r'</?([a-zA-Z][a-zA-Z0-9-]*)', tag).group(1).lower()
        if tag.startswith('</'):
            for tiefe in range(len(stapel) - 1, 0, -1):
                if stapel[tiefe].name == name:
                    stapel[tiefe].ende = tag
                    del stapel[tiefe:]
                    break
            else:
                # Kein passendes oeffnendes Tag: unveraendert stehen lassen,
                # damit nichts verlorengeht.
                stapel[-1].kinder.append(Knoten('marke', tag))
            continue
        if (name in ROH or name in ATOMAR) and not tag.endswith('/>'):
            ende = re.search(r'</%s\s*>' % name, html[i:], re.I | re.S)
            bis = i + (ende.end() if ende else 0)
            k = Knoten('roh', tag + html[i:bis], name, _blockig(tag, name))
            stapel[-1].kinder.append(k)
            i = bis
            continue
        k = Knoten('element', tag, name, _blockig(tag, name))
        stapel[-1].kinder.append(k)
        if name not in LEER and not tag.endswith('/>'):
            stapel.append(k)
    return wurzel


def _hat_block(k):
    for kind in k.kinder:
        if kind.block or _hat_block(kind):
            return True
    return False


def _flach(k):
    """Der Knoten und alles darunter am Stueck, ohne eingefuegten Leerraum."""
    if k.art in ('text', 'marke', 'roh'):
        return k.text
    if k.art == 'wurzel':
        return ''.join(_flach(x) for x in k.kinder)
    return k.text + ''.join(_flach(x) for x in k.kinder) + k.ende


def _schreibe(k, tiefe, schritt, aus):
    kinder = [x for x in k.kinder if not (x.art == 'text' and not x.text.strip())]
    # Ein Kommentar rendert nichts; er zaehlt als Block, wenn das naechste
    # Geschwister einer ist - dann darf die Ueberschrift davor umbrechen.
    for i, x in enumerate(kinder):
        if x.art == 'marke' and x.text.startswith('<!--'):
            x.block = i + 1 < len(kinder) and kinder[i + 1].block
    voriges_block = True                     # Blockanfang: Umbruch ist frei
    for kind in kinder:
        umbruch = voriges_block or kind.block
        if aus:
            aus.append(('\n' + schritt * tiefe) if umbruch else '')
        if kind.art == 'element' and kind.block and _hat_block(kind):
            aus.append(kind.text)
            _schreibe(kind, tiefe + 1, schritt, aus)
            aus.append('\n' + schritt * tiefe + kind.ende if kind.ende else '')
        else:
            aus.append(_flach(kind))
        voriges_block = kind.block


def entformatiere(html):
    """Nimmt eingefuegte Umbrueche samt Einrueckung wieder heraus."""
    aus, i = [], 0
    while i < len(html):
        m = MARKE.search(html, i)
        stueck = html[i:m.start()] if m else html[i:]
        aus.append(re.sub(r'\n[ \t]*', '', stueck))
        if not m:
            break
        tag = m.group(0)
        i = m.end()
        name = re.match(r'</?([a-zA-Z][a-zA-Z0-9-]*)', tag)
        if name and not tag.startswith('</') and name.group(1).lower() in ROH \
                and not tag.endswith('/>'):
            ende = re.search(r'</%s\s*>' % name.group(1), html[i:], re.I | re.S)
            if ende:
                tag += html[i:i + ende.end()]
                i += ende.end()
        aus.append(tag)
    return ''.join(aus)


def formatiere(html, schritt='  '):
    aus = []
    _schreibe(_baum(entformatiere(html)), 0, schritt, aus)
    return ''.join(aus).lstrip('\n') + '\n'
