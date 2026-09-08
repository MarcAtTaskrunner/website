/* taskrunner - startet die Schaubilder, sobald die Seite steht.
   Muss die letzte Datei sein: vorher sind die Motive noch nicht da.      */
(function () {
  "use strict";

  var Schaubild = window.Schaubild;

  function starten() {
    var f = document.querySelectorAll("canvas[data-schaubild]");
    for (var i = 0; i < f.length; i++) new Schaubild(f[i]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starten);
  else starten();
})();
