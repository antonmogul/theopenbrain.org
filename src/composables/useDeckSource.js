import { getCurrentScope, onScopeDispose, ref, shallowRef, watch } from "vue";
import {
  apiRequest,
  authedRequest,
  isApiConfigured,
} from "@/services/api/client";
import { BUNDLED_DECKS } from "@/data/decks/index.js";

/**
 * Where DeckView's slides come from (OPENBRAIN-129). `propsGetter` returns
 * DeckView's { source, deck, token, slug }:
 *
 *   bundled  BUNDLED_DECKS[deck] (/deck/templates). No request.
 *   pinned   /deck: the published deck a creator showed there,
 *            rpc/get_pinned_deck. Anything but a deck with slides (no
 *            Supabase config, the function not pushed yet, no pinned deck,
 *            an error, 5 s without an answer) quietly gives the bundled
 *            copy, with one console.warn: the bundled funding deck is
 *            already public in the JS bundle, so the fallback shows nothing
 *            new.
 *   shared   /deck/s/<token>: a published snapshot, rpc/get_shared_deck.
 *            Never falls back; a bad or old link is `unavailable`, and so
 *            is any link when Supabase isn't configured (no request).
 *   draft    /dashboard/decks/<slug>/present: the working copy, notes and
 *            all (creators only, by RLS). `unavailable` with no request when
 *            Supabase isn't configured.
 *
 * Both RPCs are `stable`, so they are GETs (the smoke test refuses non-GET
 * data requests). They strip speaker notes unless the caller is a creator.
 */

const TOKEN_RE = /^[0-9a-f]{32}$/;
const PINNED_TIMEOUT_MS = 5000;

// A deck the RPCs return: { slug, title, kind, published_at, slides }.
const hasSlides = (deck) =>
  deck !== null &&
  typeof deck === "object" &&
  !Array.isArray(deck) &&
  Array.isArray(deck.slides) &&
  deck.slides.length > 0;

export function useDeckSource(propsGetter) {
  const status = ref("loading"); // loading | ready | unavailable | error
  const title = ref("");
  const entries = shallowRef([]);
  const origin = ref("bundled"); // db | bundled
  const deckSlug = ref(null);

  let run = 0;
  let controller = null;

  const settle = (next) => {
    status.value = next.status;
    title.value = next.title ?? "";
    entries.value = next.entries ?? [];
    origin.value = next.origin ?? "bundled";
    deckSlug.value = next.deckSlug ?? null;
  };

  const bundled = (key) => {
    const deck = BUNDLED_DECKS[key] || BUNDLED_DECKS.funding;
    return {
      status: "ready",
      title: deck.title,
      entries: deck.entries,
      origin: "bundled",
      deckSlug: null,
    };
  };

  const fromDb = (deck) => ({
    status: "ready",
    title: deck.title || "",
    entries: deck.slides,
    origin: "db",
    deckSlug: deck.slug ?? null,
  });

  async function load() {
    const { source = "bundled", deck, token, slug } = propsGetter() || {};
    const mine = ++run;
    controller?.abort();
    controller = null;
    const current = () => mine === run;

    if (source === "bundled") return settle(bundled(deck));

    if (source === "pinned") {
      if (!isApiConfigured()) return settle(bundled(deck));
      status.value = "loading";
      const abort = new AbortController();
      controller = abort;
      const timer = setTimeout(() => abort.abort(), PINNED_TIMEOUT_MS);
      try {
        const result = await apiRequest("rpc/get_pinned_deck", {
          signal: abort.signal,
        });
        if (!current()) return;
        if (hasSlides(result)) return settle(fromDb(result));
        console.warn(
          "[deck] No published deck is pinned for /deck; showing the bundled copy."
        );
      } catch (err) {
        if (!current()) return;
        console.warn(
          `[deck] The pinned deck couldn't load (${err?.status || err?.name || "error"}); showing the bundled copy.`
        );
      } finally {
        clearTimeout(timer);
      }
      return settle(bundled(deck));
    }

    if (source === "shared") {
      const t = String(token ?? "");
      // A malformed token, or a build with no Supabase project to ask: no
      // link can open here, so say so without a request.
      if (!TOKEN_RE.test(t) || !isApiConfigured())
        return settle({ status: "unavailable" });
      status.value = "loading";
      try {
        const result = await apiRequest(`rpc/get_shared_deck?p_token=${t}`);
        if (!current()) return;
        return settle(
          hasSlides(result) ? fromDb(result) : { status: "unavailable" }
        );
      } catch {
        if (current()) settle({ status: "error" });
      }
      return;
    }

    if (source === "draft") {
      if (!isApiConfigured())
        return settle({ status: "unavailable", deckSlug: slug ?? null });
      status.value = "loading";
      try {
        const rows = await authedRequest(
          `decks?slug=eq.${encodeURIComponent(String(slug ?? ""))}&select=slug,title,slides`
        );
        if (!current()) return;
        const row = Array.isArray(rows) ? rows[0] : null;
        return settle(
          row
            ? fromDb({
                ...row,
                slides: Array.isArray(row.slides) ? row.slides : [],
              })
            : { status: "unavailable", deckSlug: slug ?? null }
        );
      } catch {
        if (current()) settle({ status: "error", deckSlug: slug ?? null });
      }
      return;
    }

    settle(bundled(deck));
  }

  watch(
    () => {
      const { source, deck, token, slug } = propsGetter() || {};
      return [source, deck, token, slug].join("\u0000");
    },
    () => load(),
    { immediate: true }
  );

  if (getCurrentScope())
    onScopeDispose(() => {
      run += 1;
      controller?.abort();
    });

  return { status, title, entries, origin, deckSlug, retry: load };
}
