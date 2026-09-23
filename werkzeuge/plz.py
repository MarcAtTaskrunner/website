#!/usr/bin/env python3
"""Erzeugt assets/plz.js: Postleitzahl -> Ort(e) fuer Deutschland und
Oesterreich, fuer das Handwerker-Formular (kontakt.html). Deutsche PLZ
haben fuenf Stellen, oesterreichische vier - so ist jede eindeutig.

Quellen (einmal herunterladen und Pfade uebergeben):
  Deutschland: GeoNames, Postleitzahlen, Lizenz CC BY 4.0 (Quellenhinweis
    im Impressum). https://download.geonames.org/export/zip/DE.zip
    -> entpackt DE.txt
  Oesterreich: Statistik Austria, Gemeindeliste (Spalten PLZ des
    Gemeindeamts und weitere Postleitzahlen)
    https://www.statistik.at/verzeichnis/reglisten/gemliste_knz.csv

Aufruf:
  python3 werkzeuge/plz.py DE.txt gemliste_knz.csv

Grosskunden-Postleitzahlen (Firmen statt Orte, z. B. "... GmbH") fallen
heraus; zu ihnen zeigt das Formular einfach keinen Ort an.
"""
import csv, json, re, sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
FIRMA = re.compile(r"GmbH|mbH|\bAG\b|\bKG\b|e\.\s?V\.|Bank|Versicherung|Sparkasse|Postfach|\bSE\b|Gesellschaft|Verwaltung|Corporate|Konzern|Deutsche |Bundes|Finanzamt|Universität|Klinik|Verlag|Vertrieb|Service|[A-Z]{3,}")


def main(de_txt, at_csv):
    plz = {}

    def merke(nummer, ort):
        ort = ort.strip()
        if not ort or FIRMA.search(ort):
            return
        orte = plz.setdefault(nummer, [])
        if ort not in orte:
            orte.append(ort)

    with open(de_txt, encoding="utf-8") as f:
        for zeile in csv.reader(f, delimiter="\t"):
            if len(zeile) > 2 and re.fullmatch(r"\d{5}", zeile[1]):
                merke(zeile[1], zeile[2])

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


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
