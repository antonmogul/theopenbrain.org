// Every extraction for the remaining widgets: [name, route, width, chapter, stateJs?, settleMs?]
const H = `const B=(t,exact)=>[...document.querySelectorAll('.widget-root button,.widget-root [role=tab]')].find(b=>{const s=b.textContent.replace(/\\s+/g,' ').trim();return exact?s===t:(s.startsWith(t)||(b.getAttribute('aria-label')||'').startsWith(t))});
const W=ms=>new Promise(r=>setTimeout(r,ms));
const C=async(t,ms=700,exact)=>{const b=B(t,exact);if(!b)throw new Error('no button '+t);b.click();await W(ms)};
const SEL3=(id,v)=>{const s=document.getElementById(id);s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))};
const R=(f,i=0)=>{const r=document.querySelectorAll('.widget-root input[type=range]')[i];r.value=+r.min+(r.max-r.min)*f;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}))};
const SEL=(v,i=0)=>{const s=document.querySelectorAll('.widget-root select')[i];s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))};`;
const st = (body) => `(async()=>{${H}\n${body}})()`;
const st3 = (body) => st(body).replace(/\.widget-root/g, "#rb") + ";";
export const JOBS = {
  cc: {
    ch: "fund",
    route: "/case-cabinet",
    jobs: [
      ["cc-d", 1280],
      ["cc-p", 390],
      ["cc-32", 1280, st(`await C('Open case 32',3500)`), 1500],
      [
        "cc-32r",
        1280,
        st(`await C('Open case 32',3500);await C('Read point 1b',1500)`),
        1500,
      ],
      ["cc-4", 1280, st(`await C('Open case 4',3500)`), 1500],
      ["cc-p32", 390, st(`await C('Open case 32',3500)`), 1500],
    ],
  },
  rb: {
    ch: "perc",
    route: "/retinabox",
    jobs: [
      ["rb-d", 1280],
      ["rb-p", 390],
      [
        "rb-cs",
        1280,
        st(
          `SEL('center-surround');await W(300);await C('Load a circuit',1500)`
        ),
      ],
      [
        "rb-led",
        1280,
        st(
          `SEL('on-center');await W(300);await C('Load a circuit',1200);await C('5',1800,true)`
        ),
      ],
      ["rb-cb", 1280, st(`await C('Code Breaker',1200)`)],
      ["rb-dm", 1280, st(`await C('Discovery Mode',1200)`)],
      ["rb-lp", 1280, st(`await C('Lesson Plans',1200)`)],
      ["rb-ts", 1280, st(`await C('Teaching Slides',1200)`)],
    ],
  },
  vp: {
    ch: "perc",
    route: "/visual-pathway",
    jobs: [
      ["vp-d", 1280],
      ["vp-p", 390],
      ["vp-b", 1280, st(`await C('B · Chiasm',1200)`)],
      ["vp-e", 1280, st(`await C('E · R V1',1200)`)],
      ["vp-fr", 1280, st(`await C('Field → retina',1500)`)],
      ["vp-q", 1280, st(`await C('Quiz',1500)`)],
    ],
  },
  v1: {
    ch: "perc",
    route: "/v1-camera",
    jobs: [
      ["v1-d", 1280],
      ["v1-p", 390],
      ["v1-demo", 1280, st(`await C('Demo stimulus',2500)`)],
      [
        "v1-8",
        1280,
        st(`await C('Demo stimulus',2000);await C('8 orientations',2000)`),
      ],
      [
        "v1-sw",
        1280,
        st(`await C('Demo stimulus',2000);await C('Sweep',2000)`),
      ],
    ],
  },
  sdt: {
    ch: "lear",
    route: "/sdt",
    jobs: [
      ["sdt-d", 1280],
      ["sdt-p", 390],
      ["sdt-hi", 1280, st(`R(0.85);await W(600)`)],
      ["sdt-a", 1280, st(`await C('Two observers',1200)`)],
      ["sdt-b", 1280, st(`await C('Same H',1200)`)],
    ],
  },
  pf: {
    ch: "lear",
    route: "/psychometric-function",
    jobs: [
      ["pf-d", 1280],
      ["pf-p", 390],
      ["pf-light", 1280, st(`await C('Light',900,true)`)],
      ["pf-low", 1280, st(`await C('Lower threshold')`)],
      ["pf-lib", 1280, st(`await C('Liberal bias')`)],
      ["pf-lapse", 1280, st(`await C('High lapse rate')`)],
      ["pf-tvb", 1280, st(`await C('Threshold vs')`)],
    ],
  },
  pn: {
    ch: "lear",
    route: "/posner-cueing",
    jobs: [
      ["pn-d", 1280],
      ["pn-p", 390],
      ["pn-run", 1280, st(`await C('Start block',1100)`), 200],
      [
        "pn-done",
        1280,
        st(
          `await C('Start block',300);const t0=Date.now();while(!document.querySelector('.pn-results')&&Date.now()-t0<170000){document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true}));await W(140+Math.random()*260)}await W(800)`
        ),
        800,
      ],
    ],
  },
  bc: {
    ch: "lear",
    route: "/biased-competition",
    jobs: [
      ["bc-d", 1280],
      ["bc-p", 390],
      ["bc-s1", 1280, st(`await C('Stim 1 Alone',1500)`)],
      ["bc-s2", 1280, st(`await C('Stim 2 Alone',1500)`)],
      ["bc-a1", 1280, st(`await C('Attend Stim 1',1500)`)],
      ["bc-a2", 1280, st(`await C('Attend Stim 2',1500)`)],
    ],
  },
  crg: {
    ch: "lear",
    route: "/contrast-response",
    jobs: [
      ["crg-d", 1280],
      ["crg-p", 390],
      ["crg-rg", 1280, st(`await C('Response gain')`)],
      ["crg-hi", 1280, st(`R(0.9);await W(600)`)],
    ],
  },
  tmt: {
    ch: "lear",
    route: "/feature-attention",
    jobs: [
      ["tmt-d", 1280],
      ["tmt-p", 390],
      ["tmt-pref", 1280, st(`await C('Attend preferred',1500)`)],
      ["tmt-null", 1280, st(`await C('Attend null',1500)`)],
    ],
  },
  cpa: {
    ch: "lear",
    route: "/corbetta-pet",
    jobs: [
      ["cpa-d", 1280],
      ["cpa-p", 390],
      ["cpa-col", 1280, st(`await C('Color',1200,true)`)],
      ["cpa-vel", 1280, st(`await C('Velocity',1200,true)`)],
      ["cpa-sp", 1280, st(`await C('Spatial',1200)`)],
    ],
  },
  nm: {
    ch: "lear",
    route: "/normalization-model",
    jobs: [
      ["nm-d", 1280],
      ["nm-p", 390],
      ["nm-two", 1280, st(`await C('Two in receptive field',1200)`)],
      ["nm-out", 1280, st(`await C('One in, one outside',1200)`)],
      [
        "nm-hi",
        1280,
        st(
          `R(0.9);await W(400);const c=document.querySelector('.widget-root input[type=checkbox]');c.click();await W(800)`
        ),
      ],
    ],
  },
  hl: {
    ch: "lear",
    route: "/hillyard-erp",
    jobs: [
      ["hl-d", 1280, st(`await C('Pause',600)`)],
      ["hl-p", 390, st(`await C('Pause',600)`)],
      ["hl-l", 1280, st(`await C('Pause',300);await C('Attend left',1500)`)],
      ["hl-r", 1280, st(`await C('Pause',300);await C('Attend right',1500)`)],
    ],
  },
  rb3: {
    ch: "perc",
    route: "/retinabox-web.html",
    base: "http://localhost:5192",
    root: "#rb",
    jobs: [
      ["rb3-d", 1280],
      ["rb3-p", 390],
      [
        "rb3-led",
        1280,
        st3(
          `await C('Load a circuit',1500);if(B('Activate stimulus LEDs')){await C('5',400,true);await C('Activate stimulus LEDs',300)}await W(2600)`
        ),
        200,
      ],
      [
        "rb3-cs",
        1280,
        st3(
          `SEL3('rb-preset','center-surround');await C('Load a circuit',1500)`
        ),
      ],
      ["rb3-tour", 1280, st3(`await C('Play a tutorial',3500)`), 1500],
      ["rb3-delay", 1280, st3(`await C('Delays',1200)`)],
      ["rb3-cb", 1280, st3(`await C('Code Breaker',1200)`)],
      ["rb3-dm", 1280, st3(`await C('Discovery Mode',1200)`)],
      ["rb3-lp", 1280, st3(`await C('Lesson Plans',2500)`)],
      ["rb3-ts", 1280, st3(`await C('Teaching Slides',2500)`)],
    ],
  },
};

// Chapter uploads (3 Nov): served from the scratchpad on :5193, built with buildWidgetDoc (book tokens)
const stU = (root) => (body) => st(body).replace(/\.widget-root/g, root) + ";";
const U = (slug, ch, root, wD, states) => ({
  ch,
  route: `/${slug}.html`,
  base: "http://localhost:5193",
  root,
  jobs: [
    [`${slug}-d`, wD],
    [`${slug}-p`, 390],
    ...states.map(([k, body]) => [`${slug}-${k}`, wD, stU(root)(body), 2600]),
  ],
});
const T = "#tob-widget";
Object.assign(JOBS, {
  lw: U("loewi-vagusstoff", "fund", ".wrap", 1280, [
    ["fluids", `await C('Collecting the fluids',3000)`],
    ["vs", `await C('Vagusstoff',3000)`],
  ]),
  pr: U("retina-photoreceptors", "perc", T, 640, [
    ["opsins", `await C('Opsins',1500)`],
    ["mito", `await C('Mitochondria',1500)`],
  ]),
  re: U("retina-refraction-errors", "perc", T, 1280, [
    ["myopia", `await C('Myopia',2500)`],
    [
      "myopiac",
      `await C('Myopia',2000);[...document.querySelectorAll('${T} button')].filter(b=>b.textContent.trim()==='Corrected')[0].click();await W(2500)`,
    ],
    ["astig", `await C('Astigmatism',2500)`],
    ["expl", `await C('Show explanation',1500)`],
  ]),
  pl: U("retina-pupillary-light-reflex", "perc", T, 1280, [
    ["s3", `await C('3',3000)`],
    ["s5", `await C('5',3000)`],
  ]),
  ph: U("retina-phototransduction", "perc", T, 1280, [
    ["s4", `await C('4',3000)`],
    ["s8", `await C('8',3000)`],
    ["expl", `await C('Show explanation',1500)`],
  ]),
  vc: U("retina-visual-cycle", "perc", T, 1280, [
    ["s3", `await C('3',3000)`],
    ["s6", `await C('6',3000)`],
  ]),
  oo: U("retina-on-off-bipolar-cells", "perc", T, 640, [
    ["light", `await C('Light',2500,true)`],
  ]),
  cs: U("retina-center-surround", "perc", T, 640, [
    ["surr", `await C('Center + surround',2500)`],
  ]),
  dsu: U("retina-direction-selectivity", "perc", T, 640, [
    ["null", `await C('Null',2500,true)`],
  ]),
  om: U("retina-object-motion-sensitivity", "perc", T, 640, [
    ["asym", `await C('Asymmetric',2500)`],
  ]),
  ip: U("retina-light-sensitive-ganglion-cells", "perc", T, 640, []),
  rc: U("retina-rod-vs-cone-circuits", "perc", T, 640, [
    ["night", `await C('Night',2500,true)`],
  ]),
  ct: U("retina-retinal-cell-types", "perc", T, 640, [
    ["bip", `await C('Bipolar cells',1500)`],
    ["ipl", `await C('Inner plexiform layer',1500)`],
  ]),
  sa: U("retina-synaptic-architecture", "perc", T, 640, [
    ["inh", `await C('Inhibition',1500)`],
    ["gap", `await C('Gap junction',1500)`],
  ]),
});
