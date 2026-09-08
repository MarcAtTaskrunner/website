/* taskrunner - Grundgeruest der Schaubilder auf Canvas. Alles gerechnet,
   keine Bilder.

   Hier steht, was jedes Schaubild braucht: Aufbau, Messen, Ereignisse,
   Laufwerk, die Glaskarte in der Mitte - und das Standardmotiv "orbit",
   bei dem die Taskrunner auf drei flachen Bahnen um den Auftrag ziehen.

   Jedes weitere Motiv liegt als eigene Datei daneben und haengt seine
   beiden Methoden saeenX/zeichnenX an Schaubild.prototype.

   Einbau:  <canvas data-schaubild="orbit"></canvas>

   Ein neues Motiv anlegen - drei Handgriffe:
     1. quellen/schaubilder/<name>.js nach dem Muster der anderen anlegen
     2. hier unten in saeen() und zeichnen() je eine Zeile ergaenzen
     3. den Namen in die Liste im Konstruktor aufnehmen                     */

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
    this.motiv = /^(rad|gewerke|kosten|dashboard|team|notdienst)$/.test(m) ? m : "orbit";
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
    if (this.motiv === "rad")       return this.saeenRad();
    if (this.motiv === "gewerke")   return this.saeenGewerke();
    if (this.motiv === "kosten")    return this.saeenKosten();
    if (this.motiv === "dashboard") return this.saeenDashboard();
    if (this.motiv === "team")      return this.saeenTeam();
    if (this.motiv === "notdienst") return this.saeenNotdienst();
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

    if (/^(rad|gewerke|kosten)$/.test(this.motiv) && fein.matches) {
      var buehne = this.motiv !== "rad"
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
    if (this.beginn) this.beginn();
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

    if (/^(gewerke|kosten|dashboard|team|notdienst)$/.test(this.motiv)) {
      g.clearRect(0, 0, this.b, this.h);
      g.globalAlpha = 1;
      g.lineCap = "round";
      if (this.motiv === "kosten")    return this.zeichnenKosten();
      if (this.motiv === "dashboard") return this.zeichnenDashboard();
      if (this.motiv === "team")      return this.zeichnenTeam();
      if (this.motiv === "notdienst") return this.zeichnenNotdienst();
      return this.zeichnenGewerke();
    }

    if (this.motiv === "rad") {
      g.clearRect(0, 0, this.b, this.h);
      g.globalAlpha = 1;
      g.lineCap = "round";
      g.strokeStyle = "#ffffff";
      g.fillStyle = "#ffffff";
      return this.zeichnenRad();
    }

    g.clearRect(0, 0, this.b, this.h);
    g.globalAlpha = 1;
    g.fillStyle = this.flaechenverlauf;
    g.fillRect(0, 0, this.b, this.h);

    g.strokeStyle = this.verlauf;
    g.fillStyle = this.verlauf;
    g.lineCap = "round";


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
   *  Deterministischer Wuerfel - gleicher Aufbau bei jedem Aufruf
   * ---------------------------------------------------------------- */
  function wuerfelAb(saat) {
    var z = saat;
    return function () {
      z = (z * 1103515245 + 12345) % 2147483648;
      return z / 2147483648;
    };
  }

  /* Farbe der Schatten - #000031 statt Schwarz, sonst wirkt es grau. */
  var SCHATTEN = "0,0,49";

  /* Die Motiv-Dateien haengen ihre Methoden an diese Klasse; alles, was
     sie darueber hinaus brauchen, steht hier. */
  Schaubild.HELL = HELL;
  Schaubild.TIEF = TIEF;
  Schaubild.FLACH = FLACH;
  Schaubild.SCHATTEN = SCHATTEN;
  Schaubild.ruhig = ruhig;
  Schaubild.wuerfelAb = wuerfelAb;
  window.Schaubild = Schaubild;
})();
