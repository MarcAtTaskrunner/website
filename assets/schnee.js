/* taskrunner – Schneefall auf Canvas, fuer das Kopfband von
   /winter-is-coming. Gerechnet, keine Bilder, keine Fremdquelle.

   Einbau:  <canvas data-schnee class="schnee-flaeche" aria-hidden="true"></canvas>
            Das Canvas legt sich ueber den Grund des Kopfbands; die
            Flocken fallen genau in dieser Flaeche.

   Stellschrauben am Element:
     data-schnee="140"   Anzahl der Flocken (ohne Angabe: aus der Flaeche
                         gerechnet, rund eine Flocke je 9000 px²)

   Ruecksicht:
     - prefers-reduced-motion: ein stehendes Bild, kein Laufwerk
     - Seite im Hintergrund oder Kopfband ausserhalb des Bildschirms:
       das Laufwerk haelt an und spart Strom                            */
(function () {
  "use strict";

  var flaechen = document.querySelectorAll("[data-schnee]");
  if (!flaechen.length) return;

  var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");

  function Schnee(flaeche) {
    this.flaeche = flaeche;
    this.stift = flaeche.getContext("2d");
    if (!this.stift) return;
    this.wunsch = parseInt(flaeche.dataset.schnee, 10) || 0;
    this.laeuft = false;
    this.sichtbar = true;
    this.zuletzt = 0;
    this.wind = 0;
    this.t = 0;
    /* Boeen: Wartezeit bis zur naechsten, Dauer und Staerke der
       laufenden. dauer 0 heisst: gerade ist Ruhe. */
    this.boeWarten = 3 + Math.random() * 6;
    this.boeDauer = 0;
    this.boeZeit = 0;
    this.boeStaerke = 0;
    this.messen();
    this.saeen();
    this.binden();
    this.zeichnen();
    if (!ruhig.matches) this.an();
  }

  /* Canvas auf die tatsaechliche Groesse bringen. Der Stift rechnet
     danach wieder in CSS-Pixeln, die Pixeldichte steckt in der Matrix.
     Mehr als das Doppelte lohnt nicht: die Flocken sind weiche Punkte,
     die dritte Stufe sieht man nicht, sie kostet nur Flaeche. */
  Schnee.prototype.messen = function () {
    var r = this.flaeche.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, 2);
    this.b = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.flaeche.width = Math.round(this.b * d);
    this.flaeche.height = Math.round(this.h * d);
    this.stift.setTransform(d, 0, 0, d, 0, 0);
  };

  /* Anzahl aus der Flaeche: auf dem Handy rund 90 Flocken, auf einem
     breiten Bildschirm rund 320. Feiner Schnee vertraegt viel mehr
     Koerner als grober - erst darueber wird daraus Nebel. */
  Schnee.prototype.anzahl = function () {
    if (this.wunsch) return this.wunsch;
    return Math.max(80, Math.min(340, Math.round((this.b * this.h) / 3400)));
  };

  /* Drei Ebenen: kleine Flocken hinten (langsam, blass), grosse vorn
     (schnell, weiss). Das gibt Tiefe, ohne dass etwas gezeichnet wird,
     was nicht schon da waere. tiefe 0..1 steuert alles zugleich. */
  Schnee.prototype.flocke = function (obenRein) {
    var tiefe = Math.random();
    return {
      x: Math.random() * this.b,
      y: obenRein ? -Math.random() * 40 - 8 : Math.random() * this.h,
      r: 0.4 + tiefe * 1.5,
      tempo: 16 + tiefe * 46,            /* px je Sekunde */
      deckung: 0.34 + tiefe * 0.54,
      /* Seitliches Pendeln: eigene Weite, eigener Takt, eigene Lage -
         sonst wiegen alle Flocken im Gleichschritt. */
      weite: 6 + tiefe * 16,
      takt: 0.25 + Math.random() * 0.5,
      lage: Math.random() * 6.2832
    };
  };

  Schnee.prototype.saeen = function () {
    var n = this.anzahl();
    this.flocken = [];
    for (var i = 0; i < n; i++) this.flocken.push(this.flocke(false));
  };

  Schnee.prototype.zeichnen = function () {
    var g = this.stift;
    g.clearRect(0, 0, this.b, this.h);
    for (var i = 0; i < this.flocken.length; i++) {
      var f = this.flocken[i];
      var x = f.x + Math.sin(this.t * f.takt + f.lage) * f.weite;
      g.globalAlpha = f.deckung;
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(x, f.y, f.r, 0, 6.2832);
      g.fill();
    }
    g.globalAlpha = 1;
  };

  /* Eine Boe faehrt als halbe Sinuswelle hoch und wieder herunter -
     ohne Kante am Anfang und am Ende. Dazwischen liegt eine zufaellige
     Ruhe von sechs bis sechzehn Sekunden. Richtung und Staerke wuerfelt
     jede Boe neu, damit keine wie die vorige aussieht. */
  Schnee.prototype.boe = function (dt) {
    if (this.boeDauer > 0) {
      this.boeZeit += dt;
      if (this.boeZeit >= this.boeDauer) {
        this.boeDauer = 0;
        this.boeWarten = 6 + Math.random() * 10;
        return 0;
      }
      return Math.sin(Math.PI * this.boeZeit / this.boeDauer) * this.boeStaerke;
    }
    this.boeWarten -= dt;
    if (this.boeWarten <= 0) {
      this.boeDauer = 3 + Math.random() * 3.5;
      this.boeZeit = 0;
      this.boeStaerke = (Math.random() < 0.5 ? -1 : 1) * (26 + Math.random() * 34);
    }
    return 0;
  };

  /* dt in Sekunden, gedeckelt: kommt die Seite aus dem Hintergrund
     zurueck, liegt sonst eine Sekunde oder mehr zwischen zwei Bildern
     und der Schnee springt nach unten. */
  Schnee.prototype.schritt = function (dt) {
    this.t += dt;
    /* Der Wind dreht langsam; zwei ungleiche Takte, damit sich das
       Muster nicht hoerbar wiederholt. */
    this.wind = Math.sin(this.t * 0.13) * 10 + Math.sin(this.t * 0.31) * 4;
    this.wind += this.boe(dt);
    /* In der Boe faellt der Schnee auch schneller, sonst sieht das
       seitliche Treiben aus wie ein Ruck zur Seite. */
    var eile = 1 + Math.abs(this.wind) / 110;
    for (var i = 0; i < this.flocken.length; i++) {
      var f = this.flocken[i];
      f.y += f.tempo * eile * dt;
      /* Grosse Flocken nehmen mehr Wind mit als kleine. Der Teiler haengt
         an der Groesse aus flocke() - wird die geaendert, aendert sich
         sonst ungewollt auch die Seitwaertsdrift. */
      f.x += this.wind * dt * (f.r / 1.6);
      if (f.y - f.r > this.h) {
        this.flocken[i] = this.flocke(true);
      } else if (f.x < -30) {
        f.x = this.b + 30;
      } else if (f.x > this.b + 30) {
        f.x = -30;
      }
    }
  };

  Schnee.prototype.bild = function (jetzt) {
    if (!this.laeuft) return;
    var dt = this.zuletzt ? Math.min((jetzt - this.zuletzt) / 1000, 0.05) : 0.016;
    this.zuletzt = jetzt;
    this.schritt(dt);
    this.zeichnen();
    var selbst = this;
    this.bildnr = requestAnimationFrame(function (z) { selbst.bild(z); });
  };

  Schnee.prototype.an = function () {
    if (this.laeuft || ruhig.matches || !this.sichtbar || document.hidden) return;
    this.laeuft = true;
    this.zuletzt = 0;
    var selbst = this;
    this.bildnr = requestAnimationFrame(function (z) { selbst.bild(z); });
  };

  Schnee.prototype.aus = function () {
    this.laeuft = false;
    if (this.bildnr) cancelAnimationFrame(this.bildnr);
  };

  Schnee.prototype.binden = function () {
    var selbst = this;

    /* Neue Groesse: Flocken bleiben liegen, wo sie waren, nur die
       Anzahl wird nachgezogen. Neu saeen liesse den Schnee bei jedem
       Dreh des Handys von vorn anfangen. */
    var neu = function () {
      var altB = selbst.b, altH = selbst.h;
      selbst.messen();
      var xf = selbst.b / altB, yf = selbst.h / altH;
      for (var i = 0; i < selbst.flocken.length; i++) {
        selbst.flocken[i].x *= xf;
        selbst.flocken[i].y *= yf;
      }
      var soll = selbst.anzahl();
      while (selbst.flocken.length > soll) selbst.flocken.pop();
      while (selbst.flocken.length < soll) selbst.flocken.push(selbst.flocke(false));
      if (!selbst.laeuft) selbst.zeichnen();
    };

    if (window.ResizeObserver) {
      new ResizeObserver(neu).observe(this.flaeche);
    } else {
      window.addEventListener("resize", neu);
    }

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (eintraege) {
        selbst.sichtbar = eintraege[0].isIntersecting;
        if (selbst.sichtbar) selbst.an(); else selbst.aus();
      }).observe(this.flaeche);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) selbst.aus(); else selbst.an();
    });

    /* Schaltet jemand die Bewegung im Betriebssystem um, gilt das sofort. */
    var aufRuhig = function () {
      if (ruhig.matches) { selbst.aus(); selbst.zeichnen(); }
      else selbst.an();
    };
    if (ruhig.addEventListener) ruhig.addEventListener("change", aufRuhig);
    else if (ruhig.addListener) ruhig.addListener(aufRuhig);
  };

  for (var i = 0; i < flaechen.length; i++) new Schnee(flaechen[i]);
}());
