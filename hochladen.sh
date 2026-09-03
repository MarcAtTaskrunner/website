#!/bin/sh
# Aendert nichts am Inhalt - committet nur offene Aenderungen und pusht.
#   ./hochladen.sh                 -> committet mit "Aktualisierung"
#   ./hochladen.sh "Neues Bild"    -> committet mit eigener Nachricht
set -e
cd "$(dirname "$0")"

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "${1:-Aktualisierung}"
else
  echo "Keine offenen Aenderungen - es wird nur gepusht."
fi

git push
echo "Fertig."
