-- OPENBRAIN-111: the first two Attention widgets built with the widget kit.
--
-- attn-helmholtz replaces the "coming soon" marker after the Helmholtz
-- paragraph in "The story of attention". The Figma review file draws it as a
-- full-bleed band in the reading flow (instruction panel + Ready), so the
-- block becomes kind "inline" instead of a card that opens a modal.
--
-- attn-biased-competition is the redesign of Figure 5 (Figma Wid. 06). It is
-- published to the widget library only: the chapter keeps the author's
-- biased-competition widget until Anton and Arjun choose between them.
--
-- The HTML is the file the kit produced, verbatim.

insert into public.widget_uploads (slug, title, description, author, ramp, html, status)
values
  ('attn-helmholtz', $t$Helmholtz's black room$t$,
   $t$Covert attention: keep your eyes on the + and report a letter that flashed off to one side, first without and then with a cue.$t$,
   $t$Design: Malpeso Studio$t$, 'lear', $w$<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Helmholtz's black room</title>
    <!--
  The Open Brain, chapter 3 "Attention and Working Memory", Wid. 01
  "Helmholtz Attention (Black Room)". Figma R7AjPuac7z7OZ7xcd2t7OR, section
  21:1242, states attn/helmoltz step=01 ... 08c (21:2330-21:2343).

  Covert attention: with the eyes held on a fixation cross, the reader tries
  to report the letter at one place in a ring of eight that flashes for
  about 100 ms (too brief for an eye movement). Trial 1 has no cue, and the
  place is asked about only after the flash. Trial 2 marks the place with a
  cue before the flash, as Helmholtz chose his place before each spark.

  Timings and trial rules are in the constants at the top of the script.
  Every one marked DEFAULT is to confirm with the designers/authors.
  The ~200 ms saccade latency in the caption is not in the chapter text:
  authors to confirm the figure and the source.
-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <style>
      /* The book sets these; the fallbacks make the file work on its own.
         Attention is the Learning, Cognition & Memory ramp. */
      :root {
        --accent: var(--ob-accent, #ff3351);
        /* text on an accent fill: dark on this red */
        --on-accent: var(--ob-on-accent, #1c1c1c);
        --plate: var(--ob-plate, #1c1c1c);
        --plate-2: var(--ob-plate-2, #2a2a2a);
        --on: var(--ob-on-plate, #ffffff);
        --mute: var(--ob-on-plate-mute, rgba(255, 255, 255, 0.62));
        --line: var(--ob-line-plate, rgba(255, 255, 255, 0.18));
        --sans: var(--ob-font-sans, "IBM Plex Sans", system-ui, sans-serif);
        --mono: var(--ob-font-mono, "IBM Plex Mono", ui-monospace, monospace);
        --radius: var(--ob-radius, 0);
        /* The one lit area of the "black room": a mid grey mixed from the
           plate and its ink, so it follows the book's tokens. */
        --room: color-mix(in srgb, var(--on) 22%, var(--plate));
        --disc: min(100%, 360px);
      }
      @media (min-width: 720px) {
        :root {
          --disc: clamp(300px, 40vw, 600px);
        }
      }
      * {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        background: var(--plate);
        color: var(--on);
        font-family: var(--sans);
      }
      .w {
        max-width: 1440px;
        margin: 0 auto;
        padding: 20px;
        display: grid;
        gap: 16px;
      }
      @media (min-width: 900px) {
        .w {
          padding: 32px 40px;
          gap: 20px;
        }
      }

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
      }
      .hint {
        margin: 4px 0 0;
        font-size: 15px;
        line-height: 1.5;
        color: var(--mute);
      }

      button {
        font: inherit;
        color: inherit;
        border-radius: var(--radius);
        cursor: pointer;
      }
      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
      }
      /* Kit buttons: mono uppercase, square, 1 px border; primary is white */
      .btn {
        min-height: 44px;
        padding: 10px 18px;
        border: 1px solid var(--on);
        background: transparent;
        color: var(--on);
        font: 500 12px/1.2 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .btn.primary {
        background: var(--on);
        color: var(--plate);
      }
      .btn.primary:hover {
        background: color-mix(in srgb, var(--on) 86%, var(--plate));
      }
      .btn:not(.primary):hover {
        background: var(--plate-2);
      }

      /* ---- Stage: the dark room ------------------------------------ */
      .stage {
        position: relative;
        display: grid;
        gap: 16px;
      }
      .stage:focus {
        outline: none;
      }
      .room {
        display: grid;
        place-items: center;
        border: 1px solid var(--line);
        padding: 16px 0;
      }
      @media (min-width: 720px) {
        .room {
          padding: 40px 0;
        }
      }
      /* the disc and the response screen share one cell, so swapping
         between them never moves the page */
      .room > * {
        grid-area: 1 / 1;
      }
      #disc {
        display: block;
        width: var(--disc);
        height: auto;
        transition: opacity 200ms ease-out;
      }
      .room[data-phase="respond"] #disc,
      .room[data-phase="feedback"] #disc {
        opacity: 0;
        visibility: hidden;
      }
      .cross {
        stroke: var(--plate);
        stroke-width: 3;
      }
      .ltr {
        font: 400 46px var(--sans);
        fill: var(--on);
        visibility: hidden;
      }
      #letters[data-on] .ltr {
        visibility: visible;
      }
      .cue {
        fill: var(--plate);
        stroke: var(--accent);
        stroke-width: 2;
        stroke-dasharray: 5 4;
        visibility: hidden;
      }
      .cue[data-on] {
        visibility: visible;
      }

      /* ---- Response: three letter tiles, prompt, feedback ------------- */
      .resp {
        display: none;
        justify-items: center;
        align-content: center;
        gap: 14px;
        padding: 0 16px;
        text-align: center;
      }
      .room[data-phase="respond"] .resp,
      .room[data-phase="feedback"] .resp {
        display: grid;
        animation: rise 200ms ease-out;
      }
      @keyframes rise {
        from {
          opacity: 0;
        }
      }
      .tiles {
        display: flex;
        gap: 10px;
      }
      .tile {
        position: relative;
        width: 56px;
        height: 56px;
        padding: 0;
        border: 0;
        background: var(--on);
        color: var(--plate);
        font: 500 26px/1 var(--mono);
        transition:
          background 150ms ease-out,
          color 150ms ease-out,
          opacity 150ms ease-out;
      }
      @media (min-width: 900px) {
        .tile {
          width: 64px;
          height: 64px;
          font-size: 30px;
        }
      }
      .tile:hover:not([disabled]) {
        background: color-mix(in srgb, var(--on) 84%, var(--plate));
      }
      .tile[disabled] {
        cursor: default;
      }
      .tile .mark {
        position: absolute;
        right: 3px;
        top: 2px;
        font: 600 13px/1 var(--mono);
      }
      /* chosen and right: the accent, with a tick */
      .tile.is-correct {
        background: var(--accent);
        color: var(--on-accent);
      }
      /* chosen and wrong: neutral, struck through, with a cross */
      .tile.is-wrong {
        background: var(--plate-2);
        color: var(--on);
        box-shadow: inset 0 0 0 1px var(--mute);
      }
      .tile.is-wrong .l {
        text-decoration: line-through;
        text-decoration-thickness: 2px;
      }
      /* not chosen but right: shown with an accent frame and a tick */
      .tile.is-answer {
        box-shadow: inset 0 0 0 3px var(--accent);
      }
      .tile.is-other {
        opacity: 0.4;
      }
      .prompt,
      .fb {
        margin: 0;
        font: 13px/1.5 var(--mono);
        color: var(--on);
        max-width: 26em;
      }
      .fb strong {
        font-weight: 600;
      }
      .fb .next {
        display: block;
        margin-top: 6px;
        color: var(--mute);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
      }
      .actions:empty {
        display: none;
      }

      /* ---- Instruction panel ------------------------------------------ */
      .panel {
        display: none;
        background: var(--plate-2);
        border: 1px solid var(--line);
        padding: 20px;
      }
      .panel[data-open] {
        display: grid;
        gap: 12px;
        align-content: start;
        animation: rise 200ms ease-out;
      }
      .panel-head {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 12px;
      }
      .panel h2 {
        margin: 0;
        padding-top: 10px;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.3;
      }
      .panel .eyebrow {
        display: block;
        margin-bottom: 4px;
        font: 500 12px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .panel p {
        margin: 0;
        font-size: 15px;
        line-height: 1.5;
      }
      .close {
        flex: none;
        width: 44px;
        height: 44px;
        margin: -8px -10px 0 0;
        border: 0;
        background: transparent;
        display: grid;
        place-items: center;
      }
      .close:hover {
        background: var(--plate);
      }
      .panel .actions {
        justify-content: end;
        margin-top: 8px;
      }
      /* On tablets and desktops the panel covers the left half of the room,
         as in the frames; on phones it stacks above the disc. */
      @media (min-width: 720px) {
        .panel {
          position: absolute;
          inset: 0 50% 0 0;
          z-index: 1;
          padding: 32px;
          background: color-mix(in srgb, var(--plate-2) 90%, transparent);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
      }
      @media (min-width: 1100px) {
        .panel {
          padding: 40px;
        }
        .panel p {
          font-size: 16px;
          max-width: 34em;
        }
      }

      /* ---- Readouts and caption --------------------------------------- */
      .reads {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin: 0;
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
      }
      .reads div {
        padding: 10px 0;
        min-width: 0;
      }
      .reads div + div {
        border-left: 1px solid var(--line);
        padding-left: 12px;
      }
      .reads dt {
        font: 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .reads dd {
        margin: 4px 0 0;
        font: 500 16px/1.2 var(--mono);
        font-variant-numeric: tabular-nums;
      }
      @media (min-width: 720px) {
        .reads dd {
          font-size: 18px;
        }
      }
      .cap {
        margin: 0;
        font: 12px/1.5 var(--mono);
        color: var(--mute);
        max-width: 90ch;
      }
      .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }

      /* Reduced motion: no fades. The flash timings stay: they are the
         experiment, not decoration. */
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
        }
      }
      html[data-ob-reduce-motion] * {
        transition: none !important;
        animation: none !important;
      }
    </style>
  </head>
  <body>
    <main class="w">
      <header>
        <h1>Helmholtz's black room</h1>
        <p class="hint">
          Keep your eyes on the + and report a letter that flashes off to one
          side.
        </p>
      </header>

      <section class="stage" id="stage" tabindex="-1" aria-label="Task">
        <div class="panel" id="panel" role="region" aria-labelledby="p-title">
          <div class="panel-head">
            <h2 id="p-title">
              <span class="eyebrow" id="p-eyebrow">Trial 1 of 2 · No cue</span>
              <span id="p-heading">Attention without the eyes</span>
            </h2>
            <button
              type="button"
              class="close"
              id="p-close"
              aria-label="Close the instructions and start"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M3 3l12 12M15 3L3 15"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
              </svg>
            </button>
          </div>
          <div id="p-body"></div>
          <div class="actions">
            <button type="button" class="btn primary" id="p-ready">
              Ready
            </button>
          </div>
        </div>

        <div class="room" id="room" data-phase="panel">
          <svg
            id="disc"
            viewBox="0 0 400 400"
            role="img"
            aria-label="A grey circle, the only lit area of a dark room, with a fixation cross at its center"
          >
            <circle cx="200" cy="200" r="200" fill="var(--room)" />
            <circle id="cue" class="cue" cx="0" cy="0" r="38" />
            <g id="letters"></g>
            <path class="cross" d="M186 200h28M200 186v28" />
          </svg>

          <div class="resp" id="resp">
            <div
              class="tiles"
              id="tiles"
              role="group"
              aria-labelledby="prompt"
            ></div>
            <p class="prompt" id="prompt"></p>
            <p class="fb" id="fb" hidden></p>
            <div class="actions" id="actions"></div>
          </div>
        </div>
      </section>

      <dl class="reads">
        <div>
          <dt>Trial</dt>
          <dd id="r-trial">1 of 2</dd>
        </div>
        <div>
          <dt>No cue</dt>
          <dd id="r-1">–</dd>
        </div>
        <div>
          <dt>With a cue</dt>
          <dd id="r-2">–</dd>
        </div>
      </dl>

      <p class="cap" id="cap"></p>
      <p class="sr" id="live" aria-live="polite"></p>
    </main>

    <script>
      // The book injects window.OB before this runs; this fallback keeps the
      // file working on its own (in Claude, or opened in a browser).
      window.OB = window.OB || {
        reducedMotion:
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.hasAttribute("data-ob-reduce-motion"),
        onTheme(fn) {
          fn({ accent: null, reduceMotion: this.reducedMotion, ramp: null });
        },
        resize() {},
      };

      // ---- Timing and trial rules -------------------------------------
      // With reduced motion these stay the same: they are the experiment.
      // DEFAULT — to confirm with the designers/authors: fixation period
      // after Ready, before anything appears.
      const FIXATION_MS = 1000;
      // DEFAULT — to confirm with the designers/authors: how long the
      // letters are lit. Shorter than an eye movement takes to start
      // (~200 ms), as in Helmholtz's spark.
      const FLASH_MS = 100;
      // DEFAULT — to confirm with the designers/authors: the cue appears
      // this long before the letters (cue onset to flash onset). Kept at or
      // under the ~200 ms it takes to start an eye movement.
      const CUE_LEAD_MS = 200;
      // DEFAULT — to confirm with the designers/authors: the frames (step 07)
      // keep the cue ring drawn around its letter during the flash. Set to
      // false to show the cue for CUE_MS only, then a blank until the flash.
      const CUE_DURING_FLASH = true;
      const CUE_MS = 100; // used only when CUE_DURING_FLASH is false
      // DEFAULT — to confirm with the designers/authors: an empty disc after
      // the flash, before the tiles replace it.
      const BLANK_MS = 400;
      // DEFAULT — to confirm with the designers/authors: the place asked
      // about (and, in trial 2, cued) is drawn at random each time. The
      // frames always use the upper right.
      const RANDOM_PLACE = true;
      // DEFAULT — to confirm with the designers/authors: both wrong choices
      // are letters that flashed elsewhere in the ring, so knowing which
      // letters appeared is not enough; you must know where.
      const DISTRACTORS_FROM_RING = true;
      // DEFAULT — to confirm with the designers/authors: every run (and
      // "Try again") draws a new random set of letters.
      // Letters that are easy to confuse at a glance (I, O, Q) are left out.
      const POOL = "ABCDEFGHJKLMNPRSTUVWXYZ";

      // Eight places on a ring, clockwise from 12 o'clock (as in the frames)
      const PLACES = [
        "top",
        "upper right",
        "right",
        "lower right",
        "bottom",
        "lower left",
        "left",
        "upper left",
      ];
      const RING_R = 150; // in the 400-unit disc; letters at 0.375 of its width

      const $ = (id) => document.getElementById(id);
      const room = $("room");
      const live = $("live");
      const PANEL = {
        1: {
          eyebrow: "Trial 1 of 2 · No cue",
          heading: "Attention without the eyes",
          body: [
            "This task demonstrates covert attention: how you can shift your focus to a location in your visual field without moving your eyes.",
            "To test it out, sit at arm's length from your screen and keep your eyes fixed on the + at the center of the circle throughout. " +
              `Eight letters will flash for ${FLASH_MS} ms.`,
          ],
        },
        2: {
          eyebrow: "Trial 2 of 2 · With a cue",
          heading: "This time, try with a cue",
          body: [
            "A ring will briefly mark one place in the circle. Silently shift your attention there, while keeping your eyes fixed on the + at the center.",
          ],
        },
      };

      const st = {
        trial: 1,
        results: { 1: null, 2: null },
        tries2: 0,
        letters: [],
        place: 1,
        choices: [],
        run: 0, // increments to cancel a running sequence
      };

      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      function shuffle(a) {
        a = a.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
      const xy = (i) => {
        const a = (i * Math.PI) / 4;
        return [200 + RING_R * Math.sin(a), 200 - RING_R * Math.cos(a)];
      };

      function say(msg) {
        live.textContent = "";
        setTimeout(() => (live.textContent = msg), 30);
      }
      function setPhase(p) {
        room.dataset.phase = p;
        OB.resize();
      }

      // A new ring of 8 different letters, a place, and 3 choices
      function newSet() {
        const ring = shuffle(POOL.split("")).slice(0, 8);
        st.letters = ring;
        st.place = RANDOM_PLACE ? Math.floor(Math.random() * 8) : 1;
        const target = ring[st.place];
        const others = DISTRACTORS_FROM_RING
          ? ring.filter((l) => l !== target)
          : POOL.split("").filter((l) => !ring.includes(l));
        st.choices = shuffle([target, ...shuffle(others).slice(0, 2)]);
        $("letters").innerHTML = ring
          .map((l, i) => {
            const [x, y] = xy(i);
            return `<text class="ltr" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central">${l}</text>`;
          })
          .join("");
        const [cx, cy] = xy(st.place);
        $("cue").setAttribute("cx", cx.toFixed(1));
        $("cue").setAttribute("cy", cy.toFixed(1));
      }

      function readouts() {
        const fmt = (r) => (r === null ? "–" : r ? "✓ Correct" : "✗ Wrong");
        $("r-trial").textContent = `${st.trial} of 2`;
        $("r-1").textContent = fmt(st.results[1]);
        $("r-2").textContent = fmt(st.results[2]);
      }

      // ---- Step 01 / 05: the instruction panel ------------------------
      function showPanel(trial) {
        st.run++;
        st.trial = trial;
        const p = PANEL[trial];
        $("p-eyebrow").textContent = p.eyebrow;
        $("p-heading").textContent = p.heading;
        $("p-body").innerHTML = p.body
          .map((t) => `<p>${t}</p>`)
          .join('<div style="height:10px"></div>');
        $("panel").setAttribute("data-open", "");
        $("letters").removeAttribute("data-on");
        $("cue").removeAttribute("data-on");
        readouts();
        setPhase("panel");
      }

      function start() {
        $("panel").removeAttribute("data-open");
        // keep focus inside the widget without drawing a ring on the stage
        $("stage").focus({ preventScroll: true });
        runTrial();
      }

      // ---- Steps 02-03 / 06-07: fixation, cue, flash ------------------
      async function runTrial() {
        const id = ++st.run;
        const alive = () => id === st.run;
        newSet();
        readouts();
        const cued = st.trial === 2;
        if (cued) st.tries2++;
        setPhase("fixation");
        say(
          cued
            ? "Keep your eyes on the plus sign. A ring will mark one place, then letters flash."
            : "Keep your eyes on the plus sign. Letters will flash."
        );
        await wait(FIXATION_MS);
        if (!alive()) return;
        if (cued) {
          setPhase("cue");
          $("cue").setAttribute("data-on", "");
          if (CUE_DURING_FLASH) {
            await wait(CUE_LEAD_MS);
          } else {
            await wait(Math.min(CUE_MS, CUE_LEAD_MS));
            $("cue").removeAttribute("data-on");
            await wait(Math.max(0, CUE_LEAD_MS - CUE_MS));
          }
          if (!alive()) return;
        }
        setPhase("flash");
        $("letters").setAttribute("data-on", "");
        $("disc").setAttribute(
          "aria-label",
          "Eight letters flash in a ring around the fixation cross"
        );
        await wait(FLASH_MS);
        $("letters").removeAttribute("data-on");
        $("cue").removeAttribute("data-on");
        $("disc").setAttribute(
          "aria-label",
          "A grey circle, the only lit area of a dark room, with a fixation cross at its center"
        );
        if (!alive()) return;
        setPhase("blank");
        await wait(BLANK_MS);
        if (!alive()) return;
        ask();
      }

      // ---- Step 04 / 08: which letter was there? ----------------------
      function ask() {
        const where = PLACES[st.place];
        $("prompt").textContent = `Which letter was in the ${where} area?`;
        $("prompt").hidden = false;
        $("fb").hidden = true;
        $("actions").innerHTML = "";
        $("tiles").innerHTML = st.choices
          .map(
            (l, i) =>
              `<button type="button" class="tile" data-l="${l}" tabindex="${i === 0 ? 0 : -1}" aria-label="${l}"><span class="l">${l}</span><span class="mark" aria-hidden="true"></span></button>`
          )
          .join("");
        setPhase("respond");
        $("tiles").querySelector(".tile").focus({ preventScroll: true });
        say(
          `Which letter was in the ${where} area? ${st.choices.join(", ")}. Use the arrow keys or type the letter.`
        );
      }

      // ---- Step 04a-c / 08a-c: feedback -------------------------------
      function choose(l) {
        if (room.dataset.phase !== "respond") return;
        const target = st.letters[st.place];
        const ok = l === target;
        const where = PLACES[st.place];
        st.results[st.trial] = ok;
        $("tiles")
          .querySelectorAll(".tile")
          .forEach((b) => {
            const me = b.dataset.l;
            b.disabled = true;
            b.tabIndex = -1;
            const mark = b.querySelector(".mark");
            if (me === l && ok) {
              b.classList.add("is-correct");
              mark.textContent = "✓";
              b.setAttribute("aria-label", `${me}, your choice, correct`);
            } else if (me === l) {
              b.classList.add("is-wrong");
              mark.textContent = "✗";
              b.setAttribute("aria-label", `${me}, your choice, wrong`);
            } else if (me === target) {
              b.classList.add("is-answer");
              mark.textContent = "✓";
              b.setAttribute("aria-label", `${me}, the right answer`);
            } else {
              b.classList.add("is-other");
            }
          });
        $("prompt").hidden = true;
        const fb = $("fb");
        fb.hidden = false;
        const acts = $("actions");
        acts.innerHTML = "";
        let msg = ok
          ? `<strong>✓ Correct.</strong> ${target} was in the ${where} area.`
          : `<strong>✗ Wrong.</strong> The ${where} letter was ${target}.`;
        let first;
        if (st.trial === 1) {
          first = button("Continue →", true, () => {
            showPanel(2);
            $("p-ready").focus({ preventScroll: true });
          });
        } else if (!ok) {
          first = button("Try again", true, () => {
            $("stage").focus({ preventScroll: true });
            runTrial();
          });
        } else {
          // Step 08c, plus a short end state (the frames stop here)
          msg +=
            `<span class="next">${st.tries2 > 1 ? `Got it on try ${st.tries2}. ` : ""}Continue with the lesson. With the cue, your attention moved to one place before the flash while your eyes stayed on the +, as Helmholtz chose his place before each spark.</span>`;
          first = button("Start again", false, () => {
            st.results = { 1: null, 2: null };
            st.tries2 = 0;
            showPanel(1);
            $("p-ready").focus({ preventScroll: true });
          });
        }
        fb.innerHTML = msg;
        acts.append(first);
        readouts();
        setPhase("feedback");
        first.focus({ preventScroll: true });
        say(fb.textContent);
      }

      function button(label, primary, fn) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = primary ? "btn primary" : "btn";
        b.textContent = label;
        b.addEventListener("click", fn);
        return b;
      }

      // ---- Input --------------------------------------------------------
      $("p-ready").addEventListener("click", start);
      // The frames' × closes the panel and starts, the same as Ready
      $("p-close").addEventListener("click", start);
      $("panel").addEventListener("keydown", (e) => {
        if (e.key === "Escape") start();
      });
      $("tiles").addEventListener("click", (e) => {
        const b = e.target.closest(".tile");
        if (b && !b.disabled) choose(b.dataset.l);
      });
      // Arrow keys move between tiles; typing a shown letter picks it
      document.addEventListener("keydown", (e) => {
        if (room.dataset.phase !== "respond") return;
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        const tiles = [...$("tiles").querySelectorAll(".tile")];
        const i = tiles.indexOf(document.activeElement);
        if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
          const n = tiles[(Math.max(i, 0) + d + tiles.length) % tiles.length];
          tiles.forEach((t) => (t.tabIndex = t === n ? 0 : -1));
          n.focus();
          return;
        }
        const k = e.key.length === 1 ? e.key.toUpperCase() : "";
        if (k && st.choices.includes(k)) {
          e.preventDefault();
          choose(k);
        }
      });
      // A trial that runs while the page is hidden is not a trial: restart it
      document.addEventListener("visibilitychange", () => {
        const p = room.dataset.phase;
        if (document.hidden && ["fixation", "cue", "flash", "blank"].includes(p))
          showPanel(st.trial);
      });

      $("cap").textContent =
        `After Helmholtz (1867): in a darkened room lit by a brief electric spark, he could read the letters where he had chosen to attend, not others equally close to his fixation point. Here the letters are lit for ${FLASH_MS} ms; an eye movement takes about 200 ms to start, so only attention can move. ` +
        `Timing is approximate (±1 screen frame). Best on a laptop or larger screen, where the letters sit farther from where you look. Illustrative demonstration, not a controlled experiment.`;

      OB.onTheme(() => OB.resize());
      showPanel(1);
    </script>
  </body>
</html>
$w$, 'published'),
  ('attn-biased-competition', $t$Attention biases competition between stimuli$t$,
   $t$Two stimuli in one V4 receptive field: the response follows the attended one (after Moran & Desimone, 1985).$t$,
   $t$After Arjun's widget; design: Malpeso Studio$t$, 'lear', $w$<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Attention biases competition between stimuli</title>
    <!--
  The Open Brain, chapter 3 "Attention and Working Memory", Figure 5.
  Figma "Wid. 06 | Attention Biased Competition" (R7AjPuac7z7OZ7xcd2t7OR,
  21:13486), rebuilt on the widget kit. Science from the author's original,
  src/widgets/source/biased_competition_widget.html (Arjun):

  - Stim 1 is the "good" stimulus (drives the V4 neuron strongly), stim 2
    the "poor" one (drives it weakly).
  - The author's raster shows 10 spikes for stim 1 alone and 4 for stim 2
    alone, in a fixed window with no time scale; with both stimuli in the
    receptive field the response equals the attended stimulus's response
    alone (10 when attending stim 1, 4 when attending stim 2).
  - ADDED, not in the author's widget: "Attend away" (attention outside the
    receptive field). The chapter says the pair response then "fell to a
    level between that evoked by either stimulus alone"; the midpoint (7) is
    our choice, illustrative, for the author to confirm.
  - Spike counts are schematic (no units in the author's widget), so the
    readouts are spikes per window, not spikes/s.
  - The banana and snake are the designers' stand-ins for the experiment's
    stimuli, which differed in color and orientation (chapter text).
-->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600&display=swap"
      rel="stylesheet"
    />
    <style>
      /* The book sets these; the fallbacks make the file work on its own.
         Attention and Working Memory = Learning, Cognition & Memory ramp. */
      :root {
        --accent: var(--ob-accent, #ff3351);
        --on-accent: var(--ob-on-accent, #1c1c1c);
        --attn: var(--ob-series-2, #fbeb00);
        --plate: var(--ob-plate, #1c1c1c);
        --plate-2: var(--ob-plate-2, #2a2a2a);
        --on: var(--ob-on-plate, #ffffff);
        --mute: var(--ob-on-plate-mute, rgba(255, 255, 255, 0.62));
        --line: var(--ob-line-plate, rgba(255, 255, 255, 0.18));
        --sans: var(--ob-font-sans, "IBM Plex Sans", system-ui, sans-serif);
        --mono: var(--ob-font-mono, "IBM Plex Mono", ui-monospace, monospace);
        --radius: var(--ob-radius, 0);
      }
      * {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        background: var(--plate);
        color: var(--on);
        font-family: var(--sans);
      }
      [hidden] {
        display: none !important;
      }
      .w {
        max-width: 1120px;
        margin: 0 auto;
        padding: 20px;
        display: grid;
        gap: 16px;
      }
      @media (min-width: 900px) {
        .w {
          padding: 32px 40px;
          gap: 20px;
        }
      }

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
      }
      .hint {
        margin: 4px 0 0;
        font-size: 15px;
        line-height: 1.5;
        color: var(--mute);
      }

      .controls {
        display: grid;
        gap: 10px;
      }
      .group-label {
        margin: 0 0 6px;
        font: 500 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      /* Tabs: equal cells, hairline dividers, the active one in the accent */
      .tabs {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        border: 1px solid var(--line);
      }
      .tabs button {
        min-height: 44px;
        padding: 8px 6px;
        border: 0;
        border-left: 1px solid var(--line);
        background: transparent;
        color: var(--on);
        cursor: pointer;
        border-radius: var(--radius);
        font: 500 12px/1.25 var(--mono);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        transition: background-color 0.18s ease-out, color 0.18s ease-out;
      }
      .tabs button:first-child {
        border-left: 0;
      }
      .tabs button:hover {
        background: var(--plate-2);
      }
      .tabs button[aria-pressed="true"] {
        background: var(--accent);
        color: var(--on-accent);
      }
      button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        position: relative;
        z-index: 1;
      }

      /* The two figures: stacked on phones, side by side from 760 px */
      .figs {
        display: grid;
        gap: 16px;
      }
      @media (min-width: 760px) {
        .figs {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          align-items: start;
        }
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .label {
        font: 12px var(--mono);
        fill: var(--mute);
      }
      .label-on {
        font: 500 12px var(--mono);
        fill: var(--on);
      }
      .badge {
        font: 500 12px var(--mono);
        fill: var(--plate);
      }

      /* Stimuli: white line drawings; the attended one in color, the
         unattended one faded. The pictures never move or change shape. */
      .stim {
        transition: opacity 0.22s ease-out;
      }
      .stim .o {
        stroke: var(--on);
        transition: stroke 0.22s ease-out, fill 0.22s ease-out;
      }
      .stim .f {
        fill: var(--plate-2);
        transition: fill 0.22s ease-out, stroke 0.22s ease-out;
      }
      .stim .fs {
        stroke: var(--plate-2);
        transition: stroke 0.22s ease-out;
      }
      .stim .oc {
        fill: var(--on);
        transition: fill 0.22s ease-out;
      }
      .stim.attended .o {
        stroke: var(--plate);
      }
      .stim.attended .f {
        fill: var(--attn);
      }
      .stim.attended .fs {
        stroke: var(--attn);
      }
      .stim.attended .oc {
        fill: var(--plate);
      }
      .stim.unattended {
        opacity: 0.32;
      }
      .ring {
        fill: none;
        stroke: var(--attn);
        stroke-width: 2;
        transition: opacity 0.22s ease-out;
      }

      .brain .cortex {
        fill: var(--plate);
        stroke: var(--on);
        stroke-width: 1.6;
        stroke-linejoin: round;
      }
      .brain .sulcus {
        fill: none;
        stroke: var(--on);
        stroke-width: 1.1;
        stroke-linecap: round;
        opacity: 0.75;
      }
      .spike {
        stroke: var(--on);
        stroke-width: 1.5;
      }

      .under {
        display: grid;
        gap: 12px;
      }
      @media (min-width: 760px) {
        .under {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 24px;
        }
      }
      .reads {
        margin: 0;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        border-top: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
      }
      .reads div {
        padding: 10px 0;
        min-width: 0;
      }
      .reads div + div {
        border-left: 1px solid var(--line);
        padding-left: 12px;
      }
      .reads dt {
        font: 11px/1.3 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mute);
      }
      .reads dd {
        margin: 4px 0 0;
        font: 500 20px/1.1 var(--mono);
        font-variant-numeric: tabular-nums;
      }
      .reads dd small {
        font: 11px var(--mono);
        color: var(--mute);
        letter-spacing: 0.04em;
      }
      .btn {
        min-height: 44px;
        min-width: 44px;
        padding: 8px 16px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: transparent;
        color: var(--on);
        cursor: pointer;
        font: 500 12px/1.2 var(--mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .btn:hover {
        border-color: var(--on);
      }

      .info {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        margin: 0;
        padding: 12px 14px;
        background: var(--plate-2);
        border: 1px solid var(--line);
        font: 13px/1.5 var(--mono);
      }
      .info svg {
        width: 20px;
        height: 20px;
        margin-top: 1px;
      }

      .cap {
        margin: 0;
        font: 12px/1.55 var(--mono);
        color: var(--mute);
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
        }
      }
      html[data-ob-reduce-motion] * {
        transition: none !important;
        animation: none !important;
      }
    </style>
  </head>
  <body>
    <main class="w">
      <header>
        <h1>Attention biases competition between stimuli</h1>
        <p class="hint">
          Two stimuli, one receptive field. Choose what is on the screen and
          where the monkey attends, and watch which stimulus the V4 neuron
          reports.
        </p>
      </header>

      <div class="controls">
        <div>
          <p class="group-label" id="stim-label">On the screen</p>
          <div class="tabs" id="stimTabs" role="group" aria-labelledby="stim-label">
            <button type="button" data-stim="s1" aria-pressed="false">
              Stim 1 alone
            </button>
            <button type="button" data-stim="s2" aria-pressed="false">
              Stim 2 alone
            </button>
            <button type="button" data-stim="both" aria-pressed="true">
              Both stimuli
            </button>
          </div>
        </div>
        <div id="attendRow">
          <p class="group-label" id="attend-label">Attention</p>
          <div class="tabs" id="attendTabs" role="group" aria-labelledby="attend-label">
            <button type="button" data-attend="a1" aria-pressed="true">
              Attend stim 1
            </button>
            <button type="button" data-attend="a2" aria-pressed="false">
              Attend stim 2
            </button>
            <button type="button" data-attend="away" aria-pressed="false">
              Attend away
            </button>
          </div>
        </div>
      </div>

      <div class="figs">
        <!-- The screen the monkey looks at -->
        <svg id="screen" viewBox="0 0 360 200" role="img" aria-label="">
          <rect x="4" y="4" width="352" height="190" fill="var(--plate-2)" stroke="var(--line)" />
          <text class="label" x="14" y="21">Screen</text>

          <!-- attention outside the receptive field -->
          <g id="awayMark">
            <circle class="ring" cx="44" cy="96" r="22" stroke-dasharray="5 4" />
            <text class="label-on" x="44" y="136" text-anchor="middle">attention</text>
          </g>

          <!-- fixation cross -->
          <g stroke="var(--on)" stroke-width="1.6">
            <line x1="97" y1="96" x2="111" y2="96" />
            <line x1="104" y1="89" x2="104" y2="103" />
          </g>
          <text class="label" x="104" y="120" text-anchor="middle">fixation</text>

          <!-- receptive field of the recorded V4 neuron -->
          <rect x="160" y="16" width="186" height="146" fill="var(--on)" fill-opacity=".04" stroke="var(--on)" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="4 3" />
          <text class="label" x="253" y="180" text-anchor="middle">Receptive field</text>

          <!-- Stim 1, the good stimulus: a bunch of bananas -->
          <g id="stim1" class="stim">
            <circle class="ring" id="ring1" cx="218" cy="72" r="44" />
            <g transform="translate(240 64) scale(.9)">
              <!-- a hand of three bananas on one stalk, back to front -->
              <g stroke-width="1.8" stroke-linejoin="round">
                <g transform="rotate(-30) scale(0.94)">
                  <path class="o f" d="M0 0 C-6 26 -40 34 -56 12 C-57.5 10 -56.5 7.5 -54 8 C-40 16 -14 10 -7 -3 Z" />
                  <path class="o" d="M-4 3 C-12 20 -36 25 -52 11" fill="none" stroke-width="1" />
                  <circle class="oc" cx="-55" cy="10" r="2.4" />
                </g>
                <g transform="rotate(0) scale(1)">
                  <path class="o f" d="M0 0 C-6 26 -40 34 -56 12 C-57.5 10 -56.5 7.5 -54 8 C-40 16 -14 10 -7 -3 Z" />
                  <path class="o" d="M-4 3 C-12 20 -36 25 -52 11" fill="none" stroke-width="1" />
                  <circle class="oc" cx="-55" cy="10" r="2.4" />
                </g>
                <g transform="rotate(30) scale(1.04)">
                  <path class="o f" d="M0 0 C-6 26 -40 34 -56 12 C-57.5 10 -56.5 7.5 -54 8 C-40 16 -14 10 -7 -3 Z" />
                  <path class="o" d="M-4 3 C-12 20 -36 25 -52 11" fill="none" stroke-width="1" />
                  <circle class="oc" cx="-55" cy="10" r="2.4" />
                </g>
              </g>
              <path class="o" d="M-3 2 C0 -8 6 -14 14 -17" fill="none" stroke-width="9" stroke-linecap="round" />
              <path class="fs" d="M-3 2 C0 -8 6 -14 14 -17" fill="none" stroke-width="6" stroke-linecap="round" />
            </g>
            <circle cx="184" cy="38" r="9" fill="var(--on)" />
            <text class="badge" x="184" y="42.2" text-anchor="middle">1</text>
          </g>

          <!-- Stim 2, the poor stimulus: a coiled snake -->
          <g id="stim2" class="stim">
            <circle class="ring" id="ring2" cx="301" cy="114" r="40" />
            <g transform="translate(292 114)">
              <!-- tail -->
              <path class="o" d="M-16 10 C-6 9 -2 14 -7 19 C-10 22 -14 22 -16 20" fill="none" stroke-width="6" stroke-linecap="round" />
              <path class="fs" d="M-16 10 C-6 9 -2 14 -7 19 C-10 22 -14 22 -16 20" fill="none" stroke-width="3" stroke-linecap="round" />
              <!-- body: an outlined tube, with a line of scales -->
              <path class="o" d="M18 -26 C4 -34 -18 -26 -14 -10 C-10 4 22 -2 23 16 C24 32 -2 36 -18 29 C-28 24 -28 12 -16 10" fill="none" stroke-width="11" stroke-linecap="round" />
              <path class="fs" d="M18 -26 C4 -34 -18 -26 -14 -10 C-10 4 22 -2 23 16 C24 32 -2 36 -18 29 C-28 24 -28 12 -16 10" fill="none" stroke-width="8" stroke-linecap="round" />
              <path class="o" d="M16 -27 C4 -33 -16 -26 -13 -11 C-9 3 21 -2 22 16 C23 31 -2 35 -17 28" fill="none" stroke-width="1" stroke-dasharray="1.5 3" />
              <!-- head, eye, forked tongue -->
              <path class="o f" d="M16 -30 C22 -35 32 -33 34 -28 C35 -24 28 -21 20 -21 C15 -21 13 -27 16 -30 Z" stroke-width="1.6" />
              <circle class="oc" cx="26" cy="-28.5" r="1.4" />
              <path d="M34 -27 L40 -27 M40 -27 L43 -30 M40 -27 L43 -24" fill="none" stroke="var(--on)" stroke-width="1.1" stroke-linecap="round" />
            </g>
            <circle cx="331" cy="146" r="9" fill="var(--on)" />
            <text class="badge" x="331" y="150.2" text-anchor="middle">2</text>
          </g>
        </svg>

        <!-- The recorded neuron and its spikes -->
        <svg id="neuron" viewBox="0 0 360 176" role="img" aria-label="">
          <text class="label" x="8" y="14">V4 neuron spikes</text>
          <text class="label" x="356" y="14" text-anchor="end">macaque brain, side view</text>
          <rect x="8" y="24" width="176" height="120" fill="var(--plate-2)" stroke="var(--line)" />
          <line x1="8" y1="84" x2="184" y2="84" stroke="var(--mute)" stroke-width="1" />
          <g id="spikes"></g>
          <line id="cursor" x1="18" y1="28" x2="18" y2="140" stroke="var(--accent)" stroke-width="1" opacity="0" />
          <text class="label" x="8" y="160">time →</text>
          <text class="label" x="184" y="160" text-anchor="end">one window</text>

          <!-- lateral view: occipital pole left, frontal pole right -->
          <g class="brain" transform="translate(196 24)">
            <!-- brainstem and cerebellum, behind the cortex -->
            <path class="cortex" d="M50 100 C55 112 57 122 55 132 L65 132 C67 120 67 108 63 96 Z" />
            <ellipse class="cortex" cx="36" cy="100" rx="24" ry="15" />
            <g class="sulcus" style="opacity: 0.5">
              <path d="M16 98 C26 94 44 94 58 99" />
              <path d="M17 104 C28 101 44 101 57 105" />
              <path d="M21 110 C30 108 42 108 52 111" />
            </g>
            <!-- cerebral cortex -->
            <path class="cortex" d="M10 62 C6 36 30 10 70 8 C108 6 146 20 156 46 C162 62 152 76 138 78 C126 80 118 80 112 84 C106 92 100 100 88 102 C70 106 50 100 38 92 C26 84 12 78 10 62 Z" />
            <path class="sulcus" d="M112 83 C100 72 86 64 68 60" />
            <path class="sulcus" d="M101 95 C88 86 70 78 52 74" />
            <path class="sulcus" d="M88 9 C84 24 92 36 86 52" />
            <path class="sulcus" d="M80 30 C64 32 50 38 42 46" />
            <path class="sulcus" d="M124 18 C112 30 112 46 122 60" />
            <path class="sulcus" d="M151 48 C144 46 136 44 129 40" />
            <path class="sulcus" d="M29 22 C21 38 23 56 31 72" />
          </g>
          <!-- signal from the V4 neuron to the raster -->
          <line x1="230" y1="84" x2="194" y2="84" stroke="var(--accent)" stroke-width="1.5" />
          <path d="M188 84 L196 80 L196 88 Z" fill="var(--accent)" />
          <circle cx="236" cy="84" r="5" fill="var(--accent)" stroke="var(--plate)" stroke-width="1.5" />
          <circle cx="258" cy="166" r="4" fill="var(--accent)" />
          <text class="label-on" x="266" y="170">V4 neuron</text>
        </svg>
      </div>

      <div class="under">
        <dl class="reads">
          <div>
            <dt>This condition</dt>
            <dd><span id="rNow">10</span> <small>spikes</small></dd>
          </div>
          <div>
            <dt>Stim 1 alone</dt>
            <dd><span id="rS1">10</span> <small>good</small></dd>
          </div>
          <div>
            <dt>Stim 2 alone</dt>
            <dd><span id="rS2">4</span> <small>poor</small></dd>
          </div>
        </dl>
        <button type="button" class="btn" id="play" aria-pressed="false">Pause spikes</button>
      </div>

      <p class="info" aria-live="polite">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--on)" stroke-width="1.2" />
          <line x1="10" y1="8.5" x2="10" y2="14.5" stroke="var(--on)" stroke-width="1.6" />
          <circle cx="10" cy="5.8" r="1.1" fill="var(--on)" />
        </svg>
        <span id="info"></span>
      </p>

      <p class="cap">
        A V4 neuron's receptive field holds a "good" stimulus (stim 1), which
        drives the cell strongly on its own, and a "poor" one (stim 2), which
        drives it weakly. The monkey keeps its eyes on the fixation cross; the
        yellow ring marks where it attends. With both stimuli present, the
        response resembles the response to the attended stimulus alone, as if
        the other had been filtered out; with attention outside the receptive
        field it falls between the two. The pictures stand in for stimuli that
        differed in color and orientation. Illustrative model, not recorded
        data: spike counts per window are schematic, with no time scale. After
        Moran &amp; Desimone, 1985.
      </p>
    </main>

    <script>
      // The book injects window.OB before this runs; this fallback keeps the
      // file working on its own (in Claude, or opened in a browser).
      window.OB = window.OB || {
        reducedMotion:
          matchMedia("(prefers-reduced-motion: reduce)").matches ||
          document.documentElement.hasAttribute("data-ob-reduce-motion"),
        onTheme(fn) {
          fn({ accent: null, reduceMotion: this.reducedMotion, ramp: null });
        },
        resize() {},
      };

      const $ = (id) => document.getElementById(id);

      // Spikes per window for each stimulus alone: the author's 10 and 4.
      const ALONE = { 1: 10, 2: 4 };
      // Weight given to stim 1 when both share the receptive field. Attending
      // a stimulus gives it all the weight (the author's model); attention
      // outside the receptive field splits it evenly (our addition, from the
      // chapter text: "a level between").
      const WEIGHT_S1 = { a1: 1, a2: 0, away: 0.5 };

      function response(stim, attend) {
        if (stim === "s1") return ALONE[1];
        if (stim === "s2") return ALONE[2];
        const w = WEIGHT_S1[attend];
        return Math.round(w * ALONE[1] + (1 - w) * ALONE[2]);
      }

      const INFO = {
        s1: "Stim 1, the good stimulus, alone in the receptive field: the neuron fires strongly.",
        s2: "Stim 2, the poor stimulus, alone in the receptive field: the neuron fires weakly.",
        a1: "Both stimuli, attention on stim 1: the response rises to resemble the response to stim 1 alone, as if stim 2 were filtered out.",
        a2: "Both stimuli, attention on stim 2: the response falls to resemble the response to stim 2 alone, as if stim 1 were filtered out.",
        away: "Both stimuli, attention outside the receptive field: the response falls between the responses to either stimulus alone.",
      };

      let stim = "both";
      let attend = "a1";
      let playing = true;

      // Raster geometry (viewBox units of #neuron)
      const X0 = 18,
        X1 = 174,
        Y_TOP = 34,
        Y_BOT = 134;
      const SWEEP = 1800, // ms to draw one window
        HOLD = 700; // ms the full window stays before the next sweep

      // Spike times in one window: evenly spread like the author's raster,
      // with a small fixed jitter so it reads as a spike train. The count is
      // exact; only the rate carries the result (same height every spike).
      function spikeXs(n) {
        const step = (X1 - X0) / (n - 1);
        return Array.from({ length: n }, (_, i) => {
          const j = i === 0 || i === n - 1 ? 0 : (Math.sin(i * 12.9898 + n * 78.233) * 0.5) * 0.36 * step;
          return +(X0 + i * step + j).toFixed(2);
        });
      }

      let xs = [];
      function drawSpikes(upToX) {
        const shown = xs.filter((x) => x <= upToX);
        $("spikes").innerHTML = shown
          .map((x) => `<line class="spike" x1="${x}" x2="${x}" y1="${Y_TOP}" y2="${Y_BOT}"/>`)
          .join("");
      }

      const reduced = () =>
        !!OB.reducedMotion ||
        document.documentElement.hasAttribute("data-ob-reduce-motion") ||
        matchMedia("(prefers-reduced-motion: reduce)").matches;

      let raf = 0,
        t0 = 0;
      function stopAnim() {
        cancelAnimationFrame(raf);
        raf = 0;
        $("cursor").setAttribute("opacity", "0");
      }
      function frame(now) {
        if (!t0) t0 = now;
        const e = (now - t0) % (SWEEP + HOLD);
        if (e < SWEEP) {
          const x = X0 - 2 + (e / SWEEP) * (X1 - X0 + 4);
          drawSpikes(x);
          $("cursor").setAttribute("x1", x);
          $("cursor").setAttribute("x2", x);
          $("cursor").setAttribute("opacity", "1");
        } else {
          drawSpikes(Infinity);
          $("cursor").setAttribute("opacity", "0");
        }
        raf = requestAnimationFrame(frame);
      }
      function startRaster() {
        stopAnim();
        const still = reduced() || !playing;
        $("play").hidden = reduced();
        if (still) {
          drawSpikes(Infinity);
          return;
        }
        t0 = 0;
        raf = requestAnimationFrame(frame);
      }

      function setPressed(groupId, key, value) {
        document
          .querySelectorAll(`#${groupId} button`)
          .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset[key] === value)));
      }

      function render() {
        const both = stim === "both";
        setPressed("stimTabs", "stim", stim);
        setPressed("attendTabs", "attend", attend);
        $("attendRow").hidden = !both;

        // stimuli on the screen
        $("stim1").style.display = stim === "s2" ? "none" : "";
        $("stim2").style.display = stim === "s1" ? "none" : "";
        const state = (n) =>
          !both || attend === "away" ? "" : attend === "a" + n ? "attended" : "unattended";
        $("stim1").setAttribute("class", "stim " + state(1));
        $("stim2").setAttribute("class", "stim " + state(2));
        $("ring1").style.opacity = both && attend === "a1" ? 1 : 0;
        $("ring2").style.opacity = both && attend === "a2" ? 1 : 0;
        $("awayMark").style.display = both && attend === "away" ? "" : "none";

        const n = response(stim, attend);
        xs = spikeXs(n);
        $("rNow").textContent = n;
        $("rS1").textContent = ALONE[1];
        $("rS2").textContent = ALONE[2];
        const key = both ? attend : stim;
        $("info").textContent = INFO[key];

        const where = !both
          ? ""
          : attend === "away"
            ? " Attention is outside the receptive field."
            : ` A yellow ring marks attention on stim ${attend === "a1" ? 1 : 2}.`;
        const on =
          stim === "s1"
            ? "Stim 1, a bunch of bananas, alone"
            : stim === "s2"
              ? "Stim 2, a coiled snake, alone"
              : "Stim 1, bananas, and stim 2, a snake, together";
        $("screen").setAttribute(
          "aria-label",
          `Screen with a fixation cross and, to its right, the neuron's receptive field. ${on} in the receptive field.${where}`
        );
        $("neuron").setAttribute(
          "aria-label",
          `A macaque brain in side view with a V4 neuron marked; its spike raster shows ${n} spikes in one window (stim 1 alone ${ALONE[1]}, stim 2 alone ${ALONE[2]}).`
        );
        startRaster();
        OB.resize();
      }

      $("stimTabs").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        stim = b.dataset.stim;
        render();
      });
      $("attendTabs").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        attend = b.dataset.attend;
        render();
      });
      $("play").addEventListener("click", () => {
        playing = !playing;
        $("play").textContent = playing ? "Pause spikes" : "Play spikes";
        $("play").setAttribute("aria-pressed", String(!playing));
        startRaster();
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopAnim();
        else startRaster();
      });
      matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", startRaster);

      OB.onTheme(() => startRaster());
      render();
    </script>
  </body>
</html>
$w$, 'published')
on conflict (slug) do update
  set title = excluded.title, description = excluded.description, author = excluded.author,
      ramp = excluded.ramp, html = excluded.html, status = excluded.status, updated_at = now();

update public.paragraphs p
   set content = jsonb_set(p.content, '{blocks,0}',
         (p.content -> 'blocks' -> 0)
         || jsonb_build_object(
              'kind', 'inline',
              'title', $t$Helmholtz's black room$t$,
              'credit', $t$Design: Malpeso Studio$t$))
  from public.sections s
  join public.modules m on m.id = s.module_id
 where p.section_id = s.id
   and m.slug = 'attention-and-working-memory'
   and p.content -> 'blocks' -> 0 ->> 'widgetId' = 'upload:attn-helmholtz';
