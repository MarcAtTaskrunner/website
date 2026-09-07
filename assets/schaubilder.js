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
    var m = flaeche.dataset.schaubild;
    this.motiv = /^(welle|posten|standorte|pruefung|hero|rad)$/.test(m) ? m : "orbit";
    this.kInhalt = true;          /* Zeilen in der Glaskarte zeichnen? */
    this.laeuft = false;
    this.t = 0;
    this.zeiger = null;        /* Zeigerlage, null = ausserhalb */
    this.tempo = 1;            /* laeuft bei Hover kurz schneller */
    this.zielTempo = 1;
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
    if (this.motiv === "hero")      return this.saeenHero();
    if (this.motiv === "rad")       return this.saeenRad();
    if (this.motiv === "welle")     return this.saeenWelle();
    if (this.motiv === "posten")    return this.saeenPosten();
    if (this.motiv === "standorte") return this.saeenStandorte();
    if (this.motiv === "pruefung")  return this.saeenPruefung();
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

    /* Zeigt jemand mit der Maus auf die Karte, laeuft das Schaubild kurz
       schneller. Fuer Finger und Trackpad ergibt das keinen Sinn. */
    var fein = window.matchMedia("(hover: hover) and (pointer: fine)");

    if (this.motiv === "rad" && fein.matches) {
      var buehne = this.flaeche.closest("section") || this.flaeche;
      buehne.addEventListener("pointermove", function (e) {
        var r = s.flaeche.getBoundingClientRect();
        s.zeiger = { x: e.clientX - r.left, y: e.clientY - r.top };
      }, { passive: true });
      buehne.addEventListener("pointerleave", function () { s.zeiger = null; }, { passive: true });
    }

    var wirt = this.flaeche.closest("li");
    if (wirt && fein.matches) {
      wirt.addEventListener("pointerenter", function () { s.zielTempo = 2.1; }, { passive: true });
      wirt.addEventListener("pointerleave", function () { s.zielTempo = 1; }, { passive: true });
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
      s.tempo += (s.zielTempo - s.tempo) * 0.07;
      s.t += (1 / 60) * s.tempo;
      if (!(s.motiv === "rad" && s.radRuht())) s.zeichnen();
      s.anfrage = requestAnimationFrame(schritt);
    })();
  };

  Schaubild.prototype.stopp = function () {
    this.laeuft = false;
    if (this.anfrage) cancelAnimationFrame(this.anfrage);
  };

  Schaubild.prototype.zeichnen = function () {
    var g = this.stift, i, k;

    if (this.motiv === "hero" || this.motiv === "rad") {
      g.clearRect(0, 0, this.b, this.h);
      g.globalAlpha = 1;
      g.lineCap = "round";
      g.strokeStyle = "#ffffff";
      g.fillStyle = "#ffffff";
      return this.motiv === "rad" ? this.zeichnenRad() : this.zeichnenHero();
    }

    g.clearRect(0, 0, this.b, this.h);
    g.globalAlpha = 1;
    g.fillStyle = this.flaechenverlauf;
    g.fillRect(0, 0, this.b, this.h);

    g.strokeStyle = this.verlauf;
    g.fillStyle = this.verlauf;
    g.lineCap = "round";

    if (this.motiv === "welle")     return this.zeichnenWelle();
    if (this.motiv === "posten")    return this.zeichnenPosten();
    if (this.motiv === "standorte") return this.zeichnenStandorte();
    if (this.motiv === "pruefung")  return this.zeichnenPruefung();

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
      pg.filter = "blur(" + ((this.glasWeich == null ? 2.5 : this.glasWeich) * d) + "px)";
      pg.drawImage(this.flaeche, 0, 0);
      pg.filter = "none";

      var st = 60;
      var LUPE = this.lupe == null ? 0.06 : this.lupe;
      var RAND = this.rand == null ? 0.14 : this.rand;
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
    var zeilen = this.kInhalt ? [[0.34, 0.60], [0.56, 0.76], [0.78, 0.42]] : [];
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


  /* ---------------------------------------------------------------- *
   *  Deterministischer Wuerfel - gleicher Aufbau bei jedem Aufruf
   * ---------------------------------------------------------------- */
  function wuerfelAb(saat) {
    var z = saat;
    return function () {
      z = (z * 1103515245 + 12345) % 2147483648;
      return z / 2147483648;
    };
  }

  /* ---------------------------------------------------------------- *
   *  Motiv Posten - "Nachvollziehbar abgerechnet."
   *  Jede Punktreihe ist ein Posten. Eine Pruefwelle laeuft von oben
   *  nach unten durch, und jeder erfasste Posten laeuft als Linie in
   *  die Rechnung - die Glaskarte am Fuss.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenPosten = function () {
    this.kb = Math.min(190, this.b * 0.58);
    this.kh = this.kb * 0.40;
    this.cx = this.b / 2;
    this.cy = this.h - this.kh / 2 - this.h * 0.11;

    var laengen = [0.88, 0.60, 0.96, 0.46, 0.74];
    var rand = Math.max(20, this.b * 0.09);
    var oben = this.h * 0.12, unten = this.h * 0.49;
    this.zeilen = [];
    for (var i = 0; i < laengen.length; i++) {
      var y = oben + (unten - oben) * (i / (laengen.length - 1));
      var breite = (this.b - 2 * rand) * laengen[i];
      var n = Math.max(3, Math.round(breite / 15));
      var pkte = [];
      for (var k = 0; k < n; k++) pkte.push({ x: rand + (breite * k) / (n - 1), y: y });
      this.zeilen.push({ y: y, punkte: pkte, ende: rand + breite, an: 0, platz: 0 });
    }
    /* Anschluss an der Rechnung nach der x-Lage der Zeilenenden vergeben,
       damit sich die Linien nicht kreuzen */
    var sortiert = this.zeilen.slice().sort(function (p, q) { return p.ende - q.ende; });
    for (i = 0; i < sortiert.length; i++) sortiert[i].platz = i;
  };

  Schaubild.prototype.zeichnenPosten = function () {
    var g = this.stift, i, k, z;
    var n = this.zeilen.length;
    var lauf = ruhig.matches ? 1.4 : (this.t * 0.42) % (n + 2.4);
    var kx = this.cx - this.kb / 2, koben = this.cy - this.kh / 2;

    for (i = 0; i < n; i++) {
      z = this.zeilen[i];
      var ziel = Math.max(0, 1 - Math.abs(lauf - i) * 1.15);
      z.an += (ziel - z.an) * 0.16;
    }

    for (i = 0; i < n; i++) {
      z = this.zeilen[i];
      var zx = kx + this.kb * ((z.platz + 0.5) / n);
      var mitte = z.y + (koben - z.y) * 0.55;
      g.globalAlpha = 0.09 + 0.40 * z.an;
      g.lineWidth = 0.8 + 0.7 * z.an;
      g.beginPath();
      g.moveTo(z.ende, z.y);
      g.bezierCurveTo(z.ende, mitte, zx, mitte, zx, koben);
      g.stroke();
    }

    for (i = 0; i < n; i++) {
      z = this.zeilen[i];
      g.globalAlpha = 0.16 + 0.70 * z.an;
      for (k = 0; k < z.punkte.length; k++) {
        g.beginPath();
        g.arc(z.punkte[k].x, z.punkte[k].y, 1.7 + 1.7 * z.an, 0, 6.283);
        g.fill();
      }
    }

    g.globalAlpha = 1;
    this.karteZeichnen();
  };

  /* ---------------------------------------------------------------- *
   *  Motiv Standorte - "Alle Standorte auf einem Dashboard."
   *  Verstreute Punkte melden nach oben ins Dashboard. Die Meldung
   *  laeuft als kleiner Punkt die Linie entlang.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenStandorte = function () {
    this.kb = Math.min(158, this.b * 0.46);
    this.kh = this.kb * 0.46;
    this.cx = this.b / 2;
    this.cy = this.h * 0.17;

    var w = wuerfelAb(20260911), i;
    this.orte = [];
    var versuche = 0;
    while (this.orte.length < 15 && versuche < 600) {
      versuche++;
      var x = this.b * (0.07 + 0.86 * w());
      var y = this.h * (0.44 + 0.50 * w());
      var frei = true;
      for (i = 0; i < this.orte.length; i++) {
        var dx = this.orte[i].x - x, dy = this.orte[i].y - y;
        if (dx * dx + dy * dy < 1050) { frei = false; break; }
      }
      if (frei) this.orte.push({ x: x, y: y, phase: w(), an: 0, u: 0, ax: 0 });
    }
    this.orte.sort(function (a, b) { return a.x - b.x; });
  };

  Schaubild.prototype.zeichnenStandorte = function () {
    var g = this.stift, i, o, ziel;
    var n = this.orte.length;
    var kx = this.cx - this.kb / 2, kunten = this.cy + this.kh / 2;

    for (i = 0; i < n; i++) {
      o = this.orte[i];
      o.ax = kx + this.kb * ((i + 0.5) / n);
      o.u = ruhig.matches ? 0.55 : (this.t * 0.15 + o.phase) % 1;
      ziel = Math.max(0, 1 - o.u * 4.5);
      o.an += (ziel - o.an) * 0.16;

      g.globalAlpha = 0.10 + 0.22 * o.an;
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(o.x, o.y);
      g.lineTo(o.ax, kunten);
      g.stroke();
    }

    if (!ruhig.matches) {
      for (i = 0; i < n; i++) {
        o = this.orte[i];
        g.globalAlpha = 0.70 * Math.sin(o.u * Math.PI);
        g.beginPath();
        g.arc(o.x + (o.ax - o.x) * o.u, o.y + (kunten - o.y) * o.u, 1.6, 0, 6.283);
        g.fill();
      }
    }

    for (i = 0; i < n; i++) {
      o = this.orte[i];
      if (o.an > 0.04) {
        g.globalAlpha = 0.20 * o.an;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(o.x, o.y, 5 + 13 * (1 - o.an), 0, 6.283);
        g.stroke();
      }
      g.globalAlpha = 0.30 + 0.58 * o.an;
      g.beginPath();
      g.arc(o.x, o.y, 2.2 + 1.7 * o.an, 0, 6.283);
      g.fill();
    }

    g.globalAlpha = 1;
    this.karteZeichnen();
  };

  /* ---------------------------------------------------------------- *
   *  Motiv Pruefung - "Wir pruefen Qualitaet und Abrechnung."
   *  Eine Glaslupe faehrt ueber das Feld. Was sie erfasst hat, bleibt
   *  kraeftiger stehen - geprueft.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenPruefung = function () {
    this.kInhalt = false;
    this.glasWeich = 0.6;      /* Punkte sollen im Glas Punkte bleiben */
    this.lupe = 0.16;
    this.rand = 0.04;
    this.kb = this.b * 1.2;          /* Pruefleiste laeuft ueber die volle Breite */
    this.kh = Math.max(46, this.h * 0.15);
    this.cx = this.b / 2;
    this.cy = this.h * 0.5;

    var w = wuerfelAb(20260918);
    this.raster = [];
    var sp = 21, reihe = 0, x, y;
    for (y = this.h * 0.09; y < this.h * 0.95; y += sp * 0.88) {
      for (x = (reihe % 2 ? sp / 2 : 0) + sp * 0.55; x < this.b; x += sp) {
        this.raster.push({ x: x + (w() - 0.5) * 3, y: y + (w() - 0.5) * 3, an: 0, g: 0 });
      }
      reihe++;
    }
  };

  Schaubild.prototype.zeichnenPruefung = function () {
    var g = this.stift, i, p;
    /* ein Durchgang von oben nach unten, danach faengt die Pruefung von vorn an */
    var u = ruhig.matches ? 0.42 : (this.t * 0.085) % 1;
    if (this.u0 != null && u < this.u0) {
      for (i = 0; i < this.raster.length; i++) { this.raster[i].g = 0; this.raster[i].an = 0; }
    }
    this.u0 = u;
    this.cy = -this.kh * 0.5 + u * (this.h + this.kh);
    var oben = this.cy - this.kh / 2, unten = this.cy + this.kh / 2;

    for (i = 0; i < this.raster.length; i++) {
      p = this.raster[i];
      if (p.y > oben && p.y < unten) { p.an = 1; p.g = 1; }
      else p.an = Math.max(p.g ? 0.52 : 0, p.an * 0.99);
      g.globalAlpha = 0.12 + 0.64 * p.an;
      g.beginPath();
      g.arc(p.x, p.y, 1.6 + 1.8 * p.an, 0, 6.283);
      g.fill();
    }

    g.globalAlpha = 1;
    this.karteZeichnen();
  };


  /* ---------------------------------------------------------------- *
   *  Motiv Hero - ruhiges Punktfeld hinter der Headline
   *  Weiss auf Blau, sehr geringe Deckung. Die Nachbarschaften werden
   *  einmal berechnet; die Punkte driften nur um wenige Pixel, deshalb
   *  bleiben die Paare gueltig und es faellt pro Bild keine Suche an.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenHero = function () {
    var w = wuerfelAb(20260925), i, j;
    var sp = this.b < 640 ? 42 : 52;
    this.feld = [];
    var reihe = 0, x, y;
    for (y = -sp * 0.3; y < this.h + sp; y += sp * 0.88) {
      for (x = (reihe % 2 ? sp / 2 : 0) - sp * 0.2; x < this.b + sp; x += sp) {
        this.feld.push({
          x0: x + (w() - 0.5) * sp * 0.42,
          y0: y + (w() - 0.5) * sp * 0.42,
          x: 0, y: 0,
          ph: w() * 6.283,
          ruhe: 0.5 + w() * 0.5
        });
      }
      reihe++;
    }

    this.paare = [];
    var max = sp * 1.16, i2 = max * max;
    for (i = 0; i < this.feld.length; i++) {
      for (j = i + 1; j < this.feld.length; j++) {
        var dx = this.feld[i].x0 - this.feld[j].x0;
        var dy = this.feld[i].y0 - this.feld[j].y0;
        var q = dx * dx + dy * dy;
        if (q < i2) this.paare.push([i, j, 1 - Math.sqrt(q) / max]);
      }
    }
  };

  Schaubild.prototype.zeichnenHero = function () {
    var g = this.stift, i, p, q, pa;

    for (i = 0; i < this.feld.length; i++) {
      p = this.feld[i];
      p.x = p.x0 + Math.sin(this.t * 0.16 + p.ph) * 3.2;
      p.y = p.y0 + Math.cos(this.t * 0.13 + p.ph * 1.4) * 2.6;
      p.an = 0.55 + 0.45 * Math.sin(this.t * 0.22 + p.ph * 2.1);
      /* hinter der Headline ruhiger als in der freien Flaeche */
      p.dm = 0.5 + 0.5 * Math.min(1, p.x0 / (this.b * 0.42));
    }

    g.lineWidth = 0.8;
    for (i = 0; i < this.paare.length; i++) {
      pa = this.paare[i];
      p = this.feld[pa[0]]; q = this.feld[pa[1]];
      g.globalAlpha = 0.20 * pa[2] * (0.5 + 0.5 * Math.min(p.an, q.an)) * Math.min(p.dm, q.dm);
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(q.x, q.y);
      g.stroke();
    }

    for (i = 0; i < this.feld.length; i++) {
      p = this.feld[i];
      g.globalAlpha = (0.20 + 0.26 * p.an * p.ruhe) * p.dm;
      g.beginPath();
      g.arc(p.x, p.y, 1.5 + 1.0 * p.an, 0, 6.283);
      g.fill();
    }

    g.globalAlpha = 1;
  };


  /* ---------------------------------------------------------------- *
   *  Motiv Rad - interaktive Grafik im Hero
   *  80 Punkte auf einem Kreis, jeder mit einer Linie bis in die Mitte.
   *  Nichts dreht sich: die Grafik steht still und antwortet nur auf den
   *  Zeiger. Was in seiner Naehe liegt, wird groesser und heller.
   *
   *  Der Punktdurchmesser wird aus dem Abstand auf dem Kreis gerechnet,
   *  nicht fest gesetzt - so bleibt der Spalt zwischen zwei Punkten in
   *  jeder Fenstergroesse gleich schmal.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenRad = function () {
    var w = wuerfelAb(20261002), i;
    var n = parseInt(this.flaeche.dataset.punkte, 10) || 80;

    /* Schmale Fenster: der Text nimmt die ganze Breite ein, deshalb sitzt
       der Kreis unten rechts und laeuft ueber den Rand - so wie vorher das
       Foto. Ab 700 px steht er frei neben dem Text. */
    if (this.b < 700) {
      this.cx = this.b * 0.82;
      this.cy = this.h * 0.88;
      this.radius = Math.min(this.b * 0.52, this.h * 0.30);
    } else {
      this.cx = this.b * 0.62;
      this.cy = this.h * 0.5;
      this.radius = Math.min(this.b * 0.32, this.h * 0.42);
    }

    var abstand = (6.283 * this.radius) / n;
    this.pr = Math.max(2.2, abstand * 0.36);   /* Punktradius, schmaler Spalt */

    this.speichen = [];
    for (i = 0; i < n; i++) {
      var wk = (i / n) * 6.283 - 1.5708;       /* oben beginnen */
      this.speichen.push({
        x: this.cx + Math.cos(wk) * this.radius,
        y: this.cy + Math.sin(wk) * this.radius,
        gr: 0.92 + w() * 0.16,
        naehe: 0
      });
    }
    this.wachBis = 0;
  };

  /* Steht die Grafik still, wird nicht neu gezeichnet. Nach dem Verlassen
     laeuft sie noch eine halbe Sekunde weiter, damit das Abklingen zu
     Ende gespielt wird. */
  Schaubild.prototype.radRuht = function () {
    if (this.zeiger) { this.wachBis = this.t + 0.6; return false; }
    return this.t > this.wachBis;
  };

  Schaubild.prototype.zeichnenRad = function () {
    var g = this.stift, i, s, dx, dy, ab, ziel;
    var grenze = this.radius * 0.58;

    for (i = 0; i < this.speichen.length; i++) {
      s = this.speichen[i];
      ziel = 0;
      if (this.zeiger) {
        dx = this.zeiger.x - s.x; dy = this.zeiger.y - s.y;
        ab = Math.sqrt(dx * dx + dy * dy);
        ziel = Math.max(0, 1 - ab / grenze);
        ziel *= ziel;
      }
      s.naehe += (ziel - s.naehe) * 0.16;
    }

    /* Speichen, durchgehend bis in die Mitte */
    for (i = 0; i < this.speichen.length; i++) {
      s = this.speichen[i];
      g.globalAlpha = 0.20 + 0.55 * s.naehe;
      g.lineWidth = 1 + 1.4 * s.naehe;
      g.beginPath();
      g.moveTo(this.cx, this.cy);
      g.lineTo(s.x, s.y);
      g.stroke();
    }

    /* Punkte */
    for (i = 0; i < this.speichen.length; i++) {
      s = this.speichen[i];
      if (s.naehe > 0.02) {
        g.globalAlpha = 0.22 * s.naehe;
        g.beginPath();
        g.arc(s.x, s.y, this.pr * s.gr * (2.0 + 1.8 * s.naehe), 0, 6.283);
        g.fill();
      }
      g.globalAlpha = 0.52 + 0.48 * s.naehe;
      g.beginPath();
      g.arc(s.x, s.y, this.pr * s.gr * (1 + 0.65 * s.naehe), 0, 6.283);
      g.fill();
    }

    /* Knotenpunkt */
    g.globalAlpha = 0.14;
    g.beginPath();
    g.arc(this.cx, this.cy, this.pr * 3.2, 0, 6.283);
    g.fill();
    g.globalAlpha = 0.95;
    g.beginPath();
    g.arc(this.cx, this.cy, this.pr * 1.15, 0, 6.283);
    g.fill();

    g.globalAlpha = 1;
  };

  function starten() {
    var f = document.querySelectorAll("canvas[data-schaubild]");
    for (var i = 0; i < f.length; i++) new Schaubild(f[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starten);
  else starten();
})();
