import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import {
  corpusRepository,
  restClient,
  studentContext,
  type Rest,
  type Row,
} from "./data.js";
import { requestFor, safeReply, type ModelClient } from "./model.js";
export type Config = {
  supabaseUrl: string;
  publishableKey: string;
  allowedOrigins: string[];
};
export class RateLimit {
  private users = new Map<string, number[]>();
  constructor(private now = Date.now) {}
  take(id: string) {
    const now = this.now();
    for (const [key, times] of this.users)
      if (times.at(-1)! <= now - 86_400_000) this.users.delete(key);
    const times = (this.users.get(id) || []).filter(
      (t) => t > now - 86_400_000
    );
    if (
      times.length >= 200 ||
      times.filter((t) => t > now - 3_600_000).length >= 30
    )
      return false;
    times.push(now);
    this.users.set(id, times);
    return true;
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createApp(
  config: Config,
  model: ModelClient,
  dependencies: {
    fetcher?: typeof fetch;
    publicRest?: Rest;
    userRest?: (token: string) => Rest;
  } = {}
) {
  const fetcher = dependencies.fetcher || fetch;
  const repo = corpusRepository(
    dependencies.publicRest ||
      restClient(
        config.supabaseUrl,
        config.publishableKey,
        config.publishableKey,
        fetcher
      )
  );
  const rate = new RateLimit();
  const busy = new Set<string>();
  const app = new Hono<{ Variables: { user: Row; rest: Rest } }>();
  app.use("*", async (c, next) => {
    const origin = c.req.header("Origin");
    if (origin && !config.allowedOrigins.includes(origin))
      return c.json({ error: "Origin is not allowed" }, 403);
    if (origin) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Vary", "Origin");
    }
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    if (c.req.method === "OPTIONS") {
      c.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
      c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      return c.body(null, 204);
    }
    await next();
  });
  app.get("/healthz", (c) => c.json({ ok: true }));
  app.use("/study-partner/*", async (c, next) => {
    const auth = c.req.header("Authorization");
    if (!auth?.startsWith("Bearer ") || auth.length > 8192)
      return c.json({ error: "Sign in to study with your partner." }, 401);
    const token = auth.slice(7);
    const response = await fetcher(`${config.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: config.publishableKey, Authorization: auth },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      return c.json(
        { error: "Your session expired. Please sign in again." },
        401
      );
    const user = (await response.json()) as Row;
    if (!uuid.test(user.id || ""))
      return c.json({ error: "Invalid session" }, 401);
    c.set("user", user);
    c.set(
      "rest",
      dependencies.userRest?.(token) ||
        restClient(config.supabaseUrl, config.publishableKey, token, fetcher)
    );
    await next();
  });
  app.get("/study-partner/opening", async (c) => {
    if (!rate.take(c.get("user").id))
      return c.json(
        { error: "Time for a reading break. Try again in an hour." },
        429
      );
    const corpus = await repo.retrieve("opening");
    const context = await studentContext(c.get("rest"), c.get("user"), corpus);
    const reply = await model.generate(
      requestFor(corpus, context, [], "", true),
      c.req.raw.signal
    );
    return c.json(safeReply(reply, corpus, context.eligibleIds, true));
  });
  app.get("/study-partner/conversations", async (c) => {
    const rows = await c.get("rest")(
      `ai_conversations?user_id=eq.${c.get("user").id}&title=like.Study%20partner%25&select=id,title,updated_at&order=updated_at.desc&limit=20`
    );
    return c.json(rows);
  });
  app.get("/study-partner/conversations/:id", async (c) => {
    const id = c.req.param("id");
    if (!uuid.test(id)) return c.json({ error: "Invalid conversation" }, 400);
    const rest = c.get("rest");
    const owned = await rest(
      `ai_conversations?id=eq.${id}&user_id=eq.${c.get("user").id}&select=id`
    );
    if (!owned.length) return c.json({ error: "Conversation not found" }, 404);
    const rows = await rest(
      `ai_messages?conversation_id=eq.${id}&select=id,role,content&order=created_at.asc,id.asc&limit=80`
    );
    return c.json(
      rows.filter((r) => r.role === "user" || r.role === "assistant")
    );
  });
  app.post("/study-partner/messages", async (c) => {
    // Enforce bytes before JSON parsing, even for chunked requests.
    const reader = c.req.raw.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 18_000) {
          await reader.cancel();
          return c.json({ error: "Message is too long" }, 413);
        }
        chunks.push(value);
      }
    let body: Row;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      return c.json({ error: "Invalid message" }, 400);
    }
    if (
      !body ||
      typeof body.message !== "string" ||
      !body.message.trim() ||
      body.message.length > 4000 ||
      Object.keys(body).some(
        (k) => !["message", "conversationId"].includes(k)
      ) ||
      (body.conversationId && !uuid.test(body.conversationId))
    )
      return c.json({ error: "Send a message of 1–4,000 characters." }, 400);
    const uid = c.get("user").id;
    if (busy.has(uid))
      return c.json(
        { error: "One thought at a time — please wait for this reply." },
        409
      );
    if (!rate.take(uid))
      return c.json(
        { error: "Time for a reading break. Try again in an hour." },
        429
      );
    busy.add(uid);
    const rest = c.get("rest");
    try {
      let id = body.conversationId;
      let history: Row[] = [];
      if (id) {
        const owned = await rest(
          `ai_conversations?id=eq.${id}&user_id=eq.${uid}&select=id`
        );
        if (!owned.length) {
          busy.delete(uid);
          return c.json({ error: "Conversation not found" }, 404);
        }
        history = await rest(
          `ai_messages?conversation_id=eq.${id}&select=role,content&order=created_at.asc,id.asc&limit=81`
        );
        if (
          history.length >= 80 ||
          history.filter((m) => m.role === "user").length >= 40
        ) {
          busy.delete(uid);
          return c.json(
            { error: "This conversation is full. Start a new one." },
            409
          );
        }
      }
      const corpus = await repo.retrieve(body.message);
      const context = await studentContext(rest, c.get("user"), corpus);
      if (!id) {
        const created = await rest("ai_conversations", {
          method: "POST",
          body: JSON.stringify({
            user_id: uid,
            title: "Study partner · " + body.message.slice(0, 60),
          }),
        });
        id = created[0]?.id;
        if (!id) throw new Error("Conversation not saved");
      }
      await rest("ai_messages", {
        method: "POST",
        body: JSON.stringify({
          conversation_id: id,
          role: "user",
          content: body.message,
        }),
      });
      return streamSSE(c, async (stream) => {
        const controller = new AbortController();
        stream.onAbort(() => controller.abort());
        const heartbeat = setInterval(() => {
          void stream
            .writeSSE({
              event: "status",
              data: JSON.stringify({ message: "Checking the book…" }),
            })
            .catch(() => controller.abort());
        }, 10_000);
        try {
          await stream.writeSSE({
            event: "conversation",
            data: JSON.stringify({ id }),
          });
          const reply = await model.generate(
            requestFor(corpus, context, history, body.message),
            controller.signal
          );
          const result = safeReply(reply, corpus, context.eligibleIds);
          await rest("ai_messages", {
            method: "POST",
            body: JSON.stringify({
              conversation_id: id,
              role: "assistant",
              content: JSON.stringify(result),
              model_used: reply.model || "claude-opus-5-5",
              tokens_used: reply.usage.output_tokens || 0,
            }),
          });
          await rest(`ai_conversations?id=eq.${id}&user_id=eq.${uid}`, {
            method: "PATCH",
            body: JSON.stringify({ updated_at: new Date().toISOString() }),
          });
          // Only validated content leaves the server, after the stop reason.
          for (const chunk of result.text.match(/[\s\S]{1,120}/g) || [])
            await stream.writeSSE({
              event: "text",
              data: JSON.stringify({ text: chunk }),
            });
          for (const tool of result.tools)
            await stream.writeSSE({
              event: "tool",
              data: JSON.stringify(tool),
            });
          await stream.writeSSE({
            event: "done",
            data: JSON.stringify({
              citations: result.citations,
              usage: result.usage,
            }),
          });
        } catch {
          if (!controller.signal.aborted)
            await stream.writeSSE({
              event: "error",
              data: JSON.stringify({
                error:
                  "I could not finish that reply. Your question is saved; please try again.",
              }),
            });
        } finally {
          clearInterval(heartbeat);
          busy.delete(uid);
        }
      });
    } catch (e) {
      busy.delete(uid);
      throw e;
    }
  });
  app.onError((_e, c) =>
    c.json(
      {
        error:
          "Your study partner could not reach the book. Please try again shortly.",
      },
      503
    )
  );
  return app;
}
