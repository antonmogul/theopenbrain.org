export const STUDY_PARTNER_URL = (
  import.meta.env.VITE_STUDY_PARTNER_URL || ""
).replace(/\/$/, "");
export const studyPartnerEnabled = Boolean(STUDY_PARTNER_URL);

// SSE frames can span arbitrary UTF-8/network chunks; the callback sees only
// complete events. Never parse an unfinished tool or response object.
export async function readStudyStream(body, onEvent) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let end;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const event = frame.match(/^event: ?(.+)$/m)?.[1];
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (event && data) {
          onEvent(event, JSON.parse(data));
          if (event === "done") complete = true;
        }
      }
      if (done) break;
    }
    if (!complete)
      throw new Error("The reply was interrupted. Please try again.");
  } finally {
    reader.releaseLock();
  }
}
