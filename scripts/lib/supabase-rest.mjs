/**
 * Minimal READ-ONLY PostgREST access for Node scripts.
 *
 * Same request shape as src/services/api/client.js (apikey + Bearer headers,
 * anon/publishable key from .env), but GET only — there is deliberately no
 * write helper here, so any script built on this module cannot touch the DB.
 * Key values are never logged.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Parse a dotenv-style file into an object (no dependency needed). */
function parseEnvFile(file) {
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Resolve Supabase URL + anon key: process.env first, then .env.local, then
 * .env (same precedence as the importer). Throws if either is missing.
 */
export function loadSupabaseEnv() {
  const env = { ...process.env };
  for (const name of [".env.local", ".env"]) {
    const file = path.join(REPO_ROOT, name);
    if (fs.existsSync(file)) {
      const parsed = parseEnvFile(file);
      for (const [k, v] of Object.entries(parsed)) {
        if (env[k] === undefined) env[k] = v;
      }
    }
  }
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (checked process.env, .env.local, .env)"
    );
  }
  return { url, key };
}

/** GET `${url}/rest/v1/${endpoint}` as the anon role. */
export async function restGet(endpoint, env = loadSupabaseEnv()) {
  const response = await fetch(`${env.url}/rest/v1/${endpoint}`, {
    method: "GET",
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status} on ${endpoint}: ${text}`);
  }
  return response.json();
}

/**
 * Fetch the live Chapter 1 module (`the-retina`) exactly as the reader does:
 * module → sections → paragraphs → animations (id, key, title).
 * Returns { module, sections, paragraphs, animations }; paragraphs are sorted
 * by (section order_index, order_index).
 */
export async function fetchChapter1(slug = "the-retina") {
  const env = loadSupabaseEnv();
  const modules = await restGet(
    `modules?slug=eq.${encodeURIComponent(slug)}&select=id,title,slug,order_index,status`,
    env
  );
  const module = modules?.[0];
  if (!module) throw new Error(`Module "${slug}" not found`);

  const sections = await restGet(
    `sections?module_id=eq.${module.id}&select=id,title,slug,order_index,module_id,animation_id,animation_config&order=order_index.asc`,
    env
  );
  const sectionIds = sections.map((s) => `"${s.id}"`).join(",");
  const paragraphs = sections.length
    ? await restGet(
        `paragraphs?section_id=in.(${sectionIds})&select=id,section_id,order_index,content,content_text,has_animation,animation_id,animation_trigger,is_subsection_header,subsection_level&order=order_index.asc&limit=10000`,
        env
      )
    : [];
  const animations = await restGet(
    "animations?select=id,animation_key,title&limit=10000",
    env
  );

  const sectionOrder = new Map(sections.map((s) => [s.id, s.order_index]));
  paragraphs.sort(
    (a, b) =>
      sectionOrder.get(a.section_id) - sectionOrder.get(b.section_id) ||
      a.order_index - b.order_index
  );

  return { module, sections, paragraphs, animations };
}
