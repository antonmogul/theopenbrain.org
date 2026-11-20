// Builds the scaffold payload for the 14 chapter uploads (pages, headers, sections, labels, cover rows)
import { readFileSync, writeFileSync } from "node:fs";
const H = (k) => JSON.parse(readFileSync(`out/${k}.json`, "utf8")).tree.r;
const R =
  "Chapter 2 · The Retina  ·  Author: Stuart Trenholm (1 Oct 2026 set, OPENBRAIN-141)";
const W = [
  // [order page name, slug, kind(full|pane|wide), chapter, title, how[], states[[key,label]], notes extra]
  [
    "1.3 Loewi’s Vagusstoff",
    "loewi-vagusstoff",
    "wide",
    "History",
    "Loewi’s Vagusstoff, 1921 — the first neurotransmitter",
    [
      "A narrated recreation of Loewi’s experiment: the frog heart on its cannula, the vagus nerve and stimulator, the rotating drum recording each beat.",
      "Press Play · narrated (with sound) or step through: Previous / Next step, or jump to a chapter marker (The set-up, Collecting the fluids, Vagusstoff) on the scrubber.",
      "Below the scene, Loewi’s own Figure 1: the coloured bar marks which fluid (1 Ringer’s, 2 vagus, 3 normal, 4 atropine) was on the heart for each stretch of the trace.",
      "States: start (Play overlay), Collecting the fluids, Vagusstoff (atropine, step 4).",
    ],
    [
      ["fluids", "Collecting the fluids"],
      ["vs", "Vagusstoff · atropine (step 4)"],
    ],
    "The scene and Figure 1 are one SVG of engraved illustrations (embedded bitmaps), so they come through as a single raster; the transport, captions, buttons and source line are editable layers. Published as an upload but not yet placed in the History chapter. Chapter mode = fund.",
  ],
  [
    "2.1 Pupillary light reflex",
    "retina-pupillary-light-reflex",
    "full",
    "perc",
    "Pathway for the pupillary light reflex",
    [
      "Five narrated steps from the retina to the iris: retina, pretectal nucleus, Edinger-Westphal nucleus, ciliary ganglion, pupil.",
      "Step with the arrows or the numbered step list; Pause stops the loop; narration can be turned on.",
      "The key below the animation names each structure; hovering a key item highlights it.",
    ],
    [
      ["s3", "Step 3 · pretectal → Edinger-Westphal"],
      ["s5", "Step 5 · pupil constricts"],
    ],
    "",
  ],
  [
    "2.2 Refractive errors",
    "retina-refraction-errors",
    "full",
    "perc",
    "Refractive errors",
    [
      "Pick an eye: normal (emmetropia), myopia, hyperopia or astigmatism; each error has a Corrected twin with its lens.",
      "The ray diagram shows where the image falls; the painting beside it blurs as the viewer would see it.",
      "+ shows the explanation; narration can be turned on.",
    ],
    [
      ["myopia", "Myopia"],
      ["myopiac", "Myopia · corrected"],
      ["astig", "Astigmatism"],
      ["expl", "Explanation open"],
    ],
    "The painting (blurred to match the eye) and the eye artwork are rasters; the picker, caption and controls are editable.",
  ],
  [
    "2.3 Retinal cell types",
    "retina-retinal-cell-types",
    "pane",
    "perc",
    "Retinal cell types",
    [
      "The retina in cross-section. Pick a cell class (photoreceptors, horizontal, bipolar, amacrine, ganglion cells) to highlight it.",
      "Or pick a layer (outer nuclear … ganglion cell layer) to band it.",
    ],
    [
      ["bip", "Bipolar cells highlighted"],
      ["ipl", "Inner plexiform layer"],
    ],
    "",
  ],
  [
    "2.4 Synaptic architecture",
    "retina-synaptic-architecture",
    "pane",
    "perc",
    "Synaptic architecture",
    [
      "The retina’s wiring with three toggles: Inhibition, Excitation, Gap junction. Each switches its kind of synapse on or off in the diagram.",
    ],
    [
      ["inh", "Inhibition toggled"],
      ["gap", "Gap junction toggled"],
    ],
    "",
  ],
  [
    "2.5 Photoreceptors",
    "retina-photoreceptors",
    "pane",
    "perc",
    "Photoreceptors — a rod and a cone",
    [
      "Pick a part (disks, opsins, outer segment, connecting cilium, inner segment, mitochondria, nucleus) to highlight it on both cells.",
    ],
    [
      ["opsins", "Opsins"],
      ["mito", "Mitochondria"],
    ],
    "",
  ],
  [
    "2.6 Phototransduction",
    "retina-phototransduction",
    "full",
    "perc",
    "Phototransduction",
    [
      "Eight narrated steps from the rod in the dark to its hyperpolarized membrane: rhodopsin, transducin, PDE, cGMP-gated channels.",
      "Arrows, the step list on the right, or Pause; + opens the explanation; the key names each molecule.",
    ],
    [
      ["s4", "Step 4 · transducin exchanges GDP for GTP"],
      ["s8", "Step 8 · the rod hyperpolarizes"],
      ["expl", "Explanation open"],
    ],
    "",
  ],
  [
    "2.7 The visual cycle",
    "retina-visual-cycle",
    "full",
    "perc",
    "The visual cycle",
    [
      "Six narrated steps: retinal from 11-cis to all-trans and back through the pigment epithelium, carried by IRBP.",
      "Arrows, the step list or Pause; the key names each molecule.",
    ],
    [
      ["s3", "Step 3 · retinol to the RPE via IRBP"],
      ["s6", "Step 6 · 11-cis retinal re-enters the rod"],
    ],
    "",
  ],
  [
    "2.8 ON and OFF bipolar cells",
    "retina-on-off-bipolar-cells",
    "pane",
    "perc",
    "ON and OFF bipolar cells",
    [
      "Dark and Light tabs: how the photoreceptor’s glutamate is copied by the OFF bipolar cell and inverted by the ON bipolar cell, three narrated steps each.",
    ],
    [["light", "Light"]],
    "",
  ],
  [
    "2.9 Center-surround",
    "retina-center-surround",
    "pane",
    "perc",
    "Center-surround receptive fields",
    [
      "Center: a spot of light in the centre of a ganglion cell’s receptive field. Center + surround: the surround lit too, and the response cancelled.",
    ],
    [["surr", "Center + surround"]],
    "",
  ],
  [
    "2.11 Direction selectivity · animation",
    "retina-direction-selectivity",
    "pane",
    "perc",
    "Direction selectivity (animation)",
    [
      "Preferred and Null tabs: a direction-selective ganglion cell firing to motion one way and staying quiet to motion the other way.",
    ],
    [["null", "Null direction"]],
    "The narrated pane animation. The data widget (Pyodide) is on 2.12.",
  ],
  [
    "2.13 Object motion sensitivity",
    "retina-object-motion-sensitivity",
    "pane",
    "perc",
    "Object motion sensitivity",
    [
      "Symmetric and Asymmetric tabs: an object-motion-sensitive ganglion cell fires when an object moves differently from its background, not when the whole scene moves together.",
    ],
    [["asym", "Asymmetric"]],
    "",
  ],
  [
    "2.15 Rod and cone circuits",
    "retina-rod-vs-cone-circuits",
    "pane",
    "perc",
    "Rod and cone circuits",
    [
      "Day and Night tabs: which circuit carries the signal from the photoreceptors to the ganglion cells in each.",
    ],
    [["night", "Night"]],
    "",
  ],
  [
    "2.16 Light-sensitive ganglion cells",
    "retina-light-sensitive-ganglion-cells",
    "pane",
    "perc",
    "Light-sensitive ganglion cells",
    [
      "An intrinsically photosensitive ganglion cell responding to light on its own, through its melanopsin. One looping animation; narration can be turned on.",
    ],
    [],
    "No states: the widget has a single looping animation.",
  ],
];
const SB =
  "https://theopenbrainorg-production.up.railway.app/storybook/index.html?path=/story/widgets-uploads--";
const cfgs = W.map(([page, slug, kind, ch, title, how, states, extra]) => {
  const dw = kind === "pane" ? "Pane 640" : "Desktop 1280";
  const w0 = kind === "pane" ? 640 : 1280;
  const hist = ch === "History";
  const meta =
    (hist
      ? "Chapter 1 · Foundations of Neuroscience (History)  ·  Author: Stuart Trenholm"
      : R) +
    `  ·  Code: src/widgets/uploads/${slug}.html  ·  ` +
    (hist
      ? "Upload: loewi-vagusstoff (published, not yet placed)"
      : `In the chapter: upload:${slug}, ${kind === "pane" ? "a figure in the pane (half page)" : "full width"}`);
  const notes = [
    extra,
    `Rendered as the chapter does (buildWidgetDoc, ${hist ? "fund" : "perc"} tokens). Lottie artwork comes through as editable vectors; the narration (audio) and the looping motion are not drawn. ${kind === "pane" ? "“Pane 640” is about the figure pane’s width at a 1280 window." : ""}${hist ? "" : " Chapter mode = perc."}`,
  ]
    .filter(Boolean)
    .join(" ");
  const st = (s) => [
    [`${slug}-${s[0]}`, `${dw} · ${s[1]}`, w0, H(`${slug}-${s[0]}`)[3]],
  ];
  return {
    page,
    slug,
    name: page.replace(/^[\d.]+ /, ""),
    title,
    meta,
    links: [
      ["Storybook: ", null],
      [`Widgets / Uploads ↗`, SB + slug],
    ],
    how: [
      ...how,
      states.length
        ? `States: default, ${states.map((s) => s[1].toLowerCase()).join(", ")}, phone.`
        : "States: default and phone.",
    ].slice(0, 5),
    notes,
    story: SB + slug,
    sections: [
      {
        name: dw,
        frames: [[`${slug}-d`, `${dw} · Default`, w0, H(`${slug}-d`)[3]]],
      },
      {
        name: "Phone 390",
        frames: [[`${slug}-p`, "Phone 390 · Default", 390, H(`${slug}-p`)[3]]],
      },
      ...(states.length
        ? [{ name: `States · ${dw}`, frames: states.flatMap(st) }]
        : []),
    ],
  };
});
writeFileSync("pk2/cfgs.json", JSON.stringify(cfgs));
const code = readFileSync("scaffold2.body.js", "utf8");
const payload = JSON.stringify({ code, D: { cfgs } });
const esc = payload
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");
writeFileSync(
  "pk2/scaffold.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><text x="0" y="5" font-size="1" xml:space="preserve">${esc}</text></svg>`
);
console.log(payload.length, cfgs.length);
