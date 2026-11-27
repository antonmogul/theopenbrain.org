// Local proof only; not imported by src/index.ts and not copied into Docker.
import { serve } from "@hono/node-server";
import { createApp } from "../src/app.js";
import { fixtureRest, fakeModel, U } from "./fixture.js";
const db = fixtureRest();
const app = createApp(
  {
    supabaseUrl: "http://127.0.0.1:4296",
    publishableKey: "fixture",
    allowedOrigins: ["http://localhost:5296", "http://127.0.0.1:5296"],
  },
  fakeModel,
  {
    publicRest: db.rest,
    userRest: () => db.rest,
    fetcher: async (_url, init) =>
      Response.json(
        { id: U },
        {
          status:
            new Headers(init?.headers).get("Authorization") ===
            "Bearer study-fixture"
              ? 200
              : 401,
        }
      ),
  }
);
serve({ fetch: app.fetch, port: 4296, hostname: "127.0.0.1" });
