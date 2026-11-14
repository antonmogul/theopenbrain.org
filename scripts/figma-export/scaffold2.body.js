const H = await figma.getNodeByIdAsync("11:66"),
  LBL = await figma.getNodeByIdAsync("11:78");
for (const t of H.findAllWithCriteria({ types: ["TEXT"] }).concat([LBL]))
  for (const f of t.getRangeAllFontNames(0, t.characters.length))
    await figma.loadFontAsync(f);
const setLinks = (t, parts) => {
  t.characters = parts.map((p) => p[0]).join("");
  let i = 0;
  t.setRangeHyperlink(0, t.characters.length, null);
  for (const [s, u] of parts) {
    if (u) t.setRangeHyperlink(i, i + s.length, { type: "URL", value: u });
    i += s.length;
  }
};
async function scaffold(page, cfg) {
  await figma.setCurrentPageAsync(page);
  for (const c of [...page.children]) c.remove();
  const h = H.clone();
  page.appendChild(h);
  h.x = 0;
  h.y = -600;
  h.name = cfg.name + " / Header";
  const T = h.children.filter((c) => c.type === "TEXT");
  T[1].characters = cfg.title;
  T[2].characters = cfg.meta;
  setLinks(T[3], cfg.links);
  T[3].name = "Links";
  const bullets = T.slice(5, 9);
  while (bullets.length < cfg.how.length) {
    const c = bullets[0].clone();
    h.insertChild(h.children.indexOf(bullets[bullets.length - 1]) + 1, c);
    bullets.push(c);
  }
  while (bullets.length > cfg.how.length) bullets.pop().remove();
  cfg.how.forEach((s, i) => (bullets[i].characters = "• " + s));
  T[10].characters = cfg.notes;
  const slots = {};
  let sx = 0;
  for (const sec of cfg.sections) {
    const s = figma.createSection();
    page.appendChild(s);
    s.name = sec.name;
    s.x = sx;
    s.y = -31;
    s.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    let y = 80,
      maxW = 0;
    for (const [key, label, w, hh] of sec.frames) {
      const l = LBL.clone();
      s.appendChild(l);
      l.characters = label;
      l.setRangeHyperlink(0, label.length, null);
      l.x = 80;
      l.y = y;
      slots[key] = [s.id, 80, y + 26];
      y += 26 + hh + 120;
      maxW = Math.max(maxW, w);
    }
    s.resizeWithoutConstraints(maxW + 160, y - 120 + 80 + 40);
    sx += maxW + 160 + 120;
  }
  return slots;
}
const byName = (n) => figma.root.children.find((p) => p.name === n);
// rename existing Retina pages into reading order
const ren = {
  "6:6": "2.10 Colour vision",
  "6:7": "2.12 Direction selectivity · data",
  "6:8": "2.14 RetINaBox",
};
for (const [id, n] of Object.entries(ren)) {
  (await figma.getNodeByIdAsync(id)).name = n;
}
const out = {};
for (const cfg of D.cfgs) {
  let p = byName(cfg.page);
  if (!p) {
    p = figma.createPage();
    p.name = cfg.page;
  }
  out[cfg.slug] = { page: p.id, slots: await scaffold(p, cfg) };
}
// page order
const num = (n) => {
  const m = n.match(/^(\d+)\.(\d+)/);
  return m ? +m[1] * 100 + +m[2] : -1;
};
const fixed = figma.root.children.filter(
  (p) => num(p.name) < 100 || p.name === "---"
);
const wid = figma.root.children
  .filter((p) => num(p.name) >= 100)
  .sort((a, b) => num(a.name) - num(b.name));
let i = fixed.length;
for (const p of wid) figma.root.insertChild(i++, p);
// cover rows
const cover = await figma.getNodeByIdAsync("11:86");
const tmpl = await figma.getNodeByIdAsync("11:103");
for (const t of tmpl.findAllWithCriteria({ types: ["TEXT"] }))
  for (const f of t.getRangeAllFontNames(0, t.characters.length))
    await figma.loadFontAsync(f);
const rows = {};
for (const r of cover.children.filter((c) =>
  c.name.startsWith("Cover row / ")
)) {
  const pid = r.children[0].getRangeHyperlink(0, 1);
  rows[pid && pid.value] = r;
}
for (const cfg of D.cfgs) {
  const pid = out[cfg.slug].page;
  if (rows[pid]) continue;
  const r = tmpl.clone();
  cover.appendChild(r);
  rows[pid] = r;
  const [a, b, c] = r.children;
  a.characters = cfg.page;
  a.setRangeHyperlink(0, cfg.page.length, { type: "NODE", value: pid });
  const n = cfg.sections.reduce((s, x) => s + x.frames.length, 0) - 2;
  b.characters = `Done — ${cfg.sections[0].name.toLowerCase()}, phone, ${n} state${n === 1 ? "" : "s"}`;
  c.setRangeHyperlink(0, c.characters.length, {
    type: "URL",
    value: cfg.story,
  });
}
for (const [pid, r] of Object.entries(rows)) {
  const p = await figma.getNodeByIdAsync(pid);
  if (!p) continue;
  r.name = "Cover row / " + p.name;
  const a = r.children[0];
  a.characters = p.name;
  a.setRangeHyperlink(0, p.name.length, { type: "NODE", value: pid });
}
const head = await figma.getNodeByIdAsync("11:90");
let at = cover.children.indexOf(head) + 1;
for (const p of wid) {
  const r = rows[p.id];
  if (r) cover.insertChild(at++, r);
}
return out;
