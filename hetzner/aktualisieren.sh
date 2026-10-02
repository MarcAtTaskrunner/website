#!/bin/sh
# Bringt den Hetzner-Zweig auf den Stand von main und pusht ihn. Der Push
# loest auf GitHub den Upload nach Hetzner aus (deploy-hetzner.yml).
#
#   ./hetzner/aktualisieren.sh
#
# Uebernommen wird, was von main schon auf GitHub liegt - also erst im
# Ordner website/ wie gewohnt pushen (hochladen.sh), dann das hier.
set -e
cd "$(dirname "$0")/.."

if [ "$(git rev-parse --abbrev-ref HEAD)" != "hetzner-version" ]; then
  echo "Dieser Ordner steht nicht auf dem Zweig hetzner-version - abgebrochen." >&2
  exit 1
fi

git fetch origin
git merge --no-edit origin/main
git push -u origin hetzner-version
echo "Fertig. Fortschritt: GitHub -> Actions -> Deploy auf Hetzner."
