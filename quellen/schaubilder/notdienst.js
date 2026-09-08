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
