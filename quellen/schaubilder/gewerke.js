/* taskrunner - Schaubild "gewerke": Gewerke-Symbole um die Auftragskarte.
   Einbau:  <canvas data-schaubild="gewerke"></canvas>                                             */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;
  var SCHATTEN = Schaubild.SCHATTEN;

  /* ---------------------------------------------------------------- *
   *  Motiv Gewerke - Kachel "Ein Task, alle Gewerke."
   *  In der Mitte der Auftrag als Squircle, darum sechs Handwerker,
   *  verbunden durch weiche Bogen. Naehert sich der Zeiger, weichen
   *  die Kreise aus und federn zurueck; die Bogen folgen ihnen.
   *
   *  Der Squircle ist keine abgerundete Box, sondern eine Superellipse
   *  (|x/a|^n + |y/b|^n = 1, n = 5). Nur so laeuft die Kante stetig in
   *  die Ecke, statt an der Nahtstelle zwischen Gerade und Viertelkreis
   *  zu knicken - das ist der Unterschied, den man bei grossen Radien
   *  sieht.
   *
   *  Schatten nach Material/Apple: zwei Lagen, eine enge fuer die Kante
   *  und eine weite fuer die Hoehe. Die Farbe ist #000031 statt Schwarz.
   * ---------------------------------------------------------------- */
  /* Catmull-Rom: laeuft durch p1 und p2, p0 und p3 geben nur die
     Steigung an den Enden. */
  function kr(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  Schaubild.prototype.saeenGewerke = function () {
    var s = this, i;
    this.ruht = this.radRuht;
    this.wachBis = 0;

    /* Lage in Anteilen der Flaeche, uebernommen aus dem Entwurf */
    var lage = [
      [0.235, 0.175, 0.082],
      [0.095, 0.505, 0.072],
      [0.295, 0.855, 0.080],
      [0.795, 0.160, 0.080],
      [0.878, 0.545, 0.077],
      [0.757, 0.805, 0.080]
    ];
    var mass = Math.min(this.b, this.h * 1.9);   /* damit flache Kacheln nicht ausufern */

    /* Jeder Kreis bleibt samt weissem Ring (3 px) und Schatten in der
       Flaeche - was darueber hinausragt, schneidet der Canvas ab. Der
       Schatten faellt nach unten (Versatz 9, Unschaerfe 26), deshalb
       braucht es dort am meisten Luft. Die Ruhelage wird in diese
       Grenzen gerueckt, und beim Ausweichen vor dem Zeiger haelt
       zeichnenGewerke den Kreis an der Grenze fest. */
    var klemm = function (v, lo, hi) { return lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi); };
    this.knoten = [];
    for (i = 0; i < lage.length; i++) {
      var r = Math.max(19, mass * lage[i][2]);
      var minX = r + 16, maxX = this.b - r - 16;
      var minY = r + 8,  maxY = this.h - r - 25;
      this.knoten.push({
        rx: klemm(this.b * lage[i][0], minX, maxX),
        ry: klemm(this.h * lage[i][1], minY, maxY),
        r: r,
        minX: minX, maxX: Math.max(minX, maxX),
        minY: minY, maxY: Math.max(minY, maxY),
        x: 0, y: 0, dx: 0, dy: 0, vx: 0, vy: 0
      });
    }

    this.cx = this.b * 0.5;
    this.cy = this.h * 0.5;
    this.sq = Math.max(60, mass * 0.195);        /* Kantenlaenge */

    /* Portraits aus data-bilder (Liste) bzw. data-bild, je Kreis das
       naechste. Geladen wird erst, wenn die Kachel ins Bild kommt
       (this.gesehen, siehe start() in kern.js) - vorher kostet sie nichts. */
    var nachLaden = function () { s.zeichnen(); };
    this.avatare = (this.flaeche.dataset.bilder || this.flaeche.dataset.bild || "images/headshot.webp")
      .split(",").map(function (q) { return q.trim(); }).filter(Boolean)
      .map(function (q) {
        var im = new Image();
        im.decoding = "async";
        im.onload = nachLaden;
        im.dataset.quelle = q;
        return im;
      });

    /* App-Symbol in der Mitte (Icon Composer), geladen wie die Portraits */
    this.icon = new Image();
    this.icon.decoding = "async";
    this.icon.onload = nachLaden;
    this.icon.dataset.quelle = this.flaeche.dataset.icon || "images/icons/auftrag-app-icon.png";
  };

  /* Superellipse. n = 5 kommt der stetigen Ecke von iOS sehr nahe. */
  Schaubild.prototype.pfadSquircle = function (cx, cy, a, bb, n) {
    var g = this.stift, i, t, ct, st, x, y;
    var schritte = 160;
    g.beginPath();
    for (i = 0; i <= schritte; i++) {
      t = (i / schritte) * 6.283185;
      ct = Math.cos(t); st = Math.sin(t);
      x = cx + a * (ct < 0 ? -1 : 1) * Math.pow(Math.abs(ct), 2 / n);
      y = cy + bb * (st < 0 ? -1 : 1) * Math.pow(Math.abs(st), 2 / n);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  };

  /* Optische Mitte des Icons, einmal nach dem Laden gemessen.
     Zwei Groessen: der Kasten der Deckung (wo die Zeichnung ueberhaupt
     liegt) und ihr Schwerpunkt (wo das Gewicht liegt). Der reine
     Schwerpunkt ueberzieht, wenn ein Teil vollflaechig und der Rest
     Strichzeichnung ist - bei diesem Icon zieht die Hand ihn deutlich
     nach links unten. Deshalb 65 Prozent des Wegs vom Kasten zum
     Schwerpunkt. */
  Schaubild.prototype.ikoMitteMessen = function () {
    try {
      var n = 128;
      var h = document.createElement("canvas");
      h.width = n; h.height = n;
      var q = h.getContext("2d");
      q.drawImage(this.icon, 0, 0, n, n);
      var d = q.getImageData(0, 0, n, n).data;
      var sx = 0, sy = 0, sm = 0, i, x, y, a;
      var lx = n, rx = 0, oy = n, uy = 0;
      for (y = 0; y < n; y++) {
        for (x = 0; x < n; x++) {
          i = (y * n + x) * 4;
          a = d[i + 3];
          if (a < 8) continue;
          sx += x * a; sy += y * a; sm += a;
          if (x < lx) lx = x;
          if (x > rx) rx = x;
          if (y < oy) oy = y;
          if (y > uy) uy = y;
        }
      }
      if (sm <= 0) return;
      var kx = ((lx + rx) / 2) / n, ky = ((oy + uy) / 2) / n;
      var px = (sx / sm) / n, py = (sy / sm) / n;
      var w = 0.65;
      this.ikoMitte = { x: kx + (px - kx) * w, y: ky + (py - ky) * w };
    } catch (e) { /* getImageData kann bei fremden Quellen scheitern */ }
  };

  Schaubild.prototype.zeichnenGewerke = function () {
    var g = this.stift, i, k;
    var wirk = Math.min(this.b, this.h) * 0.42;
    /* Ruhelage bei etwa KRAFT/STEIF Pixeln - hier rund 28 px. */
    var KRAFT = 2.8, STEIF = 0.10, DAEMPF = 0.86;
    var halb = this.sq / 2;

    /* Federn */
    for (i = 0; i < this.knoten.length; i++) {
      k = this.knoten[i];
      if (this.zeiger) {
        var qx = k.rx + k.dx - this.zeiger.x;
        var qy = k.ry + k.dy - this.zeiger.y;
        var ab = Math.sqrt(qx * qx + qy * qy);
        if (ab < wirk && ab > 0.01) {
          var f = (1 - ab / wirk) * (1 - ab / wirk) * KRAFT;
          k.vx += (qx / ab) * f;
          k.vy += (qy / ab) * f;
        }
      }
      k.vx = (k.vx - STEIF * k.dx) * DAEMPF;
      k.vy = (k.vy - STEIF * k.dy) * DAEMPF;
      k.dx += k.vx;
      k.dy += k.vy;
      /* An der Grenze stehen bleiben statt hinauszurutschen (siehe
         saeenGewerke); die Feder zieht den Kreis danach zurueck. */
      k.x = Math.min(Math.max(k.rx + k.dx, k.minX), k.maxX);
      k.y = Math.min(Math.max(k.ry + k.dy, k.minY), k.maxY);
      if (k.x !== k.rx + k.dx) { k.dx = k.x - k.rx; k.vx = 0; }
      if (k.y !== k.ry + k.dy) { k.dy = k.y - k.ry; k.vy = 0; }
    }

    /* Bogen vom Auftrag zu jedem Handwerker */
    g.strokeStyle = "rgba(66,133,244,0.55)";
    g.lineWidth = 1.2;
    for (i = 0; i < this.knoten.length; i++) {
      k = this.knoten[i];
      var vx = k.x - this.cx, vy = k.y - this.cy;
      var vl = Math.sqrt(vx * vx + vy * vy) || 1;
      /* Start auf der Squircle-Kante, Ende auf dem Kreisrand */
      var sx = this.cx + (vx / vl) * halb * 1.02;
      var sy = this.cy + (vy / vl) * halb * 1.02;
      var ex = k.x - (vx / vl) * k.r;
      var ey = k.y - (vy / vl) * k.r;
      var ddx = ex - sx, ddy = ey - sy;
      var waag = Math.abs(ddx) >= Math.abs(ddy);
      var z = 0.55;
      g.beginPath();
      g.moveTo(sx, sy);
      if (waag) g.bezierCurveTo(sx + ddx * z, sy, ex - ddx * z, ey, ex, ey);
      else      g.bezierCurveTo(sx, sy + ddy * z, ex, ey - ddy * z, ex, ey);
      g.stroke();
    }

    /* Auftrag: das App-Symbol aus dem Icon Composer (data-icon), mit
       zweilagigem Schatten. Die Ecken des Bildes sind durchsichtig, der
       Schatten folgt deshalb seiner Form. Bis es geladen ist, steht an
       seiner Stelle ein schlichtes hellblaues Squircle. */
    var ik = this.icon;
    if (this.gesehen) Schaubild.ladeBild(ik);
    var fertig = ik.complete && ik.naturalWidth;
    var lagen = [[0.18, 40, 16], [0.12, 10, 3]];
    for (i = 0; i < lagen.length; i++) {
      g.save();
      g.shadowColor = "rgba(" + SCHATTEN + "," + lagen[i][0] + ")";
      g.shadowBlur = lagen[i][1];
      g.shadowOffsetY = lagen[i][2];
      if (fertig) {
        g.drawImage(ik, this.cx - halb, this.cy - halb, halb * 2, halb * 2);
      } else {
        g.fillStyle = "#e8f0fe";
        this.pfadSquircle(this.cx, this.cy, halb, halb, 5);
        g.fill();
      }
      g.restore();
    }

    /* Handwerker */
    for (i = 0; i < this.knoten.length; i++) {
      k = this.knoten[i];

      g.save();
      g.shadowColor = "rgba(" + SCHATTEN + ",0.24)";
      g.shadowBlur = 26;
      g.shadowOffsetY = 9;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(k.x, k.y, k.r + 3, 0, 6.283);
      g.fill();
      g.shadowColor = "rgba(" + SCHATTEN + ",0.13)";
      g.shadowBlur = 7;
      g.shadowOffsetY = 2;
      g.beginPath();
      g.arc(k.x, k.y, k.r + 3, 0, 6.283);
      g.fill();
      g.restore();

      var bild = this.avatare[i % this.avatare.length];
      if (this.gesehen) Schaubild.ladeBild(bild);
      if (bild.complete && bild.naturalWidth) {
        g.save();
        g.beginPath();
        g.arc(k.x, k.y, k.r, 0, 6.283);
        g.clip();
        var sk = Math.max((k.r * 2) / bild.naturalWidth,
                          (k.r * 2) / bild.naturalHeight);
        var bw = bild.naturalWidth * sk, bh = bild.naturalHeight * sk;
        g.drawImage(bild, k.x - bw / 2, k.y - bh / 2, bw, bh);
        g.restore();
      }
    }

    g.globalAlpha = 1;
  };
})();
