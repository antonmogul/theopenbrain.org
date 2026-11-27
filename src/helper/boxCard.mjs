import { imageUrl } from "../editor/media.mjs";

/** CMS contract: image is the flat original; layers run back to front,
 * on the same canvas. Depth is 0 (back) through 1 (front). */
export function normalizeBoxCard(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = (v) =>
    typeof v === "string" && /^(\/[^/]|https?:\/\/)/.test(v) ? v : "";
  const image = source(value.image?.src)
    ? {
        src: imageUrl(value.image.src),
        alt: String(value.image.alt || ""),
        ...(value.image.fit === "contain" ? { fit: "contain" } : {}),
        ...(source(value.image.video)
          ? { video: imageUrl(value.image.video) }
          : {}),
        ...(typeof value.image.position === "string" &&
        /^\d+(?:\.\d+)?% \d+(?:\.\d+)?%$/.test(value.image.position)
          ? { position: value.image.position }
          : {}),
      }
    : null;
  const layers = (Array.isArray(value.layers) ? value.layers : [])
    .slice(0, 8)
    .filter((l) => source(l?.src))
    .map((l) => ({
      src: imageUrl(l.src),
      depth: Math.min(1, Math.max(0, Number(l.depth) || 0)),
      alt: String(l.alt || ""),
    }));
  return {
    ...(typeof value.enabled === "boolean" ? { enabled: value.enabled } : {}),
    ...(image ? { image } : {}),
    ...(layers.length ? { layers } : {}),
    ...(typeof value.quote === "string"
      ? { quote: value.quote.slice(0, 1000) }
      : {}),
  };
}

/** Exact critically damped spring, stable across variable frame times.
 * 2/omega = 150ms mean follow delay; no overshoot for a resting step. */
export function followBoxMotion(position, velocity, target, seconds) {
  const omega = 2 / 0.15;
  const t = Math.min(0.064, Math.max(0, seconds));
  const offset = position - target;
  const c = velocity + omega * offset;
  const decay = Math.exp(-omega * t);
  return {
    position: target + (offset + c * t) * decay,
    velocity: (velocity - omega * c * t) * decay,
  };
}

export function layerTransform(depth, progress) {
  const p = Math.min(1, Math.max(0, progress));
  // The composition returns to its aligned canvas before the hand-off.
  const travel = Math.sin(p * Math.PI);
  return `translate3d(0, ${(-28 * depth * travel).toFixed(2)}px, 0) scale(${(1 + 0.045 * depth * travel).toFixed(4)})`;
}
