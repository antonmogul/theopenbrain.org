<script setup>
/*
 * Phrenology3DView — Widget 1 (History chapter), the 3D version.
 * Figma: Open-Brain-Chapters, "Widget 1 – Phrenology" (3:747) for the chrome,
 * Assets (24:31) for the faculty maps.
 *
 * A three.js skull (public/publicAssets/models/skull.glb) wearing the Figma
 * faculty map. The map is not painted into the model: the three designed
 * views (front, side, back SVGs, helper/phrenologyMaps) are PROJECTED onto
 * it in the material's shader, each along its own axis, and blended by which
 * way the surface faces. So the regions are exactly the designer's shapes,
 * and a new map from Figma is a file swap.
 *
 * Clicking the skull picks the region under the pointer from the same maps
 * (CPU-side id raster); the region lights up in violet and the card opens.
 * Number markers sit on the skull surface at each region's centroid, found by
 * raycasting the map onto the mesh, and show for the view you are closest to,
 * like the three flat plates in the design. Anterior / Lateral / Posterior
 * glide the camera to those plates.
 *
 * Faculty names and blurbs come from the mock seam @/mocks/phrenology, for
 * the regions whose numbering is known to match (see attachFacultyInfo).
 *
 * Unlisted route: /phrenology-3d.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import { PHRENOLOGY_CITATION, usePhrenology } from "@/mocks/phrenology";
import {
  MAP_H,
  MAP_SRC,
  MAP_W,
  facultyInfoByNumber,
  loadRegionMap,
} from "@/helper/phrenologyMaps";
import { reducedMotionK } from "@/helper/motion";

const MODEL_SRC = "/publicAssets/models/skull.glb";
const K = reducedMotionK();

/*
 * Registration: how each 750 × 725 plate sits on the model. Two landmark
 * pairs per axis, (model metres → plate pixels), fitted by hand-measured
 * points because the engravings are not orthographic (the lateral plate is
 * drawn slightly oblique) and the model carries a mandible they lack:
 *   vertical  — crown, and the centre of the eye socket;
 *   horizontal — front/back: the skull's widest extent; side: the back of the
 *                skull and the eye socket, at socket height.
 * Plate points from skull-*.png; model points measured on skull.glb by
 * raycasting (eye sockets at x ±0.036, y 0.1456, z 0.085; back of skull at
 * z −0.16 at that height). Re-measure if the GLB is swapped.
 */
const FIT = {
  front: {
    u: [
      [-0.1021, 69.2],
      [0.102, 679.2],
    ], // model x
    v: [
      [0.2527, 39.2],
      [0.1456, 408],
    ], // model y
  },
  back: {
    u: [
      [0.102, 50],
      [-0.1021, 698.3],
    ], // model x, mirrored from behind
    // No socket from behind: the front plate's crown-to-socket ratio.
    v: [
      [0.2527, 40.8],
      [0.1456, 433.4],
    ],
  },
  // The lateral plate is a three-quarter view (tilted ~21°, the long axis
  // foreshortened), so it gets a full affine fit, least squares over four
  // landmarks: [model z, model y, plate x, plate y]. Residual ≈ 26 px.
  side: [
    [-0.001, 0.2527, 353.7, 51.7], // crown
    [-0.1696, 0.108, 45.8, 352.5], // back-most point
    [0.085, 0.1456, 555, 455], // eye socket
    [-0.079, 0.0, 246.7, 658.3], // skull base, behind the jaw
  ],
};
// Plate maps are affine: ix = A·(coord, y, 1), iy = B·(coord, y, 1), where
// coord is model x for front/back and model z for the side.
function separable({ u: [[m1, p1], [m2, p2]], v: [[n1, q1], [n2, q2]] }) {
  const a = (p2 - p1) / (m2 - m1);
  const c = (q2 - q1) / (n2 - n1);
  return { A: [a, 0, p1 - a * m1], B: [0, c, q1 - c * n1] };
}
function leastSquares(points) {
  // Normal equations for [coord, y, 1] → ix and → iy.
  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const rx = [0, 0, 0];
  const ry = [0, 0, 0];
  for (const [u, v, x, y] of points) {
    const r = [u, v, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) M[i][j] += r[i] * r[j];
      rx[i] += r[i] * x;
      ry[i] += r[i] * y;
    }
  }
  const solve = (rhs) => {
    const m = M.map((row, i) => [...row, rhs[i]]);
    for (let i = 0; i < 3; i++) {
      const p = m[i][i];
      for (let j = i; j < 4; j++) m[i][j] /= p;
      for (let k = 0; k < 3; k++) {
        if (k === i) continue;
        const f = m[k][i];
        for (let j = i; j < 4; j++) m[k][j] -= f * m[i][j];
      }
    }
    return m.map((row) => row[3]);
  };
  return { A: solve(rx), B: solve(ry) };
}
// Plate pixel → model (coord, y): invert the 2 × 2 part.
function toModel({ A, B }, ix, iy) {
  const det = A[0] * B[1] - A[1] * B[0];
  const x = ix - A[2];
  const y = iy - B[2];
  return [(x * B[1] - A[1] * y) / det, (A[0] * y - B[0] * x) / det];
}
function toPlate({ A, B }, coord, y) {
  return [A[0] * coord + A[1] * y + A[2], B[0] * coord + B[1] * y + B[2]];
}
// The three plates as camera azimuths (radians, 0 = looking at the face).
const VIEWS = [
  { id: "anterior", label: "Anterior", map: "front", azimuth: 0 },
  { id: "lateral", label: "Lateral", map: "side", azimuth: -Math.PI / 2 },
  { id: "posterior", label: "Posterior", map: "back", azimuth: Math.PI },
];

const stageEl = ref(null);
const canvasEl = ref(null);
const loading = ref(true);
const failed = ref(false);
const activeView = ref("anterior");
const selected = shallowRef(null); // { n, name, blurb }
const markers = shallowRef([]); // [{ key, n, view, sign, pos, normal }]
const markerEls = {};

const { fetchViews } = usePhrenology();
const facultyInfo = new Map(); // n → { name, blurb }

let renderer, scene, camera, controls, skull, raf;
let maps = {}; // view → loadRegionMap() result
let xf = {}; // view → { A, B } model → plate px (affine)
let uniforms = null;
let ro = null;
let camTween = null;

const cardOpen = computed(() => !!selected.value);

// ── Region maps → shader ────────────────────────────────────────────────────
function fitRegistration() {
  xf = {
    front: separable(FIT.front),
    back: separable(FIT.back),
    side: leastSquares(FIT.side),
  };
}

const v3 = (arr) => new THREE.Vector3(...arr);

function mapTexture(canvas, nearest) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = nearest ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (nearest) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  } else {
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  return t;
}

function patchMaterial(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;"
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWNrm = normalize(mat3(modelMatrix) * objectNormal);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vWPos;
        varying vec3 vWNrm;
        uniform sampler2D uMapF, uMapS, uMapB, uIdF, uIdS, uIdB;
        uniform vec3 uAF, uBF, uAS, uBS, uAB, uBB;
        uniform float uSel, uHover, uReveal;
        uniform vec3 uSelColor;
        vec2 plateUv(vec3 A, vec3 B, float coord, float y) {
          vec3 p = vec3(coord, y, 1.0);
          return vec2(dot(A, p) / ${MAP_W.toFixed(1)},
                      1.0 - dot(B, p) / ${MAP_H.toFixed(1)});
        }
        float onPlate(vec2 uv) {
          return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        }`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec3 n = normalize(vWNrm);
          // Sharp blend so each region reads from one plate, not two.
          vec3 w = pow(abs(n), vec3(6.0));
          float wF = n.z > 0.0 ? w.z : 0.0;
          float wB = n.z < 0.0 ? w.z : 0.0;
          float wS = w.x;
          float sum = wF + wB + wS + 1e-5;
          wF /= sum; wB /= sum; wS /= sum;

          vec2 uvF = plateUv(uAF, uBF, vWPos.x, vWPos.y);
          vec2 uvS = plateUv(uAS, uBS, vWPos.z, vWPos.y);
          vec2 uvB = plateUv(uAB, uBB, vWPos.x, vWPos.y);
          vec4 cF = texture2D(uMapF, uvF) * onPlate(uvF);
          vec4 cS = texture2D(uMapS, uvS) * onPlate(uvS);
          vec4 cB = texture2D(uMapB, uvB) * onPlate(uvB);
          float a = wF * cF.a + wS * cS.a + wB * cB.a;
          vec3 map = (wF * cF.rgb * cF.a + wS * cS.rgb * cS.a + wB * cB.rgb * cB.a) / max(a, 1e-4);

          // Region id from the plate that dominates here.
          float id = 0.0;
          if (wF >= wS && wF >= wB) id = texture2D(uIdF, uvF).r * onPlate(uvF);
          else if (wS >= wB) id = texture2D(uIdS, uvS).r * onPlate(uvS);
          else id = texture2D(uIdB, uvB).r * onPlate(uvB);
          id = floor(id * 255.0 + 0.5);

          diffuseColor.rgb = mix(diffuseColor.rgb, map, a * 0.92 * uReveal);
          if (id > 0.5 && abs(id - uHover) < 0.5)
            diffuseColor.rgb = mix(diffuseColor.rgb, uSelColor, 0.35 * uReveal);
          if (id > 0.5 && abs(id - uSel) < 0.5)
            diffuseColor.rgb = mix(diffuseColor.rgb, uSelColor, 0.78 * uReveal);
        }`
      );
  };
  material.needsUpdate = true;
}

// ── Picking ────────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function dominantPlate(normal) {
  const ax = Math.abs(normal.x);
  const az = Math.abs(normal.z);
  if (az >= ax) return normal.z >= 0 ? "front" : "back";
  return "side";
}

function regionAt(point, normal) {
  const view = dominantPlate(normal);
  const coord = view === "side" ? point.z : point.x;
  const [ix, iy] = toPlate(xf[view], coord, point.y);
  return maps[view]?.idAt(ix, iy) || null;
}

function hitAt(clientX, clientY) {
  const rect = canvasEl.value.getBoundingClientRect();
  ndc.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(skull, true)[0];
  if (!hit?.face) return null;
  const normal = hit.face.normal
    .clone()
    .transformDirection(hit.object.matrixWorld);
  return regionAt(hit.point, normal);
}

let downAt = null;
function onPointerDown(e) {
  downAt = { x: e.clientX, y: e.clientY };
}
function onPointerUp(e) {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 5) return; // that was an orbit drag, not a click
  const region = hitAt(e.clientX, e.clientY);
  if (region) select(region.n);
}
function onPointerMove(e) {
  if (!uniforms || e.buttons) return;
  const region = hitAt(e.clientX, e.clientY);
  uniforms.uHover.value = region ? region.n : -1;
  canvasEl.value.style.cursor = region ? "pointer" : "grab";
}
function onPointerLeave() {
  if (uniforms) uniforms.uHover.value = -1;
}

function select(n) {
  const info = facultyInfo.get(n);
  selected.value = { n, name: info?.name || null, blurb: info?.blurb || null };
  if (uniforms) uniforms.uSel.value = n;
}
function closeCard() {
  selected.value = null;
  if (uniforms) uniforms.uSel.value = -1;
}

// ── Markers: region centroids raycast onto the skull ───────────────────────
function buildMarkers(box) {
  const out = [];
  const pad = 0.5;
  const cast = (origin, dir) => {
    raycaster.set(origin, dir);
    const hit = raycaster.intersectObject(skull, true)[0];
    if (!hit?.face) return null;
    return {
      pos: hit.point.clone(),
      normal: hit.face.normal
        .clone()
        .transformDirection(hit.object.matrixWorld),
    };
  };
  for (const view of ["front", "side", "back"]) {
    for (const c of maps[view].centroids) {
      const [coord, y] = toModel(xf[view], c.x, c.y);
      const shots =
        view === "front"
          ? [
              [
                new THREE.Vector3(coord, y, box.max.z + pad),
                new THREE.Vector3(0, 0, -1),
                0,
              ],
            ]
          : view === "back"
            ? [
                [
                  new THREE.Vector3(coord, y, box.min.z - pad),
                  new THREE.Vector3(0, 0, 1),
                  0,
                ],
              ]
            : [
                [
                  new THREE.Vector3(box.max.x + pad, y, coord),
                  new THREE.Vector3(-1, 0, 0),
                  1,
                ],
                [
                  new THREE.Vector3(box.min.x - pad, y, coord),
                  new THREE.Vector3(1, 0, 0),
                  -1,
                ],
              ];
      for (const [origin, dir, sign] of shots) {
        const hit = cast(origin, dir);
        if (!hit) continue;
        out.push({
          key: `${view}-${c.n}-${c.part}-${sign}`,
          n: c.n,
          view,
          sign,
          ...hit,
        });
      }
    }
  }
  markers.value = out;
}

const tmp = new THREE.Vector3();
const toCam = new THREE.Vector3();
function placeMarkers() {
  if (!markers.value.length) return;
  const rect = canvasEl.value.getBoundingClientRect();
  toCam.copy(camera.position).sub(controls.target).normalize();
  const plate =
    Math.abs(toCam.z) >= Math.abs(toCam.x)
      ? toCam.z >= 0
        ? "front"
        : "back"
      : "side";
  const side = Math.sign(toCam.x);
  for (const m of markers.value) {
    const el = markerEls[m.key];
    if (!el) continue;
    const facing = m.normal.dot(
      tmp.copy(camera.position).sub(m.pos).normalize()
    );
    const show =
      m.view === plate &&
      (m.view !== "side" || m.sign === side) &&
      facing > 0.25;
    if (!show) {
      el.style.visibility = "hidden";
      continue;
    }
    tmp.copy(m.pos).project(camera);
    el.style.visibility = "visible";
    el.style.transform = `translate(${((tmp.x + 1) / 2) * rect.width}px, ${((1 - tmp.y) / 2) * rect.height}px) translate(-50%, -50%)`;
  }
}

// ── Camera ─────────────────────────────────────────────────────────────────
function goTo(viewId) {
  const v = VIEWS.find((x) => x.id === viewId);
  if (!v || !controls) return;
  activeView.value = viewId;
  const offset = camera.position.clone().sub(controls.target);
  const sph = new THREE.Spherical().setFromVector3(offset);
  // Shortest way round to the target azimuth.
  let to = v.azimuth;
  while (to - sph.theta > Math.PI) to -= 2 * Math.PI;
  while (to - sph.theta < -Math.PI) to += 2 * Math.PI;
  const state = { theta: sph.theta, phi: sph.phi };
  camTween?.kill();
  camTween = gsap.to(state, {
    theta: to,
    phi: Math.PI / 2 - 0.12,
    duration: 0.9 * K,
    ease: "power2.inOut",
    onUpdate: () => {
      sph.theta = state.theta;
      sph.phi = state.phi;
      camera.position
        .copy(controls.target)
        .add(new THREE.Vector3().setFromSpherical(sph));
      camera.lookAt(controls.target);
    },
  });
}

function onControlsChange() {
  // Keep the tab in step with free orbiting.
  const off = camera.position.clone().sub(controls.target);
  const theta = Math.atan2(off.x, off.z);
  const near = VIEWS.map((v) => ({
    id: v.id,
    d: Math.abs(
      Math.atan2(Math.sin(theta - v.azimuth), Math.cos(theta - v.azimuth))
    ),
  })).sort((a, b) => a.d - b.d)[0];
  if (near.d < Math.PI / 4) activeView.value = near.id;
}

// ── Setup ──────────────────────────────────────────────────────────────────
function resize() {
  const el = stageEl.value;
  if (!el || !renderer) return;
  const { clientWidth: w, clientHeight: h } = el;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Framed for a landscape stage; a narrower one (card open, phone) zooms
  // out so the whole skull stays in view instead of being cropped.
  camera.zoom = Math.min(1, camera.aspect / 1.15);
  camera.updateProjectionMatrix();
}

function loop() {
  raf = requestAnimationFrame(loop);
  if (document.hidden) return;
  controls.update();
  renderer.render(scene, camera);
  placeMarkers();
}

async function attachFacultyInfo() {
  for (const [n, info] of facultyInfoByNumber(await fetchViews()))
    facultyInfo.set(n, info);
}

onMounted(async () => {
  renderer = new THREE.WebGLRenderer({
    canvas: canvasEl.value,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3440, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1.5, 2.5, 2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(-2, 1, -1.5);
  scene.add(rim);

  controls = new OrbitControls(camera, canvasEl.value);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.addEventListener("change", onControlsChange);
  controls.addEventListener("start", () => camTween?.kill());

  resize();
  ro = new ResizeObserver(resize);
  ro.observe(stageEl.value);
  loop();

  try {
    const [gltf, front, side, back] = await Promise.all([
      new GLTFLoader().loadAsync(MODEL_SRC),
      loadRegionMap(MAP_SRC.front),
      loadRegionMap(MAP_SRC.side),
      loadRegionMap(MAP_SRC.back),
    ]);
    maps = { front, side, back };
    skull = gltf.scene;
    scene.add(skull);
    skull.updateMatrixWorld(true);
    // precise: from the vertices. The quick box is the geometry's box pushed
    // through the node's rotation, which inflates it (0.34 m long here).
    const box = new THREE.Box3().setFromObject(skull, true);
    fitRegistration();
    if (import.meta.env.DEV)
      window.__phreno = { box, xf, maps, skull, camera, controls, THREE };

    uniforms = {
      uMapF: { value: mapTexture(front.display) },
      uMapS: { value: mapTexture(side.display) },
      uMapB: { value: mapTexture(back.display) },
      uIdF: { value: mapTexture(front.ids, true) },
      uIdS: { value: mapTexture(side.ids, true) },
      uIdB: { value: mapTexture(back.ids, true) },
      uAF: { value: v3(xf.front.A) },
      uBF: { value: v3(xf.front.B) },
      uAS: { value: v3(xf.side.A) },
      uBS: { value: v3(xf.side.B) },
      uAB: { value: v3(xf.back.A) },
      uBB: { value: v3(xf.back.B) },
      uSel: { value: -1 },
      uHover: { value: -1 },
      uReveal: { value: 0 },
      uSelColor: { value: new THREE.Color("#8d4cf6") },
    };
    skull.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      patchMaterial(o.material);
    });

    // Frame the skull.
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    controls.target.copy(center);
    controls.minDistance = size * 0.9;
    controls.maxDistance = size * 3;
    camera.position
      .copy(center)
      .add(new THREE.Vector3(0, size * 0.12, size * 1.9));
    camera.near = size / 100;
    camera.far = size * 20;
    camera.updateProjectionMatrix();
    controls.update();

    buildMarkers(box);
    await attachFacultyInfo();
    loading.value = false;
    gsap.to(uniforms.uReveal, { value: 1, duration: 0.8 * K, delay: 0.2 * K });
  } catch (err) {
    console.error("Phrenology3DView: failed to load the skull or maps", err);
    failed.value = true;
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  camTween?.kill();
  ro?.disconnect();
  controls?.dispose();
  scene?.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  if (uniforms)
    for (const u of Object.values(uniforms))
      u.value?.isTexture && u.value.dispose();
  renderer?.dispose();
});

function onKeydown(e) {
  if (e.key === "Escape") closeCard();
}
</script>

<template>
  <section class="phreno3d" aria-label="Phrenology, 3D" @keydown="onKeydown">
    <header class="phreno3d__head">
      <h2 class="phreno3d__title">Phrenology</h2>
    </header>
    <nav class="tabs" aria-label="Skull views">
      <button
        v-for="v in VIEWS"
        :key="v.id"
        type="button"
        class="tabs__btn"
        :class="{ 'tabs__btn--on': activeView === v.id }"
        :aria-pressed="activeView === v.id"
        @click="goTo(v.id)"
      >
        {{ v.label }}
      </button>
    </nav>

    <div class="body" :class="{ 'body--card': cardOpen }">
      <div ref="stageEl" class="stage">
        <canvas
          ref="canvasEl"
          class="stage__canvas"
          @pointerdown="onPointerDown"
          @pointerup="onPointerUp"
          @pointermove="onPointerMove"
          @pointerleave="onPointerLeave"
        ></canvas>
        <div class="markers">
          <button
            v-for="m in markers"
            :key="m.key"
            :ref="(el) => el && (markerEls[m.key] = el)"
            type="button"
            class="marker"
            :class="{ 'marker--on': selected?.n === m.n }"
            :aria-label="`Faculty ${m.n}`"
            @click="select(m.n)"
          >
            {{ m.n }}
          </button>
        </div>
        <p v-if="loading" class="stage__note">Loading the skull…</p>
        <p v-else-if="failed" class="stage__note">
          The 3D skull could not be loaded.
          <a href="/phrenology">Open the 2D version</a>.
        </p>
        <p v-else class="stage__hint">
          Drag to turn the skull · Scroll to zoom · Click a region
        </p>
      </div>

      <transition name="card">
        <aside
          v-if="selected"
          class="card"
          role="dialog"
          :aria-label="`Faculty ${selected.n}`"
        >
          <button
            type="button"
            class="card__close"
            aria-label="Close"
            @click="closeCard"
          >
            ✕
          </button>
          <span class="card__badge">
            <i class="card__num">{{ selected.n }}</i>
            {{ selected.name || `Faculty ${selected.n}` }}
          </span>
          <p v-if="selected.blurb" class="card__text">{{ selected.blurb }}</p>
          <p v-else class="card__text card__text--mute">
            A description of this faculty is still to come from the authors.
          </p>
        </aside>
      </transition>
    </div>

    <footer class="phreno3d__foot">
      <span>{{ PHRENOLOGY_CITATION }}</span>
      <a href="/phrenology" class="phreno3d__link">2D version</a>
    </footer>
  </section>
</template>

<style scoped>
/* The Figma widget plate (#333) and the History ramp for the accents. */
.phreno3d {
  --plate: #333;
  --line: rgb(255 255 255 / 0.18);
  --violet: rgb(var(--color-chapter));
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: min(100vh, 860px);
  background: var(--plate);
  color: #fff;
  font-family: var(--font-ui, var(--font-body));
}
.phreno3d__head {
  padding: 1rem 1.5rem;
}
.phreno3d__title {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 1rem;
}
.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}
.tabs__btn {
  padding: 0.7rem 0.5rem;
  border: 0;
  border-right: 1px solid var(--line);
  background: transparent;
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.tabs__btn:last-child {
  border-right: 0;
}
.tabs__btn:hover {
  background: rgb(255 255 255 / 0.06);
}
.tabs__btn--on,
.tabs__btn--on:hover {
  background: var(--violet);
}
.tabs__btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: -2px;
}

.body {
  position: relative;
  flex: 1;
  display: flex;
  min-height: 0;
}
.stage {
  position: relative;
  flex: 1;
  min-height: 420px;
  overflow: hidden;
}
.stage__canvas {
  /* index.css gives every canvas z-index 10 (a legacy full-screen effect);
     keep this one under the number markers. */
  z-index: 0;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  touch-action: none;
}
.stage__canvas:active {
  cursor: grabbing;
}
.stage__note,
.stage__hint {
  position: absolute;
  left: 0;
  right: 0;
  margin: 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(255 255 255 / 0.6);
  pointer-events: none;
}
.stage__note {
  top: 50%;
  pointer-events: auto;
}
.stage__note a {
  color: #fff;
}
.stage__hint {
  bottom: 0.9rem;
}

.markers {
  z-index: 1;
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.marker {
  position: absolute;
  left: 0;
  top: 0;
  visibility: hidden;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--violet);
  border-radius: 50%;
  background: #fff;
  color: var(--violet);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
}
.marker:hover,
.marker:focus-visible,
.marker--on {
  background: var(--violet);
  color: #fff;
  outline: none;
}

.card {
  position: relative;
  flex: none;
  width: min(360px, 38%);
  margin: 1rem 1rem 1rem 0;
  padding: 1.5rem 1.25rem;
  background: #f4f1ea;
  color: #1a1a1a;
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
  overflow-y: auto;
}
.card__close {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.06);
  cursor: pointer;
}
.card__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.7rem 0.3rem 0.3rem;
  border-radius: 999px;
  background: var(--violet);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
.card__num {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  color: var(--violet);
  font-style: normal;
  font-size: 0.7rem;
}
.card__text {
  margin: 1rem 0 0;
  font-size: 0.95rem;
  line-height: 1.55;
}
.card__text--mute {
  color: rgb(0 0 0 / 0.55);
  font-size: 0.85rem;
}
.card-enter-active,
.card-leave-active {
  transition:
    transform 0.35s ease,
    opacity 0.35s ease;
}
.card-enter-from,
.card-leave-to {
  transform: translateX(24px);
  opacity: 0;
}

.phreno3d__foot {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--line);
  font-size: 0.75rem;
  font-style: italic;
  font-weight: 600;
}
.phreno3d__link {
  color: #fff;
  font-style: normal;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .body {
    flex-direction: column;
  }
  .stage {
    min-height: 60vh;
  }
  .card {
    width: auto;
    margin: 0 0.75rem 0.75rem;
  }
}
</style>
