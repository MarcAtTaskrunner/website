#!/usr/bin/env python3
"""Erzeugt assets/orte.js: alle Gemeinden in Deutschland und Oesterreich
fuer den Ortsvorschlag im Handwerker-Formular (kontakt.html).

Quellen (frei nutzbar, einmal herunterladen und Pfade uebergeben):
  Deutschland: Destatis, Gemeindeverzeichnis, Auszug GV (xlsx)
    https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/Archiv/GVAuszugQ/AuszugGV2QAktuell.xlsx?__blob=publicationFile
  Oesterreich: Statistik Austria, Gemeindeliste (csv)
    https://www.statistik.at/verzeichnis/reglisten/gemliste_knz.csv

Aufruf:
  python3 werkzeuge/orte.py AuszugGV.xlsx gemliste_knz.csv

Reihenfolge nach Einwohnern, damit bei mehreren Treffern die groessere
Stadt zuerst kommt ("Ber" -> Berlin). Die oesterreichische Liste hat
keine Einwohnerzahlen; die groesseren Staedte stehen unten von Hand drin,
alle anderen zaehlen mit 1.000.
"""
import csv, json, re, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

AT_EINWOHNER = {
    "Wien": 2000000, "Graz": 300000, "Linz": 210000, "Salzburg": 157000,
    "Innsbruck": 131000, "Klagenfurt am Wörthersee": 102000, "Villach": 65000,
    "Wels": 63000, "St. Pölten": 57000, "Dornbirn": 51000,
    "Wiener Neustadt": 48000, "Steyr": 38000, "Feldkirch": 35000,
    "Bregenz": 30000, "Leonding": 29000, "Klosterneuburg": 27000,
    "Baden": 26000, "Leoben": 25000, "Wolfsberg": 25000,
    "Krems an der Donau": 25000, "Traun": 25000, "Amstetten": 24000,
    "Lustenau": 24000, "Kapfenberg": 22000, "Mödling": 21000,
    "Hallein": 21000, "Kufstein": 20000, "Schwechat": 20000,
    "Traiskirchen": 19000, "Braunau am Inn": 17000, "Saalfelden am Steinernen Meer": 17000,
    "Tulln an der Donau": 17000, "Hohenems": 17000, "Ansfelden": 17000,
    "Bruck an der Mur": 16000, "Telfs": 16000, "Eisenstadt": 15000,
    "Spittal an der Drau": 15000, "Ternitz": 15000, "Perchtoldsdorf": 15000,
    "Stockerau": 17000, "Feldkirchen in Kärnten": 14500, "Bludenz": 14500,
    "Bad Ischl": 14000, "Schwaz": 14000, "Hall in Tirol": 14000, "Wörgl": 14000,
    "Marchtrenk": 14000, "Hard": 13500, "Gmunden": 13000, "Korneuburg": 13000,
    "St. Veit an der Glan": 12500, "Vöcklabruck": 12500, "Neunkirchen": 12500,
    "Lienz": 12000, "Rankweil": 12000, "Ried im Innkreis": 12000,
    "Mistelbach": 11500, "Bischofshofen": 10500, "Zell am See": 10000,
}


def xlsx_zeilen(pfad):
    z = zipfile.ZipFile(pfad)
    texte = ["".join(t.text or "" for t in si.iter(N + "t"))
             for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(N + "si")]
    for blatt in sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n)):
        for zeile in ET.fromstring(z.read(blatt)).iter(N + "row"):
            werte = {}
            for zelle in zeile.findall(N + "c"):
                v = zelle.find(N + "v")
                if v is None:
                    continue
                spalte = re.match(r"[A-Z]+", zelle.get("r")).group()
                werte[spalte] = texte[int(v.text)] if zelle.get("t") == "s" else v.text
            yield werte


def main(de_xlsx, at_csv):
    einwohner = {}

    def merke(name, zahl):
        name = name.strip()
        if name and zahl > einwohner.get(name, -1):
            einwohner[name] = zahl

    # Satzart 60 = Gemeinde; H = Name ("Kiel, Landeshauptstadt"), J = Einwohner
    for z in xlsx_zeilen(de_xlsx):
        if z.get("A") == "60" and z.get("H"):
            merke(z["H"].split(",")[0], int(float(z.get("J") or 0)))

    with open(at_csv, encoding="utf-8") as f:
        zeilen = list(csv.reader(f, delimiter=";"))
    for z in zeilen[3:]:
        if len(z) > 1 and z[0].isdigit():
            merke(z[1], AT_EINWOHNER.get(z[1], 1000))

    orte = sorted(einwohner, key=lambda n: (-einwohner[n], n))
    ziel = WURZEL / "assets" / "orte.js"
    ziel.write_text(
        "/* Bauergebnis von werkzeuge/orte.py - nicht von Hand aendern.\n"
        "   Alle Gemeinden in Deutschland und Oesterreich, nach Einwohnern. */\n"
        "window.taskrunnerOrte=" + json.dumps(orte, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    print(f"{len(orte)} Orte -> {ziel.relative_to(WURZEL)} ({ziel.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
