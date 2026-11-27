import he from "he";

export type Row = Record<string, any>;
export type Rest = (path: string, init?: RequestInit) => Promise<Row[]>;
export type Source = {
  id: string;
  text: string;
  sectionId: string;
  section: string;
  title: string;
  moduleId: string;
  chapter: string;
  number: number;
};
export type Corpus = {
  chapters: { id: string; slug: string; title: string; text: string }[];
  sources: Map<string, Source>;
};
export const CHAPTERS = ["foundations-of-neuroscience", "the-retina"];
export function plain(value: unknown): string {
  return typeof value === "string"
    ? he
        .decode(
          value
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]*>/g, " ")
        )
        .replace(/\s+/g, " ")
        .trim()
    : "";
}
function paragraphText(p: Row) {
  const blocks = p.content?.blocks;
  const text = Array.isArray(blocks)
    ? blocks
        .map((b: Row) => {
          if (
            [
              "text",
              "paragraph",
              "heading",
              "blockquote",
              "reference",
              "code",
            ].includes(b.type)
          )
            return plain(b.content);
          if (b.type === "list") return (b.items || []).map(plain).join("; ");
          return [plain(b.title), plain(b.caption), plain(b.alt)]
            .filter(Boolean)
            .join(": ");
        })
        .join(" ")
    : plain(p.content_text);
  return [
    text,
    plain(p.animation_title),
    plain(p.content?.explore?.title),
    plain(p.content?.explore?.legend),
  ]
    .filter(Boolean)
    .join("\n");
}
export async function buildCorpus(rest: Rest): Promise<Corpus> {
  // Explicit allow-list + status filter, even for creator tokens that can see drafts.
  const modules = (
    await rest(
      `modules?status=eq.published&slug=in.(${CHAPTERS.join(",")})&select=id,slug,title,order_index&order=order_index.asc,id.asc`
    )
  ).filter(
    (m) => CHAPTERS.includes(m.slug) && (!m.status || m.status === "published")
  );
  const sources = new Map<string, Source>();
  const chapters = [];
  for (const m of modules) {
    const sections = await rest(
      `sections?module_id=eq.${m.id}&select=id,slug,title,introduction_text,animation_id,order_index&order=order_index.asc,id.asc`
    );
    const lines = [];
    for (const s of sections) {
      const ps = await rest(
        `paragraphs?section_id=eq.${s.id}&select=id,content,content_text,animation_id,order_index&order=order_index.asc,id.asc`
      );
      const animationIds = [
        ...new Set(
          [s.animation_id, ...ps.map((p) => p.animation_id)].filter(Boolean)
        ),
      ];
      const figures = animationIds.length
        ? await rest(
            `animations?id=in.(${animationIds.join(",")})&select=id,title,description,config`
          )
        : [];
      if (!ps.length && plain(s.introduction_text))
        lines.push(`[§${s.slug}] ${plain(s.introduction_text)}`);
      for (const [index, p] of ps.entries()) {
        const figure = figures.find(
          (f) =>
            f.id === (p.animation_id || (index === 0 ? s.animation_id : null))
        );
        const captions = figure
          ? [
              plain(figure.title),
              plain(figure.description),
              plain(figure.config?.legend),
              ...(figure.config?.images || []).map((i: Row) =>
                plain(i.legend || i.caption)
              ),
            ]
              .filter(Boolean)
              .join("\n")
          : "";
        const text = [
          index === 0 ? plain(s.introduction_text) : "",
          paragraphText(p),
          captions,
        ]
          .filter(Boolean)
          .join("\n");
        if (!text) continue;
        const source = {
          id: p.id,
          text,
          sectionId: s.id,
          section: s.slug,
          title: plain(s.title),
          moduleId: m.id,
          chapter: m.slug,
          number: m.order_index,
        };
        sources.set(p.id, source);
        lines.push(`[§${s.slug} ¶${p.id}] ${text}`);
      }
    }
    chapters.push({
      id: m.id,
      slug: m.slug,
      title: plain(m.title),
      text: lines.join("\n\n"),
    });
  }
  if (!sources.size) throw new Error("Published book is unavailable");
  return { chapters, sources };
}
export function corpusRepository(publicRest: Rest, now = Date.now) {
  let cached: Corpus | undefined;
  let expires = 0;
  let pending: Promise<Corpus> | undefined;
  return {
    // Retrieval seam: replace chapter selection with pgvector at larger scale.
    async retrieve(_query: string, scope = CHAPTERS): Promise<Corpus> {
      if (!cached || now() >= expires) {
        pending ||= buildCorpus(publicRest)
          .then((result) => {
            cached = result;
            expires = now() + 600_000;
            return result;
          })
          .finally(() => {
            pending = undefined;
          });
        await pending;
      }
      const chapters = cached!.chapters.filter((c) => scope.includes(c.slug));
      return {
        chapters,
        sources: new Map(
          [...cached!.sources].filter(([, s]) => scope.includes(s.chapter))
        ),
      };
    },
  };
}
export async function studentContext(rest: Rest, user: Row, corpus: Corpus) {
  const uid = encodeURIComponent(user.id);
  const [profile, progress, highlights, notes, attempts, cards, events] =
    await Promise.all([
      rest(`profiles?id=eq.${uid}&select=full_name&limit=1`),
      rest(
        `reading_progress?user_id=eq.${uid}&select=module_id,last_section_id,last_paragraph_id,is_completed&order=last_accessed_at.desc&limit=20`
      ),
      rest(
        `highlights?user_id=eq.${uid}&select=selected_text,note,paragraph_id,created_at&order=created_at.desc&limit=40`
      ),
      rest(
        `notes?user_id=eq.${uid}&select=content,paragraph_id,section_id,created_at&order=created_at.desc&limit=20`
      ),
      rest(
        `quiz_attempts?student_id=eq.${uid}&select=quiz_id,score,total_points,status&order=started_at.desc&limit=10`
      ),
      rest(
        `flashcards?created_by=eq.${uid}&select=module_id,front_text&order=created_at.desc&limit=20`
      ),
      // Only this optional migration can be absent during the rollout.
      rest(
        `reader_events?user_id=eq.${uid}&select=module_id,kind,ref,created_at&order=created_at.desc&limit=40`
      ).catch((e: any) => {
        if (e.status === 404) return [];
        throw e;
      }),
    ]);
  const moduleIds = new Set(corpus.chapters.map((c) => c.id));
  const knownProgress = progress.filter((p) => moduleIds.has(p.module_id));
  // Last position is evidence of visiting, not proof all earlier sections were read.
  const readSections = new Set(
    knownProgress.map((p) => p.last_section_id).filter(Boolean)
  );
  for (const h of highlights) {
    const source = corpus.sources.get(h.paragraph_id);
    if (source) readSections.add(source.sectionId);
  }
  const eligibleIds = [...corpus.sources]
    .filter(([, s]) => readSections.has(s.sectionId))
    .map(([id]) => id);
  const quizIds = attempts.map((a) => a.quiz_id);
  const quizzes = quizIds.length
    ? await rest(
        `quizzes?id=in.(${quizIds.join(",")})&select=id,module_id,title`
      )
    : [];
  return {
    firstName: plain(
      profile[0]?.full_name || user.user_metadata?.full_name || ""
    )
      .split(" ")[0]
      .slice(0, 40),
    chaptersStarted: knownProgress.map((p) => ({
      chapter: corpus.chapters.find((c) => c.id === p.module_id)?.title,
      lastSection:
        [...corpus.sources.values()].find(
          (s) => s.sectionId === p.last_section_id
        )?.title || null,
      completed: p.is_completed,
    })),
    progressCaveat:
      "A last position proves a visit, not completion of all earlier sections. Video plays are starts, not proof of watching to the end.",
    eligibleIds,
    highlights: highlights
      .filter((h) => corpus.sources.has(h.paragraph_id))
      .map((h) => ({
        text: plain(h.selected_text).slice(0, 1500),
        note: plain(h.note).slice(0, 1000),
        paragraphId: h.paragraph_id,
        section: corpus.sources.get(h.paragraph_id)!.title,
        createdAt: h.created_at,
      })),
    notes: notes
      .filter(
        (n) =>
          corpus.sources.has(n.paragraph_id) ||
          [...corpus.sources.values()].some((s) => s.sectionId === n.section_id)
      )
      .map((n) => ({
        text: plain(n.content).slice(0, 1000),
        paragraphId: n.paragraph_id,
        sectionId: n.section_id,
      })),
    quizAttempts: attempts
      .filter((a) =>
        quizzes.some((q) => q.id === a.quiz_id && moduleIds.has(q.module_id))
      )
      .map((a) => ({
        title: quizzes.find((q) => q.id === a.quiz_id)?.title,
        score: a.score,
        totalPoints: a.total_points,
        status: a.status,
      })),
    flashcardsSaved: cards
      .filter((c) => moduleIds.has(c.module_id))
      .map((c) => plain(c.front_text).slice(0, 200)),
    readerEvents: events.filter((e) => moduleIds.has(e.module_id)),
  };
}
export function restClient(
  url: string,
  key: string,
  token: string,
  fetcher = fetch
): Rest {
  return async (path, init = {}) => {
    // Page reads: PostgREST's default 1000-row cap must never truncate a chapter.
    const rows: Row[] = [];
    for (let offset = 0; ; offset += 500) {
      const limited = /(?:^|&)limit=/.test(path);
      const paging =
        !init.method && !limited
          ? `${path.includes("?") ? "&" : "?"}limit=500&offset=${offset}`
          : "";
      const r = await fetcher(`${url}/rest/v1/${path}${paging}`, {
        ...init,
        signal: AbortSignal.timeout(20_000),
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...init.headers,
        },
      });
      if (!r.ok)
        throw Object.assign(new Error("Student data is unavailable"), {
          status: r.status,
        });
      const body = await r.text();
      const result = body ? JSON.parse(body) : [];
      if (!Array.isArray(result))
        throw new Error("Unexpected database response");
      rows.push(...result);
      if (!paging || result.length < 500) return rows;
    }
  };
}
