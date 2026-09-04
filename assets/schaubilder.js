/* taskrunner - Punkt-Schaubilder der Sektion "Schnell, einfach und Transparent".
   Alles gerechnet, keine Bilder.

   Gestaltung: flach, kein 3D. Ein einziger Verlauf spannt sich ueber die
   gesamte Flaeche und faerbt jedes Element - Strahlen, Punkte, Auftragskarte.
   Tiefe entsteht allein dadurch, dass sich durchscheinende Linien ueberlagern,
   nicht durch Schatten oder Glanzlichter.

   Ein Punkt ist ein Taskrunner. Der Auftrag ist die Karte oben, also nie ein Punkt.

   Einbau:  <canvas data-schaubild="gewerke" data-punkte="9"></canvas>          */
(function () {
  "use strict";

  var HELL = "66,133,244";      /* Light Blue  #4285f4 */
  var TIEF = "17,85,204";       /* Medium Blue #1155cc */

  var FEIN = 130;               /* Anzahl der feinen Hintergrundstrahlen */

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
  var grob  = window.matchMedia("(pointer: coarse)");

  function Schaubild(flaeche) {
    this.flaeche = flaeche;
    this.stift = flaeche.getContext("2d");
    this.anzahl = parseInt(flaeche.dataset.punkte, 10) || 9;
    this.zeiger = null;
    this.laeuft = false;
    this.t = 0;
    this.punkte = [];
    this.impulse = [];
    this.messen();
    this.saeen();
    this.binden();
    this.zeichnen();
  }

  /* ---------------------------------------------------------------- *
   *  Masse und der eine Verlauf ueber die ganze Flaeche
   * ---------------------------------------------------------------- */
  Schaubild.prototype.messen = function () {
    var r = this.flaeche.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, 2);
    this.b = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.flaeche.width = this.b * d;
    this.flaeche.height = this.h * d;
    this.stift.setTransform(d, 0, 0, d, 0, 0);

    this.kb = Math.min(190, this.b * 0.44);
    this.kh = this.kb * 0.54;
    this.kx = (this.b - this.kb) / 2;
    this.ky = this.h * 0.06;
    this.kunten = this.ky + this.kh;

    /* Der Verlauf laeuft von oben links nach unten rechts ueber alles */
    var v = this.stift.createLinearGradient(0, 0, this.b, this.h);
    v.addColorStop(0.00, "rgba(" + HELL + ",0.62)");
    v.addColorStop(0.45, "rgba(" + HELL + ",0.85)");
    v.addColorStop(1.00, "rgba(" + TIEF + ",1)");
    this.verlauf = v;

    /* Flaechenverlauf: liegt hinter allem und faerbt die ganze Karte */
    var f = this.stift.createLinearGradient(0, 0, this.b * 0.35, this.h);
    f.addColorStop(0.00, "rgba(255,255,255,0)");
    f.addColorStop(0.42, "rgba(" + HELL + ",0.05)");
    f.addColorStop(1.00, "rgba(" + HELL + ",0.17)");
    this.flaechenverlauf = f;

    /* zusaetzlicher Lichtkern dort, wo der Faecher am dichtesten ist */
    var k = this.stift.createRadialGradient(
      this.b / 2, this.h * 0.72, 0, this.b / 2, this.h * 0.72, this.b * 0.80);
    k.addColorStop(0.00, "rgba(" + HELL + ",0.16)");
    k.addColorStop(0.55, "rgba(" + HELL + ",0.05)");
    k.addColorStop(1.00, "rgba(" + HELL + ",0)");
    this.lichtkern = k;

    /* Zwischenflaeche fuer das Weichzeichnen hinter der Glaskarte */
    this.tiefe_ = d;
    if (!this.glas) this.glas = document.createElement("canvas");
    this.glas.width = this.flaeche.width;
    this.glas.height = this.flaeche.height;
    var pg = this.glas.getContext("2d");
    this.glasMoeglich = !!pg && typeof pg.filter === "string";
  };

  Schaubild.prototype.saeen = function () {
    var rand = Math.max(14, this.b * 0.055);   /* Punkte weit aussen, aber nicht angeschnitten */
    var boden = this.h * 0.78;                 /* Reihe rueckt naeher heran   */
    var woelbung = this.h * 0.075;             /* staerker gewoelbt           */
    var n = this.anzahl, i, t, dd;

    this.punkte = [];
    for (i = 0; i < n; i++) {
      t = n === 1 ? 0.5 : i / (n - 1);
      dd = (t - 0.5) * 2;
      this.punkte.push({
        rx: rand + t * (this.b - 2 * rand),
        ry: boden - woelbung * (1 - dd * dd),
        ax: this.kx + 12 + t * (this.kb - 24),
        x: 0, y: 0,
        tiefe: 1 - Math.abs(dd),
        phase: i * 0.9,
        naehe: 0,
        blitz: 0
      });
    }

    /* Feine Strahlen dahinter - sie erzeugen die Dichte, jeder fuer sich
       kaum sichtbar. Fest gestreut, damit das Bild nicht flimmert. */
    this.fein = [];
    var zufall = 987654321;
    var wuerfel = function () {           /* immer dieselbe Streuung */
      zufall = (zufall * 1103515245 + 12345) % 2147483648;
      return zufall / 2147483648;
    };
    for (i = 0; i < FEIN; i++) {
      t = i / (FEIN - 1);
      dd = (t - 0.5) * 2;
      /* Die feinen Strahlen enden auf derselben Bogenlinie wie die Punkte,
         nur unterschiedlich weit - so bleibt der untere Rand sauber. */
      var laenge = 0.80 + wuerfel() * 0.20;
      var ezx = -this.b * 0.06 + t * (this.b * 1.12) + (wuerfel() - 0.5) * this.b * 0.05;
      var ezy = boden - woelbung * 1.5 * (1 - dd * dd) + (wuerfel() - 0.5) * this.h * 0.05;
      var sax = this.kx + 8 + t * (this.kb - 16);
      this.fein.push({
        ax: sax,
        zx: sax + (ezx - sax) * laenge,
        zy: this.kunten + (ezy - this.kunten) * laenge,
        deck: 0.05 + wuerfel() * 0.07,
        kopf: wuerfel() < 0.30,          /* manche enden in einem winzigen Punkt */
        phase: wuerfel() * 6.283
      });
    }
  };

  Schaubild.prototype.binden = function () {
    var s = this;

    if (!grob.matches) {
      this.flaeche.addEventListener("pointermove", function (e) {
        var r = s.flaeche.getBoundingClientRect();
        s.zeiger = { x: e.clientX - r.left, y: e.clientY - r.top };
      }, { passive: true });
      this.flaeche.addEventListener("pointerleave", function () { s.zeiger = null; }, { passive: true });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        e.forEach(function (x) { x.isIntersecting ? s.start() : s.stopp(); });
      }, { rootMargin: "120px" }).observe(this.flaeche);
    } else {
      this.start();
    }

    var neu = function () { s.messen(); s.saeen(); s.zeichnen(); };
    if ("ResizeObserver" in window) new ResizeObserver(neu).observe(this.flaeche);
    else window.addEventListener("resize", neu);

    var aufRuhe = function () { ruhig.matches ? (s.stopp(), s.zeichnen()) : s.start(); };
    if (ruhig.addEventListener) ruhig.addEventListener("change", aufRuhe);
    else if (ruhig.addListener) ruhig.addListener(aufRuhe);
  };

  Schaubild.prototype.start = function () {
    this.zeichnen();                       /* nie eine leere Flaeche */
    if (this.laeuft || ruhig.matches) return;
    this.laeuft = true;
    var s = this;
    (function schritt() {
      if (!s.laeuft) return;
      s.t += 1 / 60;
      s.zeichnen();
      s.anfrage = requestAnimationFrame(schritt);
    })();
  };

  Schaubild.prototype.stopp = function () {
    this.laeuft = false;
    if (this.anfrage) cancelAnimationFrame(this.anfrage);
  };

  /* ---------------------------------------------------------------- *
   *  Zeichnen
   * ---------------------------------------------------------------- */
  Schaubild.prototype.zeichnen = function () {
    var g = this.stift, i, p, im;

    g.clearRect(0, 0, this.b, this.h);

    /* Flaechenverlauf und Lichtkern hinter allem */
    g.globalAlpha = 1;
    g.fillStyle = this.flaechenverlauf;
    g.fillRect(0, 0, this.b, this.h);
    g.fillStyle = this.lichtkern;
    g.fillRect(0, 0, this.b, this.h);

    g.strokeStyle = this.verlauf;
    g.fillStyle = this.verlauf;
    g.lineCap = "round";

    this.impulsePflegen();
    this.punkteBewegen();

    /* 1 - feine Strahlen: die Dichte */
    g.lineWidth = 0.6;
    for (i = 0; i < this.fein.length; i++) {
      var f = this.fein[i];
      var atem = ruhig.matches ? 0 : Math.sin(this.t * 0.5 + f.phase) * 0.35 + 0.65;
      g.globalAlpha = f.deck * (ruhig.matches ? 1 : atem);
      g.beginPath();
      g.moveTo(f.ax, this.kunten);
      g.lineTo(f.zx, f.zy);
      g.stroke();
      if (f.kopf) {
        g.globalAlpha = f.deck * 2.6;
        g.beginPath();
        g.arc(f.zx, f.zy, 1.15, 0, 6.283);
        g.fill();
      }
    }

    /* 2 - die neun Strahlen zu den Taskrunnern */
    for (i = 0; i < this.punkte.length; i++) {
      p = this.punkte[i];
      g.globalAlpha = 0.16 + 0.14 * p.tiefe + 0.40 * p.naehe + 0.30 * p.blitz;
      g.lineWidth = 0.9 + 0.5 * p.naehe;
      g.beginPath();
      g.moveTo(p.ax, this.kunten);
      g.lineTo(p.x, p.y);
      g.stroke();
    }

    /* 3 - laufende Impulse */
    for (i = 0; i < this.impulse.length; i++) {
      im = this.impulse[i];
      p = this.punkte[im.ziel];
      if (!p) continue;
      var e = im.s < 0.5 ? 2 * im.s * im.s : 1 - Math.pow(-2 * im.s + 2, 2) / 2;
      var ix = p.ax + (p.x - p.ax) * e;
      var iy = this.kunten + (p.y - this.kunten) * e;
      g.globalAlpha = Math.sin(im.s * Math.PI) * 0.9;
      g.beginPath();
      g.arc(ix, iy, 2.4, 0, 6.283);
      g.fill();
    }

    /* 4 - die Auftragskarte, flach */
    this.karteZeichnen();

    /* 5 - die Taskrunner, flache Punkte */
    g.fillStyle = this.verlauf;          /* Fuellfarbe nach der Glaskarte zuruecksetzen */
    for (i = 0; i < this.punkte.length; i++) {
      p = this.punkte[i];
      g.globalAlpha = 0.72 + 0.22 * p.tiefe + 0.06 * p.naehe;
      g.beginPath();
      g.arc(p.x, p.y, (2.6 + 1.5 * p.tiefe) * (1 + 0.30 * p.naehe + 0.22 * p.blitz), 0, 6.283);
      g.fill();
    }

    g.globalAlpha = 1;
  };

  Schaubild.prototype.punkteBewegen = function () {
    var i, p, drift = ruhig.matches ? 0 : 1;
    for (i = 0; i < this.punkte.length; i++) {
      p = this.punkte[i];
      p.x = p.rx + Math.sin(this.t * 0.5 + p.phase) * 3.2 * drift;
      p.y = p.ry + Math.cos(this.t * 0.42 + p.phase * 1.3) * 2.2 * drift;

      var ziel = 0;
      if (this.zeiger) {
        var dx = this.zeiger.x - p.x, dy = this.zeiger.y - p.y;
        var w = Math.sqrt(dx * dx + dy * dy);
        ziel = Math.max(0, 1 - w / (this.b * 0.28));
        ziel *= ziel;
        p.x += dx * 0.10 * ziel;
        p.y += dy * 0.10 * ziel;
      }
      p.naehe += (ziel - p.naehe) * 0.14;
      p.blitz *= 0.94;
    }
  };

  Schaubild.prototype.impulsePflegen = function () {
    var i;
    if (!ruhig.matches && this.impulse.length < 3 && Math.random() < 0.013) {
      this.impulse.push({ ziel: Math.floor(Math.random() * this.punkte.length), s: 0 });
    }
    for (i = this.impulse.length - 1; i >= 0; i--) {
      this.impulse[i].s += 0.011;
      if (this.impulse[i].s >= 1) {
        var p = this.punkte[this.impulse[i].ziel];
        if (p) p.blitz = 1;
        this.impulse.splice(i, 1);
      }
    }
  };

  /* Die Auftragskarte als Glas: der Untergrund wird weichgezeichnet,
     darauf eine helle Tönung, ein Lichtsaum an der oberen Kante und ein
     Rand, der von hell nach blau kippt. Kein Schlagschatten. */
  Schaubild.prototype.karteZeichnen = function () {
    var g = this.stift, x = this.kx, y = this.ky, b = this.kb, h = this.kh, r = 12, i;
    var d = this.tiefe_ || 1;

    g.globalAlpha = 1;

    if (this.glasMoeglich) {
      /* Untergrund einmal leicht weichzeichnen ... */
      var pg = this.glas.getContext("2d");
      pg.setTransform(1, 0, 0, 1, 0, 0);
      pg.clearRect(0, 0, this.glas.width, this.glas.height);
      pg.filter = "blur(" + (2.5 * d) + "px)";
      pg.drawImage(this.flaeche, 0, 0);
      pg.filter = "none";

      /* ... und dann streifenweise verzerrt zurueckzeichnen. Jeder Streifen
         holt sein Bild etwas weiter aussen und leicht vergroessert - zum
         Rand hin staerker. Das ergibt die Lichtbrechung einer Linse. */
      var streifen = 96;
      var cy = y + h / 2, cx = x + b / 2;
      var LUPE = 0.055;        /* Grundvergroesserung   */
      var RAND = 0.13;         /* Zunahme zum Rand hin  */

      g.save();
      this.pfadKarte(x, y, b, h, r);
      g.clip();
      for (i = 0; i < streifen; i++) {
        var y0 = y + (h / streifen) * i;
        var hs = h / streifen + 1.5;   /* Ueberlappung gegen sichtbare Kanten */
        var v = (y0 + hs / 2 - cy) / (h / 2);        /* -1 oben ... +1 unten */
        var k = 1 + LUPE + RAND * v * v;             /* Verzerrung */

        var qy = cy + (y0 - cy) * k;                 /* Quelle: weiter aussen */
        var qh = hs * k;
        var qx = cx - (b / 2) * k;
        var qb = b * k;

        g.drawImage(this.glas,
          qx * d, qy * d, qb * d, qh * d,            /* Quelle in Geraetepixeln */
          x, y0, b, hs);                             /* Ziel  in CSS-Pixeln     */
      }
      g.restore();
    }

    /* helle Toenung, oben dichter - das laesst das Glas gewoelbt wirken */
    var ton = g.createLinearGradient(x, y, x + b * 0.4, y + h);
    ton.addColorStop(0.00, "rgba(255,255,255,0.78)");
    ton.addColorStop(0.55, "rgba(255,255,255,0.60)");
    ton.addColorStop(1.00, "rgba(255,255,255,0.44)");
    this.pfadKarte(x, y, b, h, r);
    g.fillStyle = ton;
    g.fill();

    /* Rand: oben links heller Lichtsaum, unten rechts blau */
    var saum = g.createLinearGradient(x, y, x + b, y + h);
    saum.addColorStop(0.00, "rgba(255,255,255,0.95)");
    saum.addColorStop(0.38, "rgba(" + HELL + ",0.45)");
    saum.addColorStop(1.00, "rgba(" + TIEF + ",0.38)");
    g.strokeStyle = saum;
    g.lineWidth = 1.2;
    this.pfadKarte(x, y, b, h, r);
    g.stroke();

    /* innerer Lichtstreifen direkt unter der Oberkante */
    g.save();
    this.pfadKarte(x, y, b, h, r);
    g.clip();
    var glanz = g.createLinearGradient(0, y, 0, y + h * 0.42);
    glanz.addColorStop(0, "rgba(255,255,255,0.85)");
    glanz.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glanz;
    g.fillRect(x, y, b, h * 0.42);
    g.restore();

    /* angedeutete Zeilen im Auftrag */
    g.strokeStyle = this.verlauf;
    g.lineWidth = 3;
    var zeilen = [[0.32, 0.62], [0.52, 0.78], [0.72, 0.44]];
    for (i = 0; i < zeilen.length; i++) {
      g.globalAlpha = 0.22;
      g.beginPath();
      g.moveTo(x + b * 0.13, y + h * zeilen[i][0]);
      g.lineTo(x + b * 0.13 + (b * 0.74) * zeilen[i][1], y + h * zeilen[i][0]);
      g.stroke();
    }
    g.globalAlpha = 1;
  };

  Schaubild.prototype.pfadKarte = function (x, y, b, h, r) {
    var g = this.stift;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + b, y, x + b, y + h, r);
    g.arcTo(x + b, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + b, y, r);
    g.closePath();
  };

  function starten() {
    var f = document.querySelectorAll("canvas[data-schaubild]");
    for (var i = 0; i < f.length; i++) new Schaubild(f[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starten);
  else starten();
})();
