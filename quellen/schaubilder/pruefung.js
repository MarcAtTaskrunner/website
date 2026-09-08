/* taskrunner - Schaubild "pruefung": Lupe faehrt ueber das Feld.
   Einbau:  <canvas data-schaubild="pruefung"></canvas>                                            */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var ruhig = Schaubild.ruhig;
  var wuerfelAb = Schaubild.wuerfelAb;

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
})();
