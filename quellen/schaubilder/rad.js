/* taskrunner - Schaubild "rad": Rad aus Saiten mit Portraits.
   Einbau:  <canvas data-schaubild="rad"></canvas>                                                 */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var wuerfelAb = Schaubild.wuerfelAb;

  /* ---------------------------------------------------------------- *
   *  Motiv Rad - Saiten im Hero
   *  Ein Ring aus feinen Punkten, dazwischen gespannte Saiten von der
   *  Mitte zum Rand. Die Saiten sind keine Geraden: jede hat eine feste
   *  Grundwoelbung, dadurch der ruhige Wirbel im Standbild.
   *
   *  Der Zeiger streift die Saiten wie eine Hand ueber Gitarrensaiten:
   *  jede bekommt einen Stoss von ihm weg, gewichtet nach der Stelle,
   *  an der sie getroffen wird (an den beiden Enden kann sie sich nicht
   *  bewegen). Danach schwingt sie ueber eine Feder zurueck.
   *
   *  Gezeichnet wird je Saite eine quadratische Bezierkurve. Deren
   *  Kontrollpunkt liegt nicht auf der Kurve, deshalb wird er aus dem
   *  gewuenschten Scheitel zurueckgerechnet: C = 2M - (P0 + P2) / 2.
   * ---------------------------------------------------------------- */
  /* Der Bereich, den der Text wirklich einnimmt - nicht sein Kasten.
     Gemessen werden nur die Blaetter des Textblocks, denn die Kaesten
     darueber sind Bloecke ueber die volle Breite: die Zeile mit den
     Schaltflaechen etwa ist 1376 px breit, die Schaltflaechen selbst
     sind es nicht. Fuer Bloecke (Ueberschrift, Absatz) zaehlen die
     Zeilen, nicht die max-width - dafuer der Range. Inline-Elemente
     wie die Schaltflaechen umschliessen ihren Inhalt schon selbst,
     dort zaehlt der Kasten samt Polsterung. */
  Schaubild.prototype.textkasten = function (el) {
    var f = this.flaeche.getBoundingClientRect();
    var l = Infinity, o = Infinity, r = -Infinity, u = -Infinity;

    function messen(k) {
      var rechteck = null;
      if ((getComputedStyle(k).display || "").indexOf("inline") !== 0) {
        try {
          var bereich = document.createRange();
          bereich.selectNodeContents(k);
          rechteck = bereich.getBoundingClientRect();
        } catch (e) { rechteck = null; }
      }
      if (!rechteck || !rechteck.width || !rechteck.height) {
        rechteck = k.getBoundingClientRect();
      }
      if (!rechteck.width && !rechteck.height) return;
      l = Math.min(l, rechteck.left);
      o = Math.min(o, rechteck.top);
      r = Math.max(r, rechteck.right);
      u = Math.max(u, rechteck.bottom);
    }

    (function durchgehen(knoten) {
      for (var i = 0; i < knoten.children.length; i++) {
        var kind = knoten.children[i];
        if (kind.hidden || kind.children.length) durchgehen(kind);
        else messen(kind);
      }
    })(el);

    if (l === Infinity) {
      var ganz = el.getBoundingClientRect();
      l = ganz.left; o = ganz.top; r = ganz.right; u = ganz.bottom;
    }
    return { links: l - f.left, rechts: r - f.left,
             oben: o - f.top, unten: u - f.top };
  };

  /* Schneidet der Kreis das Rechteck? Geprueft wird ueber den Punkt des
     Rechtecks, der dem Mittelpunkt am naechsten liegt. */
  Schaubild.prototype.radSchneidet = function (cx, cy, r, k) {
    var x = Math.max(k.links, Math.min(cx, k.rechts));
    var y = Math.max(k.oben, Math.min(cy, k.unten));
    var dx = cx - x, dy = cy - y;
    return dx * dx + dy * dy < r * r;
  };

  /* Letzte Moeglichkeit: das Rad sitzt mittig in dem Band, das ueber
     dem Text frei bleibt. Liefert den dort groesstmoeglichen Radius. */
  Schaubild.prototype.radUeberText = function (kasten, oben, luecke) {
    var band = Math.max(1, this.h - oben);
    if (kasten) band = Math.max(1, Math.min(band, kasten.oben - luecke - oben));
    /* 0.46 statt 0.5: die geoeffneten Punkte ragen ueber den Ring
       hinaus, der Rest ihres Ueberstands faellt in die Luecke zum
       Text. Auf schmalen Fenstern ist dieses Band der einzige Platz -
       hier zaehlt jeder Pixel. */
    return { cx: this.b * 0.5, cy: oben + band * 0.5,
             radius: Math.min(this.b * 0.38, band * 0.46) };
  };

  Schaubild.prototype.saeenRad = function () {
    var w = wuerfelAb(20261002), i;
    var nSaiten = parseInt(this.flaeche.dataset.punkte, 10) || 76;
    /* Weniger, dafuer groessere Randpunkte. Ueber data-randpunkte am
       Canvas einstellbar. */
    var nRand = parseInt(this.flaeche.dataset.randpunkte, 10) || Math.round(nSaiten * 0.95);

    /* Die Flaeche liegt hinter dem ganzen Hero, also auch hinter der
       Kopfleiste. Fuer die Lage zaehlt nur, was darunter frei ist. */
    var kopf = document.querySelector("header");
    var oben = kopf ? kopf.offsetHeight : 0;
    /* Der Hero ragt unten ueber den Bildschirm hinaus (--hero-ueberstand
       in tailwind/input.css). Dieser Streifen ist reine Flaeche und
       zaehlt fuer die Lage nicht mit - sonst wanderte das Rad mit ihm
       nach unten. */
    var ueberstand = parseFloat(
      getComputedStyle(this.flaeche).getPropertyValue("--hero-ueberstand")) || 0;
    var frei = Math.max(1, this.h - oben - ueberstand);

    var LUECKE = 28;              /* Luft zwischen Text und Rad */
    var RAND = 24;                /* Luft zum rechten Fensterrand */
    /* Ueber data-groesse am Canvas feinjustierbar: Anteil des Radius an
       der freien Hoehe. 0.42 laesst oben und unten gerade Luft fuer die
       geoeffneten Punkte, die auf dem Ring sitzen. */
    var anteil = parseFloat(this.flaeche.dataset.groesse) || 0.42;

    var text = this.flaeche.parentElement
      ? this.flaeche.parentElement.querySelector("[data-hero-text]")
      : null;
    var kasten = text ? this.textkasten(text) : null;

    /* Wunschzustand: so gross wie moeglich, mittig in der Flaeche unter
       der Kopfleiste. Der Ring ist dabei nicht die aeussere Kante - die
       geoeffneten Punkte sitzen darauf und ragen um ihren eigenen
       Radius hinaus, daher der Faktor 1.16. */
    var AUSSEN = 1.16;
    var wunsch = Math.min(this.b * 0.30, (frei * 0.5 - 1) / AUSSEN, frei * anteil);
    var lage = { cx: this.b * 0.5, cy: oben + frei * 0.5, radius: wunsch };

    if (kasten && this.radSchneidet(lage.cx, lage.cy, wunsch * AUSSEN + LUECKE, kasten)) {
      /* Der Text laege auf dem Rad. Zwei Auswege, es gewinnt der mit dem
         groesseren Rad:
           rechts   - neben dem Text, so weit wie noetig nach rechts
           darueber - mittig in dem Band ueber dem Text (wie bisher) */
      var platz = (this.b - RAND - LUECKE - kasten.rechts) / 2;   /* fuer aussen */
      var rechts = { radius: Math.min(wunsch, platz / AUSSEN), cy: oben + frei * 0.5 };
      rechts.cx = kasten.rechts + LUECKE + rechts.radius * AUSSEN;
      var darueber = this.radUeberText(kasten, oben, LUECKE);
      lage = rechts.radius >= darueber.radius ? rechts : darueber;
    }

    this.cx = lage.cx;
    this.cy = lage.cy;
    this.radius = Math.max(1, lage.radius);

    this.prand = Math.max(3, this.radius * 0.020);
    this.pgross = this.radius * 0.155;        /* Radius des geoeffneten Punktes */

    /* Ring aus feinen Punkten. Die Lage wird ueber den Winkel gefuehrt,
       nicht ueber x/y - nur so lassen sich die Nachbarn sauber auf dem
       Kreis zur Seite schieben, ohne ihn zu verlassen. */
    this.rand = [];
    for (i = 0; i < nRand; i++) {
      this.rand.push({
        w0: (i / nRand) * 6.283 - 1.5708,
        dw: 0,        /* Winkelversatz durch den geoeffneten Nachbarn */
        gr: 0,        /* 0 = Punkt, 1 = geoeffnet mit Bild */
        x: 0, y: 0, r: this.prand
      });
    }
    this.aktiv = -1;

    /* Wer steckt hinter einem Punkt. Platzhalter, bis echte Profile da
       sind - ueber data-leute="Name|Gewerk,Name|Gewerk" ersetzbar. */
    var LEUTE = [
      "Marek Nowak|Elektrotechnik",
      "Sina Brandt|Sanitär & Heizung",
      "Tobias Reinhardt|Kältetechnik",
      "Aylin Demir|Gebäudereinigung",
      "Jonas Weidner|Brandschutz",
      "Lena Hoffmann|Aufzugstechnik",
      "Dimitri Kraus|Schließanlagen",
      "Miriam Sadowski|Grünpflege",
      "Erik Baumgart|Malerarbeiten",
      "Nadja Ferreira|Trockenbau",
      "Kai Lindemann|Winterdienst",
      "Ruth Anselm|Lüftungstechnik"
    ];
    var buehne0 = this.flaeche.closest("section");
    this.label = buehne0 ? buehne0.querySelector("[data-radlabel]") : null;

    this.leute = ((this.flaeche.dataset.leute || LEUTE.join(","))).split(",")
      .map(function (z) {
        var teil = z.split("|");
        return { name: (teil[0] || "").trim(), gewerk: (teil[1] || "").trim() };
      })
      .filter(function (e) { return e.name; });

    /* Bilder fuer die geoeffneten Punkte, aus data-bild bzw. data-bilder */
    var quellen = (this.flaeche.dataset.bilder || this.flaeche.dataset.bild || "")
      .split(",").map(function (q) { return q.trim(); }).filter(Boolean);
    this.bilder = quellen.map(function (q) {
      var im = new Image();
      im.decoding = "async";
      im.src = q;
      return im;
    });

    /* Saiten */
    var a1 = w() * 6.283, a2 = w() * 6.283, a3 = w() * 6.283;
    this.saiten = [];
    for (i = 0; i < nSaiten; i++) {
      var wk = (i / nSaiten) * 6.283 - 1.5708 + (w() - 0.5) * 0.02;
      /* Mittelwert null: die Woelbung kippt das Vorzeichen, dadurch
         kreuzen sich die Saiten und es entsteht das Geflecht. */
      var bo = this.radius * (0.150 * Math.sin(2 * wk + a1)
        + 0.105 * Math.sin(3 * wk + a2)
        + 0.055 * Math.sin(5 * wk + a3));
      this.saiten.push({
        ex: this.cx + Math.cos(wk) * this.radius,
        ey: this.cy + Math.sin(wk) * this.radius,
        bogen: bo,
        dx: 0, dy: 0, vx: 0, vy: 0      /* Auslenkung und Geschwindigkeit */
      });
    }

    /* Beschriftungen aus dem HTML, z. B. data-marken="ELEKTRO,SANITAER" */
    var roh = (this.flaeche.dataset.marken || "").split(",");
    this.marken = [];
    if (this.b >= 700) {
      for (i = 0; i < roh.length; i++) {
        var txt = roh[i].trim();
        if (!txt) continue;
        var mw = -1.5708 + ((i + 0.5) / roh.length) * 6.283 + 0.35;
        this.marken.push({ txt: txt + "...", w: mw });
      }
    }
    /* Ruhelage des Zeigers. Ohne Maus wirkte das Rad unfertig - deshalb
       liegt von Anfang an ein gedachter Zeiger auf dem Ring, als haette
       man schon einmal hingezeigt. Der Winkel ist ueber data-ruhewinkel
       einstellbar: 0 Grad ist rechts, 90 unten, 225 oben links. Dort
       steht das Namensschild frei neben dem Rad, ueber der Ueberschrift.
       Auf schmalen Fenstern bleibt es aus - da ist neben dem Rad kein
       Platz fuer das Schild. */
    var ruheWinkel = parseFloat(this.flaeche.dataset.ruhewinkel);
    if (isNaN(ruheWinkel)) ruheWinkel = 225;
    this.zeigerRuhe = null;
    if (this.b >= 700) {
      var rw = ruheWinkel * Math.PI / 180;
      this.zeigerRuhe = {
        x: this.cx + Math.cos(rw) * this.radius,
        y: this.cy + Math.sin(rw) * this.radius
      };
      /* Der getroffene Punkt ist gleich offen statt aufzugehen: sonst
         zeigte das erste Bild einen halb gewachsenen Punkt, und bei
         abgeschalteter Bewegung bliebe es dabei. */
      var jn = Math.round(((rw + 1.5708) / 6.283) * nRand);
      this.aktiv = ((jn % nRand) + nRand) % nRand;
      this.rand[this.aktiv].gr = 1;
    }
    this.zeiger = this.zeigerRuhe;

    this.ruht = this.radRuht;
    /* Drei Sekunden wach: so lange brauchen die Saiten, bis sie in der
       ausgelenkten Lage stehen. Danach ruht das Bild darin. */
    this.wachBis = this.zeigerRuhe ? 3 : 0;
  };

  /* Im Ruhezustand wird nicht neu gezeichnet. Nach dem Verlassen laeuft
     es weiter, bis die Saiten ausgeschwungen sind. */
  Schaubild.prototype.radRuht = function () {
    /* Nur ein echter Zeiger haelt das Bild wach. Die Ruhelage steht
       still, sie muss nicht Bild fuer Bild neu gezeichnet werden -
       daran erkennbar, dass es dasselbe Objekt ist. */
    if (this.zeiger && this.zeiger !== this.zeigerRuhe) {
      this.wachBis = this.t + 2.2;
      return false;
    }
    return this.t > this.wachBis;
  };

  Schaubild.prototype.zeichnenRad = function () {
    var g = this.stift, i, s;
    var wirk = this.radius * 0.46;      /* Greifweite des Zeigers */
    /* Die Ruhelage stellt sich bei etwa KRAFT/STEIF Pixeln ein.
       2.4 / 0.055 sind rund 44 px Auslenkung im Maximum. */
    var KRAFT = 2.4, STEIF = 0.055, DAEMPF = 0.90;

    for (i = 0; i < this.saiten.length; i++) {
      s = this.saiten[i];

      if (this.zeiger) {
        /* naechster Punkt auf der Saite (als Strecke gerechnet) */
        var vx = s.ex - this.cx, vy = s.ey - this.cy;
        var l2 = vx * vx + vy * vy;
        var t = ((this.zeiger.x - this.cx) * vx + (this.zeiger.y - this.cy) * vy) / l2;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        var qx = this.cx + vx * t - this.zeiger.x;
        var qy = this.cy + vy * t - this.zeiger.y;
        var ab = Math.sqrt(qx * qx + qy * qy);
        if (ab < wirk && ab > 0.01) {
          /* sin(pi t): an den Enden ist die Saite eingespannt */
          var f = (1 - ab / wirk) * (1 - ab / wirk) * KRAFT * Math.sin(3.1416 * t);
          s.vx += (qx / ab) * f;
          s.vy += (qy / ab) * f;
        }
      }

      s.vx = (s.vx - STEIF * s.dx) * DAEMPF;
      s.vy = (s.vy - STEIF * s.dy) * DAEMPF;
      s.dx += s.vx;
      s.dy += s.vy;
    }

    /* Saiten */
    g.lineWidth = 0.75;
    g.globalAlpha = 0.30;
    for (i = 0; i < this.saiten.length; i++) {
      s = this.saiten[i];
      var mx = (this.cx + s.ex) / 2, my = (this.cy + s.ey) / 2;
      var lx = s.ex - this.cx, ly = s.ey - this.cy;
      var ln = Math.sqrt(lx * lx + ly * ly) || 1;
      /* Scheitel: Grundwoelbung quer zur Saite plus Auslenkung */
      var sx = mx + (-ly / ln) * s.bogen + s.dx;
      var sy = my + ( lx / ln) * s.bogen + s.dy;
      g.beginPath();
      g.moveTo(this.cx, this.cy);
      g.quadraticCurveTo(2 * sx - mx, 2 * sy - my, s.ex, s.ey);
      g.stroke();
    }

    /* --- Randpunkte: Hover, Verdraengung, Bild --- */
    var rp, j, dlt;

    /* 1. Welcher Punkt ist getroffen? Immer nur einer. Der bereits
       geoeffnete behaelt den Zuschlag, solange der Zeiger in ihm liegt -
       sonst flackert es, weil der Punkt unter dem Zeiger waechst. */
    var neu = -1, kurz = 1e9;
    if (this.zeiger) {
      for (i = 0; i < this.rand.length; i++) {
        rp = this.rand[i];
        var qx = rp.x - this.zeiger.x, qy = rp.y - this.zeiger.y;
        var q = Math.sqrt(qx * qx + qy * qy);
        var fang = Math.max(22, rp.r + 8);
        if (q < fang && q < kurz) { kurz = q; neu = i; }
      }
    }
    this.aktiv = neu;

    /* 2. Groesse und Verdraengung */
    var akt = this.aktiv >= 0 ? this.rand[this.aktiv] : null;
    var noetig = 0, breite = 0;
    if (akt) {
      var rg = this.prand + (this.pgross - this.prand) * akt.gr;
      noetig = (rg + this.prand * 3) / this.radius;   /* freizuhaltender Winkel */
      breite = noetig * 2.4;                          /* darueber laeuft es aus */
    }

    for (i = 0; i < this.rand.length; i++) {
      rp = this.rand[i];
      rp.gr += ((i === this.aktiv ? 1 : 0) - rp.gr) * 0.16;

      var zielDw = 0;
      if (akt && i !== this.aktiv && breite > 0) {
        dlt = rp.w0 - akt.w0;
        while (dlt >  3.1416) dlt -= 6.2832;
        while (dlt < -3.1416) dlt += 6.2832;
        var a = Math.abs(dlt);
        if (a < breite) {
          /* Die Punkte im Band werden neu verteilt: aus [0, breite] wird
             [noetig, breite]. Monoton, deshalb ueberholt keiner den anderen. */
          zielDw = (dlt < 0 ? -1 : 1) * ((noetig + (breite - noetig) * (a / breite)) - a);
        }
      }
      rp.dw += (zielDw - rp.dw) * 0.18;

      var wk2 = rp.w0 + rp.dw;
      rp.x = this.cx + Math.cos(wk2) * this.radius;
      rp.y = this.cy + Math.sin(wk2) * this.radius;
      rp.r = this.prand + (this.pgross - this.prand) * rp.gr;
    }

    /* 3. Zeichnen */
    g.globalAlpha = 0.88;
    for (i = 0; i < this.rand.length; i++) {
      rp = this.rand[i];
      g.beginPath();
      g.arc(rp.x, rp.y, rp.r, 0, 6.283);
      g.fill();
    }

    for (i = 0; i < this.rand.length; i++) {
      rp = this.rand[i];
      if (rp.gr < 0.02 || !this.bilder.length) continue;
      var bild = this.bilder[i % this.bilder.length];
      if (!bild.complete || !bild.naturalWidth) continue;

      g.save();
      g.globalAlpha = rp.gr;
      g.beginPath();
      g.arc(rp.x, rp.y, rp.r, 0, 6.283);
      g.clip();
      /* formatfuellend, mittig beschnitten */
      var sk = Math.max((rp.r * 2) / bild.naturalWidth, (rp.r * 2) / bild.naturalHeight);
      var bw = bild.naturalWidth * sk, bh = bild.naturalHeight * sk;
      g.drawImage(bild, rp.x - bw / 2, rp.y - bh / 2, bw, bh);
      g.restore();

      g.globalAlpha = 0.85 * rp.gr;
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(rp.x, rp.y, rp.r, 0, 6.283);
      g.stroke();
    }

    this.beschriften(akt);

    /* Beschriftungen */
    if (this.marken.length) {
      g.globalAlpha = 0.60;
      g.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";
      try { g.letterSpacing = "0.09em"; } catch (e) {}
      g.textBaseline = "middle";
      var ab2 = this.radius * 1.13;
      for (i = 0; i < this.marken.length; i++) {
        var m = this.marken[i];
        var tx = this.cx + Math.cos(m.w) * ab2;
        var ty = this.cy + Math.sin(m.w) * ab2;
        if (tx < this.b * 0.55) continue;   /* nicht in die Textspalte */
        /* Ein geoeffneter Punkt haette sonst die Beschriftung unter sich */
        if (akt && akt.gr > 0.02) {
          var lx2 = tx - akt.x, ly2 = ty - akt.y;
          var frei = Math.sqrt(lx2 * lx2 + ly2 * ly2) / (akt.r + 60);
          g.globalAlpha = 0.60 * Math.min(1, Math.max(0, frei - 0.15));
        } else {
          g.globalAlpha = 0.60;
        }
        g.textAlign = Math.cos(m.w) < -0.15 ? "right" : (Math.cos(m.w) > 0.15 ? "left" : "center");
        g.fillText(m.txt, tx, ty);
      }
      try { g.letterSpacing = "0px"; } catch (e) {}
    }

    g.globalAlpha = 1;
  };
})();
