/* ------------------------------------------------------------------ *
 *  Besucherstatistik mit Matomo (https://stats.taskrunner.de)
 *
 *  Matomo laeuft auf dem eigenen Hetzner-Webhosting (hetzner/LIESMICH.md
 *  im Zweig hetzner-version). Gezaehlt wird ohne Cookies und ohne
 *  Einwilligungsbanner; deshalb gilt hier:
 *    - keine Cookies (disableCookies)
 *    - keine Abfrage von Geraeteeigenschaften wie Bildschirmgroesse oder
 *      Plugins (disableBrowserFeatureDetection)
 *    - nicht zaehlen, wenn der Browser "Do Not Track" oder "Global
 *      Privacy Control" meldet
 *    - nicht zaehlen, wenn jemand in der Datenschutzerklaerung
 *      widersprochen hat (localStorage "statistik" = "aus")
 *    - nur auf der Live-Adresse, nicht in der Cloudflare-Vorschau und
 *      nicht lokal
 *  Wer daran etwas aendert, muss den Abschnitt "Reichweitenmessung mit
 *  Matomo" in quellen/datenschutz.html mit aendern.
 *
 *  Ereignisse melden andere Skripte so, ohne Matomo zu kennen:
 *    document.dispatchEvent(new CustomEvent("statistik",
 *      { detail: { kategorie: "Formular", aktion: "abgeschickt", name: "…" } }));
 *  Ist die Zaehlung aus, hoert niemand zu.
 *
 *  Die CSP (_headers) muss stats.taskrunner.de bei script-src,
 *  connect-src und img-src erlauben.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  var MATOMO = "https://stats.taskrunner.de/";
  var WEBSITE = "1";                       /* ID der Website in Matomo */
  var LIVE = ["www.taskrunner.de", "taskrunner.de"];
  var SCHLUESSEL = "statistik";            /* localStorage: "aus" = widersprochen */

  var widersprochen = function () {
    try { return window.localStorage.getItem(SCHLUESSEL) === "aus"; } catch (e) { return false; }
  };
  var browserWillNicht = function () {
    return navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  };

  /* --- Widerspruch in der Datenschutzerklaerung ---------------------
     <button data-statistik-wahl hidden> und <p data-statistik-stand>:
     der Knopf schaltet um, der Text sagt, was gerade gilt. */
  var verdrahten = function () {
    var knopf = document.querySelector("[data-statistik-wahl]");
    var stand = document.querySelector("[data-statistik-stand]");
    if (!knopf || !stand) return;
    var zeigen = function () {
      if (browserWillNicht()) {
        stand.textContent = "Ihr Browser sendet „Do Not Track“ oder „Global Privacy Control“. Ihre Besuche werden deshalb nicht gezählt.";
        knopf.hidden = true;
        return;
      }
      var aus = widersprochen();
      stand.textContent = aus
        ? "Sie haben widersprochen. Ihre Besuche werden in diesem Browser nicht gezählt."
        : "Ihre Besuche werden derzeit anonym gezählt.";
      knopf.textContent = aus ? "Zählung wieder zulassen" : "Zählung für diesen Browser ausschalten";
      knopf.hidden = false;
    };
    knopf.addEventListener("click", function () {
      try {
        if (widersprochen()) window.localStorage.removeItem(SCHLUESSEL);
        else window.localStorage.setItem(SCHLUESSEL, "aus");
      } catch (e) {
        stand.textContent = "Ihr Browser lässt das Speichern der Einstellung nicht zu.";
        return;
      }
      zeigen();
    });
    zeigen();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", verdrahten);
  else verdrahten();

  /* --- Zaehlen ------------------------------------------------------ */
  if (LIVE.indexOf(location.hostname) === -1) return;
  if (widersprochen() || browserWillNicht()) return;

  var _paq = window._paq = window._paq || [];
  _paq.push(["disableCookies"]);
  _paq.push(["disableBrowserFeatureDetection"]);
  _paq.push(["setTrackerUrl", MATOMO + "matomo.php"]);
  _paq.push(["setSiteId", WEBSITE]);
  _paq.push(["trackPageView"]);
  _paq.push(["enableLinkTracking"]);

  /* Ereignisse aus anderen Skripten. Immer ueber window._paq: Sobald
     matomo.js geladen ist, ersetzt es die Liste durch ein eigenes Objekt -
     die Variable _paq oben zeigte dann noch auf die alte, tote Liste. */
  var ereignis = function (kategorie, aktion, name) {
    window._paq.push(["trackEvent", kategorie, aktion, name]);
  };
  document.addEventListener("statistik", function (e) {
    var d = e.detail || {};
    if (!d.kategorie || !d.aktion) return;
    ereignis(String(d.kategorie), String(d.aktion), d.name ? String(d.name) : undefined);
  });

  /* "Kostenlos testen": alle Links auf den Kundenteil der Kontaktseite.
     Als Name die Seite, auf der geklickt wurde. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href$="#kunden"]') : null;
    if (!a || a.getAttribute("href").indexOf("kontakt") === -1) return;
    ereignis("Klick", "Kostenlos testen", location.pathname);
  });

  var skript = document.createElement("script");
  skript.async = true;
  skript.src = MATOMO + "matomo.js";
  document.head.appendChild(skript);
})();
