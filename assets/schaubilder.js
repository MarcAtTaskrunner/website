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
    this.motiv = /^(welle|posten|standorte|pruefung|hero|rad|gewerke)$/.test(m) ? m : "orbit";
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
    if (this.motiv === "gewerke")   return this.saeenGewerke();
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

    if ((this.motiv === "rad" || this.motiv === "gewerke") && fein.matches) {
      var buehne = this.motiv === "gewerke"
        ? (this.flaeche.closest("li") || this.flaeche)
        : (this.flaeche.closest("section") || this.flaeche);
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
      if (!(s.ruht && s.ruht())) s.zeichnen();
      s.anfrage = requestAnimationFrame(schritt);
    })();
  };

  Schaubild.prototype.stopp = function () {
    this.laeuft = false;
    if (this.anfrage) cancelAnimationFrame(this.anfrage);
  };

  Schaubild.prototype.zeichnen = function () {
    var g = this.stift, i, k;

    if (this.motiv === "gewerke") {
      g.clearRect(0, 0, this.b, this.h);
      g.globalAlpha = 1;
      g.lineCap = "round";
      return this.zeichnenGewerke();
    }

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

  /* Name und Gewerk stehen als HTML neben dem Punkt, nicht auf der
     Flaeche. Der Hero-Text ist ebenfalls HTML und liegt ueber dem
     Canvas - dort gezeichnet waere die Beschriftung darunter
     verschwunden, weiss auf weiss. */
  Schaubild.prototype.beschriften = function (akt) {
    var el = this.label;
    if (!el) return;

    if (!akt || akt.gr < 0.2 || !this.leute.length) {
      if (!el.hidden) { el.hidden = true; el.style.opacity = 0; }
      return;
    }

    var e = this.leute[this.aktiv % this.leute.length];
    if (el.dataset.wer !== e.name) {
      el.dataset.wer = e.name;
      el.querySelector("[data-radname]").textContent = e.name;
      el.querySelector("[data-radgewerk]").textContent = e.gewerk;
    }
    el.hidden = false;

    var bb = el.offsetWidth, bh = el.offsetHeight;
    var luft = akt.r + 16;
    /* nach aussen, ausser es passt dort nicht mehr in die Flaeche */
    var rechts = akt.x >= this.cx;
    if (rechts && akt.x + luft + bb > this.b - 12) rechts = false;
    else if (!rechts && akt.x - luft - bb < 12) rechts = true;

    el.style.left = Math.round(rechts ? akt.x + luft : akt.x - luft - bb) + "px";
    el.style.top = Math.round(akt.y - bh / 2) + "px";
    el.style.opacity = Math.min(1, (akt.gr - 0.2) / 0.45);
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
    if (this.b < 700) {
      /* Schmal: Text nimmt die ganze Breite, der Kreis steht mittig
         darueber. */
      this.cx = this.b * 0.5;
      this.cy = oben + frei * 0.26;
      this.radius = Math.min(this.b * 0.38, frei * 0.24);
    } else {
      /* Breit: der Kreis steht genau mittig in der freien Flaeche unter
         der Kopfleiste, der Text liegt unten links darueber. */
      this.cx = this.b * 0.5;
      this.cy = oben + frei * 0.5;
      this.radius = Math.min(this.b * 0.22, frei * 0.36);
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


  /* ---------------------------------------------------------------- *
   *  Motiv Gewerke - Kachel "Ein Task, alle Gewerke."
   *  In der Mitte der Auftrag als Squircle, darum sechs Handwerker,
   *  verbunden durch weiche Bogen. Naehert sich der Zeiger, weichen
   *  die Kreise aus und federn zurueck; die Bogen folgen ihnen.
   *
   *  Der Squircle ist keine abgerundete Box, sondern eine Superellipse
   *  (|x/a|^n + |y/b|^n = 1, n = 5). Nur so laeuft die Kante stetig in
   *  die Ecke, statt an der Nahtstelle zwischen Gerade und Viertelkreis
   *  zu knicken - das ist der Unterschied, den man bei grossen Radien
   *  sieht.
   *
   *  Schatten nach Material/Apple: zwei Lagen, eine enge fuer die Kante
   *  und eine weite fuer die Hoehe. Die Farbe ist #000031 statt Schwarz.
   * ---------------------------------------------------------------- */
  var SCHATTEN = "0,0,49";        /* #000031 */

  Schaubild.prototype.saeenGewerke = function () {
    var s = this, i;
    this.ruht = this.radRuht;
    this.wachBis = 0;

    /* Lage in Anteilen der Flaeche, uebernommen aus dem Entwurf */
    var lage = [
      [0.235, 0.175, 0.053],
      [0.095, 0.505, 0.047],
      [0.295, 0.855, 0.052],
      [0.795, 0.160, 0.052],
      [0.878, 0.545, 0.050],
      [0.757, 0.805, 0.052]
    ];
    var mass = Math.min(this.b, this.h * 1.9);   /* damit flache Kacheln nicht ausufern */

    this.knoten = [];
    for (i = 0; i < lage.length; i++) {
      this.knoten.push({
        rx: this.b * lage[i][0],
        ry: this.h * lage[i][1],
        r: Math.max(16, mass * lage[i][2]),
        x: 0, y: 0, dx: 0, dy: 0, vx: 0, vy: 0
      });
    }

    this.cx = this.b * 0.5;
    this.cy = this.h * 0.5;
    this.sq = Math.max(46, mass * 0.145);        /* halbe Kantenlaenge x 2 */

    var nachLaden = function () { s.zeichnen(); };
    this.avatar = new Image();
    this.avatar.decoding = "async";
    this.avatar.onload = nachLaden;
    this.avatar.src = this.flaeche.dataset.bild || "images/headshot.webp";

    this.icon = new Image();
    this.icon.decoding = "async";
    this.icon.onload = nachLaden;
    this.icon.src = this.flaeche.dataset.icon || "images/icons/dokument.svg";
  };

  /* Superellipse. n = 5 kommt der stetigen Ecke von iOS sehr nahe. */
  Schaubild.prototype.pfadSquircle = function (cx, cy, a, bb, n) {
    var g = this.stift, i, t, ct, st, x, y;
    var schritte = 160;
    g.beginPath();
    for (i = 0; i <= schritte; i++) {
      t = (i / schritte) * 6.283185;
      ct = Math.cos(t); st = Math.sin(t);
      x = cx + a * (ct < 0 ? -1 : 1) * Math.pow(Math.abs(ct), 2 / n);
      y = cy + bb * (st < 0 ? -1 : 1) * Math.pow(Math.abs(st), 2 / n);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  };

  Schaubild.prototype.zeichnenGewerke = function () {
    var g = this.stift, i, k;
    var wirk = Math.min(this.b, this.h) * 0.42;
    /* Ruhelage bei etwa KRAFT/STEIF Pixeln - hier rund 28 px. */
    var KRAFT = 2.8, STEIF = 0.10, DAEMPF = 0.86;
    var halb = this.sq / 2;

    /* Federn */
    for (i = 0; i < this.knoten.length; i++) {
      k = this.knoten[i];
      if (this.zeiger) {
        var qx = k.rx + k.dx - this.zeiger.x;
        var qy = k.ry + k.dy - this.zeiger.y;
        var ab = Math.sqrt(qx * qx + qy * qy);
        if (ab < wirk && ab > 0.01) {
          var f = (1 - ab / wirk) * (1 - ab / wirk) * KRAFT;
          k.vx += (qx / ab) * f;
          k.vy += (qy / ab) * f;
        }
      }
      k.vx = (k.vx - STEIF * k.dx) * DAEMPF;
      k.vy = (k.vy - STEIF * k.dy) * DAEMPF;
      k.dx += k.vx;
      k.dy += k.vy;
      k.x = k.rx + k.dx;
      k.y = k.ry + k.dy;
    }

    /* Bogen vom Auftrag zu jedem Handwerker */
    g.strokeStyle = "rgba(66,133,244,0.55)";
    g.lineWidth = 1.2;
    for (i = 0; i < this.knoten.length; i++) {
      k = this.knoten[i];
      var vx = k.x - this.cx, vy = k.y - this.cy;
      var vl = Math.sqrt(vx * vx + vy * vy) || 1;
      /* Start auf der Squircle-Kante, Ende auf dem Kreisrand */
      var sx = this.cx + (vx / vl) * halb * 1.02;
      var sy = this.cy + (vy / vl) * halb * 1.02;
      var ex = k.x - (vx / vl) * k.r;
      var ey = k.y - (vy / vl) * k.r;
      var ddx = ex - sx, ddy = ey - sy;
      var waag = Math.abs(ddx) >= Math.abs(ddy);
      var z = 0.55;
      g.beginPath();
      g.moveTo(sx, sy);
      if (waag) g.bezierCurveTo(sx + ddx * z, sy, ex - ddx * z, ey, ex, ey);
      else      g.bezierCurveTo(sx, sy + ddy * z, ex, ey - ddy * z, ex, ey);
      g.stroke();
    }

    /* Auftrag: Squircle mit zweilagigem Schatten */
    g.save();
    g.shadowColor = "rgba(" + SCHATTEN + ",0.13)";
    g.shadowBlur = 30;
    g.shadowOffsetY = 14;
    g.fillStyle = "#ffffff";
    this.pfadSquircle(this.cx, this.cy, halb, halb, 5);
    g.fill();
    g.shadowColor = "rgba(" + SCHATTEN + ",0.10)";
    g.shadowBlur = 9;
    g.shadowOffsetY = 3;
    this.pfadSquircle(this.cx, this.cy, halb, halb, 5);
    g.fill();
    g.restore();

    if (this.icon.complete && this.icon.naturalWidth) {
      var ih = this.sq * 0.56;
      var iw = ih * (this.icon.naturalWidth / this.icon.naturalHeight);
      g.drawImage(this.icon, this.cx - iw / 2, this.cy - ih / 2, iw, ih);
    }

    /* Handwerker */
    for (i = 0; i < this.knoten.length; i++) {
      k = this.knoten[i];

      g.save();
      g.shadowColor = "rgba(" + SCHATTEN + ",0.16)";
      g.shadowBlur = 18;
      g.shadowOffsetY = 6;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(k.x, k.y, k.r + 3, 0, 6.283);
      g.fill();
      g.shadowColor = "rgba(" + SCHATTEN + ",0.08)";
      g.shadowBlur = 5;
      g.shadowOffsetY = 1;
      g.beginPath();
      g.arc(k.x, k.y, k.r + 3, 0, 6.283);
      g.fill();
      g.restore();

      if (this.avatar.complete && this.avatar.naturalWidth) {
        g.save();
        g.beginPath();
        g.arc(k.x, k.y, k.r, 0, 6.283);
        g.clip();
        var sk = Math.max((k.r * 2) / this.avatar.naturalWidth,
                          (k.r * 2) / this.avatar.naturalHeight);
        var bw = this.avatar.naturalWidth * sk, bh = this.avatar.naturalHeight * sk;
        g.drawImage(this.avatar, k.x - bw / 2, k.y - bh / 2, bw, bh);
        g.restore();
      }
    }

    g.globalAlpha = 1;
  };

  function starten() {
    var f = document.querySelectorAll("canvas[data-schaubild]");
    for (var i = 0; i < f.length; i++) new Schaubild(f[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starten);
  else starten();
})();
