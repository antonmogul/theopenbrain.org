/*
 * The brain atlas's three.js stage (OPENBRAIN-127). Framework-free so the
 * Vue component stays a thin shell: BrainAtlas.vue creates one per canvas
 * and talks to it through the setters it returns.
 *
 * What it does:
 *   - loads the atlas model (two hemispheres, meshopt-compressed; see
 *     scripts/brain/build-brain-asset.mjs) and shades it in the material's
 *     shader: gyri light, sulci darker from the baked sulcal depth, and each
 *     area mixed toward its colour by a per-area amount (a resting tint for
 *     the chapters' parts, stronger when highlighted). Highlighting is a
 *     uniform per area. Areas light up in groups (o.groupFor): pointing at
 *     one part of a chapter lights all of that chapter's parts.
 *   - hinges each hemisphere on the anterior-posterior axis at the base of
 *     the medial wall, so `open` swings them apart like the covers of a book
 *     and shows the medial surfaces.
 *   - plays a Dopeframe (helper/brain/dopeframe.js): the camera, the book
 *     and the highlighted area follow the timeline. The reader can drag the
 *     brain at any time; RETURN_DELAY seconds after they let go the camera
 *     eases back onto the path (Tyler's "returns to the animated path").
 *   - picks on the GPU: the area under a pixel is read back from a 1×1
 *     render of area indices, so hover costs one tiny draw, not a raycast
 *     through 160k triangles. The same pick checks that a label's spot on
 *     an area is really in view before the label goes there.
 *   - positions one DOM label: at the pointer while hovering, otherwise on a
 *     visible point of the focused area (docked in the corner on narrow
 *     stages, where it would cover the brain).
 *   - draws only when something changed, and not at all off screen, in a
 *     hidden tab or while suspended.
 *
 * Errors never reach console.error (the story smoke fails on those): a
 * missing WebGL context is detected before three.js would log it, and it and
 * a missing model are reported through on.error.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { angleDelta, sampleDopeframe } from "./dopeframe";

export const BRAIN_MODEL_URL = "/publicAssets/models/brain/brain-v1.glb";

const OPEN_ANGLE = THREE.MathUtils.degToRad(80);
const OPEN_GAP = 1.5; // model units each hemisphere slides out as it opens
const RETURN_DELAY = 2.5; // s after the last drag before easing back
const RETURN_TIME = 2; // s to blend fully back onto the path
const PICK_INTERVAL = 40; // ms between hover picks
const LABEL_CHECK_INTERVAL = 150; // ms between label visibility checks
const LABEL_BOTTOM_INSET = 88; // px kept free for BrainAtlas's control row
const LABEL_SAMPLES = 6; // candidate label spots per area and hemisphere
const DRAG_THRESHOLD = 6; // px a press must move to count as turning
const NARROW_STAGE = 600; // px; below this the label docks in the corner
// How far each area mixes toward its colour: highlighted groups, and the
// resting tint of everything else while a group is highlighted (a share of
// its own resting tint, so the focus stands out).
const MIX = { tour: 0.85, hover: 0.85, selected: 0.92, dimmed: 0.45 };
// Where the camera goes when the book is opened or closed by hand (or a
// chapter is chosen): looking down into the open book from behind, or at
// the closed left side.
const BOOK_VIEWS = {
  open: { azimuth: 270, elevation: 62, distance: 122 },
  closed: { azimuth: 160, elevation: 12, distance: 110 },
};

const NOOP = Object.freeze({
  setPlaying() {},
  setOpen() {},
  setHover() {},
  setSelected() {},
  setAreaStyles() {},
  setSuspended() {},
  dispose() {},
});

function brainMaterial(count, surface) {
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.82,
    metalness: 0,
  });
  const uniforms = {
    uGyrus: { value: new THREE.Color(surface.gyrus) },
    uSulcus: { value: new THREE.Color(surface.sulcus) },
    uAreaColor: {
      value: Array.from({ length: count }, () => new THREE.Color()),
    },
    uAreaMix: { value: new Array(count).fill(0) },
    uGlow: { value: 0.3 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec4 _atlas;
uniform vec3 uAreaColor[${count}];
uniform float uAreaMix[${count}];
varying vec3 vAreaColor;
varying float vAreaMix;
varying float vSulc;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
int areaIndex = int(_atlas.x + 0.5);
vAreaColor = uAreaColor[areaIndex];
vAreaMix = uAreaMix[areaIndex];
vSulc = _atlas.y / 255.0;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uGyrus;
uniform vec3 uSulcus;
uniform float uGlow;
varying vec3 vAreaColor;
varying float vAreaMix;
varying float vSulc;`
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
vec3 surfaceColor = mix(uGyrus, uSulcus, smoothstep(0.12, 0.88, vSulc));
diffuseColor.rgb = mix(surfaceColor, vAreaColor, vAreaMix);`
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += vAreaColor * vAreaMix * uGlow;`
      );
  };
  material.customProgramCacheKey = () => `brain-atlas-${count}`;
  return { material, uniforms };
}

/* Writes each fragment's area index (red) with alpha 1; background stays 0.
   `flat` so a triangle on an area border reports one area, not a blend. */
function pickingMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `attribute vec4 _atlas;
flat varying float vArea;
void main() {
  vArea = _atlas.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `flat varying float vArea;
void main() {
  gl_FragColor = vec4(vArea / 255.0, 0.0, 0.0, 1.0);
}`,
  });
}

/*
 * Candidate label spots for each area, per hemisphere, in mesh space: the
 * vertex nearest the area's centroid, then the vertices farthest from the
 * ones already chosen, so the candidates spread over the area and one of
 * them is usually in view.
 */
function areaAnchors(geometry, count) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const atlas = geometry.attributes._atlas;
  const members = Array.from({ length: count }, () => []);
  for (let i = 0; i < pos.count; i++) {
    const a = Math.round(atlas.getX(i));
    if (a > 0 && a < count) members[a].push(i);
  }
  const p = new THREE.Vector3();
  return members.map((verts) => {
    if (!verts.length) return null;
    const pts = verts.map((i) =>
      new THREE.Vector3().fromBufferAttribute(pos, i)
    );
    const centroid = pts
      .reduce((s, v) => s.add(v), new THREE.Vector3())
      .divideScalar(pts.length);
    const chosen = [];
    const dist = pts.map((v) => v.distanceToSquared(centroid));
    for (let k = 0; k < Math.min(LABEL_SAMPLES, pts.length); k++) {
      // First pick: nearest the centroid; then: farthest from the chosen.
      let best = 0;
      for (let j = 1; j < pts.length; j++)
        if (k === 0 ? dist[j] < dist[best] : dist[j] > dist[best]) best = j;
      chosen.push(best);
      for (let j = 0; j < pts.length; j++)
        dist[j] = Math.min(
          k === 0 ? Infinity : dist[j],
          pts[j].distanceToSquared(pts[best])
        );
    }
    return chosen.map((j) => ({
      p: pts[j].clone(),
      n: p.fromBufferAttribute(nor, verts[j]).clone().normalize(),
    }));
  });
}

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLElement} [o.label]  element the stage positions over the focus
 * @param {string} [o.url]
 * @param {Array} o.dopeframe
 * @param {Record<string, {hex: string, base: number}>} o.areaStyles  colour
 *   and resting tint (0..1) per area id; update with setAreaStyles
 * @param {(id: string) => string[]} [o.groupFor]  the areas that light up
 *   with this one (default: just it)
 * @param {{gyrus: string, sulcus: string}} o.surface
 * @param {boolean} [o.playing]
 * @param {boolean} [o.reducedMotion]  ease nothing: jump to targets
 * @param {object} [o.on]  progress(f), ready(), error(kind), hover(id),
 *   select(id), focus(id), open(isOpen)
 */
export function createBrainStage(o) {
  const { canvas, label = null, url = BRAIN_MODEL_URL, dopeframe, on = {} } = o;
  const reducedMotion = !!o.reducedMotion;
  const groupFor = o.groupFor || ((id) => [id]);
  let areaStyles = o.areaStyles || {};

  // Ask for the context ourselves: three.js logs a console.error before it
  // throws when there is none, and that would fail the smoke tests.
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
  if (!gl) {
    on.error?.("webgl");
    return NOOP;
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context: gl });
  } catch (err) {
    on.error?.("webgl", err);
    return NOOP;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 1000);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 1.5));
  // Lights ride on the camera so the brain is lit the same from every side.
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(-50, 80, 60);
  camera.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
  rimLight.position.set(60, -10, -80);
  camera.add(rimLight);

  const rig = new THREE.Group();
  scene.add(rig);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false; // the wheel scrolls the page, not the brain
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI * 0.62;
  // One finger: a horizontal drag turns the brain, a vertical one scrolls
  // the page, and a pinch still zooms it (OrbitControls sets touch-action:
  // none, which traps phones).
  canvas.style.touchAction = "pan-y pinch-zoom";

  /* ── State ── */
  let playing = o.playing !== false;
  let time = 0;
  let follow = 1;
  let idle = Infinity;
  let interacting = false; // the reader is turning the brain
  let pressing = false; // a press that has not become a drag (yet)
  let open = 0;
  let manualOpen = null;
  let manualView = null;
  let reportedOpen = null;
  let hovered = null; // { id, fromPointer }
  let selected = []; // area ids
  let focusId = null;
  let disposed = false;
  let failed = false;
  let needsRender = true;

  let areaIds = [];
  let uniforms = null;
  let material = null;
  const hemis = []; // { mesh, pivot, side, anchors }
  let hingeY = 0;
  const mixTarget = [];

  const pointer = { x: 0, y: 0, inside: false, type: "mouse", dirty: false };
  let down = null;
  let lastPick = 0;
  const pickTarget = new THREE.WebGLRenderTarget(1, 1);
  const pickMaterial = pickingMaterial();
  const pickPixel = new Uint8Array(4);

  const size = { w: 1, h: 1 };
  // Pull back on narrow (portrait) stages so the whole brain stays in frame.
  const fitScale = () =>
    camera.aspect < 1.15
      ? Math.min(2, Math.pow(1.15 / camera.aspect, 0.85))
      : 1;
  let lastFit = 1;
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    size.w = w;
    size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Refit now, even when the camera is not following the tour.
    const fit = fitScale();
    camera.position
      .sub(controls.target)
      .multiplyScalar(fit / lastFit)
      .add(controls.target);
    lastFit = fit;
    needsRender = true;
  }

  /* ── Model ── */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    url,
    (gltf) => {
      if (disposed) return;
      build(gltf);
      needsRender = true;
      on.ready?.();
    },
    (e) => on.progress?.(e.total ? e.loaded / e.total : null),
    (err) => {
      if (disposed) return;
      failed = true; // nothing to draw: stop the loop
      sync();
      on.error?.("load", err);
    }
  );

  function build(gltf) {
    areaIds = gltf.scene.userData.areas || [];
    const count = Math.max(areaIds.length, 1);
    ({ material, uniforms } = brainMaterial(count, o.surface));
    applyColors();

    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const height = box.max.y - box.min.y;
    rig.position.copy(center).negate();
    // The hinge sits low on the medial wall, so the opened hemispheres lie
    // down like the two halves of a book on a table.
    hingeY = box.min.y + height * 0.22;

    for (const name of ["left", "right"]) {
      const mesh = gltf.scene.getObjectByName(name);
      if (!mesh?.isMesh) continue;
      const pivot = new THREE.Group();
      pivot.position.set(center.x, hingeY, 0);
      mesh.removeFromParent();
      mesh.position.sub(pivot.position);
      mesh.material = material;
      pivot.add(mesh);
      rig.add(pivot);
      hemis.push({
        mesh,
        pivot,
        side: name === "left" ? -1 : 1,
        anchors: areaAnchors(mesh.geometry, count),
      });
    }
    // The hinge's height relative to the brain's centre: where the camera
    // looks once the book is open.
    hingeY -= center.y;
  }

  function applyColors() {
    if (!uniforms) return;
    areaIds.forEach((id, i) => {
      const hex = id && areaStyles[id]?.hex;
      if (hex) uniforms.uAreaColor.value[i].set(hex);
    });
    needsRender = true;
  }

  /* ── Picking (GPU) ── */
  /** The area id at a stage pixel (CSS px), or null for background/none. */
  function pickAt(x, y) {
    if (!hemis.length || x < 0 || y < 0 || x >= size.w || y >= size.h)
      return null;
    camera.setViewOffset(size.w, size.h, Math.floor(x), Math.floor(y), 1, 1);
    scene.overrideMaterial = pickMaterial;
    renderer.setRenderTarget(pickTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.overrideMaterial = null;
    camera.clearViewOffset();
    renderer.readRenderTargetPixels(pickTarget, 0, 0, 1, 1, pickPixel);
    return pickPixel[3] ? areaIds[pickPixel[0]] || null : null;
  }

  function setHovered(next) {
    const id = next?.id || null;
    if (
      (hovered?.id || null) === id &&
      hovered?.fromPointer === next?.fromPointer
    )
      return;
    hovered = id ? next : null;
    canvas.style.cursor = hovered?.fromPointer ? "pointer" : "grab";
    needsRender = true;
    if (next?.fromPointer !== false) on.hover?.(id);
  }

  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  function onPointerMove(e) {
    Object.assign(pointer, local(e), {
      inside: true,
      type: e.pointerType,
      dirty: true,
    });
    // A press becomes a drag (the reader takes the camera) once it moves.
    if (down && !interacting) {
      if (Math.hypot(pointer.x - down.x, pointer.y - down.y) >= DRAG_THRESHOLD)
        interacting = true;
    }
  }
  function onPointerLeave() {
    pointer.inside = false;
    if (hovered?.fromPointer) setHovered(null);
  }
  function onPointerDown(e) {
    if (e.button !== 0 || !e.isPrimary) {
      down = null;
      return;
    }
    down = { ...local(e), t: performance.now() };
    pressing = true;
  }
  function endPress() {
    if (interacting) idle = 0;
    interacting = false;
    pressing = false;
    down = null;
  }
  function onPointerUp(e) {
    if (down && !interacting && performance.now() - down.t < 600) {
      const p = local(e);
      on.select?.(pickAt(p.x, p.y));
    }
    endPress();
  }
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", endPress);
  canvas.style.cursor = "grab";
  controls.addEventListener("end", endPress);

  /* ── Frame ── */
  let lastFrame = 0;
  const offset = new THREE.Vector3();
  const sph = new THREE.Spherical();
  const world = new THREE.Vector3();
  const worldN = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const ease = (dt, rate) => (reducedMotion ? 1 : 1 - Math.exp(-dt * rate));

  function placeCamera(pose, k) {
    offset.copy(camera.position).sub(controls.target);
    sph.setFromVector3(offset);
    const az = THREE.MathUtils.radToDeg(sph.theta);
    const el = 90 - THREE.MathUtils.radToDeg(sph.phi);
    const radius = sph.radius || pose.distance;
    sph.set(
      radius + (pose.distance * fitScale() - radius) * k,
      THREE.MathUtils.degToRad(90 - (el + (pose.elevation - el) * k)),
      THREE.MathUtils.degToRad(az + angleDelta(az, pose.azimuth) * k)
    );
    camera.position.copy(controls.target).add(offset.setFromSpherical(sph));
  }

  /* The screen point of one candidate spot, or null when it faces away or
     falls outside the stage. */
  function candidatePoint(h, c) {
    world.copy(c.p).applyMatrix4(h.mesh.matrixWorld);
    worldN.copy(c.n).transformDirection(h.mesh.matrixWorld);
    if (worldN.dot(toCam.copy(camera.position).sub(world).normalize()) < 0.05)
      return null;
    world.project(camera);
    if (world.z > 1) return null;
    const x = (world.x * 0.5 + 0.5) * size.w;
    const y = (-world.y * 0.5 + 0.5) * size.h;
    return x >= 0 && y >= 0 && x < size.w && y < size.h ? { x, y } : null;
  }

  /*
   * Where the label for `id` goes: a candidate spot that faces the camera
   * and that the GPU pick confirms is that area (not hidden behind another).
   * The last spot is kept while it stays visible, so the label does not hop
   * between hemispheres; the check itself runs every LABEL_CHECK_INTERVAL.
   */
  let labelSpot = null; // { id, h, c } | { id, hidden: true }
  let lastLabelCheck = 0;
  function focusPoint(id, now) {
    const index = areaIds.indexOf(id);
    if (index < 1) return null;
    const same = labelSpot?.id === id;
    if (same && now - lastLabelCheck < LABEL_CHECK_INTERVAL)
      return labelSpot.hidden ? null : candidatePoint(labelSpot.h, labelSpot.c);
    lastLabelCheck = now;
    const prev = same && !labelSpot.hidden ? labelSpot : null;
    if (prev) {
      const at = candidatePoint(prev.h, prev.c);
      if (at && pickAt(at.x, at.y) === id) return at;
    }
    // The hemisphere used last goes first.
    const order = prev ? [prev.h, ...hemis.filter((h) => h !== prev.h)] : hemis;
    for (const h of order) {
      for (const c of h.anchors[index] || []) {
        const at = candidatePoint(h, c);
        if (at && pickAt(at.x, at.y) === id) {
          labelSpot = { id, h, c };
          return at;
        }
      }
    }
    labelSpot = { id, hidden: true };
    return null;
  }

  function placeLabel(pose, now) {
    const id = hovered?.id || selected[0] || (playing ? pose.area : "") || null;
    if (id !== focusId) {
      focusId = id;
      on.focus?.(id);
    }
    if (!label) return;
    let at = null;
    if (id && hovered?.fromPointer && pointer.inside) {
      at = { x: pointer.x + 16, y: pointer.y + 16 };
    } else if (id && size.w < NARROW_STAGE) {
      at = { x: 12, y: 12 }; // narrow stage: a caption, not a pin
    } else if (id) {
      const spot = focusPoint(id, now);
      if (spot) at = { x: spot.x + 10, y: spot.y - 10 };
    }
    if (!at) {
      label.dataset.visible = "false";
      return;
    }
    const lw = label.offsetWidth;
    const lh = label.offsetHeight;
    // Keep clear of the stage edges and of the control row along the bottom.
    const x = Math.min(Math.max(8, at.x), size.w - lw - 8);
    const y = Math.min(Math.max(8, at.y), size.h - lh - LABEL_BOTTOM_INSET);
    label.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    label.dataset.visible = "true";
  }

  let first = true;
  function frame(now) {
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
    lastFrame = now;
    if (playing && hemis.length) time += dt; // the tour starts with the model
    const pose = sampleDopeframe(dopeframe, time);

    if (interacting) {
      follow = 0;
      idle = 0;
      manualView = null; // the reader has taken the camera
    } else {
      idle += dt;
      if (manualView || (playing && idle > RETURN_DELAY))
        follow = reducedMotion ? 1 : Math.min(1, follow + dt / RETURN_TIME);
    }
    const view = manualView || (playing ? pose : null);

    const lastOpen = open;
    open += ((manualOpen ?? pose.open) - open) * ease(dt, 3);
    const isOpen = (manualOpen ?? pose.open) >= 0.5;
    if (isOpen !== reportedOpen) {
      reportedOpen = isOpen;
      on.open?.(isOpen);
    }
    const openMoved = Math.abs(open - lastOpen) > 1e-4;
    if (openMoved || first) {
      for (const h of hemis) {
        h.pivot.rotation.x = h.side * OPEN_ANGLE * open;
        h.pivot.position.z = h.side * OPEN_GAP * open;
      }
      controls.target.set(0, hingeY * open, 0);
    }

    if (first) {
      placeCamera(pose, 1);
      first = false;
    } else if (follow > 0 && view && !pressing) {
      placeCamera(view, ease(dt, 2.5 * follow));
    }
    const moved = controls.update() || openMoved;

    // The brain moved under a resting pointer: what it points at changed.
    if (moved && pointer.inside) pointer.dirty = true;
    if (pointer.dirty && pointer.type === "mouse" && !interacting) {
      if (now - lastPick > PICK_INTERVAL) {
        lastPick = now;
        pointer.dirty = false;
        const id = pickAt(pointer.x, pointer.y);
        setHovered(
          id ? { id, fromPointer: true } : hovered?.fromPointer ? null : hovered
        );
      }
    }

    let tinting = false;
    if (uniforms) {
      const tour =
        playing && !hovered && !selected.length && pose.area
          ? groupFor(pose.area)
          : [];
      const hover = hovered ? groupFor(hovered.id) : [];
      const focusing = tour.length || hover.length || selected.length;
      areaIds.forEach((id, i) => {
        const base = (id && areaStyles[id]?.base) || 0;
        let m = focusing ? base * MIX.dimmed : base;
        if (tour.includes(id)) m = MIX.tour;
        if (selected.includes(id)) m = MIX.selected;
        if (hover.includes(id)) m = Math.max(m, MIX.hover);
        mixTarget[i] = m;
      });
      const k = ease(dt, 9);
      const mix = uniforms.uAreaMix.value;
      for (let i = 0; i < mix.length; i++) {
        const next = mix[i] + ((mixTarget[i] || 0) - mix[i]) * k;
        if (Math.abs(next - mix[i]) > 1e-4) tinting = true;
        mix[i] = next;
      }
    }

    // Draw only when something on screen changed.
    if (moved || tinting || needsRender) {
      needsRender = false;
      scene.updateMatrixWorld();
      placeLabel(pose, now);
      renderer.render(scene, camera);
    }
  }

  /* ── Run only while visible ── */
  let onScreen = true;
  let suspended = false;
  function sync() {
    const run =
      !disposed && !failed && !suspended && onScreen && !document.hidden;
    if (run) {
      lastFrame = 0; // drop the time spent paused
      needsRender = true;
    }
    renderer.setAnimationLoop(run ? frame : null);
  }
  const io =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          onScreen = entries[entries.length - 1].isIntersecting;
          sync();
        })
      : null;
  io?.observe(canvas);
  const ro =
    typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  resize();
  sync();

  return {
    setPlaying(value) {
      playing = !!value;
      if (playing) {
        manualOpen = null;
        manualView = null;
        idle = RETURN_DELAY; // start easing back now
      }
      needsRender = true;
    },
    /**
     * true/false to hold the book open/closed (the camera moves to look at
     * it until the reader drags); null to follow the tour.
     */
    setOpen(value) {
      manualOpen = value == null ? null : value ? 1 : 0;
      manualView =
        value == null ? null : value ? BOOK_VIEWS.open : BOOK_VIEWS.closed;
      needsRender = true;
    },
    /** Highlight from outside the canvas (the legend); label sits on the area. */
    setHover(id) {
      if (hovered?.fromPointer && !id) return;
      setHovered(id ? { id, fromPointer: false } : null);
    },
    /** The selected areas (a chapter's parts, or one area); [] for none. */
    setSelected(ids) {
      selected = ids || [];
      needsRender = true;
    },
    setAreaStyles(styles) {
      areaStyles = styles || {};
      applyColors();
    },
    /** Stop rendering while something covers the stage (the nav drawer). */
    setSuspended(value) {
      suspended = !!value;
      sync();
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", endPress);
      controls.removeEventListener("end", endPress);
      controls.dispose();
      for (const h of hemis) h.mesh.geometry.dispose();
      // three keeps one module-level DFG lookup texture for every
      // MeshStandardMaterial, and each renderer that drew one leaves a
      // dispose listener on it, which keeps this renderer, its context and
      // the model alive after unmount. Disposing it drops those listeners
      // (another live renderer just re-uploads the 16×16 texture).
      if (material) {
        renderer.properties.get(material).uniforms?.dfgLUT?.value?.dispose();
        material.dispose();
      }
      pickMaterial.dispose();
      pickTarget.dispose();
      renderer.dispose();
      renderer.forceContextLoss(); // free the context and its buffers now
    },
  };
}
