/*
 * YouTube links (OPENBRAIN-70 D2). Authors paste whatever link they have;
 * the reader embeds by id through youtube-nocookie.com (allowed by the CSP
 * in index.html).
 */
const ID = /^[A-Za-z0-9_-]{11}$/;

/** The 11-character video id from a YouTube URL (or a bare id), else null. */
export function parseYouTube(input) {
  const raw = String(input || "").trim();
  if (ID.test(raw)) return raw;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
      if (m) id = m[2];
    }
  }
  return id && ID.test(id) ? id : null;
}

/** Start time in seconds from a t= / start= parameter ("1m30s", "90"), or 0. */
export function youTubeStart(input) {
  let url;
  try {
    url = new URL(String(input || "").trim());
  } catch {
    return 0;
  }
  const t = url.searchParams.get("t") || url.searchParams.get("start") || "";
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

export function youTubeEmbedUrl(id, start = 0) {
  const params = new URLSearchParams({ autoplay: "1", rel: "0" });
  if (start > 0) params.set("start", String(start));
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}
