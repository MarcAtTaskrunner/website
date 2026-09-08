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
