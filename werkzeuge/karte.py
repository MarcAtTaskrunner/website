#!/usr/bin/env python3
"""Erzeugt assets/karte.js: Linienkarte von Deutschland und Oesterreich
(Landesgrenzen und Bundeslaender) fuer das Handwerker-Formular auf
kontakt.html. Die Karte zeigt, wo die eingegebene PLZ liegt.

Quelle: Natural Earth, Admin 1 - States, Provinces (1:10 Mio.),
gemeinfrei (public domain), kein Quellenhinweis noetig.
  https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip

Aufruf (Ordner mit der entpackten .shp und .dbf):
  python3 werkzeuge/karte.py ordner/ne_10m_admin_1_states_provinces

Projektion: flach (Laenge x cos 51 Grad, Breite), fuer dieses kleine
Gebiet genau genug. Dieselbe Rechnung steht in assets/app.js
(KARTE.projiziere) - die Werte dafuer schreibt dieses Skript mit.
Linien: jede Kante zwischen zwei Punkten wird gezaehlt. Kommt sie nur
einmal vor oder trennt sie zwei Laender, ist sie Landesgrenze (dick),
sonst Grenze zwischen Bundeslaendern (duenn).
"""
import json, math, struct, sys
from collections import defaultdict
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
LAENDER = {"DEU", "AUT"}
BREITE = 1000          # Breite der Karte in Einheiten (viewBox)
TOLERANZ = 0.6         # Vereinfachung in Karteneinheiten


def dbf_lesen(pfad):
    daten = Path(pfad).read_bytes()
    anzahl, kopf, satz = struct.unpack("<IHH", daten[4:12])
    felder, pos = [], 32
    while daten[pos] != 0x0D:
        name = daten[pos:pos + 11].split(b"\0")[0].decode("latin-1")
        felder.append((name, daten[pos + 16]))
        pos += 32
    for i in range(anzahl):
        s = daten[kopf + i * satz + 1: kopf + (i + 1) * satz]
        zeile, p = {}, 0
        for name, laenge in felder:
            zeile[name] = s[p:p + laenge].decode("utf-8", "replace").strip()
            p += laenge
        yield zeile


def shp_lesen(pfad):
    daten = Path(pfad).read_bytes()
    pos = 100
    while pos < len(daten):
        _, laenge = struct.unpack(">II", daten[pos:pos + 8])
        inhalt = daten[pos + 8: pos + 8 + laenge * 2]
        pos += 8 + laenge * 2
        typ = struct.unpack("<i", inhalt[:4])[0]
        if typ != 5:
            yield []
            continue
        n_teile, n_punkte = struct.unpack("<ii", inhalt[36:44])
        teile = list(struct.unpack(f"<{n_teile}i", inhalt[44:44 + 4 * n_teile]))
        p0 = 44 + 4 * n_teile
        punkte = [struct.unpack("<dd", inhalt[p0 + 16 * k: p0 + 16 * k + 16]) for k in range(n_punkte)]
        ringe = [punkte[a:b] for a, b in zip(teile, teile[1:] + [n_punkte])]
        yield ringe


def vereinfache(punkte, tol):
    if len(punkte) < 3:
        return punkte
    (x1, y1), (x2, y2) = punkte[0], punkte[-1]
    dx, dy = x2 - x1, y2 - y1
    laenge = math.hypot(dx, dy) or 1e-9
    beste, index = 0, 0
    for i in range(1, len(punkte) - 1):
        x, y = punkte[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / laenge if (dx or dy) else math.hypot(x - x1, y - y1)
        if d > beste:
            beste, index = d, i
    if beste <= tol:
        return [punkte[0], punkte[-1]]
    return vereinfache(punkte[:index + 1], tol)[:-1] + vereinfache(punkte[index:], tol)


def ketten(kanten):
    """Kanten (Punktpaare) zu moeglichst langen Linienzuegen verbinden."""
    nachbarn = defaultdict(list)
    for a, b in kanten:
        nachbarn[a].append(b)
        nachbarn[b].append(a)
    benutzt, zuege = set(), []
    def schluessel(a, b):
        return (a, b) if a <= b else (b, a)
    # erst an Enden (Grad != 2) beginnen, dann die geschlossenen Ringe
    starts = [p for p in nachbarn if len(nachbarn[p]) != 2] + list(nachbarn)
    for s in starts:
        for n in nachbarn[s]:
            if schluessel(s, n) in benutzt:
                continue
            zug, a, b = [s], s, n
            while True:
                benutzt.add(schluessel(a, b))
                zug.append(b)
                weiter = [c for c in nachbarn[b] if schluessel(b, c) not in benutzt]
                if len(nachbarn[b]) != 2 or not weiter:
                    break
                a, b = b, weiter[0]
            zuege.append(zug)
    return zuege


def main(basis):
    zeilen = list(dbf_lesen(basis + ".dbf"))
    formen = list(shp_lesen(basis + ".shp"))
    ringe = []  # (land, ring)
    for zeile, form in zip(zeilen, formen):
        if zeile.get("adm0_a3") in LAENDER:
            for ring in form:
                ringe.append((zeile["adm0_a3"], ring))

    lon_min = min(p[0] for _, r in ringe for p in r)
    lon_max = max(p[0] for _, r in ringe for p in r)
    lat_min = min(p[1] for _, r in ringe for p in r)
    lat_max = max(p[1] for _, r in ringe for p in r)
    cos0 = math.cos(math.radians(51))
    massstab = BREITE / ((lon_max - lon_min) * cos0)
    hoehe = round((lat_max - lat_min) * massstab)

    def proj(p):
        return ((p[0] - lon_min) * cos0 * massstab, (lat_max - p[1]) * massstab)

    # Kanten zaehlen (auf 1e-6 Grad gerundet, damit gemeinsame Grenzen passen)
    zaehler = defaultdict(set)
    for land, ring in ringe:
        pts = [(round(x, 6), round(y, 6)) for x, y in ring]
        for a, b in zip(pts, pts[1:]):
            if a != b:
                zaehler[(a, b) if a <= b else (b, a)].add(land)
    anzahl = defaultdict(int)
    for land, ring in ringe:
        pts = [(round(x, 6), round(y, 6)) for x, y in ring]
        for a, b in zip(pts, pts[1:]):
            if a != b:
                anzahl[(a, b) if a <= b else (b, a)] += 1
    aussen = [k for k in anzahl if anzahl[k] == 1 or len(zaehler[k]) > 1]
    innen = [k for k in anzahl if anzahl[k] > 1 and len(zaehler[k]) == 1]

    def pfad(kanten):
        teile = []
        for zug in ketten(kanten):
            punkte = vereinfache([proj(p) for p in zug], TOLERANZ)
            if len(punkte) < 2:
                continue
            teile.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in punkte))
        return "".join(teile).replace(".0 ", " ").replace(".0L", "L").replace(".0M", "M")

    daten = {
        "breite": BREITE, "hoehe": hoehe,
        "lonMin": round(lon_min, 5), "latMax": round(lat_max, 5),
        "cos0": round(cos0, 6), "massstab": round(massstab, 5),
        "aussen": pfad(aussen), "innen": pfad(innen),
    }
    ziel = WURZEL / "assets" / "karte.js"
    ziel.write_text(
        "/* Bauergebnis von werkzeuge/karte.py - nicht von Hand aendern.\n"
        "   Linienkarte DE + AT, Natural Earth (gemeinfrei). */\n"
        "window.taskrunnerKarte=" + json.dumps(daten, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    print(f"{ziel.relative_to(WURZEL)}: {ziel.stat().st_size // 1024} KB, {BREITE} x {hoehe}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
