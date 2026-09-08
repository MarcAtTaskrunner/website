/* taskrunner - Schaubild "welle": Wellen durch ein Punktfeld.
   Einbau:  <canvas data-schaubild="welle"></canvas>                                               */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var ruhig = Schaubild.ruhig;

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
})();
