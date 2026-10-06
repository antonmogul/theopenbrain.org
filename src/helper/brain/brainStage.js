/*
 * The brain atlas's three.js stage (OPENBRAIN-127). Framework-free so the
 * Vue component stays a thin shell: BrainAtlas.vue creates one per canvas
 * and talks to it through the setters it returns.
 *
 * What it does:
 *   - loads the atlas model (two hemispheres, meshopt-compressed; see
 *     scripts/brain/build-brain-asset.mjs) and shades it in the material's
 *     shader: gyri light, sulci darker from the baked sulcal depth, and any
 *     highlighted area mixed toward its ramp colour. Highlighting is a
 *     uniform per area, so hovering costs nothing on the CPU.
 *   - hinges each hemisphere on the anterior-posterior axis at the base of
 *     the medial wall, so `open` swings them apart like the covers of a book
 *     and shows the medial surfaces.
 *   - plays a Dopeframe (helper/brain/dopeframe.js): the camera, the book
 *     and the highlighted area follow the timeline. The reader can drag the
 *     brain at any time; RETURN_DELAY seconds after they let go the camera
 *     eases back onto the path (Tyler's "returns to the animated path").
 *   - picks the area under the pointer (hover and click) and positions one
 *     DOM label element: at the pointer while hovering, otherwise over the
 *     focused area's surface.
 *   - pauses rendering when the canvas is off screen or the tab is hidden.
 *
 * Errors never reach console.error (the story smoke fails on those): a
 * missing WebGL context or model is reported through on.error.
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
const PICK_INTERVAL = 40; // ms between hover raycasts
const LABEL_BOTTOM_INSET = 88; // px kept free for BrainAtlas's control row
const MIX = { tour: 0.78, hover: 0.8, selected: 0.9, all: 0.6 };
// Where the camera goes when the reader opens or closes the book by hand:
// looking down into the open book from behind, or at the closed left side.
const BOOK_VIEWS = {
  open: { azimuth: 270, elevation: 62, distance: 122 },
  closed: { azimuth: 160, elevation: 12, distance: 110 },
};

const NOOP = Object.freeze({
  setPlaying() {},
  setOpen() {},
  setHover() {},
  setSelected() {},
  setShowAll() {},
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

/* Centroid and mean normal of each area, per hemisphere, in mesh space. */
function areaAnchors(geometry, count) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const atlas = geometry.attributes._atlas;
  const sums = Array.from({ length: count }, () => ({
    p: new THREE.Vector3(),
    n: new THREE.Vector3(),
    k: 0,
  }));
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const s = sums[Math.round(atlas.getX(i))];
    if (!s) continue;
    s.p.add(v.fromBufferAttribute(pos, i));
    s.n.add(v.fromBufferAttribute(nor, i));
    s.k++;
  }
  return sums.map((s, i) =>
    i && s.k ? { p: s.p.divideScalar(s.k), n: s.n.normalize() } : null
  );
}

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {HTMLElement} [o.label]  element the stage positions over the focus
 * @param {string} [o.url]
 * @param {Array} o.dopeframe
 * @param {(id: string) => string|null} o.areaHex  colour for an area id
 * @param {{gyrus: string, sulcus: string}} o.surface
 * @param {boolean} [o.playing]
 * @param {boolean} [o.reducedMotion]  ease nothing: jump to targets
 * @param {object} [o.on]  progress(f), ready(), error(kind), hover(id),
 *   select(id), focus(id), open(isOpen)
 */
export function createBrainStage(o) {
  const { canvas, label = null, url = BRAIN_MODEL_URL, dopeframe, on = {} } = o;
  const reducedMotion = !!o.reducedMotion;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
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
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI * 0.62;
  // One finger: a horizontal drag turns the brain, a vertical one scrolls
  // the page (OrbitControls sets touch-action: none, which traps phones).
  canvas.style.touchAction = "pan-y";

  /* ── State ── */
  let playing = o.playing !== false;
  let time = 0;
  let follow = 1;
  let idle = Infinity;
  let interacting = false;
  let open = 0;
  let manualOpen = null;
  let manualView = null;
  let reportedOpen = null;
  let hovered = null; // { id, fromPointer }
  let selected = null;
  let showAll = false;
  let focusId = null;
  let disposed = false;

  let areaIds = [];
  let uniforms = null;
  let material = null;
  const hemis = []; // { mesh, pivot, side, anchors }
  let hingeY = 0;
  const mixTarget = [];

  const pointer = { x: 0, y: 0, inside: false, type: "mouse", dirty: false };
  let down = null;
  let lastPick = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const size = { w: 1, h: 1 };
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    size.w = w;
    size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  // Pull back on narrow (portrait) stages so the whole brain stays in frame.
  const fitScale = () =>
    camera.aspect < 1.15
      ? Math.min(2, Math.pow(1.15 / camera.aspect, 0.85))
      : 1;

  /* ── Model ── */
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    url,
    (gltf) => {
      if (disposed) return;
      build(gltf);
      on.ready?.();
    },
    (e) => on.progress?.(e.total ? e.loaded / e.total : null),
    (err) => {
      if (!disposed) on.error?.("load", err);
    }
  );

  function build(gltf) {
    areaIds = gltf.scene.userData.areas || [];
    const count = Math.max(areaIds.length, 1);
    ({ material, uniforms } = brainMaterial(count, o.surface));
    areaIds.forEach((id, i) => {
      const hex = id && o.areaHex(id);
      if (hex) uniforms.uAreaColor.value[i].set(hex);
      mixTarget[i] = 0;
    });

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

  /* ── Picking ── */
  function pick(x, y) {
    if (!hemis.length) return null;
    ndc.set((x / size.w) * 2 - 1, -(y / size.h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(
      hemis.map((h) => h.mesh),
      false
    )[0];
    if (!hit) return null;
    const atlas = hit.object.geometry.attributes._atlas;
    return areaIds[Math.round(atlas.getX(hit.face.a))] || null;
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
  }
  function onPointerLeave() {
    pointer.inside = false;
    if (hovered?.fromPointer) setHovered(null);
  }
  function onPointerDown(e) {
    down = { ...local(e), t: performance.now() };
  }
  function onPointerUp(e) {
    if (!down) return;
    const p = local(e);
    const still = Math.hypot(p.x - down.x, p.y - down.y) < 6;
    if (still && performance.now() - down.t < 600) on.select?.(pick(p.x, p.y));
    down = null;
  }
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.style.cursor = "grab";

  const onStart = () => {
    interacting = true;
  };
  const onEnd = () => {
    interacting = false;
    idle = 0;
  };
  controls.addEventListener("start", onStart);
  controls.addEventListener("end", onEnd);

  /* ── Frame ── */
  let lastFrame = 0;
  const offset = new THREE.Vector3();
  const sph = new THREE.Spherical();
  const anchor = new THREE.Vector3();
  const anchorN = new THREE.Vector3();
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

  function focusAnchor(id) {
    const index = areaIds.indexOf(id);
    let best = null;
    for (const h of hemis) {
      const a = h.anchors[index];
      if (!a) continue;
      const p = a.p.clone().applyMatrix4(h.mesh.matrixWorld);
      const n = a.n.clone().transformDirection(h.mesh.matrixWorld);
      const facing = n.dot(toCam.copy(camera.position).sub(p).normalize());
      if (!best || facing > best.facing) best = { p, n, facing };
    }
    if (!best) return null;
    anchor
      .copy(best.p)
      .addScaledVector(anchorN.copy(best.n), 4)
      .project(camera);
    if (anchor.z > 1) return null;
    return {
      x: (anchor.x * 0.5 + 0.5) * size.w,
      y: (-anchor.y * 0.5 + 0.5) * size.h,
    };
  }

  function placeLabel(pose) {
    const id = hovered?.id || selected || (playing ? pose.area : "") || null;
    if (id !== focusId) {
      focusId = id;
      on.focus?.(id);
    }
    if (!label) return;
    const at = !id
      ? null
      : hovered?.fromPointer && pointer.inside
        ? { x: pointer.x + 16, y: pointer.y + 16 }
        : focusAnchor(id);
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
    if (playing) time += dt;
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

    open += ((manualOpen ?? pose.open) - open) * ease(dt, 3);
    const isOpen = (manualOpen ?? pose.open) >= 0.5;
    if (isOpen !== reportedOpen) {
      reportedOpen = isOpen;
      on.open?.(isOpen);
    }
    for (const h of hemis) {
      h.pivot.rotation.x = h.side * OPEN_ANGLE * open;
      h.pivot.position.z = h.side * OPEN_GAP * open;
    }
    controls.target.set(0, hingeY * open, 0);

    if (first) {
      placeCamera(pose, 1);
      first = false;
    } else if (follow > 0 && view) {
      placeCamera(view, ease(dt, 2.5 * follow));
    }
    controls.update();

    if (pointer.dirty && pointer.type === "mouse" && !interacting) {
      if (now - lastPick > PICK_INTERVAL) {
        lastPick = now;
        pointer.dirty = false;
        const id = pick(pointer.x, pointer.y);
        setHovered(
          id ? { id, fromPointer: true } : hovered?.fromPointer ? null : hovered
        );
      }
    }

    if (uniforms) {
      const tourId = playing && !hovered && !selected ? pose.area : "";
      areaIds.forEach((id, i) => {
        let m = showAll && id ? MIX.all : 0;
        if (id && id === tourId) m = MIX.tour;
        if (id && id === selected) m = MIX.selected;
        if (id && id === hovered?.id) m = Math.max(m, MIX.hover);
        mixTarget[i] = m;
      });
      const k = ease(dt, 9);
      const mix = uniforms.uAreaMix.value;
      for (let i = 0; i < mix.length; i++)
        mix[i] += (mixTarget[i] - mix[i]) * k;
    }

    placeLabel(pose);
    renderer.render(scene, camera);
  }

  /* ── Run only while visible ── */
  let onScreen = true;
  let suspended = false;
  function sync() {
    const run = !disposed && !suspended && onScreen && !document.hidden;
    if (run) lastFrame = 0; // drop the time spent paused
    renderer.setAnimationLoop(run ? frame : null);
  }
  const io =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting;
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
    },
    /**
     * true/false to hold the book open/closed (the camera moves to look at
     * it until the reader drags); null to follow the tour.
     */
    setOpen(value) {
      manualOpen = value == null ? null : value ? 1 : 0;
      manualView =
        value == null ? null : value ? BOOK_VIEWS.open : BOOK_VIEWS.closed;
    },
    /** Highlight from outside the canvas (the legend); label sits on the area. */
    setHover(id) {
      if (hovered?.fromPointer && !id) return;
      setHovered(id ? { id, fromPointer: false } : null);
    },
    setSelected(id) {
      selected = id || null;
    },
    setShowAll(value) {
      showAll = !!value;
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
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      for (const h of hemis) h.mesh.geometry.dispose();
      material?.dispose();
      renderer.dispose();
    },
  };
}
