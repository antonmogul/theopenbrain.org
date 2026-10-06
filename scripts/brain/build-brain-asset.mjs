/*
 * Build the brain atlas model (OPENBRAIN-127) from the open-brain-explorer
 * assets: public/publicAssets/models/brain/brain-v1.glb.
 *
 * Input (github.com/antonmogul/open-brain-explorer, public/models/):
 *   brain-left.glb, brain-right.glb — FreeSurfer fsaverage6 pial surfaces
 *     (40,962 vertices / 81,920 faces each), positions only, already
 *     centred, scaled to ~50 units and oriented for three.js by that repo's
 *     scripts/generate-brain-assets.py.
 *   region-map.json — Destrieux atlas labels grouped into areas, as face
 *     indices per hemisphere.
 *
 * Output: one GLB with two meshes ("left", "right"), each carrying
 *   NORMAL  — area-weighted vertex normals
 *   _ATLAS  — vec4 uint8 per vertex: x = area index (0 = unlabelled, the
 *             medial wall), y = sulcal depth 0..255 (0 = gyral crown,
 *             255 = deepest sulcus), z/w unused (keeps 4-byte alignment)
 * and scene extras: { areas: [<id per index>], source }.
 * The runtime (src/helper/brain/) maps area ids to names, colours and
 * chapters; the GLB only carries geometry and labels.
 *
 * Sulcal depth is computed the way FreeSurfer's `sulc` is: inflate the
 * surface by Laplacian smoothing and measure how far each vertex sits below
 * the inflated envelope along its normal.
 *
 * Usage (writes an uncompressed GLB, then meshopt-compresses it):
 *   node scripts/brain/build-brain-asset.mjs ../open-brain-explorer/public/models /tmp/brain-raw.glb
 *   npx -y @gltf-transform/cli@4 meshopt /tmp/brain-raw.glb public/publicAssets/models/brain/brain-v1.glb
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [srcDir, outFile] = process.argv.slice(2);
if (!srcDir || !outFile) {
  console.error(
    "usage: node scripts/brain/build-brain-asset.mjs <explorer public/models dir> <out.glb>"
  );
  process.exit(1);
}

/*
 * Explorer region key → our area id. The explorer named its groups after
 * the structures it hoped to show, but several are surface proxies (its
 * "amygdala" is the temporal pole and fusiform gyrus; its "hippocampus" the
 * parahippocampal gyrus), so the ids here say what the faces actually are.
 * Order = the index stored in _ATLAS.x (1-based; 0 = unlabelled).
 */
const AREAS = [
  ["prefrontal-cortex", "prefrontal"],
  ["motor-cortex", "motor"],
  ["somatosensory-cortex", "parietal"],
  ["brocas-area", "broca"],
  ["wernickes-area", "wernicke"],
  ["visual-cortex", "occipital"],
  ["auditory-cortex", "lateral-temporal"],
  ["hippocampus", "parahippocampal"],
  ["amygdala", "ventral-temporal"],
];

/* ── GLB read / write ─────────────────────────────────────────────────── */

function readGlb(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: not a GLB`);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const binStart = 20 + jsonLen + 8;
  const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));
  const accessor = (i) => {
    const a = json.accessors[i];
    const view = json.bufferViews[a.bufferView];
    const offset =
      bin.byteOffset + (view.byteOffset || 0) + (a.byteOffset || 0);
    const size = { SCALAR: 1, VEC3: 3 }[a.type] * a.count;
    const Type = { 5126: Float32Array, 5125: Uint32Array }[a.componentType];
    if (!Type)
      throw new Error(`${file}: unsupported componentType ${a.componentType}`);
    return new Type(
      bin.buffer.slice(offset, offset + size * Type.BYTES_PER_ELEMENT)
    );
  };
  const prim = json.meshes[0].primitives[0];
  return {
    position: accessor(prim.attributes.POSITION),
    index: accessor(prim.indices),
  };
}

function writeGlb(file, meshes, extras) {
  const views = [];
  const accessors = [];
  const chunks = [];
  let byteLength = 0;
  const push = (array, accessor, target) => {
    const bytes = new Uint8Array(
      array.buffer,
      array.byteOffset,
      array.byteLength
    );
    views.push({
      buffer: 0,
      byteOffset: byteLength,
      byteLength: bytes.length,
      target,
    });
    chunks.push(bytes);
    byteLength += bytes.length;
    const pad = (4 - (byteLength % 4)) % 4;
    if (pad) {
      chunks.push(new Uint8Array(pad));
      byteLength += pad;
    }
    accessors.push({ bufferView: views.length - 1, ...accessor });
    return accessors.length - 1;
  };
  const gltfMeshes = meshes.map((m) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < m.position.length; i++) {
      min[i % 3] = Math.min(min[i % 3], m.position[i]);
      max[i % 3] = Math.max(max[i % 3], m.position[i]);
    }
    const count = m.position.length / 3;
    const ARRAY = 34962;
    return {
      name: m.name,
      primitives: [
        {
          attributes: {
            POSITION: push(
              m.position,
              { componentType: 5126, count, type: "VEC3", min, max },
              ARRAY
            ),
            NORMAL: push(
              m.normal,
              { componentType: 5126, count, type: "VEC3" },
              ARRAY
            ),
            _ATLAS: push(
              m.atlas,
              { componentType: 5121, count, type: "VEC4" },
              ARRAY
            ),
          },
          indices: push(
            m.index,
            { componentType: 5125, count: m.index.length, type: "SCALAR" },
            34963
          ),
          mode: 4,
        },
      ],
    };
  });
  const json = {
    asset: { version: "2.0", generator: "scripts/brain/build-brain-asset.mjs" },
    scene: 0,
    scenes: [{ nodes: meshes.map((_, i) => i), extras }],
    nodes: meshes.map((m, i) => ({ name: m.name, mesh: i })),
    meshes: gltfMeshes,
    accessors,
    bufferViews: views,
    buffers: [{ byteLength }],
  };
  let jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(jsonPad, 0x20)]);
  const bin = Buffer.concat(
    chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength))
  );
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + bin.length, 8);
  const chunkHeader = (len, type) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(len, 0);
    h.writeUInt32LE(type, 4);
    return h;
  };
  writeFileSync(
    file,
    Buffer.concat([
      header,
      chunkHeader(jsonBytes.length, 0x4e4f534a),
      jsonBytes,
      chunkHeader(bin.length, 0x004e4942),
      bin,
    ])
  );
}

/* ── Geometry ─────────────────────────────────────────────────────────── */

function vertexNormals(position, index) {
  const n = new Float32Array(position.length);
  for (let f = 0; f < index.length; f += 3) {
    const [a, b, c] = [index[f] * 3, index[f + 1] * 3, index[f + 2] * 3];
    const e1 = [0, 1, 2].map((k) => position[b + k] - position[a + k]);
    const e2 = [0, 1, 2].map((k) => position[c + k] - position[a + k]);
    // Unnormalised cross product = area-weighted face normal.
    const cx = e1[1] * e2[2] - e1[2] * e2[1];
    const cy = e1[2] * e2[0] - e1[0] * e2[2];
    const cz = e1[0] * e2[1] - e1[1] * e2[0];
    for (const v of [a, b, c]) {
      n[v] += cx;
      n[v + 1] += cy;
      n[v + 2] += cz;
    }
  }
  for (let v = 0; v < n.length; v += 3) {
    const len = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
    n[v] /= len;
    n[v + 1] /= len;
    n[v + 2] /= len;
  }
  return n;
}

function neighbours(vertexCount, index) {
  const sets = Array.from({ length: vertexCount }, () => new Set());
  for (let f = 0; f < index.length; f += 3) {
    const [a, b, c] = [index[f], index[f + 1], index[f + 2]];
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  return sets.map((s) => Uint32Array.from(s));
}

/* Inflate by Laplacian smoothing; depth = how far below the inflated
   surface a vertex sits, along the inflated normal (FreeSurfer's sulc). */
function sulcalDepth(position, index, adj, iterations = 60) {
  const p = Float32Array.from(position);
  const next = new Float32Array(p.length);
  for (let it = 0; it < iterations; it++) {
    for (let v = 0; v < adj.length; v++) {
      const nb = adj[v];
      let x = 0,
        y = 0,
        z = 0;
      for (const u of nb) {
        x += p[u * 3];
        y += p[u * 3 + 1];
        z += p[u * 3 + 2];
      }
      const k = nb.length || 1;
      next[v * 3] = 0.5 * p[v * 3] + 0.5 * (x / k);
      next[v * 3 + 1] = 0.5 * p[v * 3 + 1] + 0.5 * (y / k);
      next[v * 3 + 2] = 0.5 * p[v * 3 + 2] + 0.5 * (z / k);
    }
    p.set(next);
  }
  const n = vertexNormals(p, index);
  const depth = new Float32Array(adj.length);
  for (let v = 0; v < adj.length; v++) {
    let d = 0;
    for (let k = 0; k < 3; k++)
      d += (position[v * 3 + k] - p[v * 3 + k]) * n[v * 3 + k];
    depth[v] = -d; // positive = below the envelope = sulcus
  }
  // Map the 2nd..98th percentile onto 0..255.
  const sorted = Float32Array.from(depth).sort();
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  return Uint8Array.from(depth, (d) =>
    Math.round(255 * Math.min(1, Math.max(0, (d - lo) / (hi - lo))))
  );
}

/* Vertex label = the area most of its faces belong to (0 if none). */
function vertexAreas(vertexCount, index, faceArea) {
  const counts = new Uint16Array(vertexCount * (AREAS.length + 1));
  for (let f = 0; f < faceArea.length; f++) {
    const a = faceArea[f];
    if (!a) continue;
    for (let k = 0; k < 3; k++)
      counts[index[f * 3 + k] * (AREAS.length + 1) + a]++;
  }
  const out = new Uint8Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) {
    let best = 0;
    for (let a = 1; a <= AREAS.length; a++) {
      const row = v * (AREAS.length + 1);
      if (counts[row + a] > counts[row + best]) best = a;
    }
    out[v] = best;
  }
  return out;
}

/* ── Main ─────────────────────────────────────────────────────────────── */

/*
 * The explorer bakes fsaverage RAS into three.js axes as x = -A, y = S,
 * z = R. That map has determinant -1: the brain comes out mirrored
 * (anterior on the wrong side for each hemisphere) and the triangles wind
 * inward, which its DoubleSide material hid. Flipping x back (x = A,
 * y = S, z = R) fixes both: the reflection restores FreeSurfer's outward
 * winding.
 */
const CALLOSAL_SULCUS_Y = -7;

function unmirror(position) {
  for (let i = 0; i < position.length; i += 3) position[i] = -position[i];
}

const regionMap = JSON.parse(
  readFileSync(path.join(srcDir, "region-map.json"), "utf8")
);
const meshes = ["left", "right"].map((hemi) => {
  const { position, index } = readGlb(path.join(srcDir, `brain-${hemi}.glb`));
  unmirror(position);
  const vertexCount = position.length / 3;
  const faceArea = new Uint8Array(index.length / 3);
  AREAS.forEach(([explorerKey], i) => {
    for (const f of regionMap[explorerKey]?.[hemi] || []) faceArea[f] = i + 1;
  });
  const adj = neighbours(vertexCount, index);
  const area = vertexAreas(vertexCount, index, faceArea);
  /*
   * The explorer's "hippocampus" group also holds S_pericallosal, the
   * callosal sulcus, which rings the corpus callosum high on the medial wall,
   * far from the parahippocampal gyrus and collateral sulci on the underside
   * of the temporal lobe. The two sit at clearly separate heights (below
   * y = -8 and above y = -6 in these units), so split by height and leave the
   * callosal ring unlabelled, like the rest of the medial wall.
   */
  const parahippocampal =
    AREAS.findIndex(([, id]) => id === "parahippocampal") + 1;
  for (let v = 0; v < vertexCount; v++)
    if (area[v] === parahippocampal && position[v * 3 + 1] > CALLOSAL_SULCUS_Y)
      area[v] = 0;
  const sulc = sulcalDepth(position, index, adj);
  const atlas = new Uint8Array(vertexCount * 4);
  for (let v = 0; v < vertexCount; v++) {
    atlas[v * 4] = area[v];
    atlas[v * 4 + 1] = sulc[v];
  }
  const labelled = area.reduce((s, a) => s + (a ? 1 : 0), 0);
  console.log(
    `${hemi}: ${vertexCount} vertices, ${index.length / 3} faces, ${labelled} labelled vertices`
  );
  return {
    name: hemi,
    position,
    normal: vertexNormals(position, index),
    atlas,
    index,
  };
});

writeGlb(outFile, meshes, {
  areas: ["", ...AREAS.map(([, id]) => id)],
  source:
    "FreeSurfer fsaverage6 pial surface; Destrieux atlas (nilearn) grouped into areas; via github.com/antonmogul/open-brain-explorer",
});
console.log(`wrote ${outFile}`);
