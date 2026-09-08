/* Erzeugt aus quellen/schaubilder/ - Aenderungen bitte dort.
   Reihenfolge: kern.js, dashboard.js, gewerke.js, kosten.js, notdienst.js, rad.js, team.js, start.js */

/* == kern.js ============================================================= */
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

/* == dashboard.js ======================================================== */
/* taskrunner - Schaubild "dashboard": Ringe auf der Deutschlandkarte.
   Einbau:  <canvas data-schaubild="dashboard"></canvas>                                           */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var wuerfelAb = Schaubild.wuerfelAb;

  /* ---------------------------------------------------------------- *
   *  Motiv Dashboard - Kachel "Alle Standorte auf einem Dashboard."
   *  Das Tablet in der Mitte, davon laufen Wellen nach aussen. Oben und
   *  unten blenden sie aus, sodass nur die seitlichen Boegen stehen.
   *
   *  Die Radien wachsen nicht linear, sondern geometrisch. Bei linearem
   *  Wachstum stehen die Ringe gleich weit auseinander und das Bild
   *  wirkt wie eine Zielscheibe; geometrisch werden die Abstaende nach
   *  aussen groesser - so sehen Wellen aus.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenDashboard = function () {
    var s = this;
    this.cx = this.b * 0.5;
    this.cy = this.h * 0.5;

    var mass = Math.min(this.b, this.h * 1.9);
    this.iko = mass * 0.18;
    this.rMin = this.b * 0.155;
    this.rMax = this.b * 0.95;
    this.wellen = 6;
    /* Bewusst langsam: bei 26 s je Umlauf und sechs Ringen loest sich
       etwa alle 4,3 s ein Ring von der Mitte - das laeuft nebenher,
       statt den Blick vom Text zu ziehen. */
    this.dauer = 26;                       /* Sekunden je Umlauf */

    this.startZeit = null;
    this.beginn = this.kostenBeginn;       /* dieselbe Uhr wie Kachel 2 */
    this.ruht = null;                      /* laeuft dauerhaft */

    this.icon = new Image();
    this.icon.decoding = "async";
    this.icon.onload = function () { s.ikoMitteMessen(); s.zeichnen(); };
    this.icon.src = this.flaeche.dataset.icon || "images/icons/tablet.svg";

    /* Standorte um das Tablet herum. Die Lage folgt dem Entwurf, ein
       kleiner ausgewuerfelter Versatz nimmt ihr das Mechanische. Der
       Wuerfel hat eine feste Saat, damit das Bild bei jedem Aufruf
       gleich aussteht. */
    var w = wuerfelAb(20261114), i;
    var lage = [
      [0.139, 0.204], [0.315, 0.345], [0.127, 0.697],
      [0.820, 0.322], [0.917, 0.500], [0.721, 0.704]
    ];
    this.orte = [];
    for (i = 0; i < lage.length; i++) {
      this.orte.push({
        x: this.b * (lage[i][0] + (w() - 0.5) * 0.035),
        y: this.h * (lage[i][1] + (w() - 0.5) * 0.055)
      });
    }
    this.ortHoehe = mass * 0.088;

    this.ort = new Image();
    this.ort.decoding = "async";
    this.ort.onload = function () { s.zeichnen(); };
    this.ort.src = this.flaeche.dataset.ort || "images/icons/standort.svg";
  };

  Schaubild.prototype.zeichnenDashboard = function () {
    var g = this.stift, i;
    var sek = this.kostenSek();
    var v = this.rMax / this.rMin;

    g.strokeStyle = "rgba(0,0,49,1)";
    g.lineWidth = 1;
    for (i = 0; i < this.wellen; i++) {
      var u = ((sek / this.dauer) + i / this.wellen) % 1;
      var r = this.rMin * Math.pow(v, u);
      /* am Anfang auf-, am Ende abblenden */
      var a = Math.min(1, u / 0.10) * Math.min(1, (1 - u) / 0.28);
      g.globalAlpha = 0.26 * a;
      g.beginPath();
      g.arc(this.cx, this.cy, r, 0, 6.283);
      g.stroke();
    }

    /* oben und unten ausblenden - danach kommt erst das Icon, sonst
       wuerde der Radierer es mit wegnehmen */
    g.globalAlpha = 1;
    g.globalCompositeOperation = "destination-out";
    var vv = g.createLinearGradient(0, 0, 0, this.h);
    vv.addColorStop(0.00, "rgba(0,0,0,1)");
    vv.addColorStop(0.26, "rgba(0,0,0,0)");
    vv.addColorStop(0.74, "rgba(0,0,0,0)");
    vv.addColorStop(1.00, "rgba(0,0,0,1)");
    g.fillStyle = vv;
    g.fillRect(0, 0, this.b, this.h);
    g.globalCompositeOperation = "source-over";

    /* Standorte nach dem Radierer, damit sie nicht mit ausgeblendet
       werden - genau wie das Tablet. */
    if (this.ort.complete && this.ort.naturalWidth) {
      var oh = this.ortHoehe;
      var ow = oh * (this.ort.naturalWidth / this.ort.naturalHeight);
      for (i = 0; i < this.orte.length; i++) {
        g.drawImage(this.ort, this.orte[i].x - ow / 2, this.orte[i].y - oh / 2, ow, oh);
      }
    }

    if (this.icon.complete && this.icon.naturalWidth) {
      var ih = this.iko;
      var iw = ih * (this.icon.naturalWidth / this.icon.naturalHeight);
      var mx = this.ikoMitte ? this.ikoMitte.x : 0.5;
      var my = this.ikoMitte ? this.ikoMitte.y : 0.5;
      g.drawImage(this.icon, this.cx - iw * mx, this.cy - ih * my, iw, ih);
    }
  };
})();

/* == gewerke.js ========================================================== */
/* taskrunner - Schaubild "gewerke": Gewerke-Symbole um die Auftragskarte.
   Einbau:  <canvas data-schaubild="gewerke"></canvas>                                             */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var SCHATTEN = Schaubild.SCHATTEN;

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
  /* Catmull-Rom: laeuft durch p1 und p2, p0 und p3 geben nur die
     Steigung an den Enden. */
  function kr(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  Schaubild.prototype.saeenGewerke = function () {
    var s = this, i;
    this.ruht = this.radRuht;
    this.wachBis = 0;

    /* Lage in Anteilen der Flaeche, uebernommen aus dem Entwurf */
    var lage = [
      [0.235, 0.175, 0.068],
      [0.095, 0.505, 0.060],
      [0.295, 0.855, 0.067],
      [0.795, 0.160, 0.067],
      [0.878, 0.545, 0.064],
      [0.757, 0.805, 0.067]
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
    this.sq = Math.max(64, mass * 0.205);        /* Kantenlaenge */

    var nachLaden = function () { s.zeichnen(); };
    this.avatar = new Image();
    this.avatar.decoding = "async";
    this.avatar.onload = nachLaden;
    this.avatar.src = this.flaeche.dataset.bild || "images/headshot.webp";

    this.icon = new Image();
    this.icon.decoding = "async";
    this.icon.onload = function () { s.ikoMitteMessen(); nachLaden(); };
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

  /* Optische Mitte des Icons, einmal nach dem Laden gemessen.
     Zwei Groessen: der Kasten der Deckung (wo die Zeichnung ueberhaupt
     liegt) und ihr Schwerpunkt (wo das Gewicht liegt). Der reine
     Schwerpunkt ueberzieht, wenn ein Teil vollflaechig und der Rest
     Strichzeichnung ist - bei diesem Icon zieht die Hand ihn deutlich
     nach links unten. Deshalb 65 Prozent des Wegs vom Kasten zum
     Schwerpunkt. */
  Schaubild.prototype.ikoMitteMessen = function () {
    try {
      var n = 128;
      var h = document.createElement("canvas");
      h.width = n; h.height = n;
      var q = h.getContext("2d");
      q.drawImage(this.icon, 0, 0, n, n);
      var d = q.getImageData(0, 0, n, n).data;
      var sx = 0, sy = 0, sm = 0, i, x, y, a;
      var lx = n, rx = 0, oy = n, uy = 0;
      for (y = 0; y < n; y++) {
        for (x = 0; x < n; x++) {
          i = (y * n + x) * 4;
          a = d[i + 3];
          if (a < 8) continue;
          sx += x * a; sy += y * a; sm += a;
          if (x < lx) lx = x;
          if (x > rx) rx = x;
          if (y < oy) oy = y;
          if (y > uy) uy = y;
        }
      }
      if (sm <= 0) return;
      var kx = ((lx + rx) / 2) / n, ky = ((oy + uy) / 2) / n;
      var px = (sx / sm) / n, py = (sy / sm) / n;
      var w = 0.65;
      this.ikoMitte = { x: kx + (px - kx) * w, y: ky + (py - ky) * w };
    } catch (e) { /* getImageData kann bei fremden Quellen scheitern */ }
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
    g.shadowColor = "rgba(" + SCHATTEN + ",0.20)";
    g.shadowBlur = 42;
    g.shadowOffsetY = 18;
    g.fillStyle = "#ffffff";
    this.pfadSquircle(this.cx, this.cy, halb, halb, 5);
    g.fill();
    g.shadowColor = "rgba(" + SCHATTEN + ",0.15)";
    g.shadowBlur = 12;
    g.shadowOffsetY = 4;
    this.pfadSquircle(this.cx, this.cy, halb, halb, 5);
    g.fill();
    g.restore();

    if (this.icon.complete && this.icon.naturalWidth) {
      var ih = this.sq * 0.58;
      var iw = ih * (this.icon.naturalWidth / this.icon.naturalHeight);
      /* Nicht die Bildmitte auf die Squircle-Mitte legen, sondern den
         Schwerpunkt der Deckung - das ist die optische Mitte. */
      var mx = this.ikoMitte ? this.ikoMitte.x : 0.5;
      var my = this.ikoMitte ? this.ikoMitte.y : 0.5;
      g.drawImage(this.icon, this.cx - iw * mx, this.cy - ih * my, iw, ih);
    }

    /* Handwerker */
    for (i = 0; i < this.knoten.length; i++) {
      k = this.knoten[i];

      g.save();
      g.shadowColor = "rgba(" + SCHATTEN + ",0.24)";
      g.shadowBlur = 26;
      g.shadowOffsetY = 9;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(k.x, k.y, k.r + 3, 0, 6.283);
      g.fill();
      g.shadowColor = "rgba(" + SCHATTEN + ",0.13)";
      g.shadowBlur = 7;
      g.shadowOffsetY = 2;
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
})();

/* == kosten.js =========================================================== */
/* taskrunner - Schaubild "kosten": Kostenkurve mit Flaeche.
   Einbau:  <canvas data-schaubild="kosten"></canvas>                                              */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var SCHATTEN = Schaubild.SCHATTEN;

  /* ---------------------------------------------------------------- *
   *  Motiv Kosten - Kachel "Nachvollziehbar abgerechnet."
   *  Eine Kurve laeuft beim Sichtbarwerden von links nach rechts ein
   *  (Trim Path), danach tauchen die Kostenpunkte nacheinander auf.
   *  Zeigt man auf einen, wird er blau und nennt daneben seinen Posten.
   *
   *  Die Kurve ist ein Catmull-Rom-Spline durch feste Stuetzstellen.
   *  Die Kostenpunkte gehoeren selbst zu den Stuetzstellen - dadurch
   *  liegen sie exakt auf der Linie, statt danebengesetzt zu werden.
   *
   *  Der Verlauf an den Raendern steckt im Strichmuster selbst: der
   *  Strich ist ein Farbverlauf, der aussen auf null geht. Eine Maske
   *  darueber waere teurer und wuerde die Punkte mit ausblenden.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenKosten = function () {
    var i;
    this.ruht = this.kostenRuht;
    this.wachBis = 0;

    /* Die Kurve besteht aus drei kubischen Bezier-Stuecken. An Hoch-
       und Tiefpunkt liegen die Kontrollpunkte waagerecht - dadurch
       laeuft die Kurve dort glatt durch, statt einen Knick zu machen.
       Genau so zeichnet ein Vektorprogramm eine solche Welle. */
    var seg = [
      [[-0.14, 0.740], [0.000, 0.500], [0.100, 0.306], [0.220, 0.306]],
      [[0.220, 0.306], [0.365, 0.306], [0.365, 0.738], [0.510, 0.738]],
      [[0.510, 0.738], [0.660, 0.738], [0.860, 0.400], [1.140, 0.000]]
    ];

    var n = 200, punkte = [], k, u, mu, a0, a1, a2, a3;
    for (k = 0; k < seg.length; k++) {
      for (i = (k ? 1 : 0); i <= n; i++) {
        u = i / n; mu = 1 - u;
        a0 = mu * mu * mu; a1 = 3 * mu * mu * u; a2 = 3 * mu * u * u; a3 = u * u * u;
        punkte.push({
          x: this.b * (a0 * seg[k][0][0] + a1 * seg[k][1][0] + a2 * seg[k][2][0] + a3 * seg[k][3][0]),
          y: this.h * (a0 * seg[k][0][1] + a1 * seg[k][1][1] + a2 * seg[k][2][1] + a3 * seg[k][3][1])
        });
      }
    }

    var ges = 0;
    for (i = 1; i < punkte.length; i++) {
      var dx = punkte[i].x - punkte[i - 1].x, dy = punkte[i].y - punkte[i - 1].y;
      punkte[i].l = Math.sqrt(dx * dx + dy * dy);
      ges += punkte[i].l;
    }
    this.linie = punkte;
    this.gesamt = ges;

    /* Kostenpunkte: an der Stuetzstelle, y von der abgetasteten Kurve */
    var namen = (this.flaeche.dataset.posten ||
      "Anfahrt,Materialkosten,Arbeitszeit,Handlingfee").split(",");
    var stellen = [0.111, 0.354, 0.678, 0.887];
    var mass = Math.min(this.b, this.h * 1.9);
    this.posten = [];
    for (i = 0; i < stellen.length && i < namen.length; i++) {
      var zx = this.b * stellen[i];
      this.posten.push({
        x: zx,
        y: this.yAuf(zx),
        r: Math.max(9, mass * 0.028),
        name: namen[i].trim(),
        an: 0
      });
    }

    this.einlauf = 1.15;                     /* Sekunden fuer den Strich */
    this.einlaufBis = this.einlauf + 0.14 * this.posten.length + 0.6;
    this.startZeit = null;
    this.beginn = this.kostenBeginn;

    /* Canvas nimmt keine Ruecksicht auf noch ladende Schriften: es misst
       und zeichnet dann den Rueckfall. Deshalb einmal anfordern. */
    var s2 = this;
    if (document.fonts && document.fonts.load) {
      document.fonts.load('900 15px "DIN Pro Cond"').then(function () { s2.zeichnen(); },
                                                          function () {});
    }
  };

  /* Der Einlauf haengt an der echten Uhr, nicht am Bildzaehler: sonst
     liefe er auf 120-Hz-Schirmen doppelt so schnell. Gestartet wird er
     beim ersten Sichtbarwerden, danach nie wieder. */
  Schaubild.prototype.kostenBeginn = function () {
    if (this.startZeit == null) this.startZeit = Schaubild.uhr();
  };
  Schaubild.prototype.kostenSek = function () {
    return this.startZeit == null ? 0 : (Schaubild.uhr() - this.startZeit) / 1000;
  };
  Schaubild.uhr = function () {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  };

  /* y der abgetasteten Kurve an der Stelle x */
  Schaubild.prototype.yAuf = function (x) {
    var l = this.linie, i;
    for (i = 1; i < l.length; i++) {
      if (l[i].x >= x) {
        var f = (x - l[i - 1].x) / ((l[i].x - l[i - 1].x) || 1);
        return l[i - 1].y + (l[i].y - l[i - 1].y) * f;
      }
    }
    return l[l.length - 1].y;
  };

  Schaubild.prototype.kostenRuht = function () {
    if (this.zeiger) { this.wachBis = this.t + 1.2; return false; }
    if (this.kostenSek() < this.einlaufBis) return false;
    return this.t > this.wachBis;
  };

  Schaubild.prototype.zeichnenKosten = function () {
    var g = this.stift, i, p;

    /* Strich einlaufen lassen */
    var sek = this.kostenSek();
    var e = Math.min(1, sek / this.einlauf);
    e = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;   /* easeInOutCubic */

    var vl = g.createLinearGradient(0, 0, this.b, 0);
    vl.addColorStop(0.000, "rgba(66,133,244,0)");
    vl.addColorStop(0.022, "rgba(66,133,244,0.85)");
    vl.addColorStop(0.978, "rgba(66,133,244,0.85)");
    vl.addColorStop(1.000, "rgba(66,133,244,0)");
    g.strokeStyle = vl;
    g.lineWidth = 1.8;
    g.lineJoin = "round";

    var ziel = e * this.gesamt, acc = 0, l = this.linie;
    g.beginPath();
    g.moveTo(l[0].x, l[0].y);
    for (i = 1; i < l.length; i++) {
      if (acc + l[i].l <= ziel) { g.lineTo(l[i].x, l[i].y); acc += l[i].l; }
      else {
        var f = (ziel - acc) / (l[i].l || 1);
        g.lineTo(l[i - 1].x + (l[i].x - l[i - 1].x) * f,
                 l[i - 1].y + (l[i].y - l[i - 1].y) * f);
        break;
      }
    }
    g.stroke();

    /* Kostenpunkte */
    for (i = 0; i < this.posten.length; i++) {
      p = this.posten[i];

      var ab = sek - (this.einlauf + 0.14 * i);
      var auf = Math.max(0, Math.min(1, ab / 0.3));
      auf = 1 - Math.pow(1 - auf, 3);                                /* easeOutCubic */
      if (auf <= 0.001) continue;

      var ziel2 = 0;
      if (this.zeiger) {
        var qx = this.zeiger.x - p.x, qy = this.zeiger.y - p.y;
        if (Math.sqrt(qx * qx + qy * qy) < p.r + 14) ziel2 = 1;
      }
      p.an += (ziel2 - p.an) * 0.2;

      var r = p.r * (0.6 + 0.4 * auf) * (1 + 0.10 * p.an);

      g.save();
      g.globalAlpha = auf;
      g.shadowColor = "rgba(" + SCHATTEN + ",0.22)";
      g.shadowBlur = 18;
      g.shadowOffsetY = 6;
      g.fillStyle = p.an > 0.5 ? "#1155cc" : "#ffffff";
      g.beginPath();
      g.arc(p.x, p.y, r, 0, 6.283);
      g.fill();
      g.shadowColor = "rgba(" + SCHATTEN + ",0.12)";
      g.shadowBlur = 6;
      g.shadowOffsetY = 2;
      g.beginPath();
      g.arc(p.x, p.y, r, 0, 6.283);
      g.fill();
      g.restore();

      /* Farbwechsel weich ueberblenden */
      if (p.an > 0.01) {
        g.globalAlpha = auf * p.an;
        g.fillStyle = "#1155cc";
        g.beginPath();
        g.arc(p.x, p.y, r, 0, 6.283);
        g.fill();
      }

      /* Beschriftung nur bei Beruehrung */
      if (p.an > 0.02) {
        g.globalAlpha = auf * Math.min(1, p.an * 1.4);
        g.fillStyle = "#1155cc";
        g.font = '900 15px "DIN Pro Cond", "DIN Pro", ui-sans-serif, sans-serif';
        try { g.letterSpacing = "0.06em"; } catch (e3) {}
        g.textBaseline = "middle";
        var txt = p.name.toUpperCase();
        var br = g.measureText(txt).width;
        var rechts = p.x + r + 12 + br < this.b - 6;
        g.textAlign = rechts ? "left" : "right";
        g.fillText(txt, p.x + (rechts ? r + 12 : -(r + 12)), p.y);
        try { g.letterSpacing = "0px"; } catch (e3) {}
      }
      g.globalAlpha = 1;
    }
  };
})();

/* == notdienst.js ======================================================== */
/* taskrunner - Schaubild "notdienst": Pulsierendes Kreuz fuer den Notdienst.
   Einbau:  <canvas data-schaubild="notdienst"></canvas>                                           */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;

  /* ---------------------------------------------------------------- *
   *  Motiv Notdienst - Kachel "Notdienst innerhalb von 4 Stunden."
   *  Ein rotes Kreuz auf dunklem Grund, dahinter ein Schein, der
   *  pulsiert. Sonst nichts.
   *
   *  Der Schein besteht aus zwei Teilen: einem weiten Radialverlauf
   *  hinter dem Kreuz und einem engen Schlagschatten am Kreuz selbst.
   *  Der weite Verlauf traegt die Flaeche, der enge die Kante - eine
   *  Lage allein wirkt entweder wie Nebel oder wie eine Kontur.
   * ---------------------------------------------------------------- */
  var NOTROT = "255,59,42";       /* #ff3b2a */

  Schaubild.prototype.saeenNotdienst = function () {
    var mass = Math.min(this.b, this.h * 1.9);
    this.cx = this.b * 0.5;
    this.cy = this.h * 0.5;
    this.kreuz = mass * 0.26;               /* Kantenlaenge des Kreuzes */
    this.takt = 2.6;                        /* Sekunden je Pulsschlag */
    this.startZeit = null;
    this.beginn = this.kostenBeginn;
    this.ruht = null;                       /* laeuft dauerhaft */
  };

  Schaubild.prototype.zeichnenNotdienst = function () {
    var g = this.stift;
    var sek = this.kostenSek();
    var p = 0.5 + 0.5 * Math.sin(6.2832 * sek / this.takt);

    var k = this.kreuz, s2 = k / 2, a = k * 0.17;

    /* weiter Schein */
    var r = k * (0.92 + 0.22 * p);
    var vv = g.createRadialGradient(this.cx, this.cy, k * 0.30, this.cx, this.cy, r);
    vv.addColorStop(0.00, "rgba(" + NOTROT + "," + (0.26 + 0.20 * p).toFixed(3) + ")");
    vv.addColorStop(0.45, "rgba(" + NOTROT + "," + (0.08 + 0.08 * p).toFixed(3) + ")");
    vv.addColorStop(1.00, "rgba(" + NOTROT + ",0)");
    g.fillStyle = vv;
    g.beginPath();
    g.arc(this.cx, this.cy, r, 0, 6.283);
    g.fill();

    /* Kreuz mit engem Schein an der Kante */
    g.save();
    g.shadowColor = "rgba(" + NOTROT + "," + (0.55 + 0.30 * p).toFixed(3) + ")";
    g.shadowBlur = k * (0.22 + 0.14 * p);
    g.fillStyle = "rgb(" + NOTROT + ")";
    g.beginPath();
    g.moveTo(this.cx - a, this.cy - s2);
    g.lineTo(this.cx + a, this.cy - s2);
    g.lineTo(this.cx + a, this.cy - a);
    g.lineTo(this.cx + s2, this.cy - a);
    g.lineTo(this.cx + s2, this.cy + a);
    g.lineTo(this.cx + a, this.cy + a);
    g.lineTo(this.cx + a, this.cy + s2);
    g.lineTo(this.cx - a, this.cy + s2);
    g.lineTo(this.cx - a, this.cy + a);
    g.lineTo(this.cx - s2, this.cy + a);
    g.lineTo(this.cx - s2, this.cy - a);
    g.lineTo(this.cx - a, this.cy - a);
    g.closePath();
    g.fill();
    g.fill();                                /* zweimal: Schein verdichten */
    g.restore();
  };
})();

/* == rad.js ============================================================== */
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
    var frei = Math.max(1, this.h - oben);

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

/* == team.js ============================================================= */
/* taskrunner - Schaubild "team": Drei ueberlappende Portraitkreise.
   Einbau:  <canvas data-schaubild="team"></canvas>                                                */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var SCHATTEN = Schaubild.SCHATTEN;

  /* ---------------------------------------------------------------- *
   *  Motiv Team - Kachel "Eine feste Ansprechperson."
   *  Drei ueberlappende Kreise, sonst nichts.
   *
   *  Der Kniff steckt in der Reihenfolge: erst alle Schatten, dann alle
   *  Kreise. Zeichnete man Kreis fuer Kreis samt Schatten, laege der
   *  Schatten des rechten Nachbarn auf dem linken Kreis. So liegt er
   *  hinter allen dreien.
   * ---------------------------------------------------------------- */
  Schaubild.prototype.saeenTeam = function () {
    var s = this, i;
    this.ruht = this.teamRuht;

    var mass = Math.min(this.b, this.h * 1.9);
    this.rFoto = mass * 0.135;
    this.rRing = this.rFoto * 1.15;
    /* Abstand kleiner als zwei Ringradien: die Ringe schieben sich
       uebereinander. 1.62 laesst rund 38 Prozent eines Radius
       ueberlappen. */
    var abstand = this.rRing * 1.62;

    this.kreise = [];
    for (i = 0; i < 3; i++) {
      this.kreise.push({
        x: this.b * 0.5 + (i - 1) * abstand,
        y: this.h * 0.5
      });
    }

    this.bild = new Image();
    this.bild.decoding = "async";
    this.bild.onload = function () { s.zeichnen(); };
    this.bild.src = this.flaeche.dataset.bild || "images/ansprechperson-portrait.webp";
  };

  /* Nichts bewegt sich - nach dem ersten Bild ist Schluss. */
  Schaubild.prototype.teamRuht = function () { return true; };

  Schaubild.prototype.zeichnenTeam = function () {
    var g = this.stift, i, k;

    /* 1. alle Schatten */
    g.save();
    g.fillStyle = "#ffffff";
    for (i = 0; i < this.kreise.length; i++) {
      k = this.kreise[i];
      g.shadowColor = "rgba(" + SCHATTEN + ",0.26)";
      g.shadowBlur = 34;
      g.shadowOffsetY = 12;
      g.beginPath();
      g.arc(k.x, k.y, this.rRing, 0, 6.283);
      g.fill();
      g.shadowColor = "rgba(" + SCHATTEN + ",0.14)";
      g.shadowBlur = 9;
      g.shadowOffsetY = 3;
      g.beginPath();
      g.arc(k.x, k.y, this.rRing, 0, 6.283);
      g.fill();
    }
    g.restore();

    /* 2. alle Kreise darueber */
    for (i = 0; i < this.kreise.length; i++) {
      k = this.kreise[i];

      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(k.x, k.y, this.rRing, 0, 6.283);
      g.fill();

      if (this.bild.complete && this.bild.naturalWidth) {
        g.save();
        g.beginPath();
        g.arc(k.x, k.y, this.rFoto, 0, 6.283);
        g.clip();
        var sk = Math.max((this.rFoto * 2) / this.bild.naturalWidth,
                          (this.rFoto * 2) / this.bild.naturalHeight);
        var bw = this.bild.naturalWidth * sk, bh = this.bild.naturalHeight * sk;
        g.drawImage(this.bild, k.x - bw / 2, k.y - bh / 2, bw, bh);
        g.restore();
      }
    }
  };
})();

/* == start.js ============================================================ */
/* taskrunner - startet die Schaubilder, sobald die Seite steht.
   Muss die letzte Datei sein: vorher sind die Motive noch nicht da.      */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;

  function starten() {
    var f = document.querySelectorAll("canvas[data-schaubild]");
    for (var i = 0; i < f.length; i++) new Schaubild(f[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starten);
  else starten();
})();
