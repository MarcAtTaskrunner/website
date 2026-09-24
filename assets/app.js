/* taskrunner – Interaktion der Startseite.
   Reines JavaScript, kein Framework, kein Build noetig. */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- *
   *  Mobiles Menue
   * ---------------------------------------------------------------- */
  var toggle = document.getElementById("nav-toggle");
  var menu = document.getElementById("mobile-nav");

  if (toggle && menu) {
    var kopf = document.querySelector("header");
    var menuZeit = 0;
    var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");

    var setzeMenue = function (offen) {
      toggle.setAttribute("aria-expanded", String(offen));
      toggle.querySelector(".sr-only").textContent = offen ? "Menü schließen" : "Menü öffnen";
      /* Oeffnen: erst sichtbar machen, im naechsten Bild aufklappen,
         sonst springt die Klappe ohne Uebergang auf. Schliessen: erst
         zuklappen, nach dem Uebergang verstecken. */
      clearTimeout(menuZeit);
      if (offen) {
        menu.hidden = false;
        void menu.offsetHeight;
        menu.classList.add("ist-offen");
      } else {
        menu.classList.remove("ist-offen");
        menuZeit = setTimeout(function () { menu.hidden = true; grund(false); flaeche(false); }, ruhig.matches ? 0 : 320);
      }
      if (offen) { grund(true); flaeche(true); }
    };

    /* Leiste deckend, Seite dahinter festgehalten (input.css, .menue-offen) */
    var flaeche = function (offen) {
      if (kopf) kopf.classList.toggle("menue-offen", offen);
      document.documentElement.classList.toggle("menue-offen", offen);
    };

    /* Die Kopfleiste ist ganz oben durchsichtig. Waehrend die Klappe
       offen ist (auch waehrend sie zuklappt), braucht sie festen Grund -
       sonst steht die weisse Schrift der Leiste ueber dem weissen Feld
       der Klappe. */
    var grund = function (offen) {
      if (kopf) kopf.classList.toggle("gescrollt", offen || window.scrollY > 8 || document.documentElement.classList.contains("kontakt-offen"));
    };

    var istOffen = function () { return menu.classList.contains("ist-offen"); };

    var schliesse = function (fokusZurueck) {
      if (!istOffen()) return;
      setzeMenue(false);
      if (fokusZurueck) toggle.focus();
    };

    toggle.addEventListener("click", function () { setzeMenue(!istOffen()); });

    /* Escape schliesst und gibt den Fokus zurueck */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") schliesse(true);
    });

    /* Klick auf einen Menuepunkt schliesst */
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) schliesse(false);
    });

    /* Beim Wechsel auf Desktop-Breite schliessen */
    var breit = window.matchMedia("(min-width: 1024px)");
    var aufBreite = function (e) { if (e.matches) schliesse(false); };
    if (breit.addEventListener) breit.addEventListener("change", aufBreite);
    else breit.addListener(aufBreite);
  }

  /* ---------------------------------------------------------------- *
   *  Kontaktfenster
   *  "Kontakt" in der Kopfleiste klappt ein Fenster unter der Leiste
   *  auf (Vorbild: serviceplan.com). Ohne JavaScript fuehrt der Link
   *  wie bisher auf /kontakt. Solange es offen ist, sind Inhalt und
   *  Fusszeile inert: Tab bleibt in Kopfleiste und Fenster, dahinter
   *  ist nichts erreichbar.
   * ---------------------------------------------------------------- */
  (function () {
    var fenster = document.getElementById("kontakt-fenster");
    var ausloeser = document.querySelectorAll("[data-kontakt-auf]");
    if (!fenster || !ausloeser.length) return;
    var wurzel = document.documentElement;
    var kopf = document.querySelector("header");
    var zu = fenster.querySelector("[data-kontakt-zu]");
    var dahinter = document.querySelectorAll("main, footer");
    var herkunft = null;

    var istOffen = function () { return wurzel.classList.contains("kontakt-offen"); };
    var sichtbar = function (el) { return el && el.offsetParent !== null; };

    var setze = function (offen) {
      wurzel.classList.toggle("kontakt-offen", offen);
      fenster.inert = !offen;
      Array.prototype.forEach.call(dahinter, function (el) { el.inert = offen; });
      Array.prototype.forEach.call(ausloeser, function (a) { a.setAttribute("aria-expanded", String(offen)); });
      if (kopf) kopf.classList.toggle("gescrollt", offen || window.scrollY > 8);
    };

    /* Fokus zurueck an den Ausloeser. Kam der Klick aus dem Mobilmenue,
       ist das inzwischen zu - dann an den Menueknopf. */
    var schliesse = function () {
      if (!istOffen()) return;
      setze(false);
      var ziel = sichtbar(herkunft) ? herkunft : document.getElementById("nav-toggle");
      if (sichtbar(ziel)) ziel.focus();
    };

    Array.prototype.forEach.call(ausloeser, function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        if (istOffen()) { schliesse(); return; }
        herkunft = a;
        setze(true);
        zu.focus({ preventScroll: true });
      });
    });
    zu.addEventListener("click", schliesse);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") schliesse();
    });
    /* Ein Klick auf einen der Wege (Telefon, Mail, Testen) schliesst. */
    fenster.addEventListener("click", function (e) {
      if (e.target.closest("a")) schliesse();
    });
  })();

  /* ---------------------------------------------------------------- *
   *  Karussell der Leistungs-Karten
   *  Gescrollt wird nativ (Scroll-Snap). Die Pfeile springen zur
   *  naechsten bzw. vorherigen Karte und deaktivieren sich am Ende.
   * ---------------------------------------------------------------- */
  var track = document.getElementById("feature-track");
  var prev = document.querySelector('[data-carousel="prev"]');
  var next = document.querySelector('[data-carousel="next"]');

  if (track && prev && next) {
    var cards = function () {
      return Array.prototype.slice.call(track.querySelectorAll("li"));
    };

    var padLeft = function () {
      return parseFloat(getComputedStyle(track).paddingLeft) || 0;
    };

    /* Ziel-scrollLeft, damit die Karte buendig am linken Rand steht */
    var targetFor = function (card) {
      var delta =
        card.getBoundingClientRect().left - track.getBoundingClientRect().left;
      return track.scrollLeft + delta - padLeft();
    };

    var go = function (dir) {
      var tolerance = 8;
      var candidates = cards()
        .map(targetFor)
        .filter(function (t) {
          return dir === 1
            ? t > track.scrollLeft + tolerance
            : t < track.scrollLeft - tolerance;
        });
      if (!candidates.length) return;
      var target =
        dir === 1 ? Math.min.apply(null, candidates) : Math.max.apply(null, candidates);
      track.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    };

    var sync = function () {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };

    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("load", sync);

    /* Layout kann sich nach dem Laden von Schriften und Bildern noch
       aendern, daher beobachten statt nur einmal zu setzen. */
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(sync);
      ro.observe(track);
      cards().forEach(function (c) { ro.observe(c); });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sync);
    }
    requestAnimationFrame(sync);
    sync();

    /* ------------------------------------------------------------ *
     *  Ziehen mit der Maus
     *  Mit Finger und Trackpad laesst sich die Leiste ohnehin
     *  schieben. Mit einer Maus ohne Querrad ging bisher nur der
     *  Pfeil - deshalb hier zusaetzlich Greifen und Ziehen.
     * ------------------------------------------------------------ */
    var feineZeiger = window.matchMedia("(hover: hover) and (pointer: fine)");
    var startX = 0, startScroll = 0, gedrueckt = false, gezogen = false;
    var SCHWELLE = 4; /* px, damit ein Klick kein Ziehen ausloest */

    var beginne = function () {
      gezogen = true;
      track.classList.add("zieht");
      track.style.scrollSnapType = "none";
      track.style.scrollBehavior = "auto";
      track.style.userSelect = "none";
    };

    var beende = function () {
      gedrueckt = false;
      track.classList.remove("zieht");
      track.style.userSelect = "";
      /* Erst im naechsten Frame zurueckstellen, sonst springt die
         Leiste noch waehrend des Loslassens auf den alten Punkt. */
      requestAnimationFrame(function () {
        track.style.scrollSnapType = "";
        track.style.scrollBehavior = "";
        sync();
      });
    };

    track.addEventListener("pointerdown", function (e) {
      if (!feineZeiger.matches || e.button !== 0) return;
      if (e.target.closest("a, button")) return;
      gedrueckt = true;
      gezogen = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
    });

    track.addEventListener("pointermove", function (e) {
      if (!gedrueckt) return;
      var weg = e.clientX - startX;
      if (!gezogen) {
        if (Math.abs(weg) < SCHWELLE) return;
        beginne();
        if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
      }
      e.preventDefault();
      track.scrollLeft = startScroll - weg;
    });

    track.addEventListener("pointerup", function () { if (gedrueckt) beende(); });
    track.addEventListener("pointercancel", function () { if (gedrueckt) beende(); });

    /* Nach einem Ziehen den folgenden Klick verschlucken, damit ein
       Link unter dem Zeiger nicht ungewollt ausgeloest wird. */
    track.addEventListener("click", function (e) {
      if (!gezogen) return;
      e.preventDefault();
      e.stopPropagation();
      gezogen = false;
    }, true);

    /* Ein Bild ist von Haus aus ziehbar - das wuerde das Greifen stoeren. */
    track.addEventListener("dragstart", function (e) {
      if (feineZeiger.matches) e.preventDefault();
    });
  }

  /* ------------------------------------------------------------------ *
   *  Einblenden beim Hereinscrollen
   *  Jedes [data-auf] blendet einmal ein. Der Verzug wird nicht im HTML
   *  gepflegt, sondern hier aus der Reihenfolge innerhalb der Sektion
   *  berechnet - so staffelt sich eine Gruppe von selbst.
   * ------------------------------------------------------------------ */
  (function () {
    var teile = document.querySelectorAll("[data-auf]");
    if (!teile.length) return;

    var sanft = window.matchMedia("(prefers-reduced-motion: reduce)");

    var zeige = function (el) { el.classList.add("da"); };

    if (sanft.matches || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(teile, zeige);
      return;
    }

    /* Verzug je Sektion: 0, 70, 140 ... hoechstens 350 ms */
    var zaehler = new Map();
    Array.prototype.forEach.call(teile, function (el) {
      var sektion = el.closest("section") || document.body;
      var i = zaehler.get(sektion) || 0;
      zaehler.set(sektion, i + 1);
      el.style.setProperty("--verzug", Math.min(i * 70, 350) + "ms");
    });

    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        zeige(e.target);
        beobachter.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });

    Array.prototype.forEach.call(teile, function (el) { beobachter.observe(el); });

    /* Notbremse: was nach 2 s noch verborgen ist, wird sichtbar gemacht */
    window.setTimeout(function () {
      Array.prototype.forEach.call(teile, function (el) {
        if (!el.classList.contains("da") && el.getBoundingClientRect().top < window.innerHeight) zeige(el);
      });
    }, 2000);
  })();

  /* ------------------------------------------------------------------ *
   *  Fortschrittsring (SLA-Kachel): CSS zieht den Ring auf, die Zahl
   *  zaehlt hier mit. Gestartet wird am transitionstart des Rings - so
   *  laufen beide gleichzeitig, egal welcher Verzug gerade gilt.
   * ------------------------------------------------------------------ */
  (function () {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Array.prototype.forEach.call(document.querySelectorAll(".fortschritt"), function (ring) {
      var wert = ring.querySelector(".fortschritt-wert");
      var zahl = ring.querySelector(".fortschritt-zahl");
      var teile = zahl && zahl.textContent.match(/^([\d.,]+)(.*)$/);
      if (!wert || !teile) return;
      var ziel = parseFloat(teile[1].replace(",", "."));
      var rest = teile[2];                        /* " %" */
      var stellen = (teile[1].split(",")[1] || "").length;
      var schreibe = function (v) { zahl.textContent = v.toFixed(stellen).replace(".", ",") + rest; };

      /* Schon da (Seite weiter unten neu geladen)? Dann nicht zuruecksetzen. */
      if (ring.closest(".da")) return;
      schreibe(0);

      wert.addEventListener("transitionstart", function (e) {
        if (e.propertyName !== "stroke-dashoffset") return;
        var dauer = (parseFloat(getComputedStyle(wert).transitionDuration) || 1.6) * 1000;
        var t0 = null;
        (function schritt(jetzt) {
          if (t0 === null) t0 = jetzt;
          var f = Math.min(1, (jetzt - t0) / dauer);
          schreibe(ziel * (1 - Math.pow(1 - f, 3)));   /* easeOutCubic, wie --kurve */
          if (f < 1) requestAnimationFrame(schritt);
        })(performance.now());
      }, { once: true });
    });
  })();

  /* ------------------------------------------------------------------ *
   *  Kopfleiste: feine Kante, sobald die Seite gescrollt ist
   * ------------------------------------------------------------------ */
  (function () {
    var kopf = document.querySelector("header");
    if (!kopf) return;
    var offen = false;
    var pruefe = function () {
      offen = false;
      var menu = document.getElementById("mobile-nav");
      var soll = window.scrollY > 8 || document.documentElement.classList.contains("kontakt-offen") || !!(menu && !menu.hidden);
      if (soll !== kopf.classList.contains("gescrollt")) kopf.classList.toggle("gescrollt", soll);
    };
    window.addEventListener("scroll", function () {
      if (offen) return;
      offen = true;
      requestAnimationFrame(pruefe);
    }, { passive: true });
    pruefe();
  })();


  /* ---------------------------------------------------------------- *
   *  Zeitstrahl "So funktioniert ein Task" (.schritte), nur Handy
   *  Die helle Linie waechst mit dem Scrollen: ihre Spitze folgt einer
   *  gedachten Linie bei 60 % der Fensterhoehe. Anfang und Laenge
   *  gehen vom Punkt des ersten bis zum Punkt des letzten Schritts.
   * ---------------------------------------------------------------- */
  (function () {
    var ol = document.querySelector(".schritte");
    if (!ol || !ol.children.length) return;
    var schmal = window.matchMedia("(max-width: 767px)");
    var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    var schritte = ol.children;
    var MITTE = 7;                      /* Punktmitte unter Schrittoberkante */
    var offen = false;

    var pruefe = function () {
      offen = false;
      if (!schmal.matches) return;
      var a = schritte[0].offsetTop + MITTE;
      var h = schritte[schritte.length - 1].offsetTop + MITTE - a;
      ol.style.setProperty("--linie-oben", a + "px");
      ol.style.setProperty("--linie-hoehe", h + "px");
      var spitze = window.innerHeight * 0.6 - ol.getBoundingClientRect().top;
      var zug = ruhig.matches ? 1 : Math.max(0, Math.min(1, (spitze - a) / h));
      ol.style.setProperty("--zug", zug.toFixed(4));
      Array.prototype.forEach.call(schritte, function (li) {
        li.classList.toggle("erreicht", a + zug * h >= li.offsetTop + MITTE - 1);
      });
    };
    var anstossen = function () {
      if (offen) return;
      offen = true;
      requestAnimationFrame(pruefe);
    };
    window.addEventListener("scroll", anstossen, { passive: true });
    window.addEventListener("resize", anstossen);
    pruefe();
  })();

  /* ---------------------------------------------------------------- *
   *  Laufband (Bildergalerie im Blogbeitrag, [data-laufband])
   *  Ein seitlicher Scrollbereich nach Uncode: er laeuft beim Scrollen
   *  der Seite nach links mit, laesst sich mit der Maus ziehen und
   *  springt mit den Pfeiltasten bildweise, solange er gut zur Haelfte
   *  im Blick ist. Auf Beruehrung wischt man nativ. Regeln unter
   *  .laufband in tailwind/input.css.
   * ---------------------------------------------------------------- */
  (function () {
    var baender = document.querySelectorAll("[data-laufband]");
    if (!baender.length) return;

    var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    var SCHWELLE = 6;       /* ab so vielen Pixeln wird aus Druecken Ziehen */
    var MITLAUF = 0.6;      /* Pixel seitwaerts je Pixel Seitenscroll */
    var DAUER = 450;        /* ms je Pfeilschritt, nur fuer die eigene Animation */

    Array.prototype.forEach.call(baender, function (band) {
      var spur = band.firstElementChild;
      var anteil = 0;
      var gedrueckt = false, gezogen = false, startX = 0, startScroll = 0;

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (e) {
          anteil = e[e.length - 1].intersectionRatio;
        }, { threshold: [0, 0.5] }).observe(band);
      }

      /* Mitlaufen. scrollLeft kennt nur ganze Pixel - kleine Schritte
         (Trackpad) werden gesammelt, sonst gingen sie verloren. Baender
         mit data-ohne-mitlauf (Kacheln mit Text) bleiben stehen. */
      var fest = band.hasAttribute("data-ohne-mitlauf");
      var letzteY = window.scrollY, rest = 0;
      window.addEventListener("scroll", function () {
        var dy = window.scrollY - letzteY;
        letzteY = window.scrollY;
        if (fest || !anteil || gedrueckt || ruhig.matches) return;
        rest += dy * MITLAUF;
        var ganz = rest < 0 ? Math.ceil(rest) : Math.floor(rest);
        if (!ganz) return;
        band.scrollLeft += ganz;
        rest -= ganz;
      }, { passive: true });

      /* Ziehen mit der Maus; Finger und Stift wischen nativ. */
      band.addEventListener("pointerdown", function (e) {
        anhalten();
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        gedrueckt = true;
        gezogen = false;
        startX = e.clientX;
        startScroll = band.scrollLeft;
      });

      band.addEventListener("pointermove", function (e) {
        if (!gedrueckt) return;
        var weg = e.clientX - startX;
        if (!gezogen) {
          if (Math.abs(weg) < SCHWELLE) return;
          gezogen = true;
          band.classList.add("zieht");
          if (band.setPointerCapture) band.setPointerCapture(e.pointerId);
        }
        band.scrollLeft = startScroll - weg;
      });

      var loslassen = function () {
        gedrueckt = false;
        band.classList.remove("zieht");
      };
      band.addEventListener("pointerup", loslassen);
      band.addEventListener("pointercancel", loslassen);

      /* Nach einem Ziehen den folgenden Klick verschlucken, sonst ginge
         unter dem Zeiger die Lightbox auf. */
      band.addEventListener("click", function (e) {
        if (!gezogen) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        gezogen = false;
      }, true);

      band.addEventListener("dragstart", function (e) { e.preventDefault(); });

      /* Pfeiltasten: das naechste bzw. vorige Bild an den linken Rand.
         Wie auf apple.com scrollt der Browser selbst weich (behavior:
         "smooth"): das laeuft neben JavaScript her und ruckelt nicht,
         wenn die Schaubilder zeichnen; die Dauer legt der Browser fest
         (Chrome ~0,5 s). Kann er das nicht, uebernimmt eine eigene
         Animation mit DAUER ms und flacher Kurve. Wer das Band selbst
         anfasst oder am Rad dreht, haelt die Bewegung an. */
      var nativWeich = "scrollBehavior" in document.documentElement.style;
      var laufNr = 0, laufZiel = null;
      function anhalten() {
        if (laufNr) cancelAnimationFrame(laufNr);
        laufNr = 0;
        laufZiel = null;
      }
      var gleiten = function (ziel) {
        anhalten();
        ziel = Math.max(0, Math.min(band.scrollWidth - band.clientWidth, ziel));
        if (ruhig.matches) { band.scrollLeft = ziel; return; }
        laufZiel = ziel;
        if (nativWeich) { band.scrollTo({ left: ziel, behavior: "smooth" }); return; }
        var von = band.scrollLeft, t0 = null;
        var bild = function (jetzt) {
          if (t0 === null) t0 = jetzt;
          var f = Math.min(1, (jetzt - t0) / DAUER);
          f = -(Math.cos(Math.PI * f) - 1) / 2;                          /* easeInOutSine */
          band.scrollLeft = von + (ziel - von) * f;
          if (f < 1) laufNr = requestAnimationFrame(bild);
          else laufNr = 0;
        };
        laufNr = requestAnimationFrame(bild);
      };
      band.addEventListener("wheel", anhalten, { passive: true });
      /* Das Ziel gilt, bis das Band dort steht */
      band.addEventListener("scroll", function () {
        if (laufZiel !== null && !laufNr && Math.abs(band.scrollLeft - laufZiel) < 1.5) laufZiel = null;
      }, { passive: true });

      var schritt = function (richtung) {
        var rand = parseFloat(getComputedStyle(spur).paddingLeft) || 0;
        /* Schnell nacheinander geklickt: vom laufenden Ziel aus weiter */
        var x = laufZiel !== null ? laufZiel : band.scrollLeft;
        var marken = Array.prototype.map.call(spur.children, function (li) {
          return li.offsetLeft - rand;
        });
        var ziel = richtung > 0
          ? marken.filter(function (m) { return m > x + 2; })[0]
          : marken.filter(function (m) { return m < x - 2; }).pop();
        if (ziel === undefined) ziel = richtung > 0 ? band.scrollWidth : 0;
        gleiten(ziel);
      };

      document.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (document.querySelector("dialog[open]")) return;
        var fokus = document.activeElement;
        if (!band.contains(fokus)) {
          if (anteil < 0.5) return;
          if (fokus && fokus.closest && fokus.closest("input, textarea, select, [contenteditable]")) return;
        }
        e.preventDefault();
        schritt(e.key === "ArrowRight" ? 1 : -1);
      });

      /* Pfeilknoepfe unter dem Band (nach apple.com), verknuepft ueber
         aria-controls. Ohne JavaScript bleiben sie verborgen. */
      var pfeile = band.id
        ? document.querySelectorAll('[data-laufband-pfeil][aria-controls="' + band.id + '"]')
        : [];
      Array.prototype.forEach.call(pfeile, function (knopf) {
        knopf.addEventListener("click", function () {
          schritt(knopf.getAttribute("data-laufband-pfeil") === "vor" ? 1 : -1);
        });
        knopf.parentElement.hidden = false;
      });
      var abgleichen = function () {
        var max = band.scrollWidth - band.clientWidth - 2;
        Array.prototype.forEach.call(pfeile, function (knopf) {
          var ende = knopf.getAttribute("data-laufband-pfeil") === "vor"
            ? band.scrollLeft >= max
            : band.scrollLeft <= 2;
          knopf.setAttribute("aria-disabled", ende ? "true" : "false");
        });
      };
      band.addEventListener("scroll", abgleichen, { passive: true });
      window.addEventListener("resize", abgleichen, { passive: true });
      abgleichen();
    });
  })();


  /* ---------------------------------------------------------------- *
   *  Lightbox ([data-lightbox])
   *  Ein Klick auf einen Bildlink der Gruppe oeffnet dessen Ziel - die
   *  grosse Fassung - in einem <dialog>. Knoepfe, Pfeiltasten und
   *  Wischen blaettern, Esc und ein Klick neben das Bild schliessen.
   *  Ohne JavaScript oeffnet der Link das Bild einfach selbst.
   *  Aussehen unter .lightbox in tailwind/input.css.
   * ---------------------------------------------------------------- */
  (function () {
    var gruppen = document.querySelectorAll("[data-lightbox]");
    if (!gruppen.length || typeof HTMLDialogElement !== "function") return;

    var zeichen = function (d) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
    };

    var box = document.createElement("dialog");
    box.className = "lightbox";
    box.setAttribute("aria-label", "Bildansicht");
    box.innerHTML =
      '<img class="lightbox-bild" alt="">' +
      '<button type="button" class="lightbox-knopf lightbox-zu" aria-label="Schließen" autofocus>' + zeichen("M18 6 6 18M6 6l12 12") + '</button>' +
      '<button type="button" class="lightbox-knopf lightbox-zurueck" aria-label="Vorheriges Bild">' + zeichen("m15 18-6-6 6-6") + '</button>' +
      '<button type="button" class="lightbox-knopf lightbox-vor" aria-label="Nächstes Bild">' + zeichen("m9 18 6-6-6-6") + '</button>' +
      '<p class="lightbox-zahl" aria-live="polite"></p>';
    document.body.appendChild(box);

    var bild = box.querySelector(".lightbox-bild");
    var zahl = box.querySelector(".lightbox-zahl");
    var links = [], nr = 0;

    var zeige = function (i) {
      nr = (i + links.length) % links.length;
      var klein = links[nr].querySelector("img");
      bild.src = links[nr].href;
      bild.alt = klein ? klein.alt : "";
      zahl.textContent = (nr + 1) + " / " + links.length;
      /* Die Nachbarn vorladen, damit das Blaettern nicht wartet. */
      [nr - 1, nr + 1].forEach(function (j) {
        new Image().src = links[(j + links.length) % links.length].href;
      });
    };

    Array.prototype.forEach.call(gruppen, function (gruppe) {
      gruppe.addEventListener("click", function (e) {
        var a = e.target.closest("a[href]");
        if (!a || e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        links = Array.prototype.slice.call(gruppe.querySelectorAll("a[href]"));
        zeige(links.indexOf(a));
        box.showModal();
      });
    });

    box.querySelector(".lightbox-zurueck").addEventListener("click", function () { zeige(nr - 1); });
    box.querySelector(".lightbox-vor").addEventListener("click", function () { zeige(nr + 1); });
    box.querySelector(".lightbox-zu").addEventListener("click", function () { box.close(); });

    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); zeige(nr - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); zeige(nr + 1); }
    });

    /* Wischen mit dem Finger; danach den Klick nicht als "daneben"
       werten, sonst schloesse die Box nach jedem Wischer. */
    var tippX = null, gewischt = false;
    box.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") tippX = e.clientX;
    });
    box.addEventListener("pointerup", function (e) {
      if (tippX === null) return;
      var dx = e.clientX - tippX;
      tippX = null;
      if (Math.abs(dx) < 50) return;
      gewischt = true;
      zeige(nr + (dx < 0 ? 1 : -1));
    });

    /* Die Box fuellt das Fenster - ein Klick auf sie selbst ist einer
       neben das Bild. */
    box.addEventListener("click", function (e) {
      if (gewischt) { gewischt = false; return; }
      if (e.target === box) box.close();
    });

    box.addEventListener("close", function () { bild.removeAttribute("src"); });
  })();

  /* ---------------------------------------------------------------- *
   *  Formular in Schritten (kontakt.html, [data-schritte])
   *  Je <fieldset data-schritt> ein Schritt; sichtbar ist immer nur
   *  einer. Weiter prueft erst die Pflichtfelder des Schritts. Enter in
   *  einem Feld heisst Weiter, erst im letzten Schritt Absenden. Ohne
   *  JavaScript stehen alle Schritte untereinander.
   * ---------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-schritte]"), function (form) {
    var schritte = form.querySelectorAll("[data-schritt]");
    var anzeige = form.querySelector("[data-schritt-anzeige]");
    var zurueck = form.querySelector("[data-schritt-zurueck]");
    var weiter = form.querySelector("[data-schritt-weiter]");
    var senden = form.querySelector("[data-schritt-senden]");
    var jetzt = 0;

    var zeige = function (nr, fokus) {
      jetzt = nr;
      /* Nicht hidden, sondern unsichtbar und inert: die Schritte liegen
         uebereinander (.in-schritten im CSS), die Kachel behaelt so die
         Hoehe des hoechsten Schritts. */
      Array.prototype.forEach.call(schritte, function (s, i) {
        s.inert = i !== nr;
        s.classList.toggle("ist-aktiv", i === nr);
      });
      var letzter = nr === schritte.length - 1;
      zurueck.hidden = nr === 0;
      weiter.hidden = letzter;
      senden.hidden = !letzter;
      anzeige.hidden = false;
      anzeige.innerHTML = "<b>Schritt " + (nr + 1) + "</b> von " + schritte.length;
      form.dispatchEvent(new CustomEvent("schrittwechsel", { detail: { nr: nr } }));
      if (fokus) {
        var erstes = schritte[nr].querySelector("input:not([type=radio]), input:checked");
        if (erstes) erstes.focus();
      }
    };

    /* Schrittwechsel ueber gehe(): form.vorWechsel (gesetzt vom Weiten
       der Kachel weiter unten) darf den Wechsel verzoegern, um ihn in
       seine Animation einzubetten - dann ruft es dann() selbst auf. */
    var gehe = function (nr) {
      var dann = function () { zeige(nr, true); };
      if (form.vorWechsel && form.vorWechsel(jetzt, nr, dann)) return;
      dann();
    };
    /* Fuer Escape in der bildschirmfuellenden Kachel (zurueck zu Schritt 1) */
    form.geheZu = function (nr) { if (nr !== jetzt) gehe(nr); };

    var gueltig = function () {
      var felder = schritte[jetzt].querySelectorAll("input");
      for (var i = 0; i < felder.length; i++) {
        if (!felder[i].checkValidity()) { felder[i].reportValidity(); return false; }
      }
      return true;
    };

    weiter.addEventListener("click", function () {
      if (gueltig()) gehe(jetzt + 1);
    });
    zurueck.addEventListener("click", function () { gehe(jetzt - 1); });
    /* Enter selbst abfangen: der Absende-Knopf ist bis zum letzten
       Schritt ausgeblendet, dann schickt der Browser bei Enter nichts ab.
       Hat der Vorschlag im Feld Enter schon verbraucht (uebernommen),
       bleibt es dabei. */
    form.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.defaultPrevented || e.target.tagName !== "INPUT") return;
      if (jetzt < schritte.length - 1) {
        e.preventDefault();
        if (gueltig()) gehe(jetzt + 1);
      }
    });

    /* Absenden: direkt an den Worker (worker/index.js), der die Mail
       verschickt. Klappt das nicht, bleibt das Formular stehen und die
       Meldung nennt die Mailadresse als Ausweg. */
    var meldung = form.querySelector("[data-senden-meldung]");
    var ziel = form.getAttribute("data-senden");
    form.addEventListener("submit", function (e) {
      if (jetzt < schritte.length - 1) { e.preventDefault(); return; }
      if (!ziel || !window.fetch) return; /* ohne fetch: Mailprogramm wie bisher */
      e.preventDefault();
      if (!gueltig()) return;
      var daten = {};
      new FormData(form).forEach(function (wert, name) { daten[name] = String(wert); });
      senden.disabled = true;
      senden.textContent = "Wird gesendet …";
      meldung.hidden = true;
      fetch(ziel, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.ok) throw new Error(j.fehler || r.status);
        });
      }).then(function () {
        form.classList.add("ist-gesendet");
        meldung.className = "registrierung-meldung ist-ok";
        meldung.innerHTML = "<strong>Danke, Ihre Registrierung ist angekommen.</strong> Wir melden uns in den nächsten Tagen telefonisch bei Ihnen.";
        meldung.hidden = false;
        var raus = form.querySelector("[data-voll-verlassen]");
        if (raus && form.vollZu && document.documentElement.classList.contains("formular-voll")) raus.hidden = false;
        form.dispatchEvent(new CustomEvent("gesendet"));
      }).catch(function () {
        senden.disabled = false;
        senden.textContent = "Kostenlos registrieren";
        meldung.className = "registrierung-meldung ist-fehler";
        meldung.innerHTML = 'Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal oder schreiben Sie uns an <a href="mailto:operations@taskrunner.de">operations@taskrunner.de</a>.';
        meldung.hidden = false;
      });
    });

    form.classList.add("in-schritten");
    zeige(0, false);
  });

  /* ---------------------------------------------------------------- *
   *  Kachel weiten (kontakt.html, [data-weiten])
   *  Nach Schritt 1 des Handwerker-Formulars waechst die dunkle Kachel
   *  nach links ueber die ganze Breite, waehrend die helle Kundenkachel
   *  langsam ausblendet; zurueck zu Schritt 1 geht es umgekehrt.
   *  Ablauf: Inhalt der dunklen Kachel aus (.blendet) -> Spalten
   *  gleiten, Kunden blenden aus (.ist-weit) -> nur das Formular blendet
   *  links wieder ein. Die dunkle Kachel behaelt dabei ihre Hoehe, der
   *  Kundeninhalt seine Breite (beides hier festgesetzt, siehe CSS).
   *  Nur ab 1024 px; bei "Bewegung reduzieren" ohne Animation.
   * ---------------------------------------------------------------- */
  (function () {
    var teilung = document.querySelector("[data-weiten]");
    if (!teilung) return;
    var form = teilung.querySelector("[data-schritte]");
    var kunden = teilung.querySelector("#kunden");
    var kundenInnen = teilung.querySelector(".kunden-innen");
    var handwerker = teilung.querySelector("#techniker");
    if (!form || !kunden || !kundenInnen || !handwerker) return;
    var breit = window.matchMedia("(min-width: 64rem)");
    var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    var AUS = 250, GLEITEN = 750;

    var wurzel = document.documentElement;
    var recht = handwerker.querySelector("[data-voll-recht]");
    var start = null;

    var festsetzen = function () {
      handwerker.style.height = handwerker.offsetHeight + "px";
      kundenInnen.style.width = kundenInnen.offsetWidth + "px";
      /* Die Kachel verlaesst gleich den Fluss (position: fixed) - die
         Seite darunter behaelt ihre Hoehe, nichts springt. */
      teilung.style.minHeight = teilung.offsetHeight + "px";
    };
    var loesen = function () {
      handwerker.style.height = "";
      kundenInnen.style.width = "";
      teilung.style.minHeight = "";
    };

    /* Bildschirmfuellend: die Kachel wird an ihrer Stelle festgesetzt
       (fixed, gemessenes Rechteck) und gleitet dann auf das ganze Fenster,
       hinter die Kopfleiste. Die Kopfleiste wird dabei durchsichtig mit
       weisser Schrift (html.formular-voll in tailwind/input.css), die
       Seite dahinter scrollt nicht. Zurueck geht es auf dasselbe Rechteck -
       die Seite hat sich solange nicht bewegt. */
    var rahmen = function (r) {
      handwerker.style.top = r.top + "px";
      handwerker.style.left = r.left + "px";
      handwerker.style.width = r.width + "px";
      handwerker.style.height = r.height + "px";
    };
    var aufziehen = function (sofort) {
      var r = handwerker.getBoundingClientRect();
      start = { top: r.top, left: r.left, width: r.width, height: r.height };
      handwerker.classList.add("ist-voll");
      rahmen(start);
      wurzel.classList.add("formular-voll");
      thema(true);
      if (sofort) zeigeRecht();
      if (!sofort) {
        void handwerker.offsetWidth;
        handwerker.classList.add("voll-gleitet");
      }
      handwerker.classList.add("voll-offen");
      rahmen({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight });
      handwerker.style.width = "100%";
      /* lvh: auf dem Handy bis hinter die Browserleisten, sonst fuellt
         Safari den Streifen darunter mit einer eigenen Farbe */
      handwerker.style.height = window.CSS && CSS.supports("height", "100lvh") ? "100lvh" : "100%";
    };
    /* Rechtslinks erst, wenn die Kachel das Fenster ganz fuellt */
    /* Farbe der Statusleiste auf dem iPhone: Safari 26 nimmt den
       Seitenhintergrund (html.formular-voll im CSS), aeltere Versionen
       theme-color. Beides waehrend des Vollbilds dunkel. */
    var themaMeta = document.querySelector('meta[name="theme-color"]');
    var themaAlt = themaMeta ? themaMeta.content : null;
    var thema = function (voll) {
      if (themaMeta) themaMeta.content = voll ? "#000a3a" : themaAlt;
    };

    var zeigeRecht = function () {
      if (!recht || !start) return;
      recht.hidden = false;
      void recht.offsetWidth;
      handwerker.classList.add("voll-da");
    };
    var zuziehen = function () {
      if (!start) return;
      handwerker.classList.remove("voll-da");
      if (recht) recht.hidden = true;
      handwerker.classList.remove("voll-offen");
      rahmen(start);
      wurzel.classList.remove("formular-voll");
      thema(false);
    };
    var ende = function () {
      handwerker.classList.remove("ist-voll", "voll-gleitet", "voll-offen", "voll-da");
      handwerker.style.top = handwerker.style.left = handwerker.style.width = "";
      wurzel.classList.remove("formular-voll");
      thema(false);
      if (recht) recht.hidden = true;
      start = null;
    };
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && start && !form.classList.contains("ist-gesendet")) form.geheZu(0);
    });

    /* Nach dem Absenden: zurueck auf die Kontaktseite, ohne Schrittwechsel.
       Die Kachel gleitet an ihren Platz, die Dankesmeldung bleibt darin. */
    form.vollZu = function () {
      if (!start) return;
      if (ruhig.matches) {
        teilung.classList.remove("kunden-weg");
        setze(false);
        ende();
        loesen();
        return;
      }
      teilung.classList.add("blendet");
      window.setTimeout(function () {
        teilung.classList.remove("kunden-weg");
        zuziehen();
        setze(false);
        window.setTimeout(function () {
          ende();
          loesen();
          teilung.classList.remove("blendet");
        }, GLEITEN);
      }, AUS);
    };
    var raus = form.querySelector("[data-voll-verlassen]");
    if (raus) raus.addEventListener("click", function () {
      raus.hidden = true;
      form.vollZu();
    });
    if (raus) document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && start && form.classList.contains("ist-gesendet")) { raus.hidden = true; form.vollZu(); }
    });
    var setze = function (weit) {
      teilung.classList.toggle("ist-weit", weit);
      kunden.inert = weit;
    };

    form.vorWechsel = function (von, nach, dann) {
      var weit = nach >= 1;
      /* Unter 1024 px nur das Vollbild, ohne Spalten und Karte */
      if (!breit.matches) {
        if (weit === !!start) return false;
        if (ruhig.matches) {
          if (weit) { festsetzen(); aufziehen(true); } else { ende(); loesen(); }
          setze(weit);
          dann();
          return true;
        }
        if (weit) festsetzen();
        teilung.classList.add("blendet");
        window.setTimeout(function () {
          if (weit) aufziehen(); else zuziehen();
          /* ist-weit auch hier: daran haengt das Laden der Karte, die
             auf dem Handy unter dem Formular steht (Spalten gibt es erst
             ab 1024 px, dort wirkt die Klasse sonst nicht) */
          setze(weit);
          dann();
          window.setTimeout(function () {
            if (weit) zeigeRecht(); else { ende(); loesen(); }
            teilung.classList.remove("blendet");
          }, GLEITEN);
        }, AUS);
        return true;
      }
      if (weit === teilung.classList.contains("ist-weit")) return false;
      if (ruhig.matches) {
        if (weit) { festsetzen(); aufziehen(true); }
        teilung.classList.toggle("kunden-weg", weit);
        setze(weit);
        if (!weit) { ende(); loesen(); }
        dann();
        return true;
      }
      if (weit) festsetzen();
      teilung.classList.add("blendet");
      window.setTimeout(function () {
        if (!weit) teilung.classList.remove("kunden-weg");
        if (weit) aufziehen(); else zuziehen();
        setze(weit);
        dann();
        window.setTimeout(function () {
          if (weit) { teilung.classList.add("kunden-weg"); zeigeRecht(); }
          else { ende(); loesen(); }
          teilung.classList.remove("blendet");
        }, GLEITEN);
      }, AUS);
      return true;
    };

    /* Fenster ueber die 1024-px-Grenze gezogen: zurueck zum normalen
       Aufbau (die Kachel liegt dann auf dem richtigen Platz neu) */
    breit.addEventListener("change", function () {
      teilung.classList.remove("blendet", "kunden-weg");
      setze(false);
      ende();
      loesen();
    });
  })();

  /* ---------------------------------------------------------------- *
   *  Postleitzahl mit Ort (kontakt.html, [data-plz])
   *  Beim ersten Klick ins Feld wird die Liste (assets/plz.js, setzt
   *  window.taskrunnerPlz) nachgeladen. Ist die PLZ vollstaendig - DE
   *  fuenf, AT vier Stellen -, steht darunter der Ort zur Bestaetigung;
   *  gehoeren mehrere Orte dazu, eine Auswahl. Der Ort geht als Feld
   *  "Ort" mit in die Mail. Ohne JavaScript bleibt ein freies Ortsfeld.
   *  "Standort verwenden" ([data-plz-orten]) fragt den Browser nach dem
   *  Standort und setzt die PLZ mit dem naechsten Mittelpunkt aus
   *  assets/plz-lage.js ein. Der Standort verlaesst den Browser nicht.
   * ---------------------------------------------------------------- */
  var ladeSkript = function (src, fertig) {
    var da = document.querySelector('script[src="' + src + '"]');
    if (da && da.getAttribute("data-geladen")) { fertig(); return; }
    if (!da) {
      da = document.createElement("script");
      da.src = src;
      da.addEventListener("load", function () { da.setAttribute("data-geladen", "1"); });
      document.head.appendChild(da);
    }
    da.addEventListener("load", fertig);
  };

  Array.prototype.forEach.call(document.querySelectorAll("[data-plz]"), function (feld) {
    var form = feld.form;
    var ausgabe = form.querySelector("[data-plz-ort]");
    var ohneJs = form.querySelector("[data-plz-ohne-js]");
    if (ohneJs) ohneJs.remove();
    var quelle = feld.getAttribute("data-plz");

    var lade = function () {
      if (!window.taskrunnerPlz) ladeSkript(quelle, zeige);
    };

    /* Nach jeder Aenderung meldet das Feld "plzwechsel" mit der PLZ,
       wenn sie bekannt ist, sonst mit null - darauf hoert die Karte. */
    /* Alle Anfaenge deutscher (5 Stellen) und oesterreichischer (4 Stellen)
       PLZ, einmal aus der Liste: "43" gibt es nur in Oesterreich, "0" nur
       in Deutschland. */
    var anfaenge = null;
    var anfang = function (land, wert) {
      if (!anfaenge) {
        anfaenge = { DE: {}, AT: {} };
        Object.keys(window.taskrunnerPlz).forEach(function (k) {
          var ziel = k.length === 5 ? anfaenge.DE : anfaenge.AT;
          for (var n = 1; n <= k.length; n++) ziel[k.slice(0, n)] = true;
        });
      }
      return !!anfaenge[land][wert];
    };
    var istDeAnfang = function (wert) { return anfang("DE", wert); };

    /* Land, sobald es feststeht: passt das Getippte nur zu oesterreichischen
       PLZ, fallen schon ab der zweiten Ziffer der fuenfte Kasten und die
       fuenfte Stelle weg; passt es nur zu deutschen, ist es Deutschland.
       Das Land meldet das Feld als "landwechsel" (fuer die Vorwahl). */
    var land = null;
    var kastenFuenf = function () {
      var plz = feld.value;
      var de = plz && anfang("DE", plz), at = plz && anfang("AT", plz);
      var nurAt = !!at && !de;
      var huelle = feld.closest(".plz-kaesten");
      if (huelle) huelle.classList.toggle("ist-vier", nurAt);
      feld.maxLength = nurAt ? 4 : 5;
      var neu = nurAt ? "AT" : (de && !at) || plz.length === 5 ? "DE" : null;
      if (neu && neu !== land) {
        land = neu;
        feld.dispatchEvent(new CustomEvent("landwechsel", { bubbles: true, detail: { land: land } }));
      }
    };

    var zeige = function () {
      zeigeOrt();
      if (window.taskrunnerPlz) kastenFuenf();
      var plz = feld.value;
      var bekannt = window.taskrunnerPlz && window.taskrunnerPlz[plz] ? plz : null;
      feld.dispatchEvent(new CustomEvent("plzwechsel", { bubbles: true, detail: { plz: bekannt } }));
    };

    var zeigeOrt = function () {
      var plz = feld.value.replace(/\D/g, "");
      if (plz !== feld.value) feld.value = plz;
      ausgabe.textContent = "";
      feld.setCustomValidity("");
      if (plz.length < 4 || !window.taskrunnerPlz) return;
      var orte = window.taskrunnerPlz[plz];
      /* Vier Ziffern koennen eine oesterreichische PLZ sein oder der
         Anfang einer deutschen - erst bei fuenf ist es sicher deutsch. */
      if (!orte) {
        /* Fehler bei fuenf Ziffern - oder schon bei vier, wenn weder eine
           oesterreichische PLZ noch der Anfang einer deutschen passt */
        if (plz.length === 5 || !istDeAnfang(plz)) {
          ausgabe.textContent = "Diese Postleitzahl kennen wir nicht. Bitte prüfen.";
          ausgabe.className = "plz-ort ist-fehler";
        }
        return;
      }
      orte = orte.split("|");
      var land = plz.length === 4 ? " (Österreich)" : "";
      ausgabe.className = "plz-ort ist-ok";
      if (orte.length === 1) {
        ausgabe.innerHTML = '<span aria-hidden="true">✓</span> ';
        ausgabe.appendChild(document.createTextNode(plz + " " + orte[0] + land));
        var versteckt = document.createElement("input");
        versteckt.type = "hidden";
        versteckt.name = "Ort";
        versteckt.value = orte[0];
        ausgabe.appendChild(versteckt);
      } else {
        var beschriftung = document.createElement("label");
        beschriftung.textContent = orte.length + " Orte mit " + plz + land + ":";
        var auswahl = document.createElement("select");
        auswahl.name = "Ort";
        orte.forEach(function (ort) {
          var o = document.createElement("option");
          o.value = o.textContent = ort;
          auswahl.appendChild(o);
        });
        beschriftung.appendChild(auswahl);
        ausgabe.appendChild(beschriftung);
      }
    };

    feld.addEventListener("focus", lade);
    feld.addEventListener("input", zeige);

    /* Kaesten hinter dem Feld: gefuellte und der naechste freie markieren */
    var kaesten = form.querySelectorAll(".plz-raster > span");
    var kaestenAuffrischen = function () {
      var n = feld.value.length;
      var fokus = document.activeElement === feld;
      Array.prototype.forEach.call(kaesten, function (k, i) {
        k.classList.toggle("ist-voll", i < n);
        var anzahl = feld.maxLength === 4 ? 4 : kaesten.length;
        k.classList.toggle("ist-aktiv", fokus && i === Math.min(n, anzahl - 1));
      });
    };
    ["input", "focus", "blur"].forEach(function (typ) { feld.addEventListener(typ, kaestenAuffrischen); });

    var orten = form.querySelector("[data-plz-orten]");
    if (!orten || !("geolocation" in navigator) || !window.isSecureContext) return;
    orten.hidden = false;
    var punkte = null;

    var meldung = function (text) {
      ausgabe.className = "plz-ort ist-fehler";
      ausgabe.textContent = text;
    };

    var naechste = function (breite, laenge) {
      if (!punkte) {
        punkte = window.taskrunnerPlzLage.split(";").map(function (t) {
          var z = t.split(",");
          return [z[0], z[1] / 100, z[2] / 100];
        });
      }
      /* Abstand in km, flach gerechnet - auf diese Entfernungen genau genug */
      var faktor = Math.cos(breite * Math.PI / 180);
      var beste = null, bestAbstand = Infinity;
      for (var i = 0; i < punkte.length; i++) {
        var db = (punkte[i][1] - breite) * 111.2;
        var dl = (punkte[i][2] - laenge) * 111.2 * faktor;
        var d = db * db + dl * dl;
        if (d < bestAbstand) { bestAbstand = d; beste = punkte[i][0]; }
      }
      return Math.sqrt(bestAbstand) <= 30 ? beste : null;
    };

    orten.addEventListener("click", function () {
      orten.disabled = true;
      ausgabe.className = "plz-ort";
      ausgabe.textContent = "Standort wird ermittelt …";
      var fertig = function () { orten.disabled = false; };
      navigator.geolocation.getCurrentPosition(function (position) {
        ladeSkript(quelle, function () {
          ladeSkript(orten.getAttribute("data-plz-orten"), function () {
            fertig();
            var plz = naechste(position.coords.latitude, position.coords.longitude);
            if (!plz) { meldung("In Ihrer Nähe haben wir keine Postleitzahl in Deutschland oder Österreich gefunden. Bitte tippen Sie sie ein."); return; }
            feld.value = plz;
            zeige();
            feld.focus();
            kaestenAuffrischen();
          });
        });
      }, function (fehler) {
        fertig();
        meldung(fehler.code === 1
          ? "Die Ortung ist im Browser nicht erlaubt. Bitte tippen Sie die Postleitzahl ein."
          : "Ihr Standort war nicht zu ermitteln. Bitte tippen Sie die Postleitzahl ein.");
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });
  });

  /* ---------------------------------------------------------------- *
   *  Ländervorwahl (kontakt.html, [data-vorwahl])
   *  Stellt sich nach dem Land der PLZ ein (+49 / +43), solange niemand
   *  sie selbst geaendert hat. Zusammengesetzt wird die Nummer erst im
   *  Worker (worker/index.js).
   * ---------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-vorwahl]"), function (auswahl) {
    var form = auswahl.form;
    var box = auswahl.closest(".telefon-box");
    var flagge = box && box.querySelector("[data-vorwahl-flagge]");
    var code = box && box.querySelector("[data-vorwahl-code]");
    var nummer = box && box.querySelector('input[type="tel"]');
    var vonHand = false;

    /* Anzeige links im Feld: Flagge und Vorwahl der gewaehlten Option,
       dazu ein passendes Beispiel als Platzhalter der Nummer */
    var anzeigen = function () {
      var o = auswahl.options[auswahl.selectedIndex];
      if (!o || !flagge) return;
      flagge.textContent = o.getAttribute("data-flagge") || "";
      code.textContent = o.value || "+";
      if (nummer) nummer.placeholder = o.getAttribute("data-beispiel") || (o.value ? "123 456 789" : "+48 123 456 789");
    };

    auswahl.addEventListener("change", function () { vonHand = true; anzeigen(); });
    form.addEventListener("landwechsel", function (e) {
      if (vonHand) return;
      auswahl.value = e.detail.land === "AT" ? "+43" : "+49";
      anzeigen();
    });
    anzeigen();
  });

  /* ---------------------------------------------------------------- *
   *  Karte zur PLZ (kontakt.html, [data-karte])
   *  Rechts in der weiten Handwerker-Kachel: Linienkarte von Deutschland
   *  und Oesterreich (assets/karte.js, Bauergebnis von werkzeuge/karte.py).
   *  Ist die PLZ bekannt, erscheint dort ein Punkt (Mittelpunkt aus
   *  assets/plz-lage.js) mit dem gewaehlten Einsatzradius, und die Karte
   *  zoomt heran; "Bundesweit" oder keine PLZ zeigt wieder alles.
   *  Beide Dateien werden erst geladen, wenn die Kachel weit wird.
   * ---------------------------------------------------------------- */
  (function () {
    var huelle = document.querySelector("[data-karte]");
    if (!huelle) return;
    var teilung = huelle.closest("[data-weiten]");
    var form = teilung && teilung.querySelector("[data-schritte]");
    if (!form) return;
    var NS = "http://www.w3.org/2000/svg";
    var svg, punkt, puls, kreis, K, lage = null;
    var sicht = null, ziel = null, anim = 0;
    var aktuell = null;
    /* Schritt des Formulars: 1 = PLZ (nur Punkt), ab 2 = Einsatzradius
       (Kreis). Die Nummern folgen der Reihenfolge der fieldsets. */
    var stufe = 0, RADIUS_AB = 2;
    /* Ganze Karte mit Rand, damit sie nicht in den weichen Auslauf am
       Rand der Flaeche (mask-image im CSS, 12 % bzw. 10 %) faellt */
    var gesamt = function () {
      return [-K.breite * 0.17, -K.hoehe * 0.14, K.breite * 1.34, K.hoehe * 1.28];
    };
    var ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");

    var element = function (name, attr) {
      var e = document.createElementNS(NS, name);
      for (var k in attr) e.setAttribute(k, attr[k]);
      return e;
    };

    var baue = function () {
      if (svg || !window.taskrunnerKarte) return;
      K = window.taskrunnerKarte;
      sicht = gesamt();
      svg = element("svg", { viewBox: sicht.join(" "), preserveAspectRatio: "xMidYMid meet", focusable: "false" });
      svg.appendChild(element("path", { d: K.innen, "class": "karte-innen" }));
      svg.appendChild(element("path", { d: K.aussen, "class": "karte-aussen" }));
      kreis = element("circle", { "class": "karte-radius", r: 0 });
      puls = element("circle", { "class": "karte-puls", r: 0 });
      punkt = element("circle", { "class": "karte-punkt", r: 0 });
      [kreis, puls, punkt].forEach(function (e) { svg.appendChild(e); });
      huelle.appendChild(svg);
      zeichne();
      if (aktuell) setze(aktuell);
    };

    var lade = function () {
      ladeSkript(huelle.getAttribute("data-karte"), baue);
      ladeSkript(huelle.getAttribute("data-lage"), function () { if (aktuell) setze(aktuell); });
    };

    var projiziere = function (breite, laenge) {
      return [(laenge - K.lonMin) * K.cos0 * K.massstab, (K.latMax - breite) * K.massstab];
    };

    var mittelpunkt = function (plz) {
      if (!window.taskrunnerPlzLage) return null;
      if (!lage) {
        lage = {};
        window.taskrunnerPlzLage.split(";").forEach(function (t) {
          var z = t.split(",");
          lage[z[0]] = [z[1] / 100, z[2] / 100];
        });
      }
      return lage[plz] || null;
    };

    var radiusKm = function () {
      var gewaehlt = form.querySelector('input[name="Einsatzradius"]:checked');
      var km = gewaehlt ? parseInt(gewaehlt.value, 10) : NaN;
      return isNaN(km) ? 0 : km;
    };

    /* Punkt, Puls und Kreis haengen an der aktuellen Sicht: der Punkt
       soll auf dem Bildschirm gleich gross bleiben, egal wie weit gezoomt. */
    var zeichne = function () {
      svg.setAttribute("viewBox", sicht.join(" "));
      var einheit = sicht[2] / 100;
      punkt.setAttribute("r", aktuellePos ? einheit * 1.1 : 0);
      puls.setAttribute("r", aktuellePos ? einheit * 2.6 : 0);
      kreis.setAttribute("r", aktuellePos && aktuellerRadius ? aktuellerRadius : 0);
    };
    var aktuellePos = null, aktuellerRadius = 0;

    var fahre = function (nach) {
      ziel = nach;
      window.cancelAnimationFrame(anim);
      if (ruhig.matches) { sicht = nach.slice(); zeichne(); return; }
      var von = sicht.slice(), start = null, DAUER = 900;
      var schritt = function (t) {
        if (start === null) start = t;
        var f = Math.min(1, (t - start) / DAUER);
        var e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
        sicht = von.map(function (v, i) { return v + (ziel[i] - v) * e; });
        zeichne();
        if (f < 1) anim = window.requestAnimationFrame(schritt);
      };
      anim = window.requestAnimationFrame(schritt);
    };

    var setze = function (plz) {
      aktuell = plz;
      if (!svg) return;
      var ll = plz && mittelpunkt(plz);
      if (!ll) {
        aktuellePos = null;
        huelle.classList.remove("hat-punkt");
        fahre(gesamt());
        return;
      }
      var neu = !aktuellePos || aktuellePos[0] !== projiziere(ll[0], ll[1])[0];
      var p = projiziere(ll[0], ll[1]);
      aktuellePos = p;
      var mitRadius = stufe >= RADIUS_AB;
      aktuellerRadius = mitRadius ? radiusKm() * K.massstab / 111.2 : 0;
      [punkt, puls, kreis].forEach(function (e) { e.setAttribute("cx", p[0]); e.setAttribute("cy", p[1]); });
      if (neu) {
        huelle.classList.remove("hat-punkt");
        void huelle.offsetWidth; /* Puls-Animation neu starten */
        huelle.classList.add("hat-punkt");
      }
      /* Ausschnitt: im PLZ-Schritt die Umgebung des Punkts, danach der
         Radiuskreis mit Luft drumherum; Bundesweit = alles */
      if (mitRadius && !radiusKm()) { fahre(gesamt()); return; }
      var seite = mitRadius ? Math.max(aktuellerRadius * 2.8, K.breite * 0.22) : K.breite * 0.32;
      var hoehe = seite * K.hoehe / K.breite;
      fahre([p[0] - seite / 2, p[1] - hoehe / 2, seite, hoehe]);
    };

    form.addEventListener("plzwechsel", function (e) { setze(e.detail.plz); });
    form.addEventListener("schrittwechsel", function (e) {
      stufe = e.detail.nr;
      if (svg && aktuell) setze(aktuell);
    });
    form.addEventListener("change", function (e) {
      if (e.target.name === "Einsatzradius" && aktuell) setze(aktuell);
    });
    /* laden, sobald die Kachel weit wird (Klasse an der Teilung) */
    new MutationObserver(function () {
      if (teilung.classList.contains("ist-weit")) lade();
    }).observe(teilung, { attributes: true, attributeFilter: ["class"] });
  })();

  /* ---------------------------------------------------------------- *
   *  Vorschlag im Feld (kontakt.html, [data-vorschlag])
   *  Ab dem ersten Buchstaben steht der Rest des ersten passenden
   *  Eintrags markiert im Feld: weitertippen ueberschreibt ihn, Enter,
   *  Tab oder Pfeil rechts uebernimmt ihn, Loeschen entfernt ihn.
   *  data-vorschlag nennt die id der <datalist> mit den Eintraegen.
   *  Mit data-mehrfach gilt der
   *  Vorschlag fuer den Teil nach dem letzten Komma. Umlaute duerfen
   *  fehlen: "sanitaer", "sanitar" und "Sanitär" treffen dasselbe.
   *  Steht ein Eintrag schon ganz da, kommt kein laengerer Vorschlag
   *  ("Maler" bleibt Maler). Ohne JavaScript ist es ein normales Textfeld.
   * ---------------------------------------------------------------- */
  var vereinfache = function (text) {
    return text.toLocaleLowerCase("de")
      .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
      /* erst danach: so wird auch das "äe" aus "sanitä" + "e" zu "a" */
      .replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-vorschlag]"), function (feld) {
    var quelle = feld.getAttribute("data-vorschlag");
    var mehrfach = feld.hasAttribute("data-mehrfach");
    var eintraege = [];
    var einfach = null;

    var datalist = document.getElementById(quelle);
    if (!datalist) return;
    /* Auf Touch-Geraeten kein Umschreiben waehrend des Tippens: Safari
       setzte nach dem neuen Wert die Markierung in Sicht und sprang dabei
       an den Seitenanfang. Dort stehen stattdessen bis zu fuenf passende
       Eintraege als Knoepfe unter dem Feld (.vorschlag-liste); ein Tipp
       setzt den Eintrag ein, der Fokus bleibt im Feld. */
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      var liste = document.createElement("div");
      liste.className = "vorschlag-liste";
      liste.hidden = true;
      (feld.closest("label") || feld).insertAdjacentElement("afterend", liste);
      eintraege = Array.prototype.map.call(datalist.options, function (o) { return o.value; });
      var einfachT = eintraege.map(vereinfache);

      var stueck = function () {
        var wert = feld.value;
        var anfang = mehrfach ? wert.lastIndexOf(",") + 1 : 0;
        return { anfang: anfang, text: vereinfache(wert.slice(anfang).trim()) };
      };
      var fuellen = function () {
        var st = stueck();
        liste.textContent = "";
        if (!st.text) { liste.hidden = true; return; }
        var schon = mehrfach ? feld.value.slice(0, st.anfang).split(",").map(function (t) { return vereinfache(t.trim()); }) : [];
        var vorn = [], mitten = [];
        einfachT.forEach(function (e, i) {
          if (schon.indexOf(e) >= 0 || e === st.text) return;
          if (e.indexOf(st.text) === 0) vorn.push(i);
          else if (st.text.length > 1 && e.indexOf(st.text) > 0) mitten.push(i);
        });
        vorn.concat(mitten).slice(0, 5).forEach(function (i) {
          var k = document.createElement("button");
          k.type = "button";
          k.textContent = eintraege[i];
          liste.appendChild(k);
        });
        liste.hidden = !liste.children.length;
      };
      /* pointerdown statt click abfangen: so verliert das Feld den Fokus
         nicht und die Tastatur bleibt offen. */
      liste.addEventListener("pointerdown", function (e) { if (e.target.closest("button")) e.preventDefault(); });
      liste.addEventListener("click", function (e) {
        var k = e.target.closest("button");
        if (!k) return;
        var st = stueck();
        var davor = feld.value.slice(0, st.anfang);
        feld.value = (davor ? davor.replace(/\s*$/, " ") : "") + k.textContent + (mehrfach ? ", " : "");
        liste.hidden = true;
        feld.dispatchEvent(new Event("change", { bubbles: true }));
      });
      feld.addEventListener("input", fuellen);
      feld.addEventListener("blur", function () { setTimeout(function () { liste.hidden = true; }, 150); });
      return;
    }
    eintraege = Array.prototype.map.call(datalist.options, function (o) { return o.value; });

    feld.addEventListener("input", function (e) {
      /* Nur beim Tippen ergaenzen, nicht beim Loeschen oder Einfuegen */
      if (e.isComposing || (e.inputType && e.inputType !== "insertText")) return;
      var wert = feld.value;
      if (!wert || feld.selectionEnd !== wert.length) return;
      var liste = eintraege;
      if (!liste.length) return;
      /* Vereinfachte Fassung einmal fuer die ganze Liste, nicht je Taste */
      if (!einfach || einfach.length !== liste.length) einfach = liste.map(vereinfache);
      /* Bei mehreren Eintraegen nur das Stueck nach dem letzten Komma */
      var anfang = mehrfach ? wert.lastIndexOf(",") + 1 : 0;
      while (anfang < wert.length && wert.charAt(anfang) === " ") anfang++;
      var getippt = vereinfache(wert.slice(anfang));
      if (!getippt) return;
      if (einfach.indexOf(getippt) >= 0) return;
      var schon = mehrfach ? wert.slice(0, anfang).split(",").map(function (t) { return vereinfache(t.trim()); }) : [];
      for (var i = 0; i < einfach.length; i++) {
        if (einfach[i].indexOf(getippt) === 0 && schon.indexOf(einfach[i]) < 0) {
          /* Schreibweise des Eintrags uebernehmen: "ber" wird zu "Berlin".
             Markiert wird ab der Stelle, bis zu der schon getippt ist -
             bei "sanitae" also nur noch das "r". */
          var bis = 0;
          while (bis < liste[i].length && vereinfache(liste[i].slice(0, bis)).length < getippt.length) bis++;
          if (bis >= liste[i].length) return;
          feld.value = wert.slice(0, anfang) + liste[i];
          feld.setSelectionRange(anfang + bis, feld.value.length);
          return;
        }
      }
    });

    feld.addEventListener("keydown", function (e) {
      var offen = feld.selectionStart < feld.selectionEnd && feld.selectionEnd === feld.value.length;
      if (!offen) return;
      if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        feld.setSelectionRange(feld.value.length, feld.value.length);
      } else if (e.key === "Tab") {
        feld.setSelectionRange(feld.value.length, feld.value.length);
      }
    });
  });

})();
