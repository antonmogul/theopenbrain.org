/* Blocks direct Supabase fetches that have not yet moved to the API client. */

const nativeFetch = globalThis.fetch.bind(globalThis);
let fixtures = {};

export function configureSupabaseFetchMock(nextFixtures = {}) {
  fixtures = { ...nextFixtures };
}

function resolveFixture(input) {
  const url = String(typeof input === "string" ? input : input?.url);
  const key = Object.keys(fixtures).find((candidate) =>
    url.includes(candidate)
  );
  return key ? fixtures[key] : [];
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

    const method = (init?.method || "GET").toUpperCase();
    const body =
      method === "GET" || method === "HEAD"
        ? resolveFixture(input)
        : { success: true };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Range": `0-${Math.max(0, body.length - 1)}/${body.length || 0}`,
      },
    });
  };
}
