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
      if (kopf) kopf.classList.toggle("gescrollt", offen || window.scrollY > 8);
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
   *  Kopfleiste: feine Kante, sobald die Seite gescrollt ist
   * ------------------------------------------------------------------ */
  (function () {
    var kopf = document.querySelector("header");
    if (!kopf) return;
    var offen = false;
    var pruefe = function () {
      offen = false;
      var soll = window.scrollY > 8;
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
   *  Zahlenband: das Leuchten wandert
   *  Die beiden Linien tragen je eine Leuchtlage. Beim Ueberfahren
   *  einer Zelle laeuft sie dorthin, statt an der einen aus- und an
   *  der naechsten aufzugehen.
   * ---------------------------------------------------------------- */
  (function () {
    var band = document.querySelector(".zahlen-band");
    if (!band) return;
    var zellen = band.querySelectorAll(".zahl-zelle");
    if (!zellen.length) return;

    /* Nur im Nebeneinander: gestapelt liegen die Zellen untereinander,
       eine waagerechte Lage koennte dort gar nicht auf sie zeigen. */
    var reihe = window.matchMedia("(min-width: 640px) and (hover: hover) and (pointer: fine)");

    band.style.setProperty("--leucht-b", (100 / zellen.length) + "%");

    var an = false;
    Array.prototype.forEach.call(zellen, function (zelle, i) {
      zelle.addEventListener("pointerenter", function () {
        if (!reihe.matches) return;
        if (!an) {
          /* Aus dem Nichts nicht von links hereinfahren, sondern gleich
             an der richtigen Stelle aufgehen. */
          band.classList.add("ohne-lauf");
          band.style.setProperty("--leucht-i", i);
          void band.offsetWidth;              /* Umbruch erzwingen */
          band.classList.remove("ohne-lauf");
        } else {
          band.style.setProperty("--leucht-i", i);
        }
        band.style.setProperty("--leucht-an", "1");
        an = true;
      }, { passive: true });
    });

    band.addEventListener("pointerleave", function () {
      band.style.setProperty("--leucht-an", "0");
      an = false;
    }, { passive: true });
  })();


})();
