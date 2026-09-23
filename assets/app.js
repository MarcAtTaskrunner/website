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

    var setzeMenue = function (offen) {
      toggle.setAttribute("aria-expanded", String(offen));
      toggle.querySelector(".sr-only").textContent = offen ? "Menü schließen" : "Menü öffnen";
      menu.hidden = !offen;
      /* Die Kopfleiste ist ganz oben durchsichtig. Waehrend die Klappe
         offen ist, braucht sie festen Grund - sonst steht die weisse
         Schrift der Leiste ueber dem weissen Feld der Klappe. */
      if (kopf) kopf.classList.toggle("gescrollt", offen || window.scrollY > 8 || document.documentElement.classList.contains("kontakt-offen"));
    };

    var schliesse = function (fokusZurueck) {
      if (menu.hidden) return;
      setzeMenue(false);
      if (fokusZurueck) toggle.focus();
    };

    toggle.addEventListener("click", function () { setzeMenue(menu.hidden); });

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
      var soll = window.scrollY > 8 || document.documentElement.classList.contains("kontakt-offen");
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
   *  Ortsvorschlag im Feld (kontakt.html, [data-ortsvorschlag])
   *  Ab dem ersten Buchstaben steht der Rest des ersten passenden Orts
   *  markiert im Feld: weitertippen ueberschreibt ihn, Enter, Tab oder
   *  Pfeil rechts uebernimmt ihn, Loeschen entfernt ihn. Die Orte kommen
   *  aus der <datalist>, deren id im Attribut steht. Ohne JavaScript ist
   *  es ein normales Textfeld.
   * ---------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-ortsvorschlag]"), function (feld) {
    var liste = document.getElementById(feld.getAttribute("data-ortsvorschlag"));
    if (!liste) return;
    var orte = Array.prototype.map.call(liste.options, function (o) { return o.value; });

    feld.addEventListener("input", function (e) {
      /* Nur beim Tippen ergaenzen, nicht beim Loeschen oder Einfuegen */
      if (e.isComposing || (e.inputType && e.inputType !== "insertText")) return;
      var getippt = feld.value;
      if (!getippt || feld.selectionEnd !== getippt.length) return;
      var klein = getippt.toLocaleLowerCase("de");
      for (var i = 0; i < orte.length; i++) {
        if (orte[i].toLocaleLowerCase("de").indexOf(klein) === 0 && orte[i].length > getippt.length) {
          /* Schreibweise des Orts uebernehmen: "ber" wird zu "Berlin" */
          feld.value = orte[i];
          feld.setSelectionRange(getippt.length, feld.value.length);
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
