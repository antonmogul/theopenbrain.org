import { inject, unref } from "vue";
import { getSession, authedRequest } from "@/services/api/client";

const recent = new Map();
export function recordReaderEvent(moduleId, kind, ref, now = Date.now()) {
  const session = getSession();
  const userId = session?.user?.id;
  if (!userId || !session.access_token || !moduleId || !ref)
    return Promise.resolve(false);
  if (!["video_play", "widget_open", "figure_expand"].includes(kind))
    return Promise.resolve(false);
  for (const [key, time] of recent) if (now - time >= 30000) recent.delete(key);
  const value = String(ref).slice(0, 200);
  const key = `${userId}:${moduleId}:${kind}:${value}`;
  if (recent.has(key)) return Promise.resolve(false);
  recent.set(key, now);
  return authedRequest("reader_events", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      module_id: moduleId,
      kind,
      ref: value,
    }),
  })
    .then(() => true)
    .catch(() => false); // Optional migration: reading must work before rollout.
}
export function useReaderEvents() {
  const moduleId = inject("readerModuleId", null);
  return (kind, ref) => recordReaderEvent(unref(moduleId), kind, ref);
}
