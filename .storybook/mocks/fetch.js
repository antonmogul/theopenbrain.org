/* Blocks direct Supabase fetches that have not yet moved to the API client. */

const nativeFetch = globalThis.fetch.bind(globalThis);

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
    const body = method === "GET" ? [] : { success: true };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
