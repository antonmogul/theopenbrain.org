import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/client", () => ({
  authedRequest: vi.fn(),
  getSession: vi.fn(() => ({ access_token: "tok" })),
}));
import { authedRequest, getSession } from "@/services/api/client";
import {
  uploadChapterImage,
  uploadChapterLottie,
  lottieProblem,
  uploadProblem,
  publicUrl,
} from "@/services/api/storage";

const file = (type, size = 1000, name = "golgi-bulb.png") => ({
  type,
  size,
  name,
});

describe("uploadProblem (OPENBRAIN-63)", () => {
  it("accepts JPG, PNG, WebP and GIF up to 10 MB", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/gif"])
      expect(uploadProblem(file(t))).toBeNull();
  });
  it("refuses SVG, other files and anything over 10 MB, saying why", () => {
    expect(uploadProblem(file("image/svg+xml"))).toMatch(/SVG/);
    expect(uploadProblem(file("application/pdf"))).toMatch(/JPG, PNG/);
    expect(uploadProblem(file("image/png", 11 * 1048576))).toMatch(/11\.0 MB/);
    expect(uploadProblem(null)).toMatch(/Choose/);
  });
});

describe("uploadChapterImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    authedRequest.mockImplementation(async (_p, init) => [
      { id: "m1", ...JSON.parse(init.body) },
    ]);
  });
  afterEach(() => vi.restoreAllMocks());

  it("stores the file under the chapter and adds it to the library", async () => {
    const media = await uploadChapterImage(file("image/png"), {
      slug: "the-retina",
      title: "Golgi's olfactory bulb",
    });
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(
      /\/storage\/v1\/object\/chapter-media\/modules\/the-retina\/.+\.png$/
    );
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.headers["Content-Type"]).toBe("image/png");
    expect(init.headers["x-upsert"]).toBe("false");
    const path = url.split("/object/chapter-media/")[1];
    expect(media).toMatchObject({
      media_type: "image",
      title: "Golgi's olfactory bulb",
      image_file_url: publicUrl(path),
      file_size_bytes: 1000,
    });
    expect(media.animation_key).toMatch(/^image-/);
  });

  it("explains a refusal instead of failing silently", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({
        message: "new row violates row-level security policy",
      }),
    }));
    await expect(
      uploadChapterImage(file("image/png"), { slug: "x" })
    ).rejects.toThrow(/Only creators/);
    expect(authedRequest).not.toHaveBeenCalled();
  });

  it("asks for a sign-in when the session has gone", async () => {
    getSession.mockReturnValueOnce(null);
    await expect(
      uploadChapterImage(file("image/png"), { slug: "x" })
    ).rejects.toThrow(/Sign in again/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// OPENBRAIN-70 B4: Lottie uploads.
const jsonFile = (data, name = "pupil.json") => {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return {
    name,
    type: "application/json",
    size: text.length,
    text: async () => text,
  };
};
const lottie = { v: "5.7.4", fr: 30, ip: 0, op: 60, layers: [] };

describe("lottieProblem", () => {
  it("accepts a Lottie JSON", async () => {
    expect(await lottieProblem(jsonFile(lottie))).toBeNull();
  });
  it("refuses other files, bad JSON and JSON that isn't Lottie", async () => {
    expect(
      await lottieProblem({ name: "a.png", type: "image/png", size: 1 })
    ).toMatch(/\.json/);
    expect(await lottieProblem(jsonFile("{nope"))).toMatch(/valid JSON/);
    expect(await lottieProblem(jsonFile({ hello: 1 }))).toMatch(
      /isn't a Lottie/
    );
    expect(await lottieProblem(null)).toMatch(/Choose/);
  });
});

describe("uploadChapterLottie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
    authedRequest.mockImplementation(async (_p, init) => [
      { id: "m1", ...JSON.parse(init.body) },
    ]);
  });

  it("stores the file as JSON and adds a looping library row", async () => {
    const row = await uploadChapterLottie(jsonFile(lottie), {
      slug: "foundations-of-neuroscience",
      title: "Pupil reflex",
    });
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(
      /chapter-media\/modules\/foundations-of-neuroscience\/.+\.json$/
    );
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(row).toMatchObject({
      media_type: "lottie",
      title: "Pupil reflex",
      config: { autoplay: true, autoLoop: true },
    });
    expect(row.animation_key).toMatch(/^animationUpload[0-9a-z]+$/);
    expect(row.lottie_file_url).toBe(
      publicUrl(url.split("/chapter-media/")[1])
    );
  });

  it("explains a bucket that doesn't accept JSON yet", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        message: "mime type application/json is not supported",
      }),
    }));
    await expect(
      uploadChapterLottie(jsonFile(lottie), { slug: "s" })
    ).rejects.toThrow(/OPENBRAIN-70/);
  });
});
