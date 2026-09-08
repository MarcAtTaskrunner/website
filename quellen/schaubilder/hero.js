/* taskrunner - Schaubild "hero": Punktfeld hinter der Startseiten-Ueberschrift.
   Einbau:  <canvas data-schaubild="hero"></canvas>                                                */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var wuerfelAb = Schaubild.wuerfelAb;

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
})();
