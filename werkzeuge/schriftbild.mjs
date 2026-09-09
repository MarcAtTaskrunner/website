/* Zeigt, welche Groessen und Gewichte die Textklassen auf welcher Seite
   tatsaechlich bekommen. Zum Vergleichen zweier Seitentypen:
       node werkzeuge/schriftbild.mjs index.html dienstleistungen.html   */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const T = { '.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2' };
const s = createServer(async (a,b)=>{ try { const f=path.join(WURZEL,decodeURIComponent(a.url.split('?')[0])); b.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'}); b.end(await readFile(f)); } catch { b.writeHead(404).end(); } });
await new Promise(f=>s.listen(0,f));
const basis='http://localhost:'+s.address().port;
const PROBEN=['h1','h2','h3','h4','.t-h1','.t-h2','.t-h3','.t-h4','.t-intro','.t-body','.t-body-tight','.t-caption','.t-eyebrow','p'];
const browser=await chromium.launch();
const tabelle={};
for (const seite of process.argv.slice(2)) {
  const p=await browser.newPage({viewport:{width:1440,height:900}});
  await p.goto(basis+'/'+seite,{waitUntil:'domcontentloaded'});
  tabelle[seite]=await p.evaluate((proben)=>{
    const aus={};
    for (const w of proben) {
      const probe=document.createElement(w.startsWith('.')?'div':w);
      if (w.startsWith('.')) probe.className=w.slice(1);
      probe.textContent='Xy'; probe.style.position='absolute'; probe.style.visibility='hidden';
      (document.querySelector('main')||document.body).appendChild(probe);
      const cs=getComputedStyle(probe);
      aus[w]=`${Math.round(parseFloat(cs.fontSize))}/${cs.fontWeight}`;
      probe.remove();
    }
    return aus;
  }, PROBEN);
  await p.close();
}
const seiten=Object.keys(tabelle);
const feld = (t, n) => String(t).padEnd(n);
console.log(feld('Klasse', 14) + seiten.map(s => feld(s.replace('.html', ''), 20)).join('') + 'gleich?');
for (const w of PROBEN) {
  const werte=seiten.map(s=>tabelle[s][w]);
  const gleich=new Set(werte).size===1;
  console.log(feld(w, 14) + werte.map(v => feld(v, 20)).join('') + (gleich ? 'ja' : 'NEIN'));
}
await browser.close(); s.close(); process.exit(0);
