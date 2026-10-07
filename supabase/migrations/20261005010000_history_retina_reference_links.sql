-- History/Retina missing source links, verified 2026-10-05.
-- Generated from src/data/history/referenceLinks.json by
-- src/helper/historyReferenceLinks.mjs. Evidence and unresolved cases live there.
-- CODE-ONLY: no production reads or application have been performed.
-- Requires the preceding History source-content repair for reference 79.
-- Adds only verified links to exact snapshots with BOTH link fields still NULL.
-- Preserves all raw citations, dates, existing links, author-edited divergence,
-- unrelated chapters and unresolved references. No inserts or deletions.
-- Slugs are version-scoped: both updates fail closed on ambiguous chapter slugs.
-- One separately documented importer repair restores History 59 author/title.
-- Supabase owns the transaction; this DO statement never commits independently.
-- Before authorized application, retain a snapshot for rollback. Reverse a link
-- only if its complete after-snapshot still matches; restore prior NULL fields.
-- Reverse the metadata repair only if its complete after-snapshot still matches.

do $reference_links$
declare
  repair jsonb := $reference_payload${
  "metadataRepairs": [
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 59,
      "before": {
        "authors": "Cajal, S. R",
        "title": "y",
        "journal": "Recollections of My Life",
        "year": 1989,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "Cajal, S. R. y. <em>Recollections of My Life</em>. (MIT Press, Cambridge, MA, USA, 1989)."
      },
      "after": {
        "authors": "Cajal, S. R. y",
        "title": "Recollections of My Life"
      },
      "evidenceUrls": [
        "https://direct.mit.edu/books/book/2088/Recollections-of-My-Life",
        "https://mitpress.mit.edu/9780262680608/recollections-of-my-life/"
      ],
      "reason": "Narrow importer split repair: the author’s final “y.” became the title. Restore the author string and title already present in raw_text; retain raw_text, MIT Press 1989 date and every other field."
    }
  ],
  "links": [
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 8,
      "before": {
        "authors": "Finger, S",
        "title": "Origins of Neuroscience: A History of Explorations Into Brain Function",
        "journal": null,
        "year": 2001,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "Finger, S. <em>Origins of Neuroscience: A History of Explorations Into Brain Function</em>. (Oxford University Press, 2001)."
      },
      "doi": null,
      "url": "https://global.oup.com/academic/product/origins-of-neuroscience-9780195146943"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 16,
      "before": {
        "authors": "Aristotle",
        "title": "On Sleep and Sleeplessness",
        "journal": null,
        "year": null,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "other",
        "raw_text": "Aristotle. On Sleep and Sleeplessness."
      },
      "doi": null,
      "url": "https://classics.mit.edu/Aristotle/sleep.html"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 22,
      "before": {
        "authors": "Clarke, E., Dewhurst, K. & Aminoff, M. J",
        "title": "An Illustrated History of Brain Function: Imaging the Brain from Antiquity to the Present",
        "journal": null,
        "year": 1996,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "Clarke, E., Dewhurst, K. & Aminoff, M. J. <em>An Illustrated History of Brain Function: Imaging the Brain from Antiquity to the Present</em>. (Norman Publishing, 1996)."
      },
      "doi": null,
      "url": "https://wellcomecollection.org/works/tj4r2hec"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 34,
      "before": {
        "authors": "Broca, P. P",
        "title": "Perte de la parole, ramouissement chronique et destruction partielle du lobe antérieur gauche du cerveau",
        "journal": "Bulletin de la Société Anthropologique",
        "year": 1861,
        "volume": "2",
        "pages": "235–238",
        "doi": null,
        "url": null,
        "pub_type": "article",
        "raw_text": "Broca, P. P. Perte de la parole, ramouissement chronique et destruction partielle du lobe antérieur gauche du cerveau. <em>Bulletin de la Société Anthropologique</em> <strong>2</strong>, 235–238 (1861)."
      },
      "doi": null,
      "url": "https://psychclassics.yorku.ca/Broca/perte.htm"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 41,
      "before": {
        "authors": "Lashley, K. S",
        "title": "In search of the engram",
        "journal": "Physiological mechanisms in animal behavior. (Society’s Symposium IV.)",
        "year": 1950,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "chapter",
        "raw_text": "Lashley, K. S. In search of the engram. in <em>Physiological mechanisms in animal behavior. (Society’s Symposium IV.)</em> 454–482 (Academic Press, Oxford, England, 1950)."
      },
      "doi": null,
      "url": "https://psycnet.apa.org/record/1952-05966-020"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 43,
      "before": {
        "authors": "Leeuwenhoek, A. V",
        "title": "Microscopical observations of Mr. Leewenhoeck, concerning the optic nerve, communicated to the publisher in Dutch, and by him made English",
        "journal": "Philosophical Transactions of the Royal Society of London",
        "year": 1997,
        "volume": "10",
        "pages": "378–380",
        "doi": null,
        "url": null,
        "pub_type": "article",
        "raw_text": "Leeuwenhoek, A. V. Microscopical observations of Mr. Leewenhoeck, concerning the optic nerve, communicated to the publisher in Dutch, and by him made English. <em>Philosophical Transactions of the Royal Society of London</em> <strong>10</strong>, 378–380 (1997)."
      },
      "doi": "10.1098/rstl.1675.0032",
      "url": "https://doi.org/10.1098/rstl.1675.0032"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 57,
      "before": {
        "authors": "Cajal, S. R. Y",
        "title": "The structure and connexions of neurons",
        "journal": null,
        "year": 1906,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "other",
        "raw_text": "Cajal, S. R. Y. The structure and connexions of neurons. (1906)."
      },
      "doi": null,
      "url": "https://www.nobelprize.org/prizes/medicine/1906/cajal/lecture/"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 58,
      "before": {
        "authors": "Golgi, C",
        "title": "The neuron doctrine - theory and facts",
        "journal": null,
        "year": 1906,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "other",
        "raw_text": "Golgi, C. The neuron doctrine - theory and facts. (1906)."
      },
      "doi": null,
      "url": "https://www.nobelprize.org/prizes/medicine/1906/golgi/lecture/"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 59,
      "before": {
        "authors": "Cajal, S. R. y",
        "title": "Recollections of My Life",
        "journal": "Recollections of My Life",
        "year": 1989,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "Cajal, S. R. y. <em>Recollections of My Life</em>. (MIT Press, Cambridge, MA, USA, 1989)."
      },
      "doi": "10.7551/mitpress/5817.001.0001",
      "url": "https://doi.org/10.7551/mitpress/5817.001.0001"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 63,
      "before": {
        "authors": "Azevedo, F. A. C. et al",
        "title": "Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain",
        "journal": "J Comp Neurol",
        "year": 2009,
        "volume": "513",
        "pages": "532–541",
        "doi": null,
        "url": null,
        "pub_type": "article",
        "raw_text": "Azevedo, F. A. C. <em>et al.</em> Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain. <em>J Comp Neurol</em> <strong>513</strong>, 532–541 (2009)."
      },
      "doi": "10.1002/cne.21974",
      "url": "https://doi.org/10.1002/cne.21974"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 70,
      "before": {
        "authors": "Dale, H. H",
        "title": "Otto Loewi, 1873-1961",
        "journal": "Biographical Memoirs of Fellows of the Royal Society",
        "year": 1997,
        "volume": "8",
        "pages": "67–89",
        "doi": null,
        "url": null,
        "pub_type": "article",
        "raw_text": "Dale, H. H. Otto Loewi, 1873-1961. <em>Biographical Memoirs of Fellows of the Royal Society</em> <strong>8</strong>, 67–89 (1997)."
      },
      "doi": "10.1098/rsbm.1962.0006",
      "url": "https://doi.org/10.1098/rsbm.1962.0006"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 74,
      "before": {
        "authors": "Feldberg, W. S",
        "title": "Henry Hallett Dale, 1875-1968",
        "journal": "Biographical Memoirs of Fellows of the Royal Society",
        "year": 1997,
        "volume": "16",
        "pages": "77–174",
        "doi": null,
        "url": null,
        "pub_type": "article",
        "raw_text": "Feldberg, W. S. Henry Hallett Dale, 1875-1968. <em>Biographical Memoirs of Fellows of the Royal Society</em> <strong>16</strong>, 77–174 (1997)."
      },
      "doi": "10.1098/rsbm.1970.0006",
      "url": "https://doi.org/10.1098/rsbm.1970.0006"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 79,
      "before": {
        "authors": "Sakmann, B",
        "title": "Bernard Katz. 26 March 1911 — 20 April 2003: Elected 1952",
        "journal": "Biogr. Mems Fell. R. Soc.",
        "year": 2007,
        "volume": "53",
        "pages": "185–202",
        "doi": null,
        "url": null,
        "pub_type": "article",
        "raw_text": "Sakmann, B. Bernard Katz. 26 March 1911 — 20 April 2003: Elected 1952. <em>Biogr. Mems Fell. R. Soc.</em> <strong>53</strong>, 185–202 (2007)."
      },
      "doi": "10.1098/rsbm.2007.0013",
      "url": "https://doi.org/10.1098/rsbm.2007.0013"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 86,
      "before": {
        "authors": "Trenholm, S. & Awatramani, G. B",
        "title": "Myriad roles for gap junctions in retinal circuits",
        "journal": "Webvision: The Organization of the Retina and Visual System",
        "year": 2019,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "chapter",
        "raw_text": "Trenholm, S. & Awatramani, G. B. Myriad roles for gap junctions in retinal circuits. in <em>Webvision: The Organization of the Retina and Visual System</em> (eds Kolb, H., Fernandez, E. & Nelson, R.) (University of Utah Health Sciences Center, Salt Lake City (UT), 2019)."
      },
      "doi": null,
      "url": "https://www.webvision.pitt.edu/book/part-iii-retinal-circuits/myriad-roles-for-gap-junctions-in-retinal-circuits/"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 91,
      "before": {
        "authors": "Manhag, A. & Karsten, P",
        "title": "9. The true skull of Descartes? – A source critical study",
        "journal": "Collecting curiosities",
        "year": null,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "chapter",
        "raw_text": "Manhag, A. & Karsten, P. 9. The true skull of Descartes? – A source critical study. in <em>Collecting curiosities</em>."
      },
      "doi": null,
      "url": "https://portal.research.lu.se/en/publications/the-true-skull-of-descartes-a-source-critical-study/"
    },
    {
      "chapterSlug": "foundations-of-neuroscience",
      "number": 104,
      "before": {
        "authors": "Freeman, W. & Watts, J. W",
        "title": "Prefrontal Lobotomy",
        "journal": "Bull N Y Acad Med",
        "year": 1942,
        "volume": "18",
        "pages": "794–812",
        "doi": null,
        "url": null,
        "pub_type": "article",
        "raw_text": "Freeman, W. & Watts, J. W. Prefrontal Lobotomy. <em>Bull N Y Acad Med</em> <strong>18</strong>, 794–812 (1942)."
      },
      "doi": null,
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC1933933/"
    },
    {
      "chapterSlug": "the-retina",
      "number": 1,
      "before": {
        "authors": "Finger, S",
        "title": "Origins of neuroscience: a history of explorations into brain function",
        "journal": null,
        "year": 2001,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "Finger, S. <em>Origins of neuroscience: a history of explorations into brain function</em>. (Oxford Univ. Press, 2001)."
      },
      "doi": null,
      "url": "https://global.oup.com/academic/product/origins-of-neuroscience-9780195146943"
    },
    {
      "chapterSlug": "the-retina",
      "number": 3,
      "before": {
        "authors": "",
        "title": "Adler's physiology of the eye: clinical application",
        "journal": null,
        "year": 2011,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "<em>Adler's physiology of the eye: clinical application</em>. (Saunders/Elsevier, 2011)"
      },
      "doi": null,
      "url": "https://shop.elsevier.com/books/adlers-physiology-of-the-eye/levin/978-0-323-05714-1"
    },
    {
      "chapterSlug": "the-retina",
      "number": 28,
      "before": {
        "authors": "Rodieck, R. W",
        "title": "The first steps in seeing",
        "journal": null,
        "year": 1998,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "Rodieck, R. W. <em>The first steps in seeing</em>. (Sinauer Associates, 1998)."
      },
      "doi": null,
      "url": "https://global.oup.com/ushe/product/the-first-steps-in-seeing-9780878937578"
    },
    {
      "chapterSlug": "the-retina",
      "number": 29,
      "before": {
        "authors": "",
        "title": "Principles of neural science",
        "journal": null,
        "year": 2000,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "<em>Principles of neural science</em>. (McGraw-Hill, Health Professions Division, 2000)."
      },
      "doi": null,
      "url": "https://archive.org/details/isbn_9780838577011"
    },
    {
      "chapterSlug": "the-retina",
      "number": 34,
      "before": {
        "authors": "Trenholm, S. & Awatramani, G. B",
        "title": "Myriad roles for gap junctions in retinal circuits",
        "journal": "Webvision: The Organization of the Retina and Visual System",
        "year": 1995,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "chapter",
        "raw_text": "Trenholm, S. & Awatramani, G. B. Myriad roles for gap junctions in retinal circuits. in <em>Webvision: The Organization of the Retina and Visual System</em> (eds. Kolb, H., Fernandez, E. & Nelson, R.) (University of Utah Health Sciences Center, 1995)."
      },
      "doi": null,
      "url": "https://www.webvision.pitt.edu/book/part-iii-retinal-circuits/myriad-roles-for-gap-junctions-in-retinal-circuits/"
    },
    {
      "chapterSlug": "the-retina",
      "number": 35,
      "before": {
        "authors": "Fernald, R. D",
        "title": "The evolution of eyes",
        "journal": "Brain Behav Evol",
        "year": 1997,
        "volume": "50",
        "pages": "253–259",
        "doi": null,
        "url": null,
        "pub_type": "article",
        "raw_text": "Fernald, R. D. The evolution of eyes. <em>Brain Behav Evol</em> <strong>50</strong>, 253--259 (1997)."
      },
      "doi": "10.1159/000113339",
      "url": "https://doi.org/10.1159/000113339"
    },
    {
      "chapterSlug": "the-retina",
      "number": 100,
      "before": {
        "authors": "Darwin, C",
        "title": "The origin of species",
        "journal": null,
        "year": null,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "book",
        "raw_text": "Darwin, C. <em>The origin of species</em>. (New York : P.F. Collier, c1909)."
      },
      "doi": null,
      "url": "https://archive.org/details/originofspecies00darwuoft"
    }
  ]
}$reference_payload$::jsonb;
  item jsonb;
  changed integer;
  updated_links integer := 0;
  updated_metadata integer := 0;
begin
  for item in select value from jsonb_array_elements(repair->'metadataRepairs')
  loop
    update public."references" as r
    set authors = item->'after'->>'authors',
        title = item->'after'->>'title'
    from public.modules as m
    where r.module_id = m.id
      and m.slug = item->>'chapterSlug'
      and (select count(*) from public.modules as candidate
           where candidate.slug = item->>'chapterSlug') = 1
      and r.number = (item->>'number')::integer
      and to_jsonb(r) @> (item->'before');
    get diagnostics changed = row_count;
    updated_metadata := updated_metadata + changed;
    if changed = 0 then
      raise notice 'Reference metadata %/% skipped: ambiguous chapter, absent, already repaired or divergent snapshot',
        item->>'chapterSlug', item->>'number';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(repair->'links')
  loop
    update public."references" as r
    set doi = item->>'doi', url = item->>'url'
    from public.modules as m
    where r.module_id = m.id
      and m.slug = item->>'chapterSlug'
      and (select count(*) from public.modules as candidate
           where candidate.slug = item->>'chapterSlug') = 1
      and r.number = (item->>'number')::integer
      and r.doi is null and r.url is null
      and to_jsonb(r) @> (item->'before');
    get diagnostics changed = row_count;
    updated_links := updated_links + changed;
    if changed = 0 then
      raise notice 'Reference links %/% skipped: ambiguous chapter, absent, already linked or divergent snapshot',
        item->>'chapterSlug', item->>'number';
    end if;
  end loop;
  raise notice 'Reference repair: % link rows, % metadata rows updated',
    updated_links, updated_metadata;
end;
$reference_links$;
