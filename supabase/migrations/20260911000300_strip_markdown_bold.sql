-- OPENBRAIN-35: markdown bold markers leaked through the Foundations import
-- (two paragraphs render "**defended by** …" literally) and the plain-text
-- search mirror (content_text) carries `**` on ~200 rows across chapters.
-- Convert balanced **…** pairs to <strong> in the rendered blocks and drop the
-- markers from content_text. The reader also converts at render time
-- (chapterTransform.markdownBoldToHtml), so applying this is safe at any time.
-- Idempotent: a second run matches no rows.

update public.paragraphs
set content = regexp_replace(
  content::text,
  '\*\*([^*]+?)\*\*',
  '<strong>\1</strong>',
  'g'
)::jsonb
where content::text ~ '\*\*[^*]+?\*\*';

update public.paragraphs
set content_text = regexp_replace(content_text, '\*\*([^*]+?)\*\*', '\1', 'g')
where content_text ~ '\*\*[^*]+?\*\*';

-- Leftover runs (an unclosed `**`, an empty `****`) are import residue with
-- no meaning to a reader: drop them from the rendered blocks and the mirror.
update public.paragraphs
set content = regexp_replace(content::text, '\*{2,}', '', 'g')::jsonb
where content::text ~ '\*{2,}';

update public.paragraphs
set content_text = regexp_replace(content_text, '\*{2,}', '', 'g')
where content_text ~ '\*{2,}';
