#!/usr/bin/env python3
"""Erzeugt fuer das Handwerker-Formular (kontakt.html):
  assets/plz.js       Postleitzahl -> Ort(e), Deutschland und Oesterreich
  assets/plz-lage.js  Postleitzahl -> Mittelpunkt (Breite/Laenge), fuer den
                      Knopf "Standort verwenden" - erst beim Klick geladen
Deutsche PLZ haben fuenf Stellen, oesterreichische vier - so ist jede
eindeutig.

Quellen (einmal herunterladen und Pfade uebergeben):
  Deutschland: GeoNames, Postleitzahlen, Lizenz CC BY 4.0 (Quellenhinweis
    im Impressum). https://download.geonames.org/export/zip/DE.zip
    -> entpackt DE.txt
  Oesterreich: Statistik Austria, Gemeindeliste (Spalten PLZ des
    Gemeindeamts und weitere Postleitzahlen) fuer die Orte
    https://www.statistik.at/verzeichnis/reglisten/gemliste_knz.csv
    und GeoNames AT (CC BY 4.0) nur fuer die Koordinaten
    https://download.geonames.org/export/zip/AT.zip -> entpackt AT.txt

Aufruf:
  python3 werkzeuge/plz.py DE.txt gemliste_knz.csv AT.txt

Grosskunden-Postleitzahlen (Firmen und Behoerden, etwa 45117
"Polizeipraesident Essen"): GeoNames laesst bei ihnen die Genauigkeit
(letzte Spalte) leer, bei echten Orten steht 4 oder 6.
  - Fuer die Ortung zaehlen nur Eintraege mit Genauigkeit - sonst landet
    man in der Essener Innenstadt bei der IHK statt bei 45127 Essen.
  - Fuer die Anzeige zum getippten PLZ zaehlen Eintraege ohne
    Genauigkeit nur, wenn ihr Name anderswo als echter Ort vorkommt
    (52222 "Stolberg (Rheinland)" ja, 45117 "Polizeipraesident Essen"
    nein). Eine Wortliste ("GmbH", "Amt" ...) war unzuverlaessiger - sie
    warf auch Orte wie Freiamt oder Landesbergen hinaus.
"""
import csv, json, re, sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent


def main(de_txt, at_csv, at_txt):
    plz = {}
    lage = {}

    def lage_merken(nummer, breite, laenge):
        try:
            lage.setdefault(nummer, []).append((float(breite), float(laenge)))
        except ValueError:
            pass

    def merke(nummer, ort):
        ort = ort.strip()
        if not ort:
            return
        orte = plz.setdefault(nummer, [])
        if ort not in orte:
            orte.append(ort)

    with open(de_txt, encoding="utf-8") as f:
        de = [z for z in csv.reader(f, delimiter="\t") if len(z) > 11 and re.fullmatch(r"\d{5}", z[1])]
    echte_orte = {z[2].strip() for z in de if z[11].strip()}
    for zeile in de:
        if zeile[11].strip():
            merke(zeile[1], zeile[2])
            lage_merken(zeile[1], zeile[9], zeile[10])
        elif zeile[2].strip() in echte_orte:
            merke(zeile[1], zeile[2])

    with open(at_txt, encoding="utf-8") as f:
        for zeile in csv.reader(f, delimiter="\t"):
            if len(zeile) > 10 and re.fullmatch(r"\d{4}", zeile[1]):
                lage_merken(zeile[1], zeile[9], zeile[10])

    with open(at_csv, encoding="utf-8") as f:
        for z in list(csv.reader(f, delimiter=";"))[3:]:
            if len(z) > 4 and z[0].isdigit():
                for nummer in [z[4]] + (z[5].split() if len(z) > 5 else []):
                    if re.fullmatch(r"\d{4}", nummer):
                        merke(nummer, z[1])

    for orte in plz.values():
        orte.sort(key=str.lower)
    daten = {k: "|".join(plz[k]) for k in sorted(plz)}
    ziel = WURZEL / "assets" / "plz.js"
    ziel.write_text(
        "/* Bauergebnis von werkzeuge/plz.py - nicht von Hand aendern.\n"
        "   Postleitzahl -> Orte (mit | getrennt). DE: GeoNames (CC BY 4.0),\n"
        "   AT: Statistik Austria. */\n"
        "window.taskrunnerPlz=" + json.dumps(daten, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    de = sum(1 for k in daten if len(k) == 5)
    print(f"{de} PLZ DE + {len(daten) - de} PLZ AT -> {ziel.relative_to(WURZEL)} ({ziel.stat().st_size // 1024} KB)")

    # Mittelpunkt je PLZ, auf 0,01 Grad (rund 1 km) - als ganze Zahlen
    # (Grad x 100) in einer Zeichenkette "plz,breite,laenge;...", klein
    # genug zum Nachladen auf Knopfdruck.
    teile = []
    for k in sorted(lage):
        if k not in daten:
            continue
        punkte = lage[k]
        b = round(sum(p[0] for p in punkte) / len(punkte) * 100)
        l = round(sum(p[1] for p in punkte) / len(punkte) * 100)
        teile.append(f"{k},{b},{l}")
    ziel = WURZEL / "assets" / "plz-lage.js"
    ziel.write_text(
        "/* Bauergebnis von werkzeuge/plz.py - nicht von Hand aendern.\n"
        "   PLZ-Mittelpunkte: plz,Breite x 100,Laenge x 100. GeoNames (CC BY 4.0). */\n"
        'window.taskrunnerPlzLage="' + ";".join(teile) + '";\n',
        encoding="utf-8")
    print(f"{len(teile)} Mittelpunkte -> {ziel.relative_to(WURZEL)} ({ziel.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
