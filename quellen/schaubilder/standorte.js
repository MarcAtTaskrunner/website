/* taskrunner - Schaubild "standorte": Standorte melden ins Dashboard.
   Einbau:  <canvas data-schaubild="standorte"></canvas>                                           */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var ruhig = Schaubild.ruhig;
  var wuerfelAb = Schaubild.wuerfelAb;

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
})();
