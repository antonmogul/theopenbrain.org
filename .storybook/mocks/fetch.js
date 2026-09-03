/* Blocks direct Supabase fetches that have not yet moved to the API client. */

const nativeFetch = globalThis.fetch.bind(globalThis);
let fixtures = {};

export function configureSupabaseFetchMock(nextFixtures = {}) {
  fixtures = { ...nextFixtures };
}

export function configureFetchMock(nextFixtures = {}) {
  fixtures = { ...nextFixtures };
}

function isSupabaseRequest(input) {
  const url = String(typeof input === "string" ? input : input?.url);
  return (
    url.includes(".supabase.co/") ||
    url.includes("/rest/v1/") ||
    url.includes("/auth/v1/") ||
    url.startsWith("undefined/rest/")
  );
}

export function installSupabaseFetchMock() {
  globalThis.fetch = async (input, init) => {
    if (!isSupabaseRequest(input)) return nativeFetch(input, init);

    const url = String(typeof input === "string" ? input : input?.url);
    const method = (init?.method || "GET").toUpperCase();
    const key = Object.keys(fixtures).find(
      (candidate) => candidate === url || url.includes(candidate)
    );
    const configured = key ? fixtures[key] : undefined;
    const resolved =
      typeof configured === "function"
        ? await configured(url, init)
        : configured;
    const status = resolved?.status || 200;
    const body =
      resolved?.body ?? resolved ?? (method === "GET" ? [] : { success: true });
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...(Array.isArray(body)
          ? {
              "Content-Range": `0-${Math.max(0, body.length - 1)}/${body.length || 0}`,
            }
          : {}),
      },
    });
  };
}
