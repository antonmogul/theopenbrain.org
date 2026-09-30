/*
 * Figma drift check (OPENBRAIN-117). Not run by Node: paste into the Figma
 * MCP `use_figma` tool against the design system file
 * (NAjmvySrMHLtWYqn2zi4h4), replacing EXP with the output of
 * `npm run tokens:figma-expected`. Read-only; returns what differs.
 */
/* global figma */
const EXP = {}; // ← paste here
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const coll = (n) => cols.find((c) => c.name === n);
const v = (c, name) => vars.find((x) => x.variableCollectionId === coll(c).id && x.name === name);
const toHex = (c) => "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
async function resolve(variable, modeId) {
  let val = variable.valuesByMode[modeId];
  for (let i = 0; val && val.type === "VARIABLE_ALIAS" && i < 5; i++) {
    const t = await figma.variables.getVariableByIdAsync(val.id);
    val = Object.values(t.valuesByMode)[0];
  }
  return val;
}
const mode = (c, n) => coll(c).modes.find((m) => m.name === n).modeId;
const drift = [];
let checked = 0;
for (const [k, [light, dark]] of Object.entries(EXP.theme)) {
  const x = v("Theme", "color/" + k);
  if (!x) { drift.push(`Theme/${k} missing`); continue; }
  for (const [m, e] of [["Light", light], ["Dark", dark]]) {
    const got = toHex(await resolve(x, mode("Theme", m)));
    checked++;
    if (got !== e) drift.push(`Theme/${k} ${m}: figma ${got} ≠ code ${e}`);
  }
}
for (const [ramp, steps] of Object.entries(EXP.chapter))
  for (const [k, e] of Object.entries(steps)) {
    const got = toHex(await resolve(v("Chapter", "color/" + k), mode("Chapter", ramp)));
    checked++;
    if (got !== e) drift.push(`Chapter/${k} ${ramp}: figma ${got} ≠ code ${e}`);
  }
for (const [role, [d, p]] of Object.entries(EXP.type)) {
  const x = v("Type", `type/${role}/size`);
  if (!x) { drift.push(`Type/${role} missing`); continue; }
  for (const [m, e] of [["Desktop", d], ["Phone", p]]) {
    const got = x.valuesByMode[mode("Type", m)];
    checked++;
    if (Math.abs(got - e) > 0.01) drift.push(`Type/${role} ${m}: figma ${got} ≠ code ${e}`);
  }
}
for (const [n, e] of Object.entries(EXP.ui || {})) {
  const x = v("Type", `ui/size-${n}`);
  if (!x) { drift.push(`Type/ui/size-${n} missing`); continue; }
  for (const m of coll("Type").modes) {
    const got = x.valuesByMode[m.modeId];
    checked++;
    if (got !== e) drift.push(`Type/ui/size-${n} ${m.name}: figma ${got} ≠ code ${e}`);
  }
}
{
  const got = Object.values(v("Shape", "radius/control").valuesByMode)[0];
  checked++;
  if (got !== EXP.radius) drift.push(`Shape/radius: ${got} ≠ ${EXP.radius}`);
}
for (const [k, e] of Object.entries(EXP.layout)) {
  const x = v("Layout", k);
  const got = x ? Object.values(x.valuesByMode)[0] : null;
  checked++;
  if (got !== e) drift.push(`Layout/${k}: figma ${got} ≠ code ${e}`);
}
return { checked, drift };
