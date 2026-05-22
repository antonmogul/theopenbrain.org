// Single point of dynamic import for lottie-web. Components await loadLottie()
// inside onMounted before calling lottie.loadAnimation(...) so the async import
// can't race with the mount lifecycle.
//
// Prior pattern was `let lottie; import("lottie-web").then(m => lottie = m.default)`
// in each component, then calling lottie.loadAnimation in onMounted without
// awaiting. That threw "Cannot read properties of undefined" intermittently
// whenever mount happened before the import resolved.

let lottiePromise = null;

export function loadLottie() {
  if (!lottiePromise) {
    lottiePromise = import("lottie-web").then((m) => m.default);
  }
  return lottiePromise;
}
