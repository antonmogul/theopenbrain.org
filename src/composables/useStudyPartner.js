import { ref, watch, onScopeDispose } from "vue";
import { useAuth } from "./useAuth";
import { ensureFreshSession } from "@/utils/authHelpers";
import { STUDY_PARTNER_URL, readStudyStream } from "@/helper/studyPartner";

export function useStudyPartner() {
  const { user } = useAuth();
  const messages = ref([]);
  const conversations = ref([]);
  const conversationId = ref(null);
  const busy = ref(false);
  const error = ref("");
  let controller;
  let generation = 0;
  function reset() {
    generation += 1;
    controller?.abort();
    busy.value = false;
    messages.value = [];
    conversationId.value = null;
    conversations.value = [];
    error.value = "";
  }
  watch(() => user.value?.id, reset);
  onScopeDispose(reset);
  async function request(path, init = {}) {
    const session = await ensureFreshSession();
    if (!session?.access_token)
      throw new Error("Please sign in to use your study partner.");
    if (!STUDY_PARTNER_URL)
      throw new Error("Your study partner is not connected yet.");
    const response = await fetch(`${STUDY_PARTNER_URL}${path}`, {
      ...init,
      signal: controller?.signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.error || "Your study partner could not connect. Please try again."
      );
    }
    return response;
  }
  async function run(work) {
    if (busy.value || !user.value) return false;
    busy.value = true;
    error.value = "";
    controller = new AbortController();
    const current = generation;
    const timer = setTimeout(() => controller?.abort(), 120000);
    try {
      await work(() => current === generation);
      return current === generation;
    } catch (e) {
      if (current === generation)
        error.value =
          e.name === "AbortError"
            ? "That reply took too long. Please try again."
            : e.message;
      return false;
    } finally {
      clearTimeout(timer);
      if (current === generation) busy.value = false;
    }
  }
  async function opening() {
    return run(async (current) => {
      const result = await (await request("/study-partner/opening")).json();
      if (current()) messages.value = [{ role: "assistant", ...result }];
      const history = await (
        await request("/study-partner/conversations")
      ).json();
      if (current()) conversations.value = history;
    });
  }
  async function send(text) {
    if (!text.trim()) return false;
    return run(async (current) => {
      const response = await request("/study-partner/messages", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          conversationId: conversationId.value,
        }),
      });
      if (!current()) return;
      messages.value.push(
        { role: "user", text },
        { role: "assistant", text: "", tools: [], citations: [] }
      );
      const reply = messages.value.at(-1);
      await readStudyStream(response.body, (event, data) => {
        if (!current()) return;
        if (event === "conversation") conversationId.value = data.id;
        if (event === "text") reply.text += data.text;
        if (event === "tool") reply.tools.push(data);
        if (event === "done") reply.citations = data.citations;
        if (event === "error") throw new Error(data.error);
      });
    });
  }
  async function load(id) {
    return run(async (current) => {
      const rows = await (
        await request(`/study-partner/conversations/${encodeURIComponent(id)}`)
      ).json();
      if (!current()) return;
      messages.value = rows.map((row) => {
        if (row.role === "assistant") {
          try {
            const data = JSON.parse(row.content);
            if (typeof data.text === "string")
              return { role: row.role, ...data };
          } catch {
            /* Older plain text messages. */
          }
        }
        return { role: row.role, text: row.content, tools: [], citations: [] };
      });
      conversationId.value = id;
    });
  }
  function cancel() {
    controller?.abort();
  }
  async function startNew() {
    reset();
    return opening();
  }
  return {
    user,
    messages,
    conversations,
    conversationId,
    busy,
    error,
    opening,
    send,
    load,
    cancel,
    startNew,
  };
}
