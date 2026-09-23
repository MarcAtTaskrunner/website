/* taskrunner – Förder-Check auf der Seite Förderungen.
   Reines JavaScript, kein Framework, kein Build noetig. Gerechnet wird
   nur im Browser: es wird nichts verschickt und nichts gespeichert.

   Die Foerderwerte stehen ein zweites Mal als Text in
   quellen/foerderungen.html (Abschnitt "Die Programme im Einzelnen").
   Aendert sich eine Richtlinie, beide Stellen anpassen. Naechster
   bekannter Termin: der Klimageschwindigkeitsbonus sinkt ab dem
   1. Februar 2027 halbjaehrlich.

   Die Karten werden hier als HTML geschrieben. Tailwind liest diese
   Datei mit (@source in tailwind/input.css), damit die Klassen darin
   im CSS landen. */
(function () {
  "use strict";

  var flaeche = document.querySelector("[data-foerdercheck-flaeche]");
  var formular = document.querySelector("[data-foerdercheck]");
  if (!flaeche || !formular) return;

  var ergebnis = flaeche.querySelector("[data-check-ergebnis]");
  var status = flaeche.querySelector("[data-check-status]");
  var leer = ergebnis.innerHTML;

  /* Ohne JavaScript bleibt der Check verborgen und ein Satz verweist
     auf die Programme weiter unten. */
  flaeche.hidden = false;
  var ohneJs = document.querySelector("[data-ohne-js]");
  if (ohneJs) ohneJs.parentNode.removeChild(ohneJs);

  /* ---------------------------------------------------------------- *
   *  Foerderwerte, Stand September 2026
   * ---------------------------------------------------------------- */
  var HEIZUNG = {
    quote: 0.30,
    /* Foerderfaehige Kosten nach Nettoraumflaeche: ein Sockel bis
       150 m², darueber je m² ein Satz, der mit der Flaeche sinkt.
       Die Staffel gilt fuer Nichtwohngebaeude - nur dort wird gerechnet. */
    sockel: 28000,
    sockelBis: 150,
    stufen: [[400, 197], [1000, 118], [Infinity, 79]]
  };
  var HUELLE = { quote: 0.15, jeEinheit: 30000, jeEinheitMitIsfp: 60000 };

  var heizungKosten = function (m2) {
    var kosten = HEIZUNG.sockel, unten = HEIZUNG.sockelBis;
    HEIZUNG.stufen.forEach(function (s) {
      if (m2 > unten) kosten += (Math.min(m2, s[0]) - unten) * s[1];
      unten = s[0];
    });
    return kosten;
  };

  var zahl = function (n) { return Math.round(n).toLocaleString("de-DE"); };
  var euro = function (n) { return zahl(n) + "&nbsp;€"; };

  /* ---------------------------------------------------------------- *
   *  Die vier Ergebniskarten
   * ---------------------------------------------------------------- */
  var heizung = function (wer, m2) {
    var mitBonus = wer === "privat";
    var k = {
      stelle: "Beantragt über die KfW",
      titel: "Heizungs&shy;förderung",
      name: "Heizungsförderung",
      ziel: "#heizung",
      posten: [],
      hinweise: []
    };
    if (mitBonus) {
      k.posten.push(["bis 70&nbsp;%", "30&nbsp;% Grundförderung plus Klima&shy;geschwindigkeits- und Einkommens&shy;bonus, in der niedrigsten Einkommens&shy;gruppe bis 80&nbsp;%"]);
      k.hinweise.push("Der Klima&shy;geschwindigkeits&shy;bonus sinkt ab dem 1. Februar 2027 halbjährlich.");
    } else {
      k.posten.push(["30&nbsp;%", "Grundförderung auf die förderfähigen Kosten"]);
      if (!wer) k.hinweise.push("Selbst nutzende Privatpersonen erhalten mit Boni bis zu 70&nbsp;%.");
      else if (wer === "weg") k.hinweise.push("Die Boni gelten nur für selbst nutzende Privatpersonen – was davon bei Ihrer Eigentümer&shy;gemeinschaft greift, prüfen wir.");
      else k.hinweise.push("Die Boni gelten nur für selbst nutzende Privatpersonen, deshalb bleibt es bei 30&nbsp;%.");
    }
    if (m2) {
      var kosten = heizungKosten(m2);
      k.betrag = "Bei " + zahl(m2) + "&nbsp;m² Nettoraumfläche sind bis zu " + euro(kosten) + " förderfähig. " +
        (mitBonus || !wer
          ? "Mit der Grundförderung sind das bis zu <strong>" + euro(kosten * HEIZUNG.quote) + "</strong>" + (mitBonus ? ", mit Boni mehr." : ".")
          : "Das ergibt bis zu <strong>" + euro(kosten * HEIZUNG.quote) + "</strong> Zuschuss.");
    }
    return k;
  };

  var huelle = function (gebaeude, einheiten) {
    var k = {
      stelle: "Beantragt über das BAFA",
      titel: "Gebäude&shy;hüllen&shy;förderung",
      name: "Gebäudehüllenförderung",
      ziel: "#gebaeudehuelle",
      posten: [["15&nbsp;%", "Dämmung von Außenwänden und Dach, Fenster, Türen und Tore"]],
      hinweise: []
    };
    if (gebaeude !== "nichtwohn") {
      k.posten.push(["+5&nbsp;%", "iSFP-Bonus mit individuellem Sanierungs&shy;fahrplan" + (gebaeude ? "" : ", nur für Wohngebäude") + ", auf Ausgaben über 30.000&nbsp;€"]);
    }
    k.posten.push(["50&nbsp;%", "Fachplanung und Baubegleitung"]);

    if (gebaeude === "nichtwohn") {
      k.hinweise.push("Für Nichtwohngebäude gelten eigene Obergrenzen.");
    } else if (einheiten) {
      var kosten = einheiten * HUELLE.jeEinheit;
      k.betrag = "Bei " + (einheiten === 1 ? "einer Wohneinheit" : zahl(einheiten) + " Wohneinheiten") +
        " sind bis zu " + euro(kosten) + " förderfähig, das ergibt bis zu <strong>" + euro(kosten * HUELLE.quote) +
        "</strong> Zuschuss. Mit Sanierungs&shy;fahrplan steigt die Grenze auf " + euro(einheiten * HUELLE.jeEinheitMitIsfp) + ".";
    } else {
      k.hinweise.push("Förderfähig sind bis zu 30.000&nbsp;€ je Wohneinheit, mit Sanierungs&shy;fahrplan bis zu 60.000&nbsp;€." +
        (gebaeude ? "" : " Für Nichtwohngebäude gelten eigene Obergrenzen."));
    }
    return k;
  };

  var anlagen = function (lueftung, optimierung) {
    var k = {
      stelle: "Beantragt über das BAFA",
      titel: "Anlagen&shy;technik",
      name: "Anlagentechnik",
      ziel: "#anlagentechnik",
      posten: [],
      hinweise: []
    };
    if (lueftung) k.posten.push(["15&nbsp;%", "Lüftungs- und Kältetechnik, Gebäude&shy;automation"]);
    if (optimierung) k.posten.push(["50&nbsp;%", "Heizungs&shy;optimierung zur Emissions&shy;minderung"]);
    k.posten.push(["50&nbsp;%", "Fachplanung und Baubegleitung"]);
    return k;
  };

  var beleuchtung = function () {
    return {
      entfallen: true,
      stelle: "Förderung entfallen",
      titel: "Beleuchtung",
      name: "Beleuchtung",
      ziel: "#anlagentechnik",
      posten: [],
      text: "Energieeffiziente Innen&shy;beleuchtung in Nichtwohngebäuden wird seit dem 21. Juli 2026 nicht mehr über die BEG gefördert.",
      hinweise: ["Infrage kommen die Nationale Klimaschutz&shy;initiative, KfW-Kredite, Landesprogramme oder Contracting."]
    };
  };

  var PFEIL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="transition-transform group-hover:translate-x-1"><path d="M9 6l6 6-6 6"></path></svg>';

  var karte = function (k) {
    var html = '<article class="ergebnis-karte">' +
      '<p class="t-eyebrow' + (k.entfallen ? " ergebnis-marke" : "") + '">' + k.stelle + "</p>" +
      '<h3 class="mt-2 hyphens-auto break-words t-h4 text-ink">' + k.titel + "</h3>";
    if (k.posten.length) {
      html += '<ul class="ergebnis-posten">' + k.posten.map(function (p) {
        return '<li><span class="ergebnis-quote t-intro font-bold">' + p[0] + '</span><span class="t-body-tight">' + p[1] + "</span></li>";
      }).join("") + "</ul>";
    }
    if (k.text) html += '<p class="mt-4 t-body-tight">' + k.text + "</p>";
    if (k.betrag) html += '<div class="ergebnis-betrag t-body-tight">' + k.betrag + "</div>";
    if (k.hinweise.length) {
      html += '<ul class="ergebnis-hinweise">' + k.hinweise.map(function (h) {
        return '<li class="t-body-tight">' + h + "</li>";
      }).join("") + "</ul>";
    }
    html += '<p class="mt-6"><a href="' + k.ziel + '" class="group inline-flex items-center gap-2 t-body font-bold text-blue-600 transition-colors hover:text-ink">' +
      'Details<span class="sr-only"> zu ' + k.name + "</span>" + PFEIL + "</a></p>";
    return html + "</article>";
  };

  /* ---------------------------------------------------------------- *
   *  Formular lesen und Ergebnis zeichnen
   * ---------------------------------------------------------------- */
  var gewaehlt = function (name) {
    return Array.prototype.map.call(
      formular.querySelectorAll('input[name="' + name + '"]:checked'),
      function (el) { return el.value; }
    );
  };
  var ganzeZahl = function (name) {
    var n = parseInt(formular.elements[name].value, 10);
    return n > 0 ? Math.min(n, 1000000) : 0;
  };
  /* Blendet ein Zusatzfeld ein oder aus; ausgeblendet zaehlt es nicht. */
  var zusatz = function (name, zeigen) {
    formular.querySelector('[data-zusatz="' + name + '"]').hidden = !zeigen;
    return zeigen ? ganzeZahl(name) : 0;
  };

  var ZAHLWORT = ["", "Ein", "Zwei", "Drei"];
  var letzterStatus = "";
  var letztesHtml = leer;

  var zeichnen = function () {
    var wer = gewaehlt("wer")[0] || "";
    var gebaeude = gewaehlt("gebaeude")[0] || "";
    var vorhaben = gewaehlt("vorhaben");
    var hat = function (v) { return vorhaben.indexOf(v) !== -1; };

    var m2 = zusatz("flaeche", gebaeude === "nichtwohn" && hat("heizung"));
    var einheiten = zusatz("einheiten", gebaeude === "wohn" && hat("huelle"));

    var karten = [];
    if (hat("heizung")) karten.push(heizung(wer, m2));
    if (hat("huelle")) karten.push(huelle(gebaeude, einheiten));
    if (hat("anlagen") || hat("optimierung")) karten.push(anlagen(hat("anlagen"), hat("optimierung")));
    if (hat("beleuchtung")) karten.push(beleuchtung());

    var programme = karten.filter(function (k) { return !k.entfallen; });
    var n = programme.length;
    var kopf = n
      ? ZAHLWORT[n] + (n === 1 ? " Programm kommt" : " Programme kommen") + " infrage"
      : "Für Beleuchtung gibt es derzeit keine Bundesförderung";

    /* Nur neu schreiben, wenn sich etwas geaendert hat. Verlaesst man
       ein Zahlenfeld mit einem Klick auf "Details", feuert vorher noch
       "change" - wuerde dann neu geschrieben, verschwaende der Link
       zwischen Druecken und Loslassen und der Klick ginge ins Leere. */
    var html = karten.length
      ? '<p class="t-intro font-bold">' + kopf + '</p><div class="mt-5">' + karten.map(karte).join("") + "</div>"
      : leer;
    if (html !== letztesHtml) {
      ergebnis.innerHTML = html;
      letztesHtml = html;
    }

    /* Vorgelesen wird nur, wenn sich die Programme aendern - nicht bei
       jeder Ziffer, die jemand in ein Zahlenfeld tippt. */
    var text = karten.length
      ? kopf + (n ? ": " + programme.map(function (k) { return k.name; }).join(", ") : "") + "."
      : "";
    if (text !== letzterStatus) {
      status.textContent = text;
      letzterStatus = text;
    }
  };

  formular.addEventListener("change", zeichnen);
  formular.addEventListener("input", zeichnen);
  formular.addEventListener("submit", function (e) { e.preventDefault(); });
  /* Der Browser stellt beim Zurueckgehen die Auswahl wieder her. */
  window.addEventListener("pageshow", zeichnen);
  zeichnen();

  /* ---------------------------------------------------------------- *
   *  Links auf ein Programm klappen es auf - aus dem Ergebnis, aus dem
   *  Kopfband oder als Adresse mit #heizung von einer anderen Seite.
   * ---------------------------------------------------------------- */
  var oeffne = function (id) {
    var ziel = id && document.getElementById(id);
    if (ziel && ziel.tagName === "DETAILS") ziel.open = true;
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) oeffne(decodeURIComponent(a.getAttribute("href").slice(1)));
  });
  window.addEventListener("hashchange", function () { oeffne(decodeURIComponent(location.hash.slice(1))); });
  oeffne(decodeURIComponent(location.hash.slice(1)));
})();
