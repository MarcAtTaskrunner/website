/* taskrunner - Punkt-Schaubilder der Sektion "Schnell, einfach und Transparent".
   Alles gerechnet, keine Bilder. Ein Punkt ist ein Taskrunner, der Auftrag ist
   die Karte oben - deshalb nie ein Punkt.

   Einbau:  <canvas data-schaubild="gewerke" data-punkte="9"></canvas>
   Die Datei sucht sich alle so ausgezeichneten Flaechen selbst.            */
(function () {
  "use strict";

  var BLAU_H = [66, 133, 244];   /* Light Blue  */
  var BLAU_M = [17, 85, 204];    /* Medium Blue */
  var BLAU_D = [0, 1, 107];      /* Dark Blue   */

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
  var grob  = window.matchMedia("(pointer: coarse)");

  function farbe(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  /* ---------------------------------------------------------------- *
   *  Ein Schaubild
   * ---------------------------------------------------------------- */
  function Schaubild(flaeche) {
    this.flaeche = flaeche;
    this.stift = flaeche.getContext("2d");
    this.anzahl = parseInt(flaeche.dataset.punkte, 10) || 9;
    this.zeiger = null;          /* Position des Mauszeigers, null = draussen */
    this.laeuft = false;
    this.t = 0;
    this.punkte = [];
    this.messen();
    this.saeen();
    this.binden();
  }

  Schaubild.prototype.messen = function () {
    var r = this.flaeche.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, 2);
    this.b = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.flaeche.width = this.b * d;
    this.flaeche.height = this.h * d;
    this.stift.setTransform(d, 0, 0, d, 0, 0);

    /* Auftragskarte: mittig oben, Groesse an der Flaeche ausgerichtet */
    this.kb = Math.min(190, this.b * 0.44);
    this.kh = this.kb * 0.56;
    this.kx = (this.b - this.kb) / 2;
    this.ky = this.h * 0.10;
    this.kunten = this.ky + this.kh;
  };

  /* Ruhelage der Punkte: gleichmaessig verteilt, Reihe leicht gewoelbt */
  Schaubild.prototype.saeen = function () {
    var rand = Math.max(26, this.b * 0.09);
    var boden = this.h * 0.84;
    var woelbung = this.h * 0.055;
    var n = this.anzahl;
    this.punkte = [];
    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0.5 : i / (n - 1);
      var d = (t - 0.5) * 2;
      this.punkte.push({
        rx: rand + t * (this.b - 2 * rand),          /* Ruhelage x */
        ry: boden - woelbung * (1 - d * d),          /* Ruhelage y */
        x: 0, y: 0,
        tiefe: 1 - Math.abs(d),                      /* Mitte = vorn */
        phase: i * 0.9,
        naehe: 0                                     /* 0..1, Naehe zum Zeiger */
      });
      /* Ansatz an der Unterkante der Karte, ebenfalls gleichmaessig */
      this.punkte[i].ax = this.kx + 14 + t * (this.kb - 28);
    }
  };

  Schaubild.prototype.binden = function () {
    var s = this;

    this.beiZeiger = function (e) {
      var r = s.flaeche.getBoundingClientRect();
      s.zeiger = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    this.beiVerlassen = function () { s.zeiger = null; };

    if (!grob.matches) {
      this.flaeche.addEventListener("pointermove", this.beiZeiger, { passive: true });
      this.flaeche.addEventListener("pointerleave", this.beiVerlassen, { passive: true });
    }

    /* nur rechnen, solange die Flaeche wirklich zu sehen ist */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) { e.isIntersecting ? s.start() : s.stopp(); });
      }, { rootMargin: "120px" }).observe(this.flaeche);
    } else {
      this.start();
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { s.messen(); s.saeen(); s.zeichnen(); }).observe(this.flaeche);
    } else {
      window.addEventListener("resize", function () { s.messen(); s.saeen(); s.zeichnen(); });
    }

    var aufRuhe = function () { ruhig.matches ? (s.stopp(), s.zeichnen()) : s.start(); };
    if (ruhig.addEventListener) ruhig.addEventListener("change", aufRuhe);
    else if (ruhig.addListener) ruhig.addListener(aufRuhe);
  };

  Schaubild.prototype.start = function () {
    if (this.laeuft) return;
    if (ruhig.matches) { this.zeichnen(); return; }   /* weniger Bewegung: Standbild */
    this.laeuft = true;
    var s = this;
    var schritt = function () {
      if (!s.laeuft) return;
      s.t += 1 / 60;
      s.zeichnen();
      s.anfrage = requestAnimationFrame(schritt);
    };
    this.anfrage = requestAnimationFrame(schritt);
  };

  Schaubild.prototype.stopp = function () {
    this.laeuft = false;
    if (this.anfrage) cancelAnimationFrame(this.anfrage);
  };

  Schaubild.prototype.zeichnen = function () {
    var g = this.stift, b = this.b, h = this.h, i, p;

    g.clearRect(0, 0, b, h);

    /* Lichtschein hinter dem Faecher */
    var mitte = { x: b / 2, y: h * 0.62 };
    var schein = g.createRadialGradient(mitte.x, mitte.y, 0, mitte.x, mitte.y, Math.max(b, h) * 0.52);
    schein.addColorStop(0, farbe(BLAU_H, 0.20));
    schein.addColorStop(0.5, farbe(BLAU_H, 0.07));
    schein.addColorStop(1, farbe(BLAU_H, 0));
    g.fillStyle = schein;
    g.fillRect(0, 0, b, h);

    /* Punkte in ihre aktuelle Lage bringen */
    for (i = 0; i < this.punkte.length; i++) {
      p = this.punkte[i];
      var drift = ruhig.matches ? 0 : 1;
      p.x = p.rx + Math.sin(this.t * 0.5 + p.phase) * 2.4 * drift;
      p.y = p.ry + Math.cos(this.t * 0.42 + p.phase * 1.3) * 1.8 * drift;

      var ziel = 0;
      if (this.zeiger) {
        var dx = this.zeiger.x - p.x, dy = this.zeiger.y - p.y;
        var abstand = Math.sqrt(dx * dx + dy * dy);
        ziel = Math.max(0, 1 - abstand / (b * 0.28));
        ziel *= ziel;
        /* leichtes Anziehen des Punktes zum Zeiger */
        p.x += dx * 0.10 * ziel;
        p.y += dy * 0.10 * ziel;
      }
      p.naehe += (ziel - p.naehe) * 0.14;
    }

    /* Strahlen von der Karte zu den Punkten */
    for (i = 0; i < this.punkte.length; i++) {
      p = this.punkte[i];
      var deck = 0.16 + 0.20 * p.tiefe + 0.42 * p.naehe;
      var lauf = g.createLinearGradient(p.ax, this.kunten, p.x, p.y);
      lauf.addColorStop(0, farbe(BLAU_M, deck));
      lauf.addColorStop(1, farbe(BLAU_M, deck * 0.42));
      g.strokeStyle = lauf;
      g.lineWidth = 1 + 0.7 * p.tiefe + 0.9 * p.naehe;
      g.beginPath();
      g.moveTo(p.ax, this.kunten);
      g.lineTo(p.x, p.y);
      g.stroke();
    }

    this.karteZeichnen();

    /* Punkte als Kugeln, mit Aufsetzschatten */
    for (i = 0; i < this.punkte.length; i++) {
      p = this.punkte[i];
      var r = (4.4 + 2.2 * p.tiefe) * (1 + 0.42 * p.naehe);

      g.fillStyle = farbe(BLAU_D, 0.13);
      g.beginPath();
      g.ellipse(p.x, p.y + r * 1.3, r * 1.15, r * 0.34, 0, 0, Math.PI * 2);
      g.fill();

      var kugel = g.createRadialGradient(p.x - r * 0.32, p.y - r * 0.36, r * 0.12, p.x, p.y, r);
      kugel.addColorStop(0, farbe(BLAU_H, 1));
      kugel.addColorStop(0.55, farbe(BLAU_M, 1));
      kugel.addColorStop(1, farbe(BLAU_D, 1));
      g.fillStyle = kugel;
      g.beginPath();
      g.arc(p.x, p.y, r, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = "rgba(255,255,255," + (0.42 + 0.3 * p.naehe) + ")";
      g.beginPath();
      g.arc(p.x - r * 0.3, p.y - r * 0.34, r * 0.32, 0, Math.PI * 2);
      g.fill();
    }
  };

  Schaubild.prototype.karteZeichnen = function () {
    var g = this.stift, x = this.kx, y = this.ky, b = this.kb, h = this.kh, r = 8;

    g.save();
    g.shadowColor = farbe(BLAU_D, 0.16);
    g.shadowBlur = 16;
    g.shadowOffsetY = 6;

    var flaeche = g.createLinearGradient(0, y, 0, y + h);
    flaeche.addColorStop(0, "#ffffff");
    flaeche.addColorStop(1, "#f4f8ff");
    g.fillStyle = flaeche;
    this.pfadKarte(x, y, b, h, r);
    g.fill();
    g.restore();

    g.strokeStyle = farbe(BLAU_M, 0.38);
    g.lineWidth = 1.3;
    this.pfadKarte(x, y, b, h, r);
    g.stroke();

    /* angedeutete Zeilen im Auftrag */
    var zeilen = [[0.30, 0.62, 5, 0.22], [0.48, 0.78, 4, 0.13], [0.63, 0.44, 4, 0.13]];
    g.lineCap = "round";
    for (var i = 0; i < zeilen.length; i++) {
      var z = zeilen[i];
      g.strokeStyle = farbe(BLAU_M, z[3]);
      g.lineWidth = z[2];
      g.beginPath();
      g.moveTo(x + b * 0.13, y + h * z[0]);
      g.lineTo(x + b * 0.13 + (b * 0.74) * z[1], y + h * z[0]);
      g.stroke();
    }
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

  /* ---------------------------------------------------------------- */
  function starten() {
    var flaechen = document.querySelectorAll("canvas[data-schaubild]");
    for (var i = 0; i < flaechen.length; i++) new Schaubild(flaechen[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", starten);
  } else {
    starten();
  }
})();
