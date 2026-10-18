/* -----------------------------------------------------------------
   The Wall — interaction layer (no frameworks)
   • click / Enter / Space  -> expand album + show tracklist
   • arrows, dots, ← → keys -> cycle the stack
   • Esc                    -> close the detail panel
   • Gears toggle           -> optional turning-gear sound (Web Audio API)
   Album metadata lives in data-* attributes; tracklists in <template>.
------------------------------------------------------------------ */
(function () {
  "use strict";

  var featured = document.getElementById("featured");
  var recs     = Array.prototype.slice.call(featured.querySelectorAll(".rec"));
  var detail   = document.getElementById("detail");
  var dots     = Array.prototype.slice.call(document.querySelectorAll(".dot"));
  var prevBtn  = document.getElementById("prev");
  var nextBtn  = document.getElementById("next");
  var closeBtn = document.getElementById("detailClose");
  var soundBtn = document.getElementById("soundToggle");

  var out = {
    title:  document.getElementById("detailTitle"),
    artist: document.getElementById("detailArtist"),
    year:   document.getElementById("detailYear"),
    genre:  document.getElementById("detailGenre"),
    tracks: document.getElementById("detailTracks")
  };

  var active = -1; // -1 == nothing expanded

  /* ---------------------------- render --------------------------- */

  function render() {
    var open = active >= 0;

    featured.classList.toggle("has-active", open);
    featured.classList.toggle("has-detail", open);

    recs.forEach(function (rec, i) {
      var on = i === active;
      rec.classList.toggle("is-active", on);
      rec.setAttribute("aria-expanded", on ? "true" : "false");
    });

    dots.forEach(function (d, i) {
      d.classList.toggle("is-on", i === active);
      d.setAttribute("aria-selected", i === active ? "true" : "false");
    });

    if (!open) {
      detail.hidden = true;
      return;
    }

    var rec = recs[active];
    out.title.textContent  = rec.dataset.title  || "";
    out.artist.textContent = rec.dataset.artist || "";
    out.year.textContent   = rec.dataset.year   || "";
    out.genre.textContent  = rec.dataset.genre  || "";

    // tracklist ships in the card as an inert <template>
    var tpl = rec.querySelector("template.rec__tracks");
    out.tracks.textContent = "";
    if (tpl) {
      Array.prototype.slice.call(tpl.content.querySelectorAll("li"))
        .forEach(function (li, n) {
          var clone = li.cloneNode(true);
          clone.style.setProperty("--n", n);
          out.tracks.appendChild(clone);
        });
    }

    detail.hidden = false;
  }

  function select(i) {
    active = (i === active) ? -1 : i;   // clicking the open album closes it
    render();
  }

  function cycle(step) {
    if (active < 0) {
      active = step > 0 ? 0 : recs.length - 1;
    } else {
      active = (active + step + recs.length) % recs.length;
    }
    render();
  }

  function clearSelection() {
    active = -1;
    render();
  }

  /* ---------------------------- wiring --------------------------- */

  recs.forEach(function (rec, i) {
    rec.addEventListener("click", function () { select(i); });
    rec.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        select(i);
      }
    });
  });

  dots.forEach(function (d, i) {
    d.addEventListener("click", function () { select(i); });
  });

  prevBtn.addEventListener("click", function () { cycle(-1); });
  nextBtn.addEventListener("click", function () { cycle(1); });
  closeBtn.addEventListener("click", clearSelection);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (active >= 0) clearSelection();
    } else if (active >= 0 && e.key === "ArrowLeft")  { cycle(-1); }
    else if (active >= 0 && e.key === "ArrowRight") { cycle(1); }
  });

  render();

  /* ================= SCROLL SECTIONS: taste · artists · quiz ========= */

  /* ---- cover fallback -------------------------------------------------
     `error` events do not bubble, so listen in the capture phase.

     Cover Art Archive redirects to archive.org, which 500s a meaningful
     share of individual requests even though the file is fine, so a
     failure is retried with backoff (3 attempts total) before anything
     is hidden. Each retry is a throwaway probe; a successful one
     re-assigns the same src, which now lands in the HTTP cache.

     Only after all attempts fail does the parent get .no-cover, which
     hides the <img> and reveals the coloured sleeve + album title that
     are already in the markup — so the layout never breaks.           */
  var COVER_MAX = 3;                 // original attempt + two retries
  var COVER_GAP = [1200, 3500];      // wait before each retry

  function coverGiveUp(img) {
    var host = img.closest(".sleeve, .rec__sleeve");
    if (host) host.classList.add("no-cover");
  }

  function coverRetry(img) {
    var tries = Number(img.getAttribute("data-tries") || 1);
    if (tries >= COVER_MAX) { coverGiveUp(img); return; }
    img.setAttribute("data-tries", String(tries + 1));

    var url = img.getAttribute("src");
    window.setTimeout(function () {
      var probe = new Image();
      probe.onload = function () { img.src = url; };        // cached now
      probe.onerror = function () { coverRetry(img); };     // keep backing off
      probe.src = url;
    }, COVER_GAP[tries - 1] || 3500);
  }

  document.addEventListener("error", function (e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG" || !img.classList.contains("cover")) return;
    coverRetry(img);
  }, true);

  /* ---- running totals for Sections A and B --------------------------- */
  function wireCounter(name, outId) {
    var out = document.getElementById(outId);
    if (!out) return;
    var num = out.querySelector(".counter__num");
    var boxes = Array.prototype.slice.call(
      document.querySelectorAll('input[name="' + name + '"]'));
    function sync() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      if (num) num.textContent = String(n);
    }
    boxes.forEach(function (b) { b.addEventListener("change", sync); });
    sync();
  }

  wireCounter("genre", "genreCount");
  wireCounter("artist", "artistCount");

  /* ---- checked / focused styling ------------------------------------
     :has() in the stylesheet covers no-JS use; these classes guarantee
     the same look even where :has() isn't honoured in the cascade.     */
  function syncCheckedStyles() {
    var labels = document.querySelectorAll(".chip, .artist, .answer");
    Array.prototype.forEach.call(labels, function (label) {
      var input = label.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) label.classList.toggle("is-on", input.checked);
    });
  }

  document.addEventListener("change", function () { syncCheckedStyles(); updateQuiz(); }, true);

  // the inputs are visually hidden, so mirror :focus-visible onto the label
  document.addEventListener("focusin", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches(".chip input, .artist input, .answer input")) {
      var l = t.closest(".chip, .artist, .answer");
      if (l) l.classList.add("is-focus");
    }
  });
  document.addEventListener("focusout", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches(".chip input, .artist input, .answer input")) {
      var l = t.closest(".chip, .artist, .answer");
      if (l) l.classList.remove("is-focus");
    }
  });
  syncCheckedStyles();

  /* ---- Section C: three single-choice questions -> one genre ---------- */
  /* Each answer contributes weight toward the eight genres used in A.    */
  var GENRE_ORDER = ["Pop", "Rock", "Jazz", "Hip-Hop", "R&B",
                     "Electronic", "Classical", "Indie"];

  var WEIGHTS = {
    mood: {
      "Chill":      { "Jazz": 2, "R&B": 2, "Indie": 1 },
      "Energetic":  { "Rock": 2, "Electronic": 2, "Pop": 1 },
      "Nostalgic":  { "Rock": 2, "Jazz": 1, "Classical": 1 }
    },
    setting: {
      "Late night drive": { "R&B": 2, "Electronic": 2, "Hip-Hop": 1 },
      "Coffee shop":      { "Indie": 3, "Jazz": 1, "Pop": 1 },
      "Party":            { "Pop": 2, "Electronic": 2, "Hip-Hop": 1 }
    },
    era: {
      "70s":   { "Rock": 2, "Jazz": 2, "Classical": 1 },
      "90s":   { "Rock": 2, "Hip-Hop": 2, "Indie": 1 },
      "Today": { "Pop": 2, "R&B": 2, "Hip-Hop": 1 }
    }
  };

  var NOTES = {
    "Pop":        "Bright hooks and big choruses — you want it stuck in your head.",
    "Rock":       "Guitars up front. Loud rooms and live drums are your thing.",
    "Jazz":       "Loose time, warm tone, and plenty of room to wander.",
    "Hip-Hop":    "Rhythm first — you listen for the pocket and the pen.",
    "R&B":        "Silk vocals and late-night production.",
    "Electronic": "Machines with a pulse. You like a long, steady build.",
    "Classical":  "Long forms and quiet dynamics. Headphones recommended.",
    "Indie":      "Small rooms, strange chords, and a little tape hiss."
  };

  var quizBox  = document.getElementById("quizBox");
  var resultEl = document.getElementById("quizResult");

  function updateQuiz() {
    if (!quizBox || !resultEl) return;

    var answers = {}, names = ["mood", "setting", "era"];
    names.forEach(function (n) {
      var picked = quizBox.querySelector('input[name="' + n + '"]:checked');
      answers[n] = picked ? picked.value : null;
    });

    // result stays hidden until all three are answered
    var answered = names.filter(function (n) { return answers[n]; });
    if (answered.length < names.length) { resultEl.hidden = true; return; }

    var scores = {};
    GENRE_ORDER.forEach(function (g) { scores[g] = 0; });
    answered.forEach(function (n) {
      var w = (WEIGHTS[n] || {})[answers[n]] || {};
      Object.keys(w).forEach(function (g) { scores[g] += w[g]; });
    });

    var best = GENRE_ORDER[0];
    GENRE_ORDER.forEach(function (g) { if (scores[g] > scores[best]) best = g; });

    document.getElementById("resultGenre").textContent = best;

    var note = NOTES[best] || "";
    var ticked = Array.prototype.slice.call(
      document.querySelectorAll('input[name="genre"]:checked'))
      .map(function (b) { return b.value; });
    if (ticked.indexOf(best) !== -1) {
      note += " You ticked " + best + " in your taste list — the quiz agrees.";
    }
    document.getElementById("resultNote").textContent = note;
    resultEl.hidden = false;
  }

  /* change is handled by the document listener above, which calls
     updateQuiz() — no separate listener needed here. */

  /* ---------------- optional ambient sound: gears ------------------ */
  /* Fully procedural — no audio files. A soft gear-train whir under    */
  /* two meshing wheels whose teeth click past a pawl, with a slow      */
  /* per-revolution load wobble so it reads as turning, not clicking.   */

  var ctx = null, src = null, gainNode = null, gearOn = false;

  function makeBuffer(context) {
    var seconds = 4;
    var sr = context.sampleRate;
    var len = Math.floor(sr * seconds);
    var buf = context.createBuffer(1, len, sr);
    var data = buf.getChannelData(0);
    var i, k;

    /* --- gear-train whir: brown-ish noise = the body of the mechanism --- */
    var rumble = 0;
    for (i = 0; i < len; i++) {
      rumble = rumble * 0.985 + (Math.random() * 2 - 1) * 0.05;
      data[i] = rumble * 0.30;
    }

    /* --- one wheel's teeth engaging ---------------------------------- */
    function addTeeth(count, ringHz, amp, decay) {
      var spacing = len / count;                 // samples between teeth
      var dur = Math.max(4, Math.floor(sr * decay));
      /* never let a click cross the loop seam — it would clip audibly */
      if (dur > spacing * 0.7) dur = Math.max(4, Math.floor(spacing * 0.7));

      for (k = 0; k < count; k++) {
        /* even spacing keeps the 4s loop seamless at any sample rate */
        var s = Math.round(k * len / count);
        if (s >= len) break;

        /* slow wobble: load changes once per revolution */
        var phase = (s / len) * Math.PI * 2;
        var rev = 0.78 + 0.22 * Math.sin(phase * 5);
        var a = amp * rev * (0.8 + Math.random() * 0.4);   // tooth-to-tooth variance
        var f = ringHz * (0.94 + Math.random() * 0.12);    // each tooth rings slightly off

        for (var j = 0; j < dur && s + j < len; j++) {
          var t = j / sr;
          var env = Math.exp(-t / decay);
          var ring = Math.sin(6.283185 * f * t) * 0.6 +
                     Math.sin(6.283185 * f * 1.71 * t) * 0.4;  // inharmonic = metal
          var click = (Math.random() * 2 - 1) * 0.5;
          data[s + j] += a * env * (ring * 0.7 + click * 0.3);
        }
      }
    }

    addTeeth(40, 1750, 0.50, 0.035);   // main wheel — 10 teeth per second
    addTeeth(100, 3100, 0.16, 0.018);  // pinion   — 25 teeth, lighter & higher

    return buf;
  }

  function startGear() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();

    src = ctx.createBufferSource();
    src.buffer = makeBuffer(ctx);
    src.loop = true;

    var hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 180;

    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;      // keep the teeth bright, tame the whir

    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.7);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(ctx.destination);
    src.start();
    return true;
  }

  function stopGear() {
    if (!ctx || !gainNode) return;
    var now = ctx.currentTime;
    var old = src;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.4);

    window.setTimeout(function () {
      try { if (old) old.stop(); } catch (err) { /* already stopped */ }
    }, 500);

    src = null;
  }

  soundBtn.addEventListener("click", function () {
    gearOn = !gearOn;

    if (gearOn && !startGear()) {
      gearOn = false;
      soundBtn.disabled = true;
      soundBtn.querySelector(".sound__label").textContent = "Audio unavailable";
      return;
    }
    if (!gearOn) stopGear();

    soundBtn.setAttribute("aria-pressed", gearOn ? "true" : "false");
    soundBtn.querySelector(".sound__label").textContent =
      gearOn ? "Gears on" : "Gears off";
  });

  window.addEventListener("pagehide", function () {
    if (gearOn) stopGear();
    if (ctx && ctx.close) { try { ctx.close(); } catch (e) {} }
  });
})();
