/* taskrunner - Punkt-Schaubild der Karte "Ein Auftrag, alle Gewerke".
   Alles gerechnet, keine Bilder.

   Motiv: Orbit. Der Auftrag liegt als Glaskarte in der Mitte, die Taskrunner
   ziehen auf drei flachen Bahnen darum herum. Punkte auf der vorderen
   Bahnhaelfte sind groesser und kraeftiger als auf der hinteren - daher die
   Tiefe, ganz ohne 3D. Sonst nichts: keine Impulse, keine Zeigerreaktion.

   Einbau:  <canvas data-schaubild="orbit"></canvas>                          */
(function () {
  "use strict";

  var HELL = "66,133,244";      /* Light Blue  #4285f4 */
  var TIEF = "17,85,204";       /* Medium Blue #1155cc */
  var FLACH = 0.41;             /* Hoehe zu Breite der Bahnen */

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");

  function Schaubild(flaeche) {
    this.flaeche = flaeche;
    this.stift = flaeche.getContext("2d");
    this.motiv = flaeche.dataset.schaubild === "welle" ? "welle" : "orbit";
    this.laeuft = false;
    this.t = 0;
    this.messen();
    this.saeen();
    this.binden();
    this.zeichnen();
  }

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
    this.cy = this.h * 0.54;
    this.kb = Math.min(150, this.b * 0.40);
    this.kh = this.kb * 0.52;

    var v = this.stift.createLinearGradient(0, 0, this.b, this.h);
    v.addColorStop(0.00, "rgba(" + HELL + ",0.60)");
    v.addColorStop(0.50, "rgba(" + HELL + ",0.85)");
    v.addColorStop(1.00, "rgba(" + TIEF + ",1)");
    this.verlauf = v;

    var f = this.stift.createLinearGradient(this.b, 0, 0, this.h);
    f.addColorStop(0.00, "rgba(255,255,255,0)");
    f.addColorStop(0.45, "rgba(" + HELL + ",0.05)");
    f.addColorStop(1.00, "rgba(" + HELL + ",0.16)");
    this.flaechenverlauf = f;

    if (!this.glas) this.glas = document.createElement("canvas");
    this.glas.width = this.flaeche.width;
    this.glas.height = this.flaeche.height;
    var pg = this.glas.getContext("2d");
    this.glasMoeglich = !!pg && typeof pg.filter === "string";
  };

  Schaubild.prototype.saeen = function () {
    if (this.motiv === "welle") return this.saeenWelle();
    var i, k, zufall = 20260904;
    var wuerfel = function () {
      zufall = (zufall * 1103515245 + 12345) % 2147483648;
      return zufall / 2147483648;
    };
    this.bahnen = [];
    for (i = 0; i < 3; i++) {
      var rx = this.b * (0.20 + i * 0.145);
      var bn = { rx: rx, ry: rx * FLACH, punkte: [] };
      var n = 5 + i * 3;
      for (k = 0; k < n; k++) {
        bn.punkte.push({ w0: k * (6.283 / n) + wuerfel(), tempo: 0.16 - i * 0.035 });
      }
      this.bahnen.push(bn);
    }
  };

  Schaubild.prototype.binden = function () {
    var s = this;

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

  Schaubild.prototype.zeichnen = function () {
    var g = this.stift, i, k;

    g.clearRect(0, 0, this.b, this.h);
    g.globalAlpha = 1;
    g.fillStyle = this.flaechenverlauf;
    g.fillRect(0, 0, this.b, this.h);

    g.strokeStyle = this.verlauf;
    g.fillStyle = this.verlauf;
    g.lineCap = "round";

    if (this.motiv === "welle") return this.zeichnenWelle();

    for (i = 0; i < this.bahnen.length; i++) {
      var bn = this.bahnen[i];

      g.globalAlpha = 0.13;
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(this.cx, this.cy, bn.rx, bn.ry, 0, 0, 6.283);
      g.stroke();

      for (k = 0; k < bn.punkte.length; k++) {
        var p = bn.punkte[k];
        var w = p.w0 + this.t * p.tempo;
        var px = this.cx + Math.cos(w) * bn.rx;
        var py = this.cy + Math.sin(w) * bn.ry;
        var vorn = (Math.sin(w) + 1) / 2;

        g.globalAlpha = 0.20;
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(this.cx, this.cy);
        g.lineTo(px, py);
        g.stroke();

        g.globalAlpha = 0.45 + 0.5 * vorn;
        g.beginPath();
        g.arc(px, py, 2.0 + 2.0 * vorn, 0, 6.283);
        g.fill();
      }
    }

    g.globalAlpha = 1;
    this.karteZeichnen();
  };

  Schaubild.prototype.karteZeichnen = function () {
    var g = this.stift, d = this.d, i;
    var b = this.kb, h = this.kh, x = this.cx - b / 2, y = this.cy - h / 2, r = 9;

    g.globalAlpha = 1;

    if (this.glasMoeglich) {
      var pg = this.glas.getContext("2d");
      pg.setTransform(1, 0, 0, 1, 0, 0);
      pg.clearRect(0, 0, this.glas.width, this.glas.height);
      pg.filter = "blur(" + (2.5 * d) + "px)";
      pg.drawImage(this.flaeche, 0, 0);
      pg.filter = "none";

      var st = 60, LUPE = 0.06, RAND = 0.14;
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

    g.strokeStyle = this.verlauf;
    g.lineWidth = 2.6;
    var zeilen = [[0.34, 0.60], [0.56, 0.76], [0.78, 0.42]];
    for (i = 0; i < zeilen.length; i++) {
      g.globalAlpha = 0.20;
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


  /* ---------------------------------------------------------------- *
   *  Motiv Welle
   *  Der Auftrag schlaegt Wellen durch ein Feld aus Taskrunnern. Die Front
   *  laeuft hindurch, die erreichten Punkte leuchten auf und verbinden sich
   *  kurz mit ihren Nachbarn.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenWelle = function () {
    var zufall = 20260904;
    var wuerfel = function () {
      zufall = (zufall * 1103515245 + 12345) % 2147483648;
      return zufall / 2147483648;
    };
    this.cx = this.b / 2;
    this.cy = this.h * 0.17;
    this.kb = Math.min(150, this.b * 0.42);
    this.kh = this.kb * 0.50;

    this.feld = [];
    var sp = 22, reihe = 0, x, y;
    for (y = this.h * 0.30; y < this.h * 0.94; y += sp * 0.86) {
      for (x = (reihe % 2 ? sp / 2 : 0) + sp * 0.5; x < this.b; x += sp) {
        this.feld.push({ x: x + (wuerfel() - 0.5) * 4, y: y + (wuerfel() - 0.5) * 4, an: 0 });
      }
      reihe++;
    }
    this.wellen = [{ r: this.b * 0.30 }, { r: this.b * 0.70 }, { r: this.b * 1.05 }];
  };

  Schaubild.prototype.zeichnenWelle = function () {
    var g = this.stift, i, j, p, q;
    var grenze = this.b * 1.25;

    if (!ruhig.matches) {
      if (this.wellen.length < 3 && Math.random() < 0.014) this.wellen.push({ r: 0 });
      for (i = this.wellen.length - 1; i >= 0; i--) {
        this.wellen[i].r += 1.5;
        if (this.wellen[i].r > grenze) this.wellen.splice(i, 1);
      }
    }

    for (i = 0; i < this.feld.length; i++) {
      p = this.feld[i];
      var e = Math.sqrt((p.x - this.cx) * (p.x - this.cx) + (p.y - this.cy) * (p.y - this.cy));
      for (j = 0; j < this.wellen.length; j++) {
        if (Math.abs(e - this.wellen[j].r) < 16) p.an = 1;
      }
      p.an *= 0.975;
    }

    for (i = 0; i < this.wellen.length; i++) {
      g.globalAlpha = 0.22 * (1 - this.wellen[i].r / grenze);
      g.lineWidth = 1;
      g.beginPath();
      g.arc(this.cx, this.cy, this.wellen[i].r, 0.06 * Math.PI, 0.94 * Math.PI);
      g.stroke();
    }

    g.lineWidth = 0.7;
    for (i = 0; i < this.feld.length; i++) {
      p = this.feld[i];
      if (p.an < 0.12) continue;
      for (j = i + 1; j < this.feld.length; j++) {
        q = this.feld[j];
        if (q.an < 0.12) continue;
        var dd = Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
        if (dd < 30) {
          g.globalAlpha = 0.30 * Math.min(p.an, q.an) * (1 - dd / 30);
          g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke();
        }
      }
    }

    for (i = 0; i < this.feld.length; i++) {
      p = this.feld[i];
      g.globalAlpha = 0.16 + 0.74 * p.an;
      g.beginPath();
      g.arc(p.x, p.y, 1.7 + 2.2 * p.an, 0, 6.283);
      g.fill();
    }

    g.globalAlpha = 1;
    this.karteZeichnen();
  };

  function starten() {
    var f = document.querySelectorAll("canvas[data-schaubild]");
    for (var i = 0; i < f.length; i++) new Schaubild(f[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starten);
  else starten();
})();
