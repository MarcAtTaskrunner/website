# Deployen

Einmalig, im Terminal auf dem Mac (nicht im Browser):

    cd ~/Desktop/"Website Taskrunner"/website
    npx wrangler login          # oeffnet den Browser, danach dauerhaft angemeldet

Danach fuer jede Aktualisierung genau ein Befehl:

    npm run deploy

Das baut `assets/style.css` neu, stellt `dist/` zusammen und laedt es zum
Cloudflare-Pages-Projekt `taskrunnernew` hoch.

Nur bauen, ohne hochzuladen:

    npm run build

`dist/` ist reines Build-Ergebnis und darf jederzeit geloescht werden.
`_redirects` leitet Seiten um, die es noch nicht gibt - vor dem echten
Launch loeschen.
