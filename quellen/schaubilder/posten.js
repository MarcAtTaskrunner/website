/* taskrunner - Schaubild "posten": Posten laufen in die Rechnung.
   Einbau:  <canvas data-schaubild="posten"></canvas>                                              */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var ruhig = Schaubild.ruhig;

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
})();
