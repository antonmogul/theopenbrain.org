-- OPENBRAIN-48: Stuart's exact Introduction suggestion, review a82adeef.
-- Current text verified read-only 19 Nov 2026. Apply the two paragraphs together
-- only when both full content/text snapshots match. Keep paragraph identities,
-- citations, the figure link and all dependent reader data. No production apply here.
do $history_intro$
declare
  changes jsonb := $intro_snapshots$[
  {
    "orderIndex": 0,
    "before": {
      "content": {
        "blocks": [
          {
            "type": "text",
            "content": "Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered, “I became a neurologist rather than, say, a cardiologist, because there’s nothing for an intelligent man to be interested in in cardiology. The heart, I suppose, is an interesting pump, but it’s just a pump. Neurology is the only branch of medicine that could sustain a thinking man.”"
          },
          {
            "type": "citation_ref",
            "number": 1
          },
          {
            "type": "text",
            "content": " In this chapter, we provide a brief survey of ideas surrounding this most fascinating of organs, told through debates that helped frame our modern understanding of the brain."
          }
        ]
      },
      "content_text": "Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered, “I became a neurologist rather than, say, a cardiologist, because there’s nothing for an intelligent man to be interested in in cardiology. The heart, I suppose, is an interesting pump, but it’s just a pump. Neurology is the only branch of medicine that could sustain a thinking man.”1 In this chapter, we provide a brief survey of ideas surrounding this most fascinating of organs, told through debates that helped frame our modern understanding of the brain."
    },
    "after": {
      "content": {
        "blocks": [
          {
            "type": "text",
            "content": "Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered, “I became a neurologist rather than, say, a cardiologist, because there’s nothing for an intelligent man to be interested in in cardiology. The heart, I suppose, is an interesting pump, but it’s just a pump. Neurology is the only branch of medicine that could sustain a thinking man.”"
          },
          {
            "type": "citation_ref",
            "number": 1
          },
          {
            "type": "text",
            "content": " In this chapter, we provide a brief survey of ideas surrounding this most fascinating of organs, told through four debates that helped frame our modern understanding of the brain:  1) Where is the mind? 2) Is there localization of function in the brain? 3) What is the fundamental functional unit of the brain? 4) How do neurons communicate with one another?"
          }
        ]
      },
      "content_text": "Upon being asked why he decided to specialize in neurology, Oliver Sacks famously answered, “I became a neurologist rather than, say, a cardiologist, because there’s nothing for an intelligent man to be interested in in cardiology. The heart, I suppose, is an interesting pump, but it’s just a pump. Neurology is the only branch of medicine that could sustain a thinking man.”1 In this chapter, we provide a brief survey of ideas surrounding this most fascinating of organs, told through four debates that helped frame our modern understanding of the brain:  1) Where is the mind? 2) Is there localization of function in the brain? 3) What is the fundamental functional unit of the brain? 4) How do neurons communicate with one another?"
    }
  },
  {
    "orderIndex": 1,
    "before": {
      "content": {
        "blocks": [
          {
            "type": "text",
            "content": "Here, we’ll focus on four debates surrounding questions that lead to our current understanding of brain function: 1) Where is the mind? 2) Is there localization of function in the brain? 3) What is the fundamental functional unit of the brain? 4) How do neurons communicate with one another?"
          }
        ]
      },
      "content_text": "Here, we will focus on four debates: 1) Where is the mind? 2) Is there localization of function in the brain? 3) What is the fundamental functional unit of the brain? 4) How do neurons communicate with one another?"
    },
    "after": {
      "content": {
        "blocks": []
      },
      "content_text": ""
    }
  }
]$intro_snapshots$::jsonb;
  chapter_ids uuid[];
  target_section uuid;
  matching integer;
begin
  select array_agg(id) into chapter_ids from public.modules
    where slug = 'foundations-of-neuroscience';
  if cardinality(chapter_ids) > 1 then
    raise exception 'History Introduction: ambiguous chapter version; nothing changed';
  end if;
  if chapter_ids[1] is null then return; end if;
  perform 1 from public.modules where id = chapter_ids[1] for update;
  select id into strict target_section from public.sections
    where module_id = chapter_ids[1] and slug = 'introduction';
  perform 1 from public.paragraphs where section_id = target_section
    and order_index in (0, 1) for update;
  select count(*) into matching from public.paragraphs p
    join jsonb_array_elements(changes) item on p.order_index = (item->>'orderIndex')::integer
    where p.section_id = target_section
      and p.content = item->'before'->'content'
      and p.content_text is not distinct from item->'before'->>'content_text';
  if matching <> 2 then
    raise notice 'History Introduction: both snapshots must match; already applied, absent or edited; nothing changed';
    return;
  end if;
  update public.paragraphs p set content = item->'after'->'content',
    content_text = item->'after'->>'content_text', updated_at = now()
    from jsonb_array_elements(changes) item
    where p.section_id = target_section and p.order_index = (item->>'orderIndex')::integer;
end
$history_intro$;
