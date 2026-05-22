import { ref, watch } from "vue";
import { useAuth } from "./useAuth";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const STORAGE_KEYS = {
  theme: "ob.theme",
  accent: "ob.accent",
  readingSize: "ob.typeSize",
  lineLength: "ob.lineLength",
  reduceMotion: "ob.reduceMotion",
  fontPair: "ob.fontPair",
};

const DEFAULTS = {
  theme: "system",
  accent: "magenta",
  readingSize: "regular",
  lineLength: "standard",
  reduceMotion: "auto",
  fontPair: "ibm-plex-legacy",
};

const READING_SIZE_SCALE = {
  compact: 0.95,
  regular: 1,
  comfortable: 1.1,
};

const LINE_LENGTH_MEASURE = {
  tight: "64ch",
  standard: "72ch",
  wide: "80ch",
};

// Module-scope refs — single source of truth for all consumers
const theme = ref(DEFAULTS.theme);
const accent = ref(DEFAULTS.accent);
const readingSize = ref(DEFAULTS.readingSize);
const lineLength = ref(DEFAULTS.lineLength);
const reduceMotion = ref(DEFAULTS.reduceMotion);
const fontPair = ref(DEFAULTS.fontPair);

let initialized = false;
let syncTimer = null;
let mediaQuery = null;

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / private-mode errors
  }
}

function resolvedTheme() {
  if (theme.value === "system") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme.value;
}

function applyTheme() {
  document.documentElement.dataset.theme = resolvedTheme();
}

function applyAccent() {
  document.documentElement.dataset.accent = accent.value;
}

function applyFontPair() {
  document.documentElement.dataset.fontpair = fontPair.value;
}

function applyReadingSize() {
  const scale = READING_SIZE_SCALE[readingSize.value] ?? 1;
  document.documentElement.style.setProperty("--reading-size", String(scale));
}

function applyLineLength() {
  const measure = LINE_LENGTH_MEASURE[lineLength.value] ?? "72ch";
  document.documentElement.style.setProperty("--reading-measure", measure);
}

function applyReduceMotion() {
  if (reduceMotion.value === "on") {
    document.documentElement.dataset.reduceMotion = "1";
  } else if (reduceMotion.value === "off") {
    document.documentElement.dataset.reduceMotion = "0";
  } else {
    delete document.documentElement.dataset.reduceMotion;
  }
}

function applyAll() {
  applyTheme();
  applyAccent();
  applyFontPair();
  applyReadingSize();
  applyLineLength();
  applyReduceMotion();
}

async function syncToServer() {
  const { user, session } = useAuth();
  if (!user.value || !session.value?.access_token) return;

  const payload = {
    user_id: user.value.id,
    theme: theme.value,
    accent: accent.value,
    reading_size: readingSize.value,
    line_length: lineLength.value,
    reduce_motion: reduceMotion.value,
    font_pair: fontPair.value,
    updated_at: new Date().toISOString(),
  };

  try {
    await fetch(
      `${supabaseUrl}/rest/v1/user_preferences?on_conflict=user_id`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${session.value.access_token}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(payload),
      },
    );
  } catch (err) {
    console.warn("usePreferences: sync failed", err);
  }
}

function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncToServer, 800);
}

async function hydrateFromServer() {
  const { user, session } = useAuth();
  if (!user.value || !session.value?.access_token) return;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_preferences?user_id=eq.${user.value.id}&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${session.value.access_token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) return;
    const rows = await response.json();
    const row = rows[0];
    if (!row) return;

    // Server wins for fields it has; localStorage retains anything missing
    if (row.theme) theme.value = row.theme;
    if (row.accent) accent.value = row.accent;
    if (row.reading_size) readingSize.value = row.reading_size;
    if (row.line_length) lineLength.value = row.line_length;
    if (row.reduce_motion) reduceMotion.value = row.reduce_motion;
    if (row.font_pair) fontPair.value = row.font_pair;
  } catch (err) {
    console.warn("usePreferences: hydrate failed", err);
  }
}

function init() {
  if (initialized) return;
  initialized = true;

  theme.value = readLS(STORAGE_KEYS.theme, DEFAULTS.theme);
  accent.value = readLS(STORAGE_KEYS.accent, DEFAULTS.accent);
  readingSize.value = readLS(STORAGE_KEYS.readingSize, DEFAULTS.readingSize);
  lineLength.value = readLS(STORAGE_KEYS.lineLength, DEFAULTS.lineLength);
  reduceMotion.value = readLS(STORAGE_KEYS.reduceMotion, DEFAULTS.reduceMotion);
  fontPair.value = readLS(STORAGE_KEYS.fontPair, DEFAULTS.fontPair);

  applyAll();

  mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  mediaQuery?.addEventListener?.("change", () => {
    if (theme.value === "system") applyTheme();
  });

  // Each pref: persist to LS, apply to DOM, schedule server sync
  watch(theme, (v) => {
    writeLS(STORAGE_KEYS.theme, v);
    applyTheme();
    scheduleSync();
  });
  watch(accent, (v) => {
    writeLS(STORAGE_KEYS.accent, v);
    applyAccent();
    scheduleSync();
  });
  watch(readingSize, (v) => {
    writeLS(STORAGE_KEYS.readingSize, v);
    applyReadingSize();
    scheduleSync();
  });
  watch(lineLength, (v) => {
    writeLS(STORAGE_KEYS.lineLength, v);
    applyLineLength();
    scheduleSync();
  });
  watch(reduceMotion, (v) => {
    writeLS(STORAGE_KEYS.reduceMotion, v);
    applyReduceMotion();
    scheduleSync();
  });
  watch(fontPair, (v) => {
    writeLS(STORAGE_KEYS.fontPair, v);
    applyFontPair();
    scheduleSync();
  });

  // Hydrate from server when auth becomes available
  const { isAuthenticated } = useAuth();
  watch(
    isAuthenticated,
    (authed) => {
      if (authed) hydrateFromServer();
    },
    { immediate: true },
  );
}

export function usePreferences() {
  return {
    theme,
    accent,
    readingSize,
    lineLength,
    reduceMotion,
    fontPair,
    init,
  };
}
