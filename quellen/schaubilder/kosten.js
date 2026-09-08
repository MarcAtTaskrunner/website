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
