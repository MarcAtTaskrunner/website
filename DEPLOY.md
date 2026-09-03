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

## Git

Das Repository liegt in diesem Ordner, Remote ist
`https://github.com/MarcAtTaskrunner/website.git` (Branch `main`).

Ich committe die Aenderungen hier; hochgeladen wird von dir im Terminal:

    cd ~/Desktop/"Website Taskrunner"/website
    git push          # beim ersten Mal: git push -u origin main

Das Repo haengt in Cloudflare an einem Worker mit statischen Assets
(Workers Builds). Ein Push loest Build und Deployment aus:

    Build-Befehl:   npm run build
    Deploy-Befehl:  npx wrangler deploy
    Root directory: /

Was deployt wird, steht in `wrangler.jsonc`: der Ordner `dist`. Der Wert
`name` dort muss mit dem Namen des Workers in Cloudflare uebereinstimmen -
sonst legt wrangler beim Deployen einen zweiten Worker an.
