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
    var frei = Math.max(1, this.h - oben);

    /* Die Ueberschrift ist gross und ihre Zeilenzahl haengt vom Text ab.
       Der Kreis bekommt deshalb nicht die ganze freie Flaeche, sondern
       nur den Platz oberhalb von [data-hero-text] (mit etwas Luft) - so
       landet er nie auf der Ueberschrift, unabhaengig davon, wie viele
       Zeilen sie gerade braucht. */
    var LUECKE = 24;
    var text = this.flaeche.parentElement
      ? this.flaeche.parentElement.querySelector("[data-hero-text]")
      : null;
    if (text) {
      var rFlaeche = this.flaeche.getBoundingClientRect();
      var textOben = text.getBoundingClientRect().top - rFlaeche.top;
      frei = Math.max(1, Math.min(frei, textOben - LUECKE - oben));
    }

    if (this.b < 700) {
      /* Schmal: Text nimmt die ganze Breite, der Kreis steht mittig
         darueber. */
      this.cx = this.b * 0.5;
      this.cy = oben + frei * 0.5;
      this.radius = Math.min(this.b * 0.38, frei * 0.48);
    } else {
      /* Breit: der Kreis steht genau mittig in der freien Flaeche unter
         der Kopfleiste, der Text liegt unten links darueber. */
      this.cx = this.b * 0.5;
      this.cy = oben + frei * 0.5;
      /* 0.48 statt 0.36: der Kreis soll das Band ueber der Headline
         ausfuellen, nicht nur ein Drittel davon. Die Luecke zum Text
         ist oben schon abgezogen. */
      this.radius = Math.min(this.b * 0.22, frei * 0.48);
    }

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
    this.ruht = this.radRuht;
    this.wachBis = 0;
  };

  /* Im Ruhezustand wird nicht neu gezeichnet. Nach dem Verlassen laeuft
     es weiter, bis die Saiten ausgeschwungen sind. */
  Schaubild.prototype.radRuht = function () {
    if (this.zeiger) { this.wachBis = this.t + 2.2; return false; }
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
