/* Vier Motive fuer "Ein Auftrag, alle Gewerke." - zum Vergleichen.
   Gemeinsame Sprache: flach, durchscheinend, ein Verlauf ueber die Flaeche,
   Punkte sind Taskrunner, der Auftrag ist nie ein Punkt.               */
(function () {
  "use strict";
  var HELL = "66,133,244", TIEF = "17,85,204";
  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");

  function Bild(fl) {
    this.fl = fl; this.g = fl.getContext("2d");
    this.art = fl.dataset.art; this.t = 0;
    this.messen(); this.saeen();
    var s = this;
    (function lauf() { s.t += 1/60; s.zeichnen(); requestAnimationFrame(lauf); })();
  }

  Bild.prototype.messen = function () {
    var r = this.fl.getBoundingClientRect(), d = Math.min(devicePixelRatio||1, 2);
    this.b = Math.round(r.width); this.h = Math.round(r.height); this.d = d;
    this.fl.width = this.b*d; this.fl.height = this.h*d;
    this.g.setTransform(d,0,0,d,0,0);
    var v = this.g.createLinearGradient(0,0,this.b,this.h);
    v.addColorStop(0,"rgba("+HELL+",0.60)"); v.addColorStop(.5,"rgba("+HELL+",0.85)");
    v.addColorStop(1,"rgba("+TIEF+",1)"); this.verlauf = v;
    var f = this.g.createLinearGradient(this.b,0,0,this.h);
    f.addColorStop(0,"rgba(255,255,255,0)"); f.addColorStop(.45,"rgba("+HELL+",0.05)");
    f.addColorStop(1,"rgba("+HELL+",0.16)"); this.flaeche = f;
  };

  /* Zufall mit fester Folge, damit nichts flimmert */
  Bild.prototype.wuerfel = function () {
    this.z = ((this.z||123456789) * 1103515245 + 12345) % 2147483648;
    return this.z / 2147483648;
  };

  Bild.prototype.saeen = function () {
    var i, b = this.b, h = this.h;
    this.z = 20260903;
    if (this.art === "welle") {
      /* lockeres Punktfeld */
      this.feld = [];
      var sp = 22, reihe = 0;
      for (var y = h*0.30; y < h*0.94; y += sp*0.86) {
        for (var x = (reihe%2 ? sp/2 : 0) + sp*0.5; x < b; x += sp) {
          this.feld.push({ x: x + (this.wuerfel()-.5)*4, y: y + (this.wuerfel()-.5)*4, an: 0 });
        }
        reihe++;
      }
      this.wellen = [{r: b*0.30}, {r: b*0.70}, {r: b*1.05}];
    }
    if (this.art === "orbit") {
      this.bahnen = [];
      for (i = 0; i < 3; i++) {
        var rx = b*(0.20 + i*0.145), ry = h*(0.085 + i*0.062);
        var n = 5 + i*3, pk = [];
        for (var k = 0; k < n; k++) pk.push({ w: k*(6.283/n) + this.wuerfel(), tempo: (0.16 - i*0.035) });
        this.bahnen.push({ rx: rx, ry: ry, pk: pk });
      }
    }
    if (this.art === "strom") {
      this.aeste = [];
      var ziele = 6;
      for (i = 0; i < ziele; i++) {
        var t = ziele === 1 ? .5 : i/(ziele-1);
        this.aeste.push({ zy: h*(0.16 + t*0.68), teilchen: [] });
        for (var q = 0; q < 7; q++) this.aeste[i].teilchen.push({ s: this.wuerfel() });
      }
    }
    if (this.art === "faecher") {
      this.pk = []; var n2 = 9;
      for (i = 0; i < n2; i++) {
        var tt = i/(n2-1), dd = (tt-.5)*2;
        this.pk.push({ x: b*0.055 + tt*(b*0.89), y: h*0.80 - h*0.075*(1-dd*dd), tiefe: 1-Math.abs(dd) });
      }
      this.fein = [];
      for (i = 0; i < 120; i++) {
        var t3 = i/119, d3 = (t3-.5)*2;
        this.fein.push({ ax: b*0.28 + t3*(b*0.44),
          zx: -b*0.06 + t3*(b*1.12) + (this.wuerfel()-.5)*b*0.05,
          zy: h*0.80 - h*0.11*(1-d3*d3) + (this.wuerfel()-.5)*h*0.05,
          deck: .05 + this.wuerfel()*.07 });
      }
    }
  };

  Bild.prototype.grund = function () {
    var g = this.g;
    g.clearRect(0,0,this.b,this.h);
    g.globalAlpha = 1; g.fillStyle = this.flaeche;
    g.fillRect(0,0,this.b,this.h);
    g.strokeStyle = this.verlauf; g.fillStyle = this.verlauf; g.lineCap = "round";
  };

  /* Glaskarte, klein, als Marke fuer den Auftrag */
  Bild.prototype.karte = function (cx, cy, kb, kh) {
    var g = this.g, x = cx-kb/2, y = cy-kh/2, r = 9, i;
    g.save(); this.pfad(x,y,kb,kh,r); g.clip();
    var o = document.createElement("canvas"); o.width = this.fl.width; o.height = this.fl.height;
    var og = o.getContext("2d"); og.filter = "blur("+(2.5*this.d)+"px)"; og.drawImage(this.fl,0,0);
    var st = 60, LUPE = .06, RAND = .14;
    for (i = 0; i < st; i++) {
      var y0 = y + (kh/st)*i, hs = kh/st + 1.5;
      var v = (y0 + hs/2 - cy)/(kh/2), k = 1 + LUPE + RAND*v*v;
      g.drawImage(o, (cx-(kb/2)*k)*this.d, (cy+(y0-cy)*k)*this.d, kb*k*this.d, hs*k*this.d, x, y0, kb, hs);
    }
    g.restore();
    var ton = g.createLinearGradient(x,y,x+kb*.4,y+kh);
    ton.addColorStop(0,"rgba(255,255,255,.78)"); ton.addColorStop(1,"rgba(255,255,255,.44)");
    this.pfad(x,y,kb,kh,r); g.fillStyle = ton; g.fill();
    var saum = g.createLinearGradient(x,y,x+kb,y+kh);
    saum.addColorStop(0,"rgba(255,255,255,.95)"); saum.addColorStop(.38,"rgba("+HELL+",.45)");
    saum.addColorStop(1,"rgba("+TIEF+",.38)");
    g.strokeStyle = saum; g.lineWidth = 1.2; this.pfad(x,y,kb,kh,r); g.stroke();
    g.strokeStyle = this.verlauf; g.lineWidth = 2.6;
    var z = [[.34,.60],[.56,.76],[.78,.42]];
    for (i = 0; i < z.length; i++) {
      g.globalAlpha = .20; g.beginPath();
      g.moveTo(x+kb*.14, y+kh*z[i][0]); g.lineTo(x+kb*.14+kb*.72*z[i][1], y+kh*z[i][0]); g.stroke();
    }
    g.globalAlpha = 1; g.fillStyle = this.verlauf; g.strokeStyle = this.verlauf;
  };

  Bild.prototype.pfad = function (x,y,b,h,r) {
    var g = this.g; g.beginPath(); g.moveTo(x+r,y);
    g.arcTo(x+b,y,x+b,y+h,r); g.arcTo(x+b,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+b,y,r); g.closePath();
  };

  Bild.prototype.zeichnen = function () {
    this.grund();
    this["m_"+this.art]();
  };

  /* -------------------------------------------------- A  Welle */
  Bild.prototype.m_welle = function () {
    var g = this.g, b = this.b, h = this.h, i, p;
    var qx = b/2, qy = h*0.17;
    if (this.wellen.length < 3 && Math.random() < 0.014) this.wellen.push({ r: 0 });
    for (i = this.wellen.length-1; i >= 0; i--) {
      this.wellen[i].r += 1.5;
      if (this.wellen[i].r > b*1.25) this.wellen.splice(i,1);
    }
    /* Punkte leuchten auf, wenn die Front sie erreicht */
    for (i = 0; i < this.feld.length; i++) {
      p = this.feld[i];
      var dist = Math.hypot(p.x-qx, p.y-qy);
      for (var w = 0; w < this.wellen.length; w++) {
        if (Math.abs(dist - this.wellen[w].r) < 16) p.an = 1;
      }
      p.an *= 0.975;
    }
    /* Wellenfronten */
    for (i = 0; i < this.wellen.length; i++) {
      var rr = this.wellen[i].r;
      g.globalAlpha = 0.22 * (1 - rr/(b*1.25));
      g.lineWidth = 1;
      g.beginPath(); g.arc(qx, qy, rr, 0.06*Math.PI, 0.94*Math.PI); g.stroke();
    }
    /* Verbindungen zwischen benachbarten, leuchtenden Punkten */
    g.lineWidth = 0.7;
    for (i = 0; i < this.feld.length; i++) {
      p = this.feld[i];
      if (p.an < 0.12) continue;
      for (var j = i+1; j < this.feld.length; j++) {
        var q = this.feld[j];
        if (q.an < 0.12) continue;
        var dd = Math.hypot(p.x-q.x, p.y-q.y);
        if (dd < 30) { g.globalAlpha = 0.30*Math.min(p.an,q.an)*(1-dd/30); 
          g.beginPath(); g.moveTo(p.x,p.y); g.lineTo(q.x,q.y); g.stroke(); }
      }
    }
    for (i = 0; i < this.feld.length; i++) {
      p = this.feld[i];
      g.globalAlpha = 0.16 + 0.74*p.an;
      g.beginPath(); g.arc(p.x, p.y, 1.7 + 2.2*p.an, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    this.karte(qx, qy, Math.min(150, b*0.42), Math.min(150, b*0.42)*0.5);
  };

  /* -------------------------------------------------- B  Orbit */
  Bild.prototype.m_orbit = function () {
    var g = this.g, b = this.b, h = this.h, cx = b/2, cy = h*0.54, i, k;
    for (i = 0; i < this.bahnen.length; i++) {
      var bn = this.bahnen[i];
      g.globalAlpha = 0.13; g.lineWidth = 0.8;
      g.beginPath(); g.ellipse(cx, cy, bn.rx, bn.ry, 0, 0, 6.283); g.stroke();
      for (k = 0; k < bn.pk.length; k++) {
        var pk = bn.pk[k];
        var w = pk.w + this.t*pk.tempo;
        var px = cx + Math.cos(w)*bn.rx, py = cy + Math.sin(w)*bn.ry;
        var vorn = (Math.sin(w) + 1)/2;                 /* unten = vorn */
        var kb2 = Math.min(150, b*0.40)/2, kh2 = Math.min(150, b*0.40)*0.52/2;
        var ax2 = cx + (px-cx)*0.999, ay2 = cy + (py-cy)*0.999;
        var mt = Math.max(Math.abs(kb2/(px-cx||1e-6)), Math.abs(kh2/(py-cy||1e-6)));
        var sx = cx + (px-cx)*mt, sy = cy + (py-cy)*mt;      /* Start am Kartenrand */
        g.globalAlpha = 0.20; g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(sx,sy); g.lineTo(px,py); g.stroke();
        g.globalAlpha = 0.45 + 0.5*vorn;
        g.beginPath(); g.arc(px, py, 2.0 + 2.0*vorn, 0, 6.283); g.fill();
      }
    }
    g.globalAlpha = 1;
    this.karte(cx, cy, Math.min(150, b*0.40), Math.min(150, b*0.40)*0.52);
  };

  /* -------------------------------------------------- C  Strom */
  Bild.prototype.m_strom = function () {
    var g = this.g, b = this.b, h = this.h, i, q;
    var ex = b*0.10, ey = h*0.50, kx = b*0.44, ky = h*0.50;
    /* Bahnen */
    for (i = 0; i < this.aeste.length; i++) {
      var a = this.aeste[i];
      g.globalAlpha = 0.16; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(kx, ky);
      g.bezierCurveTo(kx + b*0.16, ky, b*0.74, a.zy, b*0.94, a.zy);
      g.stroke();
      g.globalAlpha = 0.55;
      g.beginPath(); g.arc(b*0.94, a.zy, 3.2, 0, 6.283); g.fill();
      /* fliessende Teilchen */
      for (q = 0; q < a.teilchen.length; q++) {
        var tp = a.teilchen[q];
        tp.s += 0.0045; if (tp.s > 1) tp.s -= 1;
        var s = tp.s, u = 1-s;
        var x = u*u*u*kx + 3*u*u*s*(kx+b*0.16) + 3*u*s*s*(b*0.74) + s*s*s*(b*0.94);
        var y = u*u*u*ky + 3*u*u*s*ky + 3*u*s*s*a.zy + s*s*s*a.zy;
        g.globalAlpha = 0.75*Math.sin(s*Math.PI);
        g.beginPath(); g.arc(x, y, 2.0, 0, 6.283); g.fill();
      }
    }
    /* Zulauf */
    g.globalAlpha = 0.16; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(ex, ey); g.lineTo(kx, ky); g.stroke();
    g.globalAlpha = 1;
    this.karte(kx*0.62, ky, Math.min(120, b*0.30), Math.min(120, b*0.30)*0.55);
  };

  /* -------------------------------------------------- D  Faecher */
  Bild.prototype.m_faecher = function () {
    var g = this.g, b = this.b, h = this.h, i;
    var kb = Math.min(180, b*0.44), kh = kb*0.54, cy = h*0.16;
    var unten = cy + kh/2;
    g.lineWidth = 0.6;
    for (i = 0; i < this.fein.length; i++) {
      var f = this.fein[i];
      g.globalAlpha = f.deck;
      g.beginPath(); g.moveTo(f.ax, unten); g.lineTo(f.zx, f.zy); g.stroke();
    }
    for (i = 0; i < this.pk.length; i++) {
      var p = this.pk[i];
      g.globalAlpha = 0.16 + 0.16*p.tiefe; g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(b/2 - kb/2 + 12 + (i/(this.pk.length-1))*(kb-24), unten);
      g.lineTo(p.x, p.y); g.stroke();
    }
    g.globalAlpha = 1;
    this.karte(b/2, cy, kb, kh);
    for (i = 0; i < this.pk.length; i++) {
      g.globalAlpha = 0.74 + 0.22*this.pk[i].tiefe;
      g.beginPath(); g.arc(this.pk[i].x, this.pk[i].y, 2.6 + 1.5*this.pk[i].tiefe, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
  };

  var f = document.querySelectorAll("canvas[data-art]");
  for (var i = 0; i < f.length; i++) new Bild(f[i]);
})();
