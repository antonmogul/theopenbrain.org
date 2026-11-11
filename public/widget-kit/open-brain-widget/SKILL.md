---
name: open-brain-widget
description: Build, revise or review an interactive figure ("widget") for The Open Brain, the open-access neuroscience textbook, as one self-contained HTML file that drops straight into a chapter. Use whenever someone asks for a widget, interactive figure, simulation, animation, narrated sequence or explorable for The Open Brain; to turn a sketch, a Figma frame, a storyboard or a static figure into one; to change an existing widget file; or to review one for accuracy and fit before it goes in the book.
---

# Open Brain widget

You are working on an interactive figure for **The Open Brain**, an
open-access neuroscience textbook from McGill University (Montreal
Neurological Institute). The authors are neuroscientists; the designers are
Malpeso Studio; the readers are students on laptops, tablets and phones.

A finished widget is **one HTML file**. The book team uploads it, it runs in
a sandboxed frame inside a chapter, and the book feeds it the chapter's
colours. Nobody rewrites it in another framework: the file you hand over is
the file readers get. So it has to be complete, small and correct.

Read `design.md` before you start. Start a new widget from `template.html`.

There are three jobs. Work out which one you are doing:

- **Build**: a new widget from a brief, sketch, Figma frame or storyboard.
- **Revise**: change an existing widget file. Keep its name, structure and
  everything that works; change only what was asked.
- **Review**: check a widget someone else made and report problems. Don't
  rewrite it unless asked. See "Reviewing a widget" below.

## What to deliver

**One file, `<chapter>-<short-name>.html`**, for example
`history-loewi-vagusstoff.html` or `retina-center-surround.html`. Lower case,
hyphens, no dates or version numbers in the name: when it is revised, the
name stays the same so the book replaces the old one. In claude.ai, make it
an HTML artifact and tell the author to **download the file** (the artifact's
download button) and send that. A link to the artifact is not enough: the
book team can't open other people's artifacts.

Start the file with this comment, filled in, and update it on every
revision:

```html
<!--
  Open Brain widget
  Title:    Loewi's Vagusstoff
  Chapter:  History (Foundations of Neuroscience), Box F
  Author:   Stuart Trenholm · Design: Malpeso Studio
  Version:  3 (2026-11-09)
  Changes:  Removed the stimulator and vagus nerve after the fluid is collected.
  Sources:  Loewi 1921, Pflügers Archiv 189:239–242.
  To check: Narration covers half the sequence; placeholder voice.
-->
```

**Everything inline**: HTML, CSS, JavaScript, images and sound. The only
outside resources allowed are:

- scripts from `https://cdnjs.cloudflare.com` or `https://cdn.jsdelivr.net`
  (for example Chart.js, D3, GSAP, Three.js), pinned to an exact version;
- fonts from Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`).

Anything else is blocked by the book and the widget fails its checks: other
CDNs, APIs, `fetch`, images or audio by URL, iframes, links that navigate
the page. Don't rely on `localStorage`: the frame may not keep it.

## Keep it small

Every reader downloads the whole file, many of them on a phone. **Aim for
under 2 MB; 4 MB is the hard limit.** Images and sound are almost always
what makes a file big, because inline media is stored as text and grows by a
third.

- Draw diagrams, anatomy and apparatus as **inline SVG**, not pictures.
- Photos and paintings: WebP, no wider than 1600 px (800 px if they're shown
  small), quality around 75.
- Narration: mono MP3 at 64 kbps (about 0.5 MB a minute). One file for the
  whole narration, with cue times, is smaller than many clips.
- Never embed the same image twice; reuse it from one `data:` URI in CSS or
  a `<symbol>`.
- Say the final file size in your reply.

## How it must behave

1. **Fits every screen.** It must work from **360 px to 1440 px wide** with
   no horizontal scrolling. On phones it sits in the text column (about
   360–720 px); on desktop it is the full width of the page. Design for the
   narrow case first and widen with CSS grid or flex and `@media` or
   `@container` rules. Never set a fixed width wider than 360 px.
2. **Sets its own height, or fills the one it is given.** Normally the
   content decides the height (no `height: 100vh`) and the book resizes the
   frame to fit. Some places give the widget a fixed height instead: a
   full-screen band in the chapter, or the figure pane beside the text. Then
   the book sets `html[data-ob-fit]` and `--ob-max-height`. Your widget must
   handle that itself: the title, controls and caption keep their size and
   the picture takes what is left, so nothing is cut off. The template shows
   how. The book does not patch widgets from outside.
3. **Uses the book's tokens.** Colours, fonts and corners come from the
   `--ob-*` CSS variables in `design.md` (the book sets them; write each with
   a fallback so the file also works on its own). `--ob-accent` is the
   chapter colour: one accent, for what the reader should look at.
4. **Respects reduced motion.** Check `OB.reducedMotion` and the CSS
   `@media (prefers-reduced-motion: reduce)` and `html[data-ob-reduce-motion]`.
   Show the end state, or let the reader step through with buttons.
5. **Works by keyboard and touch.** Real `<button>`, `<input type="range">`
   and `<select>` elements, visible focus, targets at least 44 px, nothing
   that only works on hover.
6. **Says what it shows.** A short title and a one-line instruction at the
   top ("Press play to follow Loewi's experiment"), labels on every axis and
   part, and a caption with units and the source.
7. **Is scientifically exact.** Every label, number and claim matches the
   chapter text or a cited source, in the chapter's terms and spelling. If
   the brief asks for something the chapter doesn't cover, cite a source in
   the caption and flag it in your reply. If you are unsure of a value, say
   so in the "To check" line and in your reply. Never guess silently. Label
   a model as one ("Illustrative model, not recorded data").
8. **Loads fast and fails gently.** Show something useful at once (the first
   frame, the title, a play button) while anything heavy decodes. If
   something can't load, say so in the widget rather than showing a blank.
9. **No console errors.**

## Narrated and animated sequences

Some widgets tell a story: an experiment step by step, with a voice-over.

- Playback starts only from the reader pressing a real play button. Never
  autoplay.
- Give the reader control: play / pause, step back and forward between
  scenes, and a progress bar or scene dots. Keep the controls in one row
  that never scrolls out of view.
- Drive the pictures from the audio's own clock (`audio.currentTime` and a
  list of cue times), not from separate timers, so voice and pictures stay
  in sync on slow phones and after a pause.
- Show the words: captions for the current line, and the full transcript
  one tap away. A reader with the sound off must get everything.
- `audio.play()` can be refused; catch it and show the play button again.
- Under reduced motion, each scene is a still with its caption, stepped with
  the buttons.
- Placeholder voices are fine while the script settles. Keep the script in
  the file (the transcript) so a final recording can replace the audio
  without touching anything else.

## The book's bridge

The book injects a small `window.OB` object before your scripts run.
`template.html` includes a fallback, so the calls are safe when the file is
opened on its own, in Claude or in a browser.

- `OB.onTheme(fn)`: called with `{ accent, reduceMotion, ramp }` when the
  chapter's colours are known or change (the CSS variables are already set).
- `OB.reducedMotion`: `true` when the reader asked for less motion.
- `OB.resize()`: call after a layout change the browser can't see.
- `OB.maxHeight` and `OB.onFit(fn)`: the fixed height, when there is one
  (see point 2 above); `null` means grow with the content.
- `OB.fullScreen`: `true` when the reader opened the widget full screen (the
  expand button under a full-screen band). That view is a fresh copy of the
  widget in a dialog, one screen tall, and the book sets
  `html[data-ob-fullscreen]` on it. Use it to give the screen to the
  picture: the reader has already seen the title, the instruction and the
  caption on the page, so you may hide them (keep them for screen readers).
  The dialog's Close button covers a square in the top right corner,
  `var(--ob-close-clear, 60px)` on a side: keep controls out of it. If the
  widget uses Escape itself (to close a panel of its own), call
  `event.preventDefault()`, or the book closes the dialog too.

## Working with the author and designer

- A **sketch, photo, Figma frame or storyboard** is the brief: keep its
  composition, sequence and labels; redraw it cleanly in the book's style
  as inline SVG; add the interaction they describe.
- Ask at most two questions before the first version; otherwise make
  sensible choices and list them.
- After each version, reply with: what it shows, what the reader can do,
  what changed since the last version, the file size, the checklist below
  with any item that fails, and the questions for the author.

## Reviewing a widget

When asked to review, open the file and report, in this order:

1. **Science**: every claim, label, number and source against the chapter
   text. Quote anything wrong and say what it should be.
2. **Fit**: the checklist below. For each failure, say where and why.
3. **Reading**: is the instruction clear, is the sequence easy to follow,
   is anything ambiguous to a first-year student?

Keep it to a list the author can act on. Don't rewrite the widget unless
asked.

## Checklist before you hand it over

- [ ] One `.html` file named `<chapter>-<short-name>.html`, header comment filled in
- [ ] Only the allowed outside resources; under 2 MB (never over 4 MB)
- [ ] No horizontal scroll at 360 px; nothing cut off at 1440 px
- [ ] Works when given a fixed height (`html[data-ob-fit]`): nothing cut off
- [ ] Colours, fonts and corners from `--ob-*` tokens, each with a fallback
- [ ] Figure labels at least 11 px on screen at 390 px
- [ ] Reduced motion handled
- [ ] Keyboard and touch work; focus is visible
- [ ] Title, one-line instruction, labels, caption with units and sources
- [ ] Narration (if any): starts from a button, has captions and a transcript
- [ ] No console errors
- [ ] Every scientific claim matches the chapter or a cited source
