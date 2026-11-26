import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { anthropicClient } from "./model.js";
const required = [
  "ANTHROPIC_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "ALLOWED_ORIGINS",
] as const;
for (const key of required)
  if (!process.env[key]) throw new Error(`Missing ${key}`);
const app = createApp(
  {
    supabaseUrl: process.env.SUPABASE_URL!,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY!,
    allowedOrigins: process.env
      .ALLOWED_ORIGINS!.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },
  anthropicClient(process.env.ANTHROPIC_API_KEY!)
);
serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 4296),
  hostname: "0.0.0.0",
});
