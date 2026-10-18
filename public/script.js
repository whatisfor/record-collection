/* -----------------------------------------------------------------
   The Wall — interaction layer (no frameworks)
   • click / Enter / Space  -> expand album + show tracklist
   • arrows, dots, ← → keys -> cycle the stack
   • Esc                    -> close the detail panel
   • Crackle toggle         -> optional vinyl noise (Web Audio API)
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

  /* ------------------- optional vinyl crackle -------------------- */
  /* Generated noise: constant surface hiss + sparse decaying pops.  */

  var ctx = null, src = null, gainNode = null, crackleOn = false;

  function makeBuffer(context) {
    var seconds = 4;
    var len = Math.floor(context.sampleRate * seconds);
    var buf = context.createBuffer(1, len, context.sampleRate);
    var data = buf.getChannelData(0);
    var pop = 0;

    for (var i = 0; i < len; i++) {
      var v = (Math.random() * 2 - 1) * 0.012;      // surface noise
      if (pop === 0 && Math.random() < 0.0004) {     // occasional crackle pop
        pop = (Math.random() * 2 - 1) * 0.85;
      }
      if (pop !== 0) {
        v += pop;
        pop *= 0.994;
        if (Math.abs(pop) < 0.01) pop = 0;
      }
      data[i] = v;
    }
    return buf;
  }

  function startCrackle() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;

    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();

    src = ctx.createBufferSource();
    src.buffer = makeBuffer(ctx);
    src.loop = true;

    var hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 260;

    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4200;

    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.7);

    src.connect(hp);
    hp.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(ctx.destination);
    src.start();
    return true;
  }

  function stopCrackle() {
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
    crackleOn = !crackleOn;

    if (crackleOn && !startCrackle()) {
      crackleOn = false;
      soundBtn.disabled = true;
      soundBtn.querySelector(".sound__label").textContent = "Audio unavailable";
      return;
    }
    if (!crackleOn) stopCrackle();

    soundBtn.setAttribute("aria-pressed", crackleOn ? "true" : "false");
    soundBtn.querySelector(".sound__label").textContent =
      crackleOn ? "Crackle on" : "Crackle off";
  });

  window.addEventListener("pagehide", function () {
    if (crackleOn) stopCrackle();
    if (ctx && ctx.close) { try { ctx.close(); } catch (e) {} }
  });
})();
