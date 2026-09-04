/* taskrunner - Punkt-Schaubilder der Sektion "Schnell, einfach und Transparent".
   Alles gerechnet, keine Bilder.

   Motiv Karte 1 "Ein Auftrag, alle Gewerke": Orbit.
   Der Auftrag liegt als Glaskarte in der Mitte, die Taskrunner ziehen auf drei
   Bahnen darum herum. Tiefe entsteht ohne 3D: Punkte auf der hinteren
   Bahnhaelfte werden VOR der Karte gezeichnet - sie verschwinden also dahinter -
   und sind kleiner und blasser als die vorderen.
   Von Zeit zu Zeit geht ein Auftrag an einen Taskrunner: erst dann erscheint
   die Verbindungslinie, ein Impuls laeuft hinaus, der Punkt leuchtet auf.

   Einbau:  <canvas data-schaubild="orbit"></canvas>                            */
(function () {
  "use strict";

  var HELL = "66,133,244";      /* Light Blue  #4285f4 */
  var TIEF = "17,85,204";       /* Medium Blue #1155cc */

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
  var grob  = window.matchMedia("(pointer: coarse)");

  function Schaubild(flaeche) {
    this.flaeche = flaeche;
    this.stift = flaeche.getContext("2d");
    this.zeiger = null;
    this.laeuft = false;
    this.t = 0;
    this.impulse = [];
    this.messen();
    this.saeen();
    this.binden();
    this.zeichnen();
  }

  /* ---------------------------------------------------------------- Masse */
  Schaubild.prototype.messen = function () {
    var r = this.flaeche.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, 2);
    this.b = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.d = d;
    this.flaeche.width = this.b * d;
    this.flaeche.height = this.h * d;
    this.stift.setTransform(d, 0, 0, d, 0, 0);

    this.cx = this.b / 2;
    this.cy = this.h * 0.52;
    this.kb = Math.min(168, this.b * 0.44);
    this.kh = this.kb * 0.52;

    var v = this.stift.createLinearGradient(0, 0, this.b, this.h);
    v.addColorStop(0.00, "rgba(" + HELL + ",0.62)");
    v.addColorStop(0.45, "rgba(" + HELL + ",0.85)");
    v.addColorStop(1.00, "rgba(" + TIEF + ",1)");
    this.verlauf = v;

    var f = this.stift.createLinearGradient(this.b, 0, 0, this.h);
    f.addColorStop(0.00, "rgba(255,255,255,0)");
    f.addColorStop(0.45, "rgba(" + HELL + ",0.05)");
    f.addColorStop(1.00, "rgba(" + HELL + ",0.16)");
    this.flaechenverlauf = f;

    var k = this.stift.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.b * 0.62);
    k.addColorStop(0.00, "rgba(" + HELL + ",0.15)");
    k.addColorStop(0.55, "rgba(" + HELL + ",0.05)");
    k.addColorStop(1.00, "rgba(" + HELL + ",0)");
    this.lichtkern = k;

    if (!this.glas) this.glas = document.createElement("canvas");
    this.glas.width = this.flaeche.width;
    this.glas.height = this.flaeche.height;
    var pg = this.glas.getContext("2d");
    this.glasMoeglich = !!pg && typeof pg.filter === "string";
  };

  /* ---------------------------------------------------------- Bahnen saeen */
  Schaubild.prototype.saeen = function () {
    var i, k, zufall = 20260904;
    var wuerfel = function () {
      zufall = (zufall * 1103515245 + 12345) % 2147483648;
      return zufall / 2147483648;
    };

    /* Die innerste Bahn liegt knapp ausserhalb der Karte, damit sie oben
       sichtbar bleibt und unten davor vorbeizieht. */
    var bahnen = [
      { rx: this.kb * 0.70, ry: this.kh * 0.86, n: 6,  tempo:  0.150 },
      { rx: this.kb * 1.02, ry: this.kh * 1.42, n: 9,  tempo: -0.105 },
      { rx: this.kb * 1.34, ry: this.kh * 2.05, n: 12, tempo:  0.072 }
    ];
    this.bahnen = [];
    this.punkte = [];
    for (i = 0; i < bahnen.length; i++) {
      var bn = bahnen[i];
      bn.rx = Math.min(bn.rx, this.b * 0.46);
      bn.ry = Math.min(bn.ry, this.h * 0.42);
      var liste = [];
      for (k = 0; k < bn.n; k++) {
        var p = {
          bahn: i,
          w0: k * (6.283 / bn.n) + wuerfel() * 0.4,
          tempo: bn.tempo,
          rx: bn.rx, ry: bn.ry,
          x: 0, y: 0, vorn: 0,
          naehe: 0, blitz: 0
        };
        liste.push(p);
        this.punkte.push(p);
      }
      this.bahnen.push({ rx: bn.rx, ry: bn.ry, punkte: liste });
    }
  };

  /* -------------------------------------------------------------- Ereignisse */
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

  /* ------------------------------------------------------------- Zeichnen */
  Schaubild.prototype.zeichnen = function () {
    var g = this.stift, i;

    g.clearRect(0, 0, this.b, this.h);
    g.globalAlpha = 1;
    g.fillStyle = this.flaechenverlauf;
    g.fillRect(0, 0, this.b, this.h);
    g.fillStyle = this.lichtkern;
    g.fillRect(0, 0, this.b, this.h);

    g.strokeStyle = this.verlauf;
    g.fillStyle = this.verlauf;
    g.lineCap = "round";

    this.punkteBewegen();
    this.impulsePflegen();

    /* 1 - die Bahnen */
    g.lineWidth = 0.8;
    for (i = 0; i < this.bahnen.length; i++) {
      g.globalAlpha = 0.13;
      g.beginPath();
      g.ellipse(this.cx, this.cy, this.bahnen[i].rx, this.bahnen[i].ry, 0, 0, 6.283);
      g.stroke();
    }

    /* 2 - was hinter der Karte liegt */
    this.punkteZeichnen(false);
    this.impulseZeichnen(false);

    /* 3 - die Auftragskarte */
    this.karteZeichnen();

    /* 4 - was davor liegt */
    this.impulseZeichnen(true);
    this.punkteZeichnen(true);

    g.globalAlpha = 1;
  };

  Schaubild.prototype.punkteBewegen = function () {
    var i, p, lauf = ruhig.matches ? 0 : 1;
    for (i = 0; i < this.punkte.length; i++) {
      p = this.punkte[i];
      var w = p.w0 + this.t * p.tempo * lauf;
      p.w = w;
      p.x = this.cx + Math.cos(w) * p.rx;
      p.y = this.cy + Math.sin(w) * p.ry;
      p.vorn = (Math.sin(w) + 1) / 2;          /* 1 = ganz vorn (unten) */

      var ziel = 0;
      if (this.zeiger) {
        var dx = this.zeiger.x - p.x, dy = this.zeiger.y - p.y;
        var e = Math.sqrt(dx * dx + dy * dy);
        ziel = Math.max(0, 1 - e / (this.b * 0.22));
        ziel *= ziel;
      }
      p.naehe += (ziel - p.naehe) * 0.14;
      p.blitz *= 0.955;
    }
  };

  /* vorn = true zeichnet nur, was vor der Karte liegt */
  Schaubild.prototype.punkteZeichnen = function (vorn) {
    var g = this.stift, i, p;
    for (i = 0; i < this.punkte.length; i++) {
      p = this.punkte[i];
      if ((p.vorn >= 0.5) !== !!vorn) continue;
      var r = (1.9 + 2.4 * p.vorn) * (1 + 0.34 * p.naehe + 0.30 * p.blitz);
      g.globalAlpha = Math.min(1, 0.26 + 0.52 * p.vorn + 0.20 * p.naehe + 0.30 * p.blitz);
      g.beginPath();
      g.arc(p.x, p.y, r, 0, 6.283);
      g.fill();
    }
  };

  /* Ein Auftrag geht raus: Linie erscheint, Impuls laeuft, Punkt leuchtet auf */
  Schaubild.prototype.impulsePflegen = function () {
    var i;
    if (!ruhig.matches && this.impulse.length < 2 && Math.random() < 0.016) {
      this.impulse.push({ p: this.punkte[Math.floor(Math.random() * this.punkte.length)], s: 0 });
    }
    for (i = this.impulse.length - 1; i >= 0; i--) {
      this.impulse[i].s += 0.014;
      if (this.impulse[i].s >= 1) {
        this.impulse[i].p.blitz = 1;
        this.impulse.splice(i, 1);
      }
    }
  };

  Schaubild.prototype.impulseZeichnen = function (vorn) {
    var g = this.stift, i;
    for (i = 0; i < this.impulse.length; i++) {
      var im = this.impulse[i], p = im.p;
      if ((p.vorn >= 0.5) !== !!vorn) continue;

      /* Startpunkt am Rand der Karte, in Richtung des Ziels */
      var dx = p.x - this.cx, dy = p.y - this.cy;
      var m = Math.max(Math.abs((this.kb / 2) / (dx || 1e-6)), Math.abs((this.kh / 2) / (dy || 1e-6)));
      var sx = this.cx + dx * m, sy = this.cy + dy * m;

      g.globalAlpha = 0.30 * Math.sin(im.s * Math.PI);
      g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(p.x, p.y); g.stroke();

      var e = im.s < 0.5 ? 2 * im.s * im.s : 1 - Math.pow(-2 * im.s + 2, 2) / 2;
      g.globalAlpha = 0.85 * Math.sin(im.s * Math.PI);
      g.beginPath();
      g.arc(sx + (p.x - sx) * e, sy + (p.y - sy) * e, 2.2, 0, 6.283);
      g.fill();
    }
  };

  /* Glaskarte: der Untergrund wird weichgezeichnet und streifenweise
     verzerrt zurueckgelegt - die Bahnen dahinter brechen sichtbar. */
  Schaubild.prototype.karteZeichnen = function () {
    var g = this.stift, d = this.d, i;
    var b = this.kb, h = this.kh, x = this.cx - b / 2, y = this.cy - h / 2, r = 11;

    g.globalAlpha = 1;

    if (this.glasMoeglich) {
      var pg = this.glas.getContext("2d");
      pg.setTransform(1, 0, 0, 1, 0, 0);
      pg.clearRect(0, 0, this.glas.width, this.glas.height);
      pg.filter = "blur(" + (2.5 * d) + "px)";
      pg.drawImage(this.flaeche, 0, 0);
      pg.filter = "none";

      var st = 96, LUPE = 0.055, RAND = 0.13;
      g.save();
      this.pfadKarte(x, y, b, h, r);
      g.clip();
      for (i = 0; i < st; i++) {
        var y0 = y + (h / st) * i, hs = h / st + 1.5;
        var v = (y0 + hs / 2 - this.cy) / (h / 2);
        var k = 1 + LUPE + RAND * v * v;
        g.drawImage(this.glas,
          (this.cx - (b / 2) * k) * d, (this.cy + (y0 - this.cy) * k) * d, b * k * d, hs * k * d,
          x, y0, b, hs);
      }
      g.restore();
    }

    var ton = g.createLinearGradient(x, y, x + b * 0.4, y + h);
    ton.addColorStop(0.00, "rgba(255,255,255,0.78)");
    ton.addColorStop(0.55, "rgba(255,255,255,0.60)");
    ton.addColorStop(1.00, "rgba(255,255,255,0.44)");
    this.pfadKarte(x, y, b, h, r);
    g.fillStyle = ton;
    g.fill();

    var saum = g.createLinearGradient(x, y, x + b, y + h);
    saum.addColorStop(0.00, "rgba(255,255,255,0.95)");
    saum.addColorStop(0.38, "rgba(" + HELL + ",0.45)");
    saum.addColorStop(1.00, "rgba(" + TIEF + ",0.38)");
    g.strokeStyle = saum;
    g.lineWidth = 1.2;
    this.pfadKarte(x, y, b, h, r);
    g.stroke();

    g.save();
    this.pfadKarte(x, y, b, h, r);
    g.clip();
    var glanz = g.createLinearGradient(0, y, 0, y + h * 0.45);
    glanz.addColorStop(0, "rgba(255,255,255,0.85)");
    glanz.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glanz;
    g.fillRect(x, y, b, h * 0.45);
    g.restore();

    g.strokeStyle = this.verlauf;
    g.lineWidth = 3;
    var zeilen = [[0.32, 0.60], [0.54, 0.76], [0.76, 0.42]];
    for (i = 0; i < zeilen.length; i++) {
      g.globalAlpha = 0.22;
      g.beginPath();
      g.moveTo(x + b * 0.14, y + h * zeilen[i][0]);
      g.lineTo(x + b * 0.14 + (b * 0.72) * zeilen[i][1], y + h * zeilen[i][0]);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = this.verlauf;
    g.strokeStyle = this.verlauf;
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
