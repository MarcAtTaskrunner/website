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
