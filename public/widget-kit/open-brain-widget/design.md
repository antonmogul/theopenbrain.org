# The Open Brain: design for widgets

How an interactive figure should look and behave so it reads as part of the
book. The book is quiet and editorial: paper and ink for the text, a dark
plate for figures, one chapter colour, square corners, mono labels.

## 1. Surfaces

Widgets sit on the **dark plate**, like the book's figures and its chapter
openers. Use the light surface only for a figure that is a page of text
(a table, a form).

| Token                | Value                   | Use                           |
| -------------------- | ----------------------- | ----------------------------- |
| `--ob-plate`         | `#1c1c1c`               | The widget's background       |
| `--ob-plate-2`       | `#2a2a2a`               | A panel or card on the plate  |
| `--ob-on-plate`      | `#ffffff`               | Text and strokes on the plate |
| `--ob-on-plate-mute` | `rgba(255,255,255,.62)` | Secondary text, axis ticks    |
| `--ob-line-plate`    | `rgba(255,255,255,.18)` | Hairlines, grid lines         |
| `--ob-paper`         | `#ffffff`               | Light surface                 |
| `--ob-bg`            | `#f7f5f0`               | The book's warm page          |
| `--ob-ink`           | `#0a0a0a`               | Text on light                 |
| `--ob-mute`          | `#6b6b66`               | Secondary text on light       |
| `--ob-line`          | `#e5e5e0`               | Hairlines on light            |

## 2. The chapter colour

Each chapter has a subject colour, and the book sets `--ob-accent` to it.
Use it for **the one thing the reader should look at**: the active state,
the selected cell, the stimulus, the current tab, the key trace. Everything
else is white, greys and lines.

| Subject                      | `--ob-accent` | `--ob-accent-deep` | `--ob-accent-soft` | `--ob-accent-pale` |
| ---------------------------- | ------------- | ------------------ | ------------------ | ------------------ |
| Fundamentals (History)       | `#8D4CF6`     | `#7615F5`          | `#BF97FC`          | `#DCCDF9`          |
| Perception (Retina)          | `#39D8BA`     | `#08AFA3`          | `#4BEACC`          | `#9BF9E7`          |
| Movement                     | `#1A72F2`     | `#0E61C4`          | `#5EA7EF`          | `#9AC0EF`          |
| Learning, Cognition & Memory | `#FF3351`     | `#C1062A`          | `#FC708A`          | `#FFC7D2`          |
| Development & Degeneration   | `#F2BB40`     | `#C98F1B`          | `#FFD788`          | `#FFE6BB`          |

Always write colours as `var(--ob-accent, #8D4CF6)`, with a fallback, so
the file works on its own. Data series beyond the accent: `--ob-series-2`
`#FBEB00` (yellow), `--ob-series-3` `#F200FF` (pink), then white and greys.
Never rely on colour alone: pair it with a label, a shape or a dash.

## 3. Type

| Token            | Value                                      |
| ---------------- | ------------------------------------------ |
| `--ob-font-sans` | `"IBM Plex Sans", system-ui, sans-serif`   |
| `--ob-font-mono` | `"IBM Plex Mono", ui-monospace, monospace` |

Load both from Google Fonts (the template does). Sizes, in CSS pixels:

| Role                        | Size                                         | Style                      |
| --------------------------- | -------------------------------------------- | -------------------------- |
| Widget title                | 20 px, weight 600                            | Sans                       |
| Instruction, body           | 15–16 px, line height 1.5                    | Sans                       |
| Tabs, buttons, labels       | 12–13 px, uppercase, letter-spacing .06–.1em | Mono                       |
| Axis ticks, units, captions | 11–13 px                                     | Mono, `--ob-on-plate-mute` |
| Readouts (numbers)          | 16–20 px, tabular figures                    | Mono                       |

Sentence case for titles and instructions. No exclamation marks.

## 4. Shape

- **Square corners everywhere:** `border-radius: var(--ob-radius, 0)`.
  Circles are the only round things (cells, dots, number badges).
- Hairline borders (`1px solid var(--ob-line-plate)`) instead of shadows.
- Tabs are a row of equal cells with hairline dividers; the active tab is
  filled with `--ob-accent` and white text.
- Buttons: mono uppercase label, 1 px border, square; primary is filled
  white on the plate.

## 5. Layout

A widget is, top to bottom:

1. **Title** and a **one-line instruction**.
2. **Controls**: tabs, a slider, toggles. Above the figure on phones.
3. **The figure**: SVG or canvas, full width, scaling with its container
   (`viewBox` + `width: 100%`).
4. **Readouts**: the numbers that change, in a ruled row.
5. **Caption**: what is shown, units, the data source, in mono.

Padding 20–24 px on phones, up to 40 px on desktop. On wide screens,
controls may move beside the figure (a two-column grid) but the figure
stays the largest thing. The widget must work **from 360 px to 1440 px**
with no horizontal scroll; test at 390, 768 and 1280.

## 6. Drawing

Anatomy and circuits are **clean line drawings**: white 1.5–2 px strokes on
the plate, the accent for the part being discussed, soft fills
(`--ob-accent-pale` at low opacity) only where a region must read as an area.
Label parts directly with thin leader lines instead of a separate legend
when there is room. Keep the book's cell vocabulary: photoreceptors as tall
rounded bars, cell bodies as circles, synapses as small triangles or dots.

## 7. Motion

Motion explains; it never decorates. 150–300 ms ease-out for state changes;
loops only when the phenomenon is a loop (a spike train, an oscillation),
with a pause button. With reduced motion (`prefers-reduced-motion: reduce`
or `html[data-ob-reduce-motion]`), jump to the end state and step with
buttons.

## 8. Accessibility

- Every control is a real `<button>`, `<input>` or `<select>` with a label.
- Visible focus: `outline: 2px solid var(--ob-accent)` with offset.
- Touch targets at least 44 × 44 px.
- The figure has a text alternative: `role="img"` and an `aria-label` on
  the SVG, or a caption that says what it shows.
- Contrast: white or `--ob-on-plate-mute` text on the plate; never accent
  text below 14 px on dark.

## 9. Words

Write for a first-year student. One idea per sentence. Use the chapter's
own terms (if the chapter says "ganglion cell", don't say "RGC" without
spelling it out once). Numbers carry units ("12 ms", "0.5 cd/m²").
