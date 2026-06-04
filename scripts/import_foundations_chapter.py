#!/usr/bin/env python3
"""Generate the Phase C SQL migration for the Foundations chapter.

Reads /tmp/odt_md/content.md (pandoc gfm output), parses Debates 1-3, Closing,
the 8 breakout boxes, and References, and emits a DO $$ ... $$ migration that
appends them to the existing 'foundations-of-neuroscience' module.

Inline handling:
  <sup>N</sup> / <sup>N,M</sup>  -> citation_ref block(s)   (numeric only)
  <sup>th</sup> etc.            -> literal <sup>th</sup> kept in text
  (**Figure N**) / **Figure N** -> figure_placeholder block (+ animation row)
  Figure A / Figure B           -> figure_placeholder (box lettered figures)
  <span id="anchor..."></span>  -> stripped
  *text* / <em>text</em>        -> <em>text</em>
"""
import re, json, sys

SRC = "/tmp/odt_md/content.md"
lines = open(SRC, encoding="utf-8").read().split("\n")

# ---- Section boundaries (line numbers are 1-based in the file) ----
# (slug, title, start_line, end_line, kind)  kind: 'narrative' | 'box' | 'refs'
SECTIONS = [
    ("do-different-parts",   "Do different parts of the brain do different things?", 237, 546, "narrative"),
    ("basic-functional-unit","What's the basic functional unit of the brain?",       547, 738, "narrative"),
    ("how-neurons-communicate","How do neurons communicate?",                         739, 922, "narrative"),
    ("closing-words",        "Closing words",                                          923, 936, "narrative"),
    ("box-descartes",        "Separating mind from body: Descartes and dualism",       939, 988, "box"),
    ("box-rete-mirabile",    "Failures in comparative neuroanatomy: The rete mirabile and hippocampus minor", 989, 1069, "box"),
    ("box-psychosurgery",    "The doctor with an icepick: A brief history of psychosurgeries", 1070, 1138, "box"),
    ("box-electrical-stim",  "Electrical stimulation of the human brain: The story of Mary Rafferty", 1139, 1177, "box"),
    ("box-penfield",         "Wilder Penfield and the Montreal Procedure",             1178, 1236, "box"),
    ("box-ngf",              "The developing brain: The discovery of nerve growth factor", 1237, 1286, "box"),
    ("box-sacred-disease",   "Hippocrates: On the Sacred Disease ~400 BCE",            1287, 1326, "box"),
    ("box-humoral-theory",   "Humoral theory",                                         1327, 1347, "box"),
    # References end at 1781; line 1782+ is the phrenology-widget appendix (handled
    # separately — long interactive excerpt, not core references).
    ("references",           "References",                                             1348, 1781, "refs"),
]

def get_block(start, end):
    """Return the raw text for [start, end] inclusive (1-based)."""
    return "\n".join(lines[start-1:end])

# strip the leading "N. Title" heading line and the "*Breakout boxes*:" marker
HEADING_RE = re.compile(r'^\s*\d+\.\s')

def split_paragraphs(raw):
    """Split a section body into paragraph chunks (blank-line separated),
    keeping blockquote groups (consecutive > lines) as one chunk."""
    body_lines = raw.split("\n")
    # drop the heading line(s) and stray markers
    cleaned = []
    for ln in body_lines:
        if HEADING_RE.match(ln):
            continue
        if ln.strip() in ("*Breakout boxes*:", "> ", ">"):
            # keep empty blockquote markers out
            if ln.strip() in ("*Breakout boxes*:",):
                continue
        cleaned.append(ln)
    text = "\n".join(cleaned)
    # paragraphs separated by blank lines
    chunks = re.split(r'\n\s*\n', text)
    paras = []
    for ch in chunks:
        ch = ch.strip()
        if not ch:
            continue
        is_quote = all(l.lstrip().startswith(">") for l in ch.split("\n") if l.strip())
        paras.append((ch, is_quote))
    return paras

ANCHOR_RE = re.compile(r'<span id="anchor[^"]*"></span>')
# numeric citation sup: <sup>1</sup> or <sup>2,3</sup> or <sup>8,13</sup> (allow spaces)
CITE_RE = re.compile(r'<sup>\s*([0-9]+(?:\s*,\s*[0-9]+)*)\s*</sup>')
# figure reference: optional "(", **Figure N**, optional ")" — also "Figure A"/"Figure B"
FIG_BOLD_RE = re.compile(r'\(?\*\*Figure\s+([0-9A-Z]+)\*\*\)?')
FIG_PLAIN_RE = re.compile(r'\(Figure\s+([A-Z])\)')  # box lettered, not bold
BOLD_STAR_RE = re.compile(r'\*\*([^*\n]+)\*\*')
EM_STAR_RE = re.compile(r'(?<!\*)\*([^*\n]+)\*(?!\*)')

def md_emphasis(s):
    """Convert markdown **bold** and *italic* to HTML, bold first."""
    s = BOLD_STAR_RE.sub(lambda m: "<strong>%s</strong>" % m.group(1), s)
    s = EM_STAR_RE.sub(lambda m: "<em>%s</em>" % m.group(1), s)
    return s

def clean_inline_text(s):
    """Strip anchors, normalize emphasis & escaped brackets to plain text/HTML."""
    s = ANCHOR_RE.sub("", s)
    s = s.replace("\\[", "[").replace("\\]", "]")
    s = s.replace("\n", " ")
    s = re.sub(r"\s+", " ", s)
    # markdown emphasis *x* -> <em>x</em>  (after figure handling, so do later)
    return s

class FigTracker:
    def __init__(self):
        self.order = []   # list of figure identifiers in encounter order across whole doc
        self.seen = {}
    def note(self, fid):
        if fid not in self.seen:
            self.seen[fid] = True
            self.order.append(fid)

figs = FigTracker()

def tokenize(text):
    """Turn a paragraph's text into an ordered list of content blocks.
    Splits on citation and figure markers, emitting text/citation_ref/figure_placeholder."""
    # First strip anchors and escapes, normalize whitespace
    text = ANCHOR_RE.sub("", text)
    text = text.replace("\\[", "[").replace("\\]", "]")
    # Drop raw <img>/<embed> tags — the real figures are represented by typed
    # figure_placeholder blocks; leftover source images would render broken.
    text = re.sub(r'<img\b[^>]*/?>', '', text)
    text = re.sub(r'<embed\b[^>]*/?>', '', text)
    text = re.sub(r'[ \t]*\n[ \t]*', ' ', text)
    text = re.sub(r"\s+", " ", text).strip()

    # Build a combined regex that finds either a citation or a figure marker.
    combined = re.compile(
        r'(?P<fig>\(?\*\*Figure\s+(?P<fignum>[0-9A-Z]+)\*\*\)?)'
        r'|(?P<figletter>\(Figure\s+(?P<figl>[A-Z])\))'
        r'|(?P<cite><sup>\s*(?P<cnums>[0-9]+(?:\s*,\s*[0-9]+)*)\s*</sup>)'
    )
    blocks = []
    pos = 0
    pending_text = ""

    def flush_text():
        nonlocal pending_text
        t = pending_text
        if t and t.strip():
            # convert emphasis *x* -> <em>x</em>
            t = md_emphasis(t)
            blocks.append({"type": "text", "content": t})
        pending_text = ""

    for m in combined.finditer(text):
        pending_text += text[pos:m.start()]
        if m.group("fig") is not None:
            fid = m.group("fignum")
            figs.note(fid)
            # if marker had surrounding parens, keep them in text
            raw = m.group("fig")
            lead = "(" if raw.startswith("(") else ""
            trail = ")" if raw.endswith(")") else ""
            if lead:
                pending_text += lead
            flush_text()
            blocks.append({"type": "figure_placeholder", "number": int(fid) if fid.isdigit() else fid})
            pending_text = trail
        elif m.group("figletter") is not None:
            fid = m.group("figl")
            figs.note(fid)
            pending_text += "("
            flush_text()
            blocks.append({"type": "figure_placeholder", "number": fid})
            pending_text = ")"
        elif m.group("cite") is not None:
            flush_text()
            nums = [int(x) for x in re.split(r'\s*,\s*', m.group("cnums"))]
            for n in nums:
                blocks.append({"type": "citation_ref", "number": n})
        pos = m.end()
    pending_text += text[pos:]
    flush_text()
    return blocks

def plain_text(blocks):
    """content_text: concatenate text blocks, strip tags, mention figures."""
    out = []
    for b in blocks:
        if b["type"] == "text":
            out.append(re.sub(r'<[^>]+>', '', b["content"]))
        elif b["type"] == "figure_placeholder":
            out.append("(Figure %s)" % b["number"])
    s = " ".join(out)
    s = re.sub(r'\s+([,.;:)])', r'\1', s)
    s = s.replace("( (Figure", "(Figure").replace("((Figure", "(Figure")
    s = re.sub(r'\s+', ' ', s).strip()
    # truncate very long content_text for the search column
    return s[:600]

def sql_str(s):
    return "'" + s.replace("'", "''") + "'"

def jsonb(obj):
    # ensure_ascii False keeps curly quotes; SQL-escape single quotes
    return "'" + json.dumps(obj, ensure_ascii=False).replace("'", "''") + "'::JSONB"

# ---- Build per-section paragraph data ----
section_data = []  # (slug, title, kind, [ (blocks, is_quote) ])
for slug, title, s, e, kind in SECTIONS:
    raw = get_block(s, e)
    if kind == "refs":
        section_data.append((slug, title, kind, raw))
        continue
    paras = split_paragraphs(raw)
    built = []
    for (chunk, is_quote) in paras:
        if is_quote:
            qtext = re.sub(r'^\s*>\s?', '', chunk, flags=re.M)
            qtext = clean_inline_text(qtext)
            qtext = md_emphasis(qtext)
            # Skip empty blockquotes (the source has stray lone '>' marker lines).
            if not qtext.strip():
                continue
            blocks = [{"type": "blockquote", "content": qtext}]
            built.append((blocks, True))
        else:
            blocks = tokenize(chunk)
            if blocks:
                built.append((blocks, False))
    section_data.append((slug, title, kind, built))

# ---- Parse references into ordered list items ----
def parse_references(raw):
    body = raw.split("\n")
    # drop "References" heading
    body = [l for l in body if l.strip() and l.strip() != "References"]
    text = "\n".join(body)
    # entries start with "N\.  " — split on that, keeping the number
    parts = re.split(r'\n?(?=^\d+\\?\.\s)', text, flags=re.M)
    items = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        m = re.match(r'^(\d+)\\?\.\s+(.*)$', p, flags=re.S)
        if not m:
            continue
        num = m.group(1)
        ref = m.group(2)
        ref = re.sub(r'[ \t]*\n[ \t]*', ' ', ref)
        ref = re.sub(r'\s+', ' ', ref).strip()
        ref = ANCHOR_RE.sub("", ref)
        ref = md_emphasis(ref)
        items.append((int(num), ref))
    return items

# ---- Diagram type per figure (best-guess from the source captions) ----
FIG_TYPE = {
    5:"diagram",6:"diagram",7:"manuscript",8:"diagram",9:"photo",10:"diagram",11:"photo",
    12:"photo",13:"illustration",14:"illustration",15:"illustration",16:"illustration",
    17:"photo",18:"photo",19:"illustration",20:"diagram",21:"diagram",
    "A":"photo","B":"photo","C":"illustration","D":"illustration","E":"diagram",
    "F":"diagram","G":"photo","J":"diagram","K":"diagram",
}
FIG_TITLE = {
    5:"Galen silences a squealing pig",6:"The cell doctrine (ventricular theory)",
    7:"Vesalius, De Humani Corporis Fabrica",8:"Gall & Spurzheim's phrenological map",
    9:"Leborgne (“Tan”): left frontal damage",10:"Fritsch & Hitzig's motor cortex map",
    11:"Goltz's dog vs. Ferrier's monkey",12:"Van Leeuwenhoek's microscope",
    13:"Deiters' nerve cell (axon & dendrites)",14:"Golgi's olfactory bulb",
    15:"Ramón y Cajal's growth cone",16:"Cajal's law of dynamic polarization",
    17:"Golgi's lab at the University of Pavia",18:"The synapse under electron microscopy",
    19:"Galvani's frog leg preparation",20:"Loewi's two-heart experiment",
    21:"Eccles' stretch-reflex circuit",
    "A":"Descartes' skull, Musée de l'homme","B":"“Skull of the Philosopher Descartes”, Lund",
    "C":"The rete mirabile","D":"Hippocampus minor across species",
    "E":"Burckhardt's cortical excisions","F":"Freeman's transorbital lobotomy",
    "G":"Mary Rafferty's exposed brain","J":"The cortical homunculus",
    "K":"The four humors",
}

refs_items = []
for slug, title, kind, data in section_data:
    if kind == "refs":
        refs_items = parse_references(data)

print(json.dumps({
    "figure_order": figs.order,
    "ref_count": len(refs_items),
    "ref_first": refs_items[0] if refs_items else None,
    "ref_last": refs_items[-1] if refs_items else None,
}, ensure_ascii=False), file=sys.stderr)

# =====================================================================
# Emit the migration SQL to stdout.
# =====================================================================
def anim_key(fid):
    return "animationFoundationsFig%s" % fid

# Which sections are "boxes" — their figures/animations still go left, but we
# tag them so the title in the placeholder reads sensibly.
BOX_SLUGS = {s for s,_,_,_,k in SECTIONS if k == "box"}

# Figures used in narrative+box sections (Figs 5-21, A-K). Figs 1-4 already seeded.
fig_ids = [f for f in figs.order]

out = []
w = out.append
w("-- =============================================================================")
w("-- Chapter 3: Foundations of Neuroscience — Seed PART 2 (Debates 1-3, Closing,")
w("-- breakout boxes, References). Appends to the existing module created by")
w("-- 20260605000000_seed_chapter_foundations.sql. Generated from the source ODT.")
w("-- =============================================================================")
w("")
w("BEGIN;")
w("")
w("DO $$")
w("DECLARE")
w("  v_module_id UUID;")
w("  v_next_order INT;")
w("  v_section_id UUID;")
# declare a fig-id var per figure
for fid in fig_ids:
    w("  v_fig_%s UUID;" % str(fid).lower())
w("BEGIN")
w("  SELECT id INTO v_module_id FROM modules WHERE slug = 'foundations-of-neuroscience' LIMIT 1;")
w("  IF v_module_id IS NULL THEN RAISE EXCEPTION 'Foundations module not found — run part 1 first'; END IF;")
w("  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_next_order FROM sections WHERE module_id = v_module_id;")
w("")
w("  -- ---- Figure / box placeholder animations ----")
for fid in fig_ids:
    key = anim_key(fid)
    dtype = FIG_TYPE.get(fid if not str(fid).isdigit() else int(fid), "diagram")
    ftitle = FIG_TITLE.get(fid if not str(fid).isdigit() else int(fid), "Figure %s" % fid)
    fignum_json = int(fid) if str(fid).isdigit() else fid
    cfg = {"placeholder": True, "figureNumber": fignum_json, "diagramType": dtype}
    w("  INSERT INTO animations (animation_key, title, media_type, interaction_type, component_name, config, scientific_domain, load_priority)")
    w("  VALUES (%s, %s, 'image', 'static_image', 'IllustrationPlaceholder', %s, 'history', 'low')"
      % (sql_str(key), sql_str(ftitle), jsonb(cfg)))
    w("  RETURNING id INTO v_fig_%s;" % str(fid).lower())
w("")

# Map each figure to the section it first appears in (so we can attach animation_id
# to the right paragraph). Build during emission below.
def first_fig_in_blocks(blocks):
    for b in blocks:
        if b["type"] == "figure_placeholder":
            return b["number"]
    return None

w("  -- ---- Sections & paragraphs ----")
for slug, title, kind, data in section_data:
    if kind == "refs":
        continue
    w("")
    w("  -- Section: %s" % title.replace("'", "''"))
    w("  INSERT INTO sections (module_id, title, slug, order_index)")
    w("  VALUES (v_module_id, %s, %s, v_next_order)" % (sql_str(title), sql_str(slug)))
    w("  RETURNING id INTO v_section_id;")
    w("  v_next_order := v_next_order + 1;")
    oi = 0
    for blocks, is_quote in data:
        fid = first_fig_in_blocks(blocks)
        content = {"blocks": blocks}
        ctext = plain_text(blocks)
        if fid is not None:
            w("  INSERT INTO paragraphs (section_id, content, content_text, order_index, has_animation, animation_id, animation_trigger, is_subsection_header, subsection_level)")
            w("  VALUES (v_section_id, %s, %s, %d, true, v_fig_%s, 'auto', false, 0);"
              % (jsonb(content), sql_str(ctext), oi, str(fid).lower()))
        else:
            w("  INSERT INTO paragraphs (section_id, content, content_text, order_index, has_animation, animation_id, animation_trigger, is_subsection_header, subsection_level)")
            w("  VALUES (v_section_id, %s, %s, %d, false, NULL, NULL, false, 0);"
              % (jsonb(content), sql_str(ctext), oi))
        oi += 1

# References section — one ordered list block
w("")
w("  -- Section: References")
w("  INSERT INTO sections (module_id, title, slug, order_index)")
w("  VALUES (v_module_id, 'References', 'references', v_next_order)")
w("  RETURNING id INTO v_section_id;")
w("  v_next_order := v_next_order + 1;")
ref_list = {"blocks": [{"type": "list", "ordered": True, "items": [r for _, r in sorted(refs_items)]}]}
ref_text = ("%d references." % len(refs_items))
w("  INSERT INTO paragraphs (section_id, content, content_text, order_index, has_animation, animation_id, animation_trigger, is_subsection_header, subsection_level)")
w("  VALUES (v_section_id, %s, %s, 0, false, NULL, NULL, false, 0);" % (jsonb(ref_list), sql_str(ref_text)))

w("")
w("  RAISE NOTICE 'Foundations part 2 seeded: Debates 1-3, Closing, %s boxes, References.';" % len(BOX_SLUGS))
w("END $$;")
w("")
w("COMMIT;")

sql = "\n".join(out)
sys.stdout.write(sql + "\n")
