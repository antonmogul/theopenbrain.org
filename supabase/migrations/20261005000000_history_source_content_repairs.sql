-- History source-content restoration, audited 2026-10-05.
-- Generated from src/data/history/sourceContentRepairs.json by
-- src/helper/historySourceRepair.mjs. Do not edit the embedded snapshots.
-- Source: Foundations_ST7_NM3_LL.docx, SHA-256 c8118d6d3be7c1f8cc4a6b3ca5893192acab7c33c8f7798fbeab64048b6dbd9f.
-- CODE-ONLY: not applied to production. Applied state is unknown.
-- Exact content/text snapshots protect divergent author edits. Slugs, not
-- production UUIDs, resolve every target. Existing humoral Figure K is untouched.
-- Fragment deletion is limited to three exact importer artifacts; every inbound
-- paragraph FK is checked and ANY dependent row causes an observable skip.
-- No CASCADE, ordering compaction, schema change, credential or permission change.
-- Retain an operator backup before authorized application. Reverse only matching
-- after snapshots. Deleted fragments may be restored from fixture before fields
-- at an empty original section/order; no inbound dependency exists at deletion.
-- Supabase's migration runner owns the transaction; this single DO statement
-- must not COMMIT separately from its migration-history entry.

do $history_repair$
declare
  repair jsonb := $history_source${
  "chapterSlug": "foundations-of-neuroscience",
  "source": {
    "document": "Foundations_ST7_NM3_LL.docx",
    "sha256": "c8118d6d3be7c1f8cc4a6b3ca5893192acab7c33c8f7798fbeab64048b6dbd9f",
    "baseCommit": "949aef2",
    "verification": "Committed migration seed comparison only; production-applied state unknown. Original DOCX/media unmodified."
  },
  "paragraphUpdates": [
    {
      "sectionSlug": "where-is-my-mind",
      "orderIndex": 0,
      "sourceBlocks": [
        23
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "What did prehistorical humans know about the brain? In the mid-1860s, Paul Broca—a renowned French neurologist and anthropologist—received a skull. It was sent to him by Ephraim George Squier, an American anthropologist who had acquired the skull in Peru from a Señora Zentino, a collector of antiquities"
            },
            {
              "type": "citation_ref",
              "number": 2
            },
            {
              "type": "text",
              "content": ". The skull came from an Incan burial site and had a square hole cut in it ("
            },
            {
              "type": "figure_placeholder",
              "number": 1
            },
            {
              "type": "text",
              "content": "). To Squier, the nature of the hole suggested it had been cut while the individual was alive. He presented it to the New York Academy of Medicine, but they were unconvinced. In the western world at that time, cranial opening surgeries were rare and had very high mortality rates. Squier forwarded the skull to Broca for a second opinion. This was not the first skull recovered from an ancient site with an apparently man-made hole, but the previously observed holes had generally been attributed to traumatic injuries or posthumous rituals"
            },
            {
              "type": "citation_ref",
              "number": 3
            },
            {
              "type": "text",
              "content": ". However, upon examination, Broca was convinced that this was the skull of a person who had survived at least for a few days after the procedure. Broca published his findings"
            },
            {
              "type": "citation_ref",
              "number": 4
            },
            {
              "type": "text",
              "content": ", which generated immediate interest in studying trepanation—the surgical procedure of putting a hole in the skull—in ancient burial sites. For instance, Broca and his friend P. Barthélemy Prunières re-examined many skulls with holes that had previously been attributed to injuries or postmortem rituals, and concluded that many had actually been caused by trepanations in living individuals"
            },
            {
              "type": "citation_ref",
              "number": 3
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "What did prehistorical humans know about the brain? In the mid-1860s, Paul Broca received a trepanned Incan skull from Peru (Figure 1) and concluded the individual had survived the procedure, sparking interest in studying trepanation in ancient burial sites."
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "What did prehistorical humans know about the brain? In the mid-1860s, Paul Broca—a renowned French neurologist and anthropologist—received a skull. It was sent to him by Ephraim George Squier, an American anthropologist who had acquired the skull in Peru from a Señora Zentino, a collector of antiquities"
            },
            {
              "type": "citation_ref",
              "number": 2
            },
            {
              "type": "citation_ref",
              "number": 3
            },
            {
              "type": "text",
              "content": ". The skull came from an Incan burial site and had a square hole cut in it ("
            },
            {
              "type": "figure_placeholder",
              "number": 1
            },
            {
              "type": "text",
              "content": "). To Squier, the nature of the hole suggested it had been cut while the individual was alive. He presented it to the New York Academy of Medicine, but they were unconvinced. In the western world at that time, cranial opening surgeries were rare and had very high mortality rates. Squier forwarded the skull to Broca for a second opinion. This was not the first skull recovered from an ancient site with an apparently man-made hole, but the previously observed holes had generally been attributed to traumatic injuries or posthumous rituals"
            },
            {
              "type": "citation_ref",
              "number": 3
            },
            {
              "type": "text",
              "content": ". However, upon examination, Broca was convinced that this was the skull of a person who had survived at least for a few days after the procedure. Broca published his findings"
            },
            {
              "type": "citation_ref",
              "number": 4
            },
            {
              "type": "text",
              "content": ", which generated immediate interest in studying trepanation—the surgical procedure of putting a hole in the skull—in ancient burial sites. For instance, Broca and his friend P. Barthélemy Prunières re-examined many skulls with holes that had previously been attributed to injuries or postmortem rituals, and concluded that many had actually been caused by trepanations in living individuals"
            },
            {
              "type": "citation_ref",
              "number": 3
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "What did prehistorical humans know about the brain? In the mid-1860s, Paul Broca received a trepanned Incan skull from Peru (Figure 1) and concluded the individual had survived the procedure, sparking interest in studying trepanation in ancient burial sites."
      },
      "sourceCitationNumbers": [
        2,
        3,
        3,
        4,
        3
      ],
      "reason": "Restore numeric citation runs omitted by the importer; preserve all existing prose and markup."
    },
    {
      "sectionSlug": "where-is-my-mind",
      "orderIndex": 1,
      "sourceBlocks": [
        25
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Subsequent examinations of ancient sites revealed that trepanations were relatively common throughout the prehistoric world, that they were performed in various different ways ("
            },
            {
              "type": "figure_placeholder",
              "number": 2
            },
            {
              "type": "text",
              "content": "), and that they were often non-lethal"
            },
            {
              "type": "citation_ref",
              "number": 2
            },
            {
              "type": "text",
              "content": ". For instance, in some Peruvian burial sites, up to 30% of skulls exhibit trepanation, with a survival rate—as evidenced by osteoclastic activity, remodeling, and healing around the trepanned site—of over 80%"
            },
            {
              "type": "citation_ref",
              "number": 5
            },
            {
              "type": "text",
              "content": ". Why were such holes made? Without a written record it’s impossible to say with certainty, but it’s likely the reasons were either superstitious, ritualistic, or medical. Possible evidence for a superstitious or ritualistic basis for trepanations comes from a Copper Age burial site in what is now Southern Russia"
            },
            {
              "type": "citation_ref",
              "number": 6
            },
            {
              "type": "text",
              "content": ". In contrast to all other trepanned skulls found in prehistorical sites throughout the world, skulls from these sites predominantly exhibit trepanned holes located over the midline, near the obelion. The consistency of the hole location, and the fact that this location is considered to be a very dangerous spot to open (even the Hippocratic writings warn to avoid trepanation over sutures"
            },
            {
              "type": "citation_ref",
              "number": 2
            },
            {
              "type": "text",
              "content": "), suggests such procedures were possibly performed in service of some type of ritual"
            },
            {
              "type": "citation_ref",
              "number": 6
            },
            {
              "type": "text",
              "content": ". As possible evidence for medical-related trepanations, some trepanation sites appear to be adjacent to trauma sites, suggesting the trauma precipitated the trepanation"
            },
            {
              "type": "citation_ref",
              "number": 5
            },
            {
              "type": "text",
              "content": ". Nowadays, the vast majority of trepanations are performed in hospitals as part of modern medical procedures, though certain, albeit rare occult trepanation rituals persist"
            },
            {
              "type": "citation_ref",
              "number": 7
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "Trepanations were relatively common throughout the prehistoric world (Figure 2), performed in various ways and often non-lethal, with survival rates over 80% at some Peruvian sites. The reasons were likely superstitious, ritualistic, or medical."
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Subsequent examinations of ancient sites revealed that trepanations were relatively common throughout the prehistoric world, that they were performed in various different ways ("
            },
            {
              "type": "figure_placeholder",
              "number": 2
            },
            {
              "type": "text",
              "content": "), and that they were often non-lethal"
            },
            {
              "type": "citation_ref",
              "number": 2
            },
            {
              "type": "citation_ref",
              "number": 3
            },
            {
              "type": "text",
              "content": ". For instance, in some Peruvian burial sites, up to 30% of skulls exhibit trepanation, with a survival rate—as evidenced by osteoclastic activity, remodeling, and healing around the trepanned site—of over 80%"
            },
            {
              "type": "citation_ref",
              "number": 5
            },
            {
              "type": "text",
              "content": ". Why were such holes made? Without a written record it’s impossible to say with certainty, but it’s likely the reasons were either superstitious, ritualistic, or medical. Possible evidence for a superstitious or ritualistic basis for trepanations comes from a Copper Age burial site in what is now Southern Russia"
            },
            {
              "type": "citation_ref",
              "number": 6
            },
            {
              "type": "text",
              "content": ". In contrast to all other trepanned skulls found in prehistorical sites throughout the world, skulls from these sites predominantly exhibit trepanned holes located over the midline, near the obelion. The consistency of the hole location, and the fact that this location is considered to be a very dangerous spot to open (even the Hippocratic writings warn to avoid trepanation over sutures"
            },
            {
              "type": "citation_ref",
              "number": 2
            },
            {
              "type": "text",
              "content": "), suggests such procedures were possibly performed in service of some type of ritual"
            },
            {
              "type": "citation_ref",
              "number": 6
            },
            {
              "type": "text",
              "content": ". As possible evidence for medical-related trepanations, some trepanation sites appear to be adjacent to trauma sites, suggesting the trauma precipitated the trepanation"
            },
            {
              "type": "citation_ref",
              "number": 5
            },
            {
              "type": "text",
              "content": ". Nowadays, the vast majority of trepanations are performed in hospitals as part of modern medical procedures, though certain, albeit rare occult trepanation rituals persist"
            },
            {
              "type": "citation_ref",
              "number": 7
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "Trepanations were relatively common throughout the prehistoric world (Figure 2), performed in various ways and often non-lethal, with survival rates over 80% at some Peruvian sites. The reasons were likely superstitious, ritualistic, or medical."
      },
      "sourceCitationNumbers": [
        2,
        3,
        5,
        6,
        2,
        6,
        5,
        7
      ],
      "reason": "Restore numeric citation runs omitted by the importer; preserve all existing prose and markup."
    },
    {
      "sectionSlug": "where-is-my-mind",
      "orderIndex": 4,
      "sourceBlocks": [
        30
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Other early texts indicate that, like the Egyptians, ancient Mesopotamian, Indian and Chinese thinkers also tended to consider the heart as the principle organ of the mind"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "text",
              "content": ". That being said, some relatively correct functions were assigned to the brain early on: the Edwin Smith Papyrus relates damage to one side of the head leading to hemiplegia"
            },
            {
              "type": "citation_ref",
              "number": 12
            },
            {
              "type": "text",
              "content": " (paralysis on the other side of the body); the Indian Charaka Samhita indicates that head issues can lead to facial paralysis and muteness"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "Like the Egyptians, ancient Mesopotamian, Indian and Chinese thinkers tended to consider the heart the principal organ of the mind, though some correct brain functions were noted early, such as head damage leading to contralateral paralysis."
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Other early texts indicate that, like the Egyptians, ancient Mesopotamian, Indian and Chinese thinkers also tended to consider the heart as the principle organ of the mind"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "citation_ref",
              "number": 10
            },
            {
              "type": "citation_ref",
              "number": 11
            },
            {
              "type": "text",
              "content": ". That being said, some relatively correct functions were assigned to the brain early on: the Edwin Smith Papyrus relates damage to one side of the head leading to hemiplegia"
            },
            {
              "type": "citation_ref",
              "number": 12
            },
            {
              "type": "text",
              "content": " (paralysis on the other side of the body); the Indian Charaka Samhita indicates that head issues can lead to facial paralysis and muteness"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "Like the Egyptians, ancient Mesopotamian, Indian and Chinese thinkers tended to consider the heart the principal organ of the mind, though some correct brain functions were noted early, such as head damage leading to contralateral paralysis."
      },
      "sourceCitationNumbers": [
        8,
        10,
        11,
        12,
        8
      ],
      "reason": "Restore numeric citation runs omitted by the importer; preserve all existing prose and markup."
    },
    {
      "sectionSlug": "where-is-my-mind",
      "orderIndex": 8,
      "sourceBlocks": [
        38,
        40
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "In contrast to Plato, his pupil Aristotle held a cardiocentric point of view. Aristotle, who performed comparative anatomical analyses in several animal species, also split the soul into three components, but he used these to separate man from plants and other animals. He argued that all organisms have a vegetative/nourishing soul, all animals possess a sensitive, motor soul, but only humans possess an immaterial intellectual soul (Alcmaeon had argued earlier that understanding is what separated humans from other animals)"
            },
            {
              "type": "citation_ref",
              "number": 13
            },
            {
              "type": "text",
              "content": ". Aristotle placed the seat of these souls in the heart"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "text",
              "content": ". In part, he argued for a cardiocentric view because he considered the heart to be warm, and thus vital, whereas he thought the brain was cold—Galen would test this a few hundred years later and find that the brain was warm. Aristotle argued that the brain served to cool down the heart, going so far as to posit that we sleep at the end of the day since the brain’s cooling abilities were insufficient:"
            },
            {
              "type": "blockquote",
              "content": "“For, as has been observed elsewhere, sleep comes on when the corporeal element [in the ‘evaporation’] conveyed upwards by the hot, along the veins, to the head. But when that which has been thus carried up can no longer ascend, but is too great in quantity [to do so], it forces the hot back again and flows downwards. Hence it is that men sink down [as they do in sleep] when the heat which tends to keep them erect (man alone, among animals, being naturally erect) is withdrawn; and this, when it befalls them, causes unconsciousness, and afterwards phantasy.”"
            }
          ]
        },
        "content_text": "In contrast to Plato, his pupil Aristotle held a cardiocentric view, placing the seat of the soul in the heart, which he considered warm and vital, while thinking the brain was cold and served only to cool the heart — even attributing sleep to the brain’s insufficient cooling."
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "In contrast to Plato, his pupil Aristotle held a cardiocentric point of view. Aristotle, who performed comparative anatomical analyses in several animal species, also split the soul into three components, but he used these to separate man from plants and other animals. He argued that all organisms have a vegetative/nourishing soul, all animals possess a sensitive, motor soul, but only humans possess an immaterial intellectual soul (Alcmaeon had argued earlier that understanding is what separated humans from other animals)"
            },
            {
              "type": "citation_ref",
              "number": 13
            },
            {
              "type": "text",
              "content": ". Aristotle placed the seat of these souls in the heart"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "citation_ref",
              "number": 13
            },
            {
              "type": "text",
              "content": ". In part, he argued for a cardiocentric view because he considered the heart to be warm, and thus vital, whereas he thought the brain was cold—Galen would test this a few hundred years later and find that the brain was warm. Aristotle argued that the brain served to cool down the heart, going so far as to posit that we sleep at the end of the day since the brain’s cooling abilities were insufficient:"
            },
            {
              "type": "blockquote",
              "content": "“For, as has been observed elsewhere, sleep comes on when the corporeal element [in the ‘evaporation’] conveyed upwards by the hot, along the veins, to the head. But when that which has been thus carried up can no longer ascend, but is too great in quantity [to do so], it forces the hot back again and flows downwards. Hence it is that men sink down [as they do in sleep] when the heat which tends to keep them erect (man alone, among animals, being naturally erect) is withdrawn; and this, when it befalls them, causes unconsciousness, and afterwards phantasy.<sup class=\"citation-ref\" data-ref=\"16\">16</sup>”"
            }
          ]
        },
        "content_text": "In contrast to Plato, his pupil Aristotle held a cardiocentric view, placing the seat of the soul in the heart, which he considered warm and vital, while thinking the brain was cold and served only to cool the heart — even attributing sleep to the brain’s insufficient cooling."
      },
      "sourceCitationNumbers": [
        13,
        8,
        13,
        16
      ],
      "reason": "Restore numeric citation runs omitted by the importer; preserve all existing prose and markup."
    },
    {
      "sectionSlug": "where-is-my-mind",
      "orderIndex": 9,
      "sourceBlocks": [
        42
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Dissections of the human brain and body only truly began with Herophilus (335-280 BCE) and Erasistratus (304-250 BCE), when, for a brief period of time, studying human cadavers was permitted at the Alexandria School of Medicine in Egypt"
            },
            {
              "type": "citation_ref",
              "number": 17
            },
            {
              "type": "text",
              "content": ". By dissecting bodies of criminals executed at the Ptolemean court, these Greek physicians pioneered the field of human anatomy and provided the first descriptions of the cerebrum, the cerebellum, and the cerebral ventricles in the human brain. Herophilus and Erasistratus were the first to define nerves, and showed that they could be traced back to the brain and the spinal cord"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "text",
              "content": ". At one point, Erasistratus argued that the meninges housed the mind"
            },
            {
              "type": "citation_ref",
              "number": 13
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "Human dissection truly began with Herophilus and Erasistratus at the Alexandria School of Medicine, who pioneered human anatomy, gave the first descriptions of the cerebrum, cerebellum, and ventricles, and were the first to define nerves and trace them to the brain and spinal cord."
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Dissections of the human brain and body only truly began with Herophilus (335-280 BCE) and Erasistratus (304-250 BCE), when, for a brief period of time, studying human cadavers was permitted at the Alexandria School of Medicine in Egypt"
            },
            {
              "type": "citation_ref",
              "number": 17
            },
            {
              "type": "text",
              "content": ". By dissecting bodies of criminals executed at the Ptolemean court, these Greek physicians pioneered the field of human anatomy and provided the first descriptions of the cerebrum, the cerebellum, and the cerebral ventricles in the human brain. Herophilus and Erasistratus were the first to define nerves, and showed that they could be traced back to the brain and the spinal cord"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "citation_ref",
              "number": 13
            },
            {
              "type": "text",
              "content": ". At one point, Erasistratus argued that the meninges housed the mind"
            },
            {
              "type": "citation_ref",
              "number": 13
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "Human dissection truly began with Herophilus and Erasistratus at the Alexandria School of Medicine, who pioneered human anatomy, gave the first descriptions of the cerebrum, cerebellum, and ventricles, and were the first to define nerves and trace them to the brain and spinal cord."
      },
      "sourceCitationNumbers": [
        17,
        8,
        13,
        13
      ],
      "reason": "Restore numeric citation runs omitted by the importer; preserve all existing prose and markup."
    },
    {
      "sectionSlug": "where-is-my-mind",
      "orderIndex": 10,
      "sourceBlocks": [
        44
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "The works of Herophilus and Erasistratus are not extant, but were passed down by the works of others, including Galen (129-216 CE), who in turn argued strongly in favour of the brain as the seat of the mind. After Hippocrates, Galen, a Greek physician working in Rome, had the most significant impact on medicine. This was in part because, like Hippocrates, he advocated for direct observation and against superstition. He served as the personal physician to several emperors, including Marcus Aurelius"
            },
            {
              "type": "citation_ref",
              "number": 18
            },
            {
              "type": "text",
              "content": ". Based on animal dissections, he described cranial and peripheral nerves, and showed that the brain and spinal cord were the source of nerves"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "text",
              "content": ". Additionally, he explored subcortical structures and described cerebral ventricles more extensively than his predecessors. However, by Galen’s time dissections on human cadavers were no longer allowed, which limited his insights into human neuroanatomy."
            }
          ]
        },
        "content_text": "Galen (129-216 CE) argued strongly for the brain as the seat of the mind and, after Hippocrates, had the greatest impact on medicine. Based on animal dissections, he described cranial and peripheral nerves and the ventricles, though a ban on human dissection limited his neuroanatomy."
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "The works of Herophilus and Erasistratus are not extant, but were passed down by the works of others, including Galen (129-216 CE), who in turn argued strongly in favour of the brain as the seat of the mind. After Hippocrates, Galen, a Greek physician working in Rome, had the most significant impact on medicine. This was in part because, like Hippocrates, he advocated for direct observation and against superstition. He served as the personal physician to several emperors, including Marcus Aurelius"
            },
            {
              "type": "citation_ref",
              "number": 18
            },
            {
              "type": "text",
              "content": ". Based on animal dissections, he described cranial and peripheral nerves, and showed that the brain and spinal cord were the source of nerves"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "citation_ref",
              "number": 13
            },
            {
              "type": "text",
              "content": ". Additionally, he explored subcortical structures and described cerebral ventricles more extensively than his predecessors. However, by Galen’s time dissections on human cadavers were no longer allowed, which limited his insights into human neuroanatomy."
            }
          ]
        },
        "content_text": "Galen (129-216 CE) argued strongly for the brain as the seat of the mind and, after Hippocrates, had the greatest impact on medicine. Based on animal dissections, he described cranial and peripheral nerves and the ventricles, though a ban on human dissection limited his neuroanatomy."
      },
      "sourceCitationNumbers": [
        18,
        8,
        13
      ],
      "reason": "Restore numeric citation runs omitted by the importer; preserve all existing prose and markup."
    },
    {
      "sectionSlug": "where-is-my-mind",
      "orderIndex": 11,
      "sourceBlocks": [
        46
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Despite Galen arguing that the mind arose in the parenchyma, or brain tissue, much attention would subsequently be given to the ventricles as possible nodes of the mind (as will be described in detail in the next section). However, it wasn’t until the 1800s that Marie Pierre Jean Flourens, in his efforts to disprove phrenology (see more on this below as well), resected various brain regions, largely from rabbits and pigeons, and showed somewhat specific behavioral impacts. He found that removing the cerebrum appeared to impair sensory perception and judgement, while removing the cerebellum seemed to impair equilibrium and coordination. Thus Flourens, despite remaining adamant that there was no localization of function within the cerebrum, firmly placed the mind in the brain"
            },
            {
              "type": "citation_ref",
              "number": 19
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "After Galen, attention turned to the ventricles as possible seats of the mind. In the 1800s, Flourens resected brain regions in rabbits and pigeons, showing the cerebrum affected perception and judgement and the cerebellum affected coordination — firmly placing the mind in the brain."
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Despite Galen arguing that the mind arose in the parenchyma, or brain tissue, much attention would subsequently be given to the ventricles as possible nodes of the mind (as will be described in detail in the next section). However, it wasn’t until the 1800s that Marie Pierre Jean Flourens, in his efforts to disprove phrenology (see more on this below as well), resected various brain regions, largely from rabbits and pigeons, and showed somewhat specific behavioral impacts. He found that removing the cerebrum appeared to impair sensory perception and judgement, while removing the cerebellum seemed to impair equilibrium and coordination. Thus Flourens, despite remaining adamant that there was no localization of function within the cerebrum, firmly placed the mind in the brain"
            },
            {
              "type": "citation_ref",
              "number": 8
            },
            {
              "type": "citation_ref",
              "number": 19
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "After Galen, attention turned to the ventricles as possible seats of the mind. In the 1800s, Flourens resected brain regions in rabbits and pigeons, showing the cerebrum affected perception and judgement and the cerebellum affected coordination — firmly placing the mind in the brain."
      },
      "sourceCitationNumbers": [
        8,
        19
      ],
      "reason": "Restore numeric citation runs omitted by the importer; preserve all existing prose and markup."
    },
    {
      "sectionSlug": "do-different-parts",
      "orderIndex": 8,
      "sourceBlocks": [
        67
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "blockquote",
              "content": "“I call that part of the human body irritable, which becomes shorter upon being touched; very irritable if it contracts upon a slight touch, and the contrary if by a violent touch it contracts but little. I call that a sensible part of the human body, which upon being touched transmits the impression of it to the soul; and in brutes, in whom the existence of a soul is not so clear, I call those parts sensible, the Irritation of which occasions evident signs of pain and disquiet in the animal.<sup>31</sup>”"
            }
          ]
        },
        "content_text": ""
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "blockquote",
              "content": "“I call that part of the human body irritable, which becomes shorter upon being touched; very irritable if it contracts upon a slight touch, and the contrary if by a violent touch it contracts but little. I call that a sensible part of the human body, which upon being touched transmits the impression of it to the soul; and in brutes, in whom the existence of a soul is not so clear, I call those parts sensible, the Irritation of which occasions evident signs of pain and disquiet in the animal.<sup class=\"citation-ref\" data-ref=\"31\">31</sup>”"
            }
          ]
        },
        "content_text": ""
      },
      "sourceCitationNumbers": [
        31
      ],
      "reason": "Citation already exists as a bare inline superscript; retain its text/formatting and add bibliography tooltip attributes."
    },
    {
      "sectionSlug": "how-neurons-communicate",
      "orderIndex": 4,
      "sourceBlocks": [
        125
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "blockquote",
              "content": "“The night before Easter Sunday I awoke, turned on the light and jotted down a few notes on a tiny slip of thin paper. Then I fell asleep again. It occurred to me at 6.00 o’clock in the morning that during the night I had written down something important, but I was unable to decipher the scrawl. The next night, at 3.00 o’clock, the idea returned. It was the design of an experiment to determine whether or not the hypothesis of chemical transmission that I had uttered 17 years ago was correct. I got up immediately, went to the laboratory, and performed a simple experiment on a frog heart according to the nocturnal design<em>.</em>”<sup><em>72</em></sup>"
            }
          ]
        },
        "content_text": ""
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "blockquote",
              "content": "“The night before Easter Sunday I awoke, turned on the light and jotted down a few notes on a tiny slip of thin paper. Then I fell asleep again. It occurred to me at 6.00 o’clock in the morning that during the night I had written down something important, but I was unable to decipher the scrawl. The next night, at 3.00 o’clock, the idea returned. It was the design of an experiment to determine whether or not the hypothesis of chemical transmission that I had uttered 17 years ago was correct. I got up immediately, went to the laboratory, and performed a simple experiment on a frog heart according to the nocturnal design<em>.</em>”<sup class=\"citation-ref\" data-ref=\"72\"><em>72</em></sup>"
            }
          ]
        },
        "content_text": ""
      },
      "sourceCitationNumbers": [
        72
      ],
      "reason": "Citation already exists as a bare inline superscript; retain its text/formatting and add bibliography tooltip attributes."
    },
    {
      "sectionSlug": "how-neurons-communicate",
      "orderIndex": 7,
      "sourceBlocks": [
        130
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "blockquote",
              "content": "“Hitherto the evidence concerning a chemical transmission in the central nervous system, of the type which we have found prevailing at all peripheral synapses, is scattered and insufficiently uniform in its indications. The basal ganglia of the brain are peculiarly rich in acetylcholine, the presence of which must presumably have some significance; and suggestive effects of eserine and of acetylcholine, injected into the ventricles of the brain, have been described. I take the view, however, that we need a much larger array of well authenticated facts, before we begin to theorize. It is here, especially, that we need to proceed with caution; if the principle of chemical transmission is ultimately to find a further extension to the interneuronal transmission in the brain itself, it is by patient testing of the groundwork of experimental fact, at each new step, that a safe and steady advance will be achieved. The possible importance of such an extension, even for practical medicine and therapeutics, could hardly be overestimated.<sup>77</sup>”"
            }
          ]
        },
        "content_text": ""
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "blockquote",
              "content": "“Hitherto the evidence concerning a chemical transmission in the central nervous system, of the type which we have found prevailing at all peripheral synapses, is scattered and insufficiently uniform in its indications. The basal ganglia of the brain are peculiarly rich in acetylcholine, the presence of which must presumably have some significance; and suggestive effects of eserine and of acetylcholine, injected into the ventricles of the brain, have been described. I take the view, however, that we need a much larger array of well authenticated facts, before we begin to theorize. It is here, especially, that we need to proceed with caution; if the principle of chemical transmission is ultimately to find a further extension to the interneuronal transmission in the brain itself, it is by patient testing of the groundwork of experimental fact, at each new step, that a safe and steady advance will be achieved. The possible importance of such an extension, even for practical medicine and therapeutics, could hardly be overestimated.<sup class=\"citation-ref\" data-ref=\"77\">77</sup>”"
            }
          ]
        },
        "content_text": ""
      },
      "sourceCitationNumbers": [
        77
      ],
      "reason": "Citation already exists as a bare inline superscript; retain its text/formatting and add bibliography tooltip attributes."
    },
    {
      "sectionSlug": "references",
      "orderIndex": 0,
      "sourceBlocks": [
        325
      ],
      "before": {
        "content": {
          "blocks": [
            {
              "type": "list",
              "ordered": true,
              "items": [
                "Weschler, L. A Rare, Personal Look at Oliver Sacks’s Early Career. <em>Vanity Fair</em> https://www.vanityfair.com/culture/2015/04/oliver-sacks-autobiography-before-cancer (2015).",
                "Gross. A Hole in the Head. <em>MIT Press</em> https://mitpress.mit.edu/9780262517331/a-hole-in-the-head/.",
                "González-Darder, J. M. Facts and Myths of Primitive Trepanations. in <em>Trepanation, Trephining and Craniotomy : History and Stories</em> (ed. González-Darder, J. M.) 19–32 (Springer International Publishing, Cham, 2019). doi:10.1007/978-3-030-22212-3_3.",
                "Broca, M. P. Cas singulier de trépanation chez les Incas. <em>Bulletins de la Société d’anthropologie de Paris</em> <strong>2</strong>, 403–408 (1867).",
                "Andrushko, V. A. & Verano, J. W. Prehistoric trepanation in the Cuzco region of Peru: A view into an ancient Andean practice. <em>American Journal of Physical Anthropology</em> <strong>137</strong>, 4–13 (2008).",
                "Gresky, J. <em>et al.</em> New cases of trepanations from the 5th to 3rd millennia BC in Southern Russia in the context of previous research: Possible evidence for a ritually motivated tradition of cranial surgery? <em>American Journal of Physical Anthropology</em> <strong>160</strong>, 665–682 (2016).",
                "André, C. Evolving story: trepanation and self-trepanation to enhance brain function. <em>Arq. Neuro-Psiquiatr.</em> <strong>75</strong>, 307–313 (2017).",
                "Finger, S. <em>Origins of Neuroscience: A History of Explorations Into Brain Function</em>. (Oxford University Press, 2001).",
                "Stiefel, M., Shaner, A. & Schaefer, S. D. The Edwin Smith Papyrus: The Birth of Analytical Thinking in Medicine and Otolaryngology. <em>The Laryngoscope</em> <strong>116</strong>, 182–188 (2006).",
                "Brandt, T. & Huppert, D. Brain beats heart: a cross-cultural reflection. <em>Brain</em> <strong>144</strong>, 1617–1620 (2021).",
                "Yu, N. Heart and Cognition in Ancient Chinese Philosophy. <em>Journal of Cognition and Culture</em> <strong>7</strong>, 27–47 (2007).",
                "Rose, F. C. Cerebral Localization in Antiquity. <em>Journal of the History of the Neurosciences</em> <strong>18</strong>, 239–247 (2009).",
                "Crivellato, E. & Ribatti, D. Soul, mind, brain: Greek philosophy and the birth of neuroscience. <em>Brain Research Bulletin</em> <strong>71</strong>, 327–336 (2007).",
                "Breitenfeld, T., Jurasic, M. J. & Breitenfeld, D. Hippocrates: the forefather of neurology. <em>Neurol Sci</em> <strong>35</strong>, 1349–1352 (2014).",
                "Plato, Timaeus, page 44. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0180%3Atext%3DTim.%3Apage%3D44.",
                "Aristotle. On Sleep and Sleeplessness.",
                "Longrigg, J. Anatomy in Alexandria in the Third Century B.C. <em>The British Journal for the History of Science</em> <strong>21</strong>, 455–488 (1988).",
                "Rocca, J. <em>Galen on the Brain: Anatomical Knowledge and Physiological Speculation in the Second Century AD</em>. (Brill, Leiden, The Netherlands, 2003). doi:10.1163/9789047401438.",
                "Pearce, J. M. S. Marie-Jean-Pierre Flourens (1794–1867) and Cortical Localization. <em>European Neurology</em> <strong>61</strong>, 311–314 (2009).",
                "Kaplan, E. L., Salti, G. I., Roncella, M., Fulton, N. & Kadowaki, M. History of the Recurrent Laryngeal Nerve: From Galen to Lahey. <em>World J Surg</em> <strong>33</strong>, 386–393 (2009).",
                "Marketos, S. G. & Skiadas, P. K. Galen: A Pioneer of Spine Research. <em>Spine</em> <strong>24</strong>, 2358 (1999).",
                "Clarke, E., Dewhurst, K. & Aminoff, M. J. <em>An Illustrated History of Brain Function: Imaging the Brain from Antiquity to the Present</em>. (Norman Publishing, 1996).",
                "Wright, J. Chapter 1 - Ventricular localization in late antiquity: The philosophical and theological roots of an enduring model of brain function. in <em>Progress in Brain Research</em> (eds Ambrosio, C. & MacLehose, W.) vol. 243 3–22 (Elsevier, 2018).",
                "Barr, J. The anatomist Andreas Vesalius at 500 years old. <em>Journal of Vascular Surgery</em> <strong>61</strong>, 1370–1374 (2015).",
                "Catani, M. & Sandrone, S. <em>Brain Renaissance: From Vesalius to Modern Neuroscience</em>. (Oxford University Press, 2015).",
                "O’Connor, J. P. B. Thomas Willis and the Background to Cerebri Anatome. <em>J R Soc Med</em> <strong>96</strong>, 139–143 (2003).",
                "Parent, A. Niels Stensen: A 17<sup>th</sup> Century Scientist with a Modern View of Brain Organization. <em>Can. J. Neurol. Sci.</em> <strong>40</strong>, 482–492 (2013).",
                "Finger, S. Descartes and the pineal gland in animals: A frequent misinterpretation. <em>Journal of the History of the Neurosciences</em> <strong>4</strong>, 166–182 (1995).",
                "Gross, C. G. <em>Brain, Vision, Memory: Tales in the History of Neuroscience</em>. (The MIT Press, Cambridge, Mass, 1998).",
                "The brain, considered anatomically, physiologically and philosophically : Swedenborg, Emanuel, 1688-1772 : Free Download, Borrow, and Streaming : Internet Archive. https://archive.org/details/brainconsidered00tafegoog/page/XXIV/mode/2up.",
                "Koehler, P. J. Neuroscience in the Work of Boerhaave and Haller. in <em>Brain, Mind and Medicine: Essays in Eighteenth-Century Neuroscience</em> (eds Whitaker, H., Smith, C. U. M. & Finger, S.) 213–231 (Springer US, Boston, MA, 2007). doi:10.1007/978-0-387-70967-3_16.",
                "Localization of Brain Function: The Legacy of Franz Joseph Gall (1758-1828) \\| Annual Reviews. https://www-annualreviews-org.proxy3.library.mcgill.ca/content/journals/10.1146/annurev.ne.18.030195.002043.",
                "Tizard, B. THEORIES OF BRAIN LOCALIZATION FROM FLOURENS TO LASHLEY. <em>Med. Hist.</em> <strong>3</strong>, 132–145 (1959).",
                "Broca, P. P. Perte de la parole, ramouissement chronique et destruction partielle du lobe antérieur gauche du cerveau. <em>Bulletin de la Société Anthropologique</em> <strong>2</strong>, 235–238 (1861).",
                "Mohammed, N., Narayan, V., Patra, D. P. & Nanda, A. Louis Victor Leborgne (“Tan”). <em>World Neurosurgery</em> <strong>114</strong>, 121–125 (2018).",
                "Catani, M. <em>et al.</em> Beyond cortical localization in clinico-anatomical correlation. <em>Cortex</em> <strong>48</strong>, 1262–1287 (2012).",
                "Berker, E. A., Berker, A. H. & Smith, A. Translation of Broca’s 1865 Report: Localization of Speech in the Third Left Frontal Convolution. <em>Archives of Neurology</em> <strong>43</strong>, 1065–1072 (1986).",
                "Fritsch, G. & Hitzig, E. Electric excitability of the cerebrum (Über die elektrische Erregbarkeit des Grosshirns). <em>Epilepsy & Behavior</em> <strong>15</strong>, 123–130 (2009).",
                "Tyler, K. L. & Malessa, R. The Goltz–Ferrier debates and the triumph of cerebral localizationalist theory. <em>Neurology</em> <strong>55</strong>, 1015–1024 (2000).",
                "Bone, I. & Larner, A. J. The trial of David Ferrier, November 1881: Context, proceedings, and aftermath. <em>Journal of the History of the Neurosciences</em> <strong>33</strong>, 333–354 (2024).",
                "Lashley, K. S. In search of the engram. in <em>Physiological mechanisms in animal behavior. (Society’s Symposium IV.)</em> 454–482 (Academic Press, Oxford, England, 1950).",
                "Scoville, W. B. & Milner, B. LOSS OF RECENT MEMORY AFTER BILATERAL HIPPOCAMPAL LESIONS. <em>Journal of Neurology, Neurosurgery, and Psychiatry</em> <strong>20</strong>, 11 (1957).",
                "Leeuwenhoek, A. V. Microscopical observations of Mr. Leewenhoeck, concerning the optic nerve, communicated to the publisher in Dutch, and by him made English. <em>Philosophical Transactions of the Royal Society of London</em> <strong>10</strong>, 378–380 (1997).",
                "Jones, M. L. To Fix, To Harden, To Preserve–Fixation: A Brief History. <em>Journal of Histotechnology</em> <strong>24</strong>, 155–162 (2001).",
                "Hakosalo, H. The brain under the knife: serial sectioning and the development of late nineteenth-century neuroanatomy. <em>Studies in History and Philosophy of Science Part C: Studies in History and Philosophy of Biological and Biomedical Sciences</em> <strong>37</strong>, 172–202 (2006).",
                "Titford, M. A Short History of Histopathology Technique. <em>Journal of Histotechnology</em> <strong>29</strong>, 99–110 (2006).",
                "Rosario, A., Howell, A. & Bhattacharya, S. K. A revisit to staining reagents for neuronal tissues. <em>Ann Eye Sci</em> <strong>7</strong>, 6 (2022).",
                "Ford, B. J. Enlightening Neuroscience: Microscopes and Microscopy in the Eighteenth Century. in <em>Brain, Mind and Medicine: Essays in Eighteenth-Century Neuroscience</em> (eds Whitaker, H., Smith, C. U. M. & Finger, S.) 29–41 (Springer US, Boston, MA, 2007). doi:10.1007/978-0-387-70967-3_3.",
                "Deiters, V. S. & Guillery, R. w. Otto Friedrich Karl Deiters (1834–1863). <em>Journal of Comparative Neurology</em> <strong>521</strong>, 1929–1953 (2013).",
                "Sotelo, C. The History of the Synapse. <em>The Anatomical Record</em> <strong>303</strong>, 1252–1279 (2020).",
                "Mazzarello, P. A unifying concept: the history of cell theory. <em>Nat Cell Biol</em> <strong>1</strong>, E13–E15 (1999).",
                "Pannese, E. The Golgi Stain: Invention, Diffusion and Impact on Neurosciences. <em>Journal of the History of the Neurosciences</em> <strong>8</strong>, 132–140 (1999).",
                "Raviola, E. & Mazzarello, P. The diffuse nervous network of Camillo Golgi: Facts and fiction. <em>Brain Research Reviews</em> <strong>66</strong>, 75–82 (2011).",
                "DeFelipe, J. Cajal and the discovery of the Golgi method: a neuroanatomist’s dream. <em>Anat Sci Int</em> <strong>100</strong>, 384–399 (2025).",
                "de Castro, F., López-Mascaraque, L. & De Carlos, J. A. Cajal: Lessons on brain development. <em>Brain Research Reviews</em> <strong>55</strong>, 481–489 (2007).",
                "Winkelmann, A. Wilhelm von Waldeyer-Hartz (1836–1921): An anatomist who left his mark. <em>Clinical Anatomy</em> <strong>20</strong>, 231–234 (2007).",
                "Cajal, S. R. Y. The structure and connexions of neurons. (1906).",
                "Golgi, C. The neuron doctrine - theory and facts. (1906).",
                "Cajal, S. R. y. <em>Recollections of My Life</em>. (MIT Press, Cambridge, MA, USA, 1989).",
                "Mazzarello, P. Camillo Golgi. in <em>Oxford Research Encyclopedia of Neuroscience</em> (2024). doi:10.1093/acrefore/9780190264086.013.510.",
                "Dröscher, A. Camillo Golgi and the discovery of the Golgi apparatus. <em>Histochemistry</em> <strong>109</strong>, 425–430 (1998).",
                "Palay, S. L. SYNAPSES IN THE CENTRAL NERVOUS SYSTEM. <em>J Biophys Biochem Cytol</em> <strong>2</strong>, 193–202 (1956).",
                "Azevedo, F. A. C. <em>et al.</em> Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain. <em>J Comp Neurol</em> <strong>513</strong>, 532–541 (2009).",
                "Allen, N. J. & Lyons, D. A. Glia as architects of central nervous system formation and function. <em>Science</em> <strong>362</strong>, 181–185 (2018).",
                "Burkhardt, P. <em>et al.</em> Syncytial nerve net in a ctenophore adds insights on the evolution of nervous systems. <em>Science</em> <strong>380</strong>, 293–297 (2023).",
                "Piccolino, M. Animal electricity and the birth of electrophysiology: the legacy of Luigi Galvani. <em>Brain Research Bulletin</em> <strong>46</strong>, 381–407 (1998).",
                "Hille, B. A brief history of nerve action potentials after 1600. <em>Molecular Pharmacology</em> <strong>107</strong>, 100012 (2025).",
                "Elliott, T. R. The action of adrenalin. <em>J Physiol</em> <strong>32</strong>, 401–467 (1905).",
                "Valenstein, E. S. <em>The War of the Soups and the Sparks: The Discovery of Neurotransmitters and the Dispute Over How Nerves Communicate</em>. 256 Pages (Columbia University Press, 2005).",
                "Dale, H. H. Otto Loewi, 1873-1961. <em>Biographical Memoirs of Fellows of the Royal Society</em> <strong>8</strong>, 67–89 (1997).",
                "Maehle, A.-H. “Receptive Substances”: John Newport Langley (1852–1925) and his Path to a Receptor Theory of Drug Action. <em>Medical History</em> <strong>48</strong>, 153–174 (2004).",
                "Loewi, O. An Autobiographic Sketch. <em>pbm</em> <strong>4</strong>, 3–25 (1960).",
                "Loewi, O. Über humorale übertragbarkeit der Herznervenwirkung. <em>Pflügers Archiv European Journal of Physiology</em> <strong>189</strong>, 239–242.",
                "Feldberg, W. S. Henry Hallett Dale, 1875-1968. <em>Biographical Memoirs of Fellows of the Royal Society</em> <strong>16</strong>, 77–174 (1997).",
                "Tansey, E. M. Henry Dale and the discovery of acetylcholine. <em>Comptes Rendus. Biologies</em> <strong>329</strong>, 419–425 (2006).",
                "Dale, H. H. & Dudley, H. W. The presence of histamine and acetylcholine in the spleen of the ox and the horse. <em>J Physiol</em> <strong>68</strong>, 97–123 (1929).",
                "Dale, H. H. Nobel Prize in Physiology or Medicine 1936. <em>NobelPrize.org</em> https://www.nobelprize.org/prizes/medicine/1936/dale/lecture/ (1936).",
                "Borck, C. John C. Eccles (1903-1997): Neurophysiologist and Neurophilosopher. <em>Journal of the History of the Neurosciences</em> <strong>7</strong>, 76–81 (1998).",
                "Sakmann, B. Bernard Katz. 26 March 1911 — 20 April 2003: Elected",
                "Todman, D. John Eccles (1903–97) and the experiment that proved chemical synaptic transmission in the central nervous system. <em>Journal of Clinical Neuroscience</em> <strong>15</strong>, 972–977 (2008).",
                "Todman, D. John Eccles (1903–97) and the experiment that proved chemical synaptic transmission in the central nervous system. <em>Journal of Clinical Neuroscience</em> <strong>15</strong>, 972–977 (2008).",
                "Brock, L. G., Coombs, J. S. & Eccles, J. C. The recording of potentials from motoneurones with an intracellular electrode. <em>The Journal of Physiology</em> <strong>117</strong>, 431–460 (1952).",
                "Schwiening, C. J. A brief historical perspective: Hodgkin and Huxley. <em>The Journal of Physiology</em> <strong>590</strong>, 2571–2575 (2012).",
                "Furshpan, E. J. & Potter, D. D. Transmission at the giant motor synapses of the crayfish. <em>J Physiol</em> <strong>145</strong>, 289–325 (1959).",
                "Pereda, A. E. Electrical synapses and their functional interactions with chemical synapses. <em>Nat. Rev. Neurosci.</em> <strong>15</strong>, 250–263 (2014).",
                "Trenholm, S. & Awatramani, G. B. Myriad roles for gap junctions in retinal circuits. in <em>Webvision: The Organization of the Retina and Visual System</em> (eds Kolb, H., Fernandez, E. & Nelson, R.) (University of Utah Health Sciences Center, Salt Lake City (UT), 2019).",
                "Hecht, S. The Visibility of the Spectrum. <em>Journal of the Optical Society of America</em> <strong>9</strong>, 211–222 (1924).",
                "Alanen, L. Descartes’s dualism and the philosophy of mind. <em>Revue de Métaphysique et de Morale</em> <strong>94</strong>, 391–413 (1989).",
                "PENFIELD, WILDER. The Mystery of the Mind \\| Princeton University Press. https://press.princeton.edu/books/hardcover/9780691273709/the-mystery-of-the-mind (1975).",
                "WEIL, E. The Skull of Descartes. <em>J Hist Med Allied Sci</em> <strong>XI</strong>, 220–221 (1956).",
                "Manhag, A. & Karsten, P. 9. The true skull of Descartes? – A source critical study. in <em>Collecting curiosities</em>.",
                "Temkin, O. On Galen’s Pneumatology. <em>Gesnerus</em> <strong>8</strong>, 180–189 (1951).",
                "Rocca, J. The elaboration of psychic pneuma. in 201–237 (Brill, Leiden, The Netherlands, 2003). doi:10.1163/9789047401438_008.",
                "PRANGHOFER, S. “It could be Seen more Clearly in Unreasonable Animals than in Humans”: The Representation of the Rete Mirabile in Early Modern Anatomy. <em>Med Hist</em> <strong>53</strong>, 561–586 (2009).",
                "Vesalius and the emergence of veridical representation in Renaissance anatomy. in <em>Progress in Brain Research</em> vol. 203 3–32 (Elsevier, 2013).",
                "Gross, C. G. Hippocampus minor and man’s place in nature: A case study in the social construction of neuroanatomy. <em>Hippocampus</em> <strong>3</strong>, 403–415 (1993).",
                "Stone, J. L. Dr. Gottlieb Burckhardt the Pioneer of Psychosurgery. <em>Journal of the History of the Neurosciences</em> <strong>10</strong>, 79–92 (2001).",
                "Burckhardt, G. Über Rindenexzisionen als Beitrag zur operativen Therapie der Psychosen. <em>Allgemeine Zeitschift fu»r Psychiatrie</em> 463–548 (1891).",
                "Berrios, G. E. The origins of psychosurgery: Shaw, Burckhardt and Moniz. <em>Hist Psychiatry</em> <strong>8</strong>, 061–081 (1997).",
                "Gross, D. & Schäfer, G. Egas Moniz (1874–1955) and the “invention” of modern psychosurgery: a historical and ethical reanalysis under special consideration of Portuguese original sources. <em>Neurosurgical Focus</em> <strong>30</strong>, E8 (2011).",
                "Boettcher, L. B. & Menacho, S. T. The early argument for prefrontal leucotomy: the collision of frontal lobe theory and psychosurgery at the 1935 International Neurological Congress in London. <em>Neurosurgical Focus</em> <strong>43</strong>, E4 (2017).",
                "Moniz, E. PREFRONTAL LEUCOTOMY IN THE TREATMENT OF MENTAL DISORDERS. <em>AJP</em> <strong>93</strong>, 1379–1385 (1937).",
                "Caruso, J. P. & Sheehan, J. P. Psychosurgery, ethics, and media: a history of Walter Freeman and the lobotomy. <em>Neurosurgical Focus</em> <strong>43</strong>, E6 (2017).",
                "Freeman, W. & Watts, J. W. Prefrontal Lobotomy. <em>Bull N Y Acad Med</em> <strong>18</strong>, 794–812 (1942).",
                "Freeman, W. Twenty Years of Leucotomy. <em>Proceedings of the Royal Society of Medicine</em> <strong>50</strong>, 79–84 (1957).",
                "López-Muñoz, F. <em>et al.</em> History of the Discovery and Clinical Introduction of Chlorpromazine. <em>Annals of Clinical Psychiatry</em> <strong>17</strong>, 113–135 (2005).",
                "BARTHOLOW, R. ART. I.--Experimental Investigations into the Functions of the Human Brain. <em>The American Journal of the Medical Sciences (1827-1924)</em> 305 (1874).",
                "Harris, L. J. & Almerigi, J. B. Probing the human brain with stimulating electrodes: The story of Roberts Bartholow’s (1874) experiment on Mary Rafferty. <em>Brain and Cognition</em> <strong>70</strong>, 92–115 (2009).",
                "Bartholow, R. Experiments on the Functions of the Human Brain. <em>British Medical Journal</em> <strong>1</strong>, 727 (1874).",
                "Todman, D. Wilder Penfield (1891–1976). <em>J Neurol</em> <strong>255</strong>, 1104–1105 (2008).",
                "The Mind Mappers by Eric Andrew-Gee \\| Penguin Random House Canada. https://www.penguinrandomhouse.ca/books/726132/the-mind-mappers-by-eric-andrew-gee/9781039008069.",
                "Ladino, L. D., Rizvi, S. & Téllez-Zenteno, J. F. The Montreal procedure: The legacy of the great Wilder Penfield. <em>Epilepsy & Behavior</em> <strong>83</strong>, 151–161 (2018).",
                "Bacigaluppi, S., Bragazzi, N. L. & Martini, M. Fedor Krause (1857–1937): the father of neurosurgery. <em>Neurosurg Rev</em> <strong>43</strong>, 1443–1449 (2020).",
                "Leblanc, R. Cushing, Penfield, and cortical stimulation. <em>Journal of Neurosurgery</em> <strong>130</strong>, 76–83 (2018).",
                "Leyton, A. S. F. & Sherrington, C. S. Observations on the Excitable Cortex of the Chimpanzee, Orang-Utan, and Gorilla. <em>Quarterly Journal of Experimental Physiology</em> <strong>11</strong>, 135–222 (1917).",
                "PENFIELD, W. MEMORY MECHANISMS. <em>AMA Arch NeurPsych</em> <strong>67</strong>, 178–198 (1952).",
                "Critchley, M. & Critchley, E. A. <em>John Hughlings Jackson: Father of English Neurology</em>. (Oxford University Press, USA, 1998).",
                "de Castro, F., López-Mascaraque, L. & De Carlos, J. A. Cajal: Lessons on brain development. <em>Brain Research Reviews</em> <strong>55</strong>, 481–489 (2007).",
                "Aloe, L. Rita Levi-Montalcini: the discovery of nerve growth factor and modern neurobiology. <em>Trends in Cell Biology</em> <strong>14</strong>, 395–399 (2004).",
                "Meyer, R. L. Roger Sperry and his chemoaffinity hypothesis. <em>Neuropsychologia</em> <strong>36</strong>, 957–980 (1998).",
                "Stelmack, R. M. & Stalikas, A. Galen and the humour theory of temperament. <em>Personality and Individual Differences</em> <strong>12</strong>, 255–263 (1991).",
                "<em>Biogr. Mems Fell. R. Soc.</em> <strong>53</strong>, 185–202 (2007)."
              ]
            }
          ]
        },
        "content_text": "122 references."
      },
      "after": {
        "content": {
          "blocks": [
            {
              "type": "list",
              "ordered": true,
              "items": [
                "Weschler, L. A Rare, Personal Look at Oliver Sacks’s Early Career. <em>Vanity Fair</em> https://www.vanityfair.com/culture/2015/04/oliver-sacks-autobiography-before-cancer (2015).",
                "Gross. A Hole in the Head. <em>MIT Press</em> https://mitpress.mit.edu/9780262517331/a-hole-in-the-head/.",
                "González-Darder, J. M. Facts and Myths of Primitive Trepanations. in <em>Trepanation, Trephining and Craniotomy : History and Stories</em> (ed. González-Darder, J. M.) 19–32 (Springer International Publishing, Cham, 2019). doi:10.1007/978-3-030-22212-3_3.",
                "Broca, M. P. Cas singulier de trépanation chez les Incas. <em>Bulletins de la Société d’anthropologie de Paris</em> <strong>2</strong>, 403–408 (1867).",
                "Andrushko, V. A. & Verano, J. W. Prehistoric trepanation in the Cuzco region of Peru: A view into an ancient Andean practice. <em>American Journal of Physical Anthropology</em> <strong>137</strong>, 4–13 (2008).",
                "Gresky, J. <em>et al.</em> New cases of trepanations from the 5th to 3rd millennia BC in Southern Russia in the context of previous research: Possible evidence for a ritually motivated tradition of cranial surgery? <em>American Journal of Physical Anthropology</em> <strong>160</strong>, 665–682 (2016).",
                "André, C. Evolving story: trepanation and self-trepanation to enhance brain function. <em>Arq. Neuro-Psiquiatr.</em> <strong>75</strong>, 307–313 (2017).",
                "Finger, S. <em>Origins of Neuroscience: A History of Explorations Into Brain Function</em>. (Oxford University Press, 2001).",
                "Stiefel, M., Shaner, A. & Schaefer, S. D. The Edwin Smith Papyrus: The Birth of Analytical Thinking in Medicine and Otolaryngology. <em>The Laryngoscope</em> <strong>116</strong>, 182–188 (2006).",
                "Brandt, T. & Huppert, D. Brain beats heart: a cross-cultural reflection. <em>Brain</em> <strong>144</strong>, 1617–1620 (2021).",
                "Yu, N. Heart and Cognition in Ancient Chinese Philosophy. <em>Journal of Cognition and Culture</em> <strong>7</strong>, 27–47 (2007).",
                "Rose, F. C. Cerebral Localization in Antiquity. <em>Journal of the History of the Neurosciences</em> <strong>18</strong>, 239–247 (2009).",
                "Crivellato, E. & Ribatti, D. Soul, mind, brain: Greek philosophy and the birth of neuroscience. <em>Brain Research Bulletin</em> <strong>71</strong>, 327–336 (2007).",
                "Breitenfeld, T., Jurasic, M. J. & Breitenfeld, D. Hippocrates: the forefather of neurology. <em>Neurol Sci</em> <strong>35</strong>, 1349–1352 (2014).",
                "Plato, Timaeus, page 44. https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0180%3Atext%3DTim.%3Apage%3D44.",
                "Aristotle. On Sleep and Sleeplessness.",
                "Longrigg, J. Anatomy in Alexandria in the Third Century B.C. <em>The British Journal for the History of Science</em> <strong>21</strong>, 455–488 (1988).",
                "Rocca, J. <em>Galen on the Brain: Anatomical Knowledge and Physiological Speculation in the Second Century AD</em>. (Brill, Leiden, The Netherlands, 2003). doi:10.1163/9789047401438.",
                "Pearce, J. M. S. Marie-Jean-Pierre Flourens (1794–1867) and Cortical Localization. <em>European Neurology</em> <strong>61</strong>, 311–314 (2009).",
                "Kaplan, E. L., Salti, G. I., Roncella, M., Fulton, N. & Kadowaki, M. History of the Recurrent Laryngeal Nerve: From Galen to Lahey. <em>World J Surg</em> <strong>33</strong>, 386–393 (2009).",
                "Marketos, S. G. & Skiadas, P. K. Galen: A Pioneer of Spine Research. <em>Spine</em> <strong>24</strong>, 2358 (1999).",
                "Clarke, E., Dewhurst, K. & Aminoff, M. J. <em>An Illustrated History of Brain Function: Imaging the Brain from Antiquity to the Present</em>. (Norman Publishing, 1996).",
                "Wright, J. Chapter 1 - Ventricular localization in late antiquity: The philosophical and theological roots of an enduring model of brain function. in <em>Progress in Brain Research</em> (eds Ambrosio, C. & MacLehose, W.) vol. 243 3–22 (Elsevier, 2018).",
                "Barr, J. The anatomist Andreas Vesalius at 500 years old. <em>Journal of Vascular Surgery</em> <strong>61</strong>, 1370–1374 (2015).",
                "Catani, M. & Sandrone, S. <em>Brain Renaissance: From Vesalius to Modern Neuroscience</em>. (Oxford University Press, 2015).",
                "O’Connor, J. P. B. Thomas Willis and the Background to Cerebri Anatome. <em>J R Soc Med</em> <strong>96</strong>, 139–143 (2003).",
                "Parent, A. Niels Stensen: A 17<sup>th</sup> Century Scientist with a Modern View of Brain Organization. <em>Can. J. Neurol. Sci.</em> <strong>40</strong>, 482–492 (2013).",
                "Finger, S. Descartes and the pineal gland in animals: A frequent misinterpretation. <em>Journal of the History of the Neurosciences</em> <strong>4</strong>, 166–182 (1995).",
                "Gross, C. G. <em>Brain, Vision, Memory: Tales in the History of Neuroscience</em>. (The MIT Press, Cambridge, Mass, 1998).",
                "The brain, considered anatomically, physiologically and philosophically : Swedenborg, Emanuel, 1688-1772 : Free Download, Borrow, and Streaming : Internet Archive. https://archive.org/details/brainconsidered00tafegoog/page/XXIV/mode/2up.",
                "Koehler, P. J. Neuroscience in the Work of Boerhaave and Haller. in <em>Brain, Mind and Medicine: Essays in Eighteenth-Century Neuroscience</em> (eds Whitaker, H., Smith, C. U. M. & Finger, S.) 213–231 (Springer US, Boston, MA, 2007). doi:10.1007/978-0-387-70967-3_16.",
                "Localization of Brain Function: The Legacy of Franz Joseph Gall (1758-1828) \\| Annual Reviews. https://www-annualreviews-org.proxy3.library.mcgill.ca/content/journals/10.1146/annurev.ne.18.030195.002043.",
                "Tizard, B. THEORIES OF BRAIN LOCALIZATION FROM FLOURENS TO LASHLEY. <em>Med. Hist.</em> <strong>3</strong>, 132–145 (1959).",
                "Broca, P. P. Perte de la parole, ramouissement chronique et destruction partielle du lobe antérieur gauche du cerveau. <em>Bulletin de la Société Anthropologique</em> <strong>2</strong>, 235–238 (1861).",
                "Mohammed, N., Narayan, V., Patra, D. P. & Nanda, A. Louis Victor Leborgne (“Tan”). <em>World Neurosurgery</em> <strong>114</strong>, 121–125 (2018).",
                "Catani, M. <em>et al.</em> Beyond cortical localization in clinico-anatomical correlation. <em>Cortex</em> <strong>48</strong>, 1262–1287 (2012).",
                "Berker, E. A., Berker, A. H. & Smith, A. Translation of Broca’s 1865 Report: Localization of Speech in the Third Left Frontal Convolution. <em>Archives of Neurology</em> <strong>43</strong>, 1065–1072 (1986).",
                "Fritsch, G. & Hitzig, E. Electric excitability of the cerebrum (Über die elektrische Erregbarkeit des Grosshirns). <em>Epilepsy & Behavior</em> <strong>15</strong>, 123–130 (2009).",
                "Tyler, K. L. & Malessa, R. The Goltz–Ferrier debates and the triumph of cerebral localizationalist theory. <em>Neurology</em> <strong>55</strong>, 1015–1024 (2000).",
                "Bone, I. & Larner, A. J. The trial of David Ferrier, November 1881: Context, proceedings, and aftermath. <em>Journal of the History of the Neurosciences</em> <strong>33</strong>, 333–354 (2024).",
                "Lashley, K. S. In search of the engram. in <em>Physiological mechanisms in animal behavior. (Society’s Symposium IV.)</em> 454–482 (Academic Press, Oxford, England, 1950).",
                "Scoville, W. B. & Milner, B. LOSS OF RECENT MEMORY AFTER BILATERAL HIPPOCAMPAL LESIONS. <em>Journal of Neurology, Neurosurgery, and Psychiatry</em> <strong>20</strong>, 11 (1957).",
                "Leeuwenhoek, A. V. Microscopical observations of Mr. Leewenhoeck, concerning the optic nerve, communicated to the publisher in Dutch, and by him made English. <em>Philosophical Transactions of the Royal Society of London</em> <strong>10</strong>, 378–380 (1997).",
                "Jones, M. L. To Fix, To Harden, To Preserve–Fixation: A Brief History. <em>Journal of Histotechnology</em> <strong>24</strong>, 155–162 (2001).",
                "Hakosalo, H. The brain under the knife: serial sectioning and the development of late nineteenth-century neuroanatomy. <em>Studies in History and Philosophy of Science Part C: Studies in History and Philosophy of Biological and Biomedical Sciences</em> <strong>37</strong>, 172–202 (2006).",
                "Titford, M. A Short History of Histopathology Technique. <em>Journal of Histotechnology</em> <strong>29</strong>, 99–110 (2006).",
                "Rosario, A., Howell, A. & Bhattacharya, S. K. A revisit to staining reagents for neuronal tissues. <em>Ann Eye Sci</em> <strong>7</strong>, 6 (2022).",
                "Ford, B. J. Enlightening Neuroscience: Microscopes and Microscopy in the Eighteenth Century. in <em>Brain, Mind and Medicine: Essays in Eighteenth-Century Neuroscience</em> (eds Whitaker, H., Smith, C. U. M. & Finger, S.) 29–41 (Springer US, Boston, MA, 2007). doi:10.1007/978-0-387-70967-3_3.",
                "Deiters, V. S. & Guillery, R. w. Otto Friedrich Karl Deiters (1834–1863). <em>Journal of Comparative Neurology</em> <strong>521</strong>, 1929–1953 (2013).",
                "Sotelo, C. The History of the Synapse. <em>The Anatomical Record</em> <strong>303</strong>, 1252–1279 (2020).",
                "Mazzarello, P. A unifying concept: the history of cell theory. <em>Nat Cell Biol</em> <strong>1</strong>, E13–E15 (1999).",
                "Pannese, E. The Golgi Stain: Invention, Diffusion and Impact on Neurosciences. <em>Journal of the History of the Neurosciences</em> <strong>8</strong>, 132–140 (1999).",
                "Raviola, E. & Mazzarello, P. The diffuse nervous network of Camillo Golgi: Facts and fiction. <em>Brain Research Reviews</em> <strong>66</strong>, 75–82 (2011).",
                "DeFelipe, J. Cajal and the discovery of the Golgi method: a neuroanatomist’s dream. <em>Anat Sci Int</em> <strong>100</strong>, 384–399 (2025).",
                "de Castro, F., López-Mascaraque, L. & De Carlos, J. A. Cajal: Lessons on brain development. <em>Brain Research Reviews</em> <strong>55</strong>, 481–489 (2007).",
                "Winkelmann, A. Wilhelm von Waldeyer-Hartz (1836–1921): An anatomist who left his mark. <em>Clinical Anatomy</em> <strong>20</strong>, 231–234 (2007).",
                "Cajal, S. R. Y. The structure and connexions of neurons. (1906).",
                "Golgi, C. The neuron doctrine - theory and facts. (1906).",
                "Cajal, S. R. y. <em>Recollections of My Life</em>. (MIT Press, Cambridge, MA, USA, 1989).",
                "Mazzarello, P. Camillo Golgi. in <em>Oxford Research Encyclopedia of Neuroscience</em> (2024). doi:10.1093/acrefore/9780190264086.013.510.",
                "Dröscher, A. Camillo Golgi and the discovery of the Golgi apparatus. <em>Histochemistry</em> <strong>109</strong>, 425–430 (1998).",
                "Palay, S. L. SYNAPSES IN THE CENTRAL NERVOUS SYSTEM. <em>J Biophys Biochem Cytol</em> <strong>2</strong>, 193–202 (1956).",
                "Azevedo, F. A. C. <em>et al.</em> Equal numbers of neuronal and nonneuronal cells make the human brain an isometrically scaled-up primate brain. <em>J Comp Neurol</em> <strong>513</strong>, 532–541 (2009).",
                "Allen, N. J. & Lyons, D. A. Glia as architects of central nervous system formation and function. <em>Science</em> <strong>362</strong>, 181–185 (2018).",
                "Burkhardt, P. <em>et al.</em> Syncytial nerve net in a ctenophore adds insights on the evolution of nervous systems. <em>Science</em> <strong>380</strong>, 293–297 (2023).",
                "Piccolino, M. Animal electricity and the birth of electrophysiology: the legacy of Luigi Galvani. <em>Brain Research Bulletin</em> <strong>46</strong>, 381–407 (1998).",
                "Hille, B. A brief history of nerve action potentials after 1600. <em>Molecular Pharmacology</em> <strong>107</strong>, 100012 (2025).",
                "Elliott, T. R. The action of adrenalin. <em>J Physiol</em> <strong>32</strong>, 401–467 (1905).",
                "Valenstein, E. S. <em>The War of the Soups and the Sparks: The Discovery of Neurotransmitters and the Dispute Over How Nerves Communicate</em>. 256 Pages (Columbia University Press, 2005).",
                "Dale, H. H. Otto Loewi, 1873-1961. <em>Biographical Memoirs of Fellows of the Royal Society</em> <strong>8</strong>, 67–89 (1997).",
                "Maehle, A.-H. “Receptive Substances”: John Newport Langley (1852–1925) and his Path to a Receptor Theory of Drug Action. <em>Medical History</em> <strong>48</strong>, 153–174 (2004).",
                "Loewi, O. An Autobiographic Sketch. <em>pbm</em> <strong>4</strong>, 3–25 (1960).",
                "Loewi, O. Über humorale übertragbarkeit der Herznervenwirkung. <em>Pflügers Archiv European Journal of Physiology</em> <strong>189</strong>, 239–242.",
                "Feldberg, W. S. Henry Hallett Dale, 1875-1968. <em>Biographical Memoirs of Fellows of the Royal Society</em> <strong>16</strong>, 77–174 (1997).",
                "Tansey, E. M. Henry Dale and the discovery of acetylcholine. <em>Comptes Rendus. Biologies</em> <strong>329</strong>, 419–425 (2006).",
                "Dale, H. H. & Dudley, H. W. The presence of histamine and acetylcholine in the spleen of the ox and the horse. <em>J Physiol</em> <strong>68</strong>, 97–123 (1929).",
                "Dale, H. H. Nobel Prize in Physiology or Medicine 1936. <em>NobelPrize.org</em> https://www.nobelprize.org/prizes/medicine/1936/dale/lecture/ (1936).",
                "Borck, C. John C. Eccles (1903-1997): Neurophysiologist and Neurophilosopher. <em>Journal of the History of the Neurosciences</em> <strong>7</strong>, 76–81 (1998).",
                "Sakmann, B. Bernard Katz. 26 March 1911 — 20 April 2003: Elected 1952. <em>Biogr. Mems Fell. R. Soc.</em> <strong>53</strong>, 185–202 (2007).",
                "Todman, D. John Eccles (1903–97) and the experiment that proved chemical synaptic transmission in the central nervous system. <em>Journal of Clinical Neuroscience</em> <strong>15</strong>, 972–977 (2008).",
                "Todman, D. John Eccles (1903–97) and the experiment that proved chemical synaptic transmission in the central nervous system. <em>Journal of Clinical Neuroscience</em> <strong>15</strong>, 972–977 (2008).",
                "Brock, L. G., Coombs, J. S. & Eccles, J. C. The recording of potentials from motoneurones with an intracellular electrode. <em>The Journal of Physiology</em> <strong>117</strong>, 431–460 (1952).",
                "Schwiening, C. J. A brief historical perspective: Hodgkin and Huxley. <em>The Journal of Physiology</em> <strong>590</strong>, 2571–2575 (2012).",
                "Furshpan, E. J. & Potter, D. D. Transmission at the giant motor synapses of the crayfish. <em>J Physiol</em> <strong>145</strong>, 289–325 (1959).",
                "Pereda, A. E. Electrical synapses and their functional interactions with chemical synapses. <em>Nat. Rev. Neurosci.</em> <strong>15</strong>, 250–263 (2014).",
                "Trenholm, S. & Awatramani, G. B. Myriad roles for gap junctions in retinal circuits. in <em>Webvision: The Organization of the Retina and Visual System</em> (eds Kolb, H., Fernandez, E. & Nelson, R.) (University of Utah Health Sciences Center, Salt Lake City (UT), 2019).",
                "Hecht, S. The Visibility of the Spectrum. <em>Journal of the Optical Society of America</em> <strong>9</strong>, 211–222 (1924).",
                "Alanen, L. Descartes’s dualism and the philosophy of mind. <em>Revue de Métaphysique et de Morale</em> <strong>94</strong>, 391–413 (1989).",
                "PENFIELD, WILDER. The Mystery of the Mind \\| Princeton University Press. https://press.princeton.edu/books/hardcover/9780691273709/the-mystery-of-the-mind (1975).",
                "WEIL, E. The Skull of Descartes. <em>J Hist Med Allied Sci</em> <strong>XI</strong>, 220–221 (1956).",
                "Manhag, A. & Karsten, P. 9. The true skull of Descartes? – A source critical study. in <em>Collecting curiosities</em>.",
                "Temkin, O. On Galen’s Pneumatology. <em>Gesnerus</em> <strong>8</strong>, 180–189 (1951).",
                "Rocca, J. The elaboration of psychic pneuma. in 201–237 (Brill, Leiden, The Netherlands, 2003). doi:10.1163/9789047401438_008.",
                "PRANGHOFER, S. “It could be Seen more Clearly in Unreasonable Animals than in Humans”: The Representation of the Rete Mirabile in Early Modern Anatomy. <em>Med Hist</em> <strong>53</strong>, 561–586 (2009).",
                "Vesalius and the emergence of veridical representation in Renaissance anatomy. in <em>Progress in Brain Research</em> vol. 203 3–32 (Elsevier, 2013).",
                "Gross, C. G. Hippocampus minor and man’s place in nature: A case study in the social construction of neuroanatomy. <em>Hippocampus</em> <strong>3</strong>, 403–415 (1993).",
                "Stone, J. L. Dr. Gottlieb Burckhardt the Pioneer of Psychosurgery. <em>Journal of the History of the Neurosciences</em> <strong>10</strong>, 79–92 (2001).",
                "Burckhardt, G. Über Rindenexzisionen als Beitrag zur operativen Therapie der Psychosen. <em>Allgemeine Zeitschift fu»r Psychiatrie</em> 463–548 (1891).",
                "Berrios, G. E. The origins of psychosurgery: Shaw, Burckhardt and Moniz. <em>Hist Psychiatry</em> <strong>8</strong>, 061–081 (1997).",
                "Gross, D. & Schäfer, G. Egas Moniz (1874–1955) and the “invention” of modern psychosurgery: a historical and ethical reanalysis under special consideration of Portuguese original sources. <em>Neurosurgical Focus</em> <strong>30</strong>, E8 (2011).",
                "Boettcher, L. B. & Menacho, S. T. The early argument for prefrontal leucotomy: the collision of frontal lobe theory and psychosurgery at the 1935 International Neurological Congress in London. <em>Neurosurgical Focus</em> <strong>43</strong>, E4 (2017).",
                "Moniz, E. PREFRONTAL LEUCOTOMY IN THE TREATMENT OF MENTAL DISORDERS. <em>AJP</em> <strong>93</strong>, 1379–1385 (1937).",
                "Caruso, J. P. & Sheehan, J. P. Psychosurgery, ethics, and media: a history of Walter Freeman and the lobotomy. <em>Neurosurgical Focus</em> <strong>43</strong>, E6 (2017).",
                "Freeman, W. & Watts, J. W. Prefrontal Lobotomy. <em>Bull N Y Acad Med</em> <strong>18</strong>, 794–812 (1942).",
                "Freeman, W. Twenty Years of Leucotomy. <em>Proceedings of the Royal Society of Medicine</em> <strong>50</strong>, 79–84 (1957).",
                "López-Muñoz, F. <em>et al.</em> History of the Discovery and Clinical Introduction of Chlorpromazine. <em>Annals of Clinical Psychiatry</em> <strong>17</strong>, 113–135 (2005).",
                "BARTHOLOW, R. ART. I.--Experimental Investigations into the Functions of the Human Brain. <em>The American Journal of the Medical Sciences (1827-1924)</em> 305 (1874).",
                "Harris, L. J. & Almerigi, J. B. Probing the human brain with stimulating electrodes: The story of Roberts Bartholow’s (1874) experiment on Mary Rafferty. <em>Brain and Cognition</em> <strong>70</strong>, 92–115 (2009).",
                "Bartholow, R. Experiments on the Functions of the Human Brain. <em>British Medical Journal</em> <strong>1</strong>, 727 (1874).",
                "Todman, D. Wilder Penfield (1891–1976). <em>J Neurol</em> <strong>255</strong>, 1104–1105 (2008).",
                "The Mind Mappers by Eric Andrew-Gee \\| Penguin Random House Canada. https://www.penguinrandomhouse.ca/books/726132/the-mind-mappers-by-eric-andrew-gee/9781039008069.",
                "Ladino, L. D., Rizvi, S. & Téllez-Zenteno, J. F. The Montreal procedure: The legacy of the great Wilder Penfield. <em>Epilepsy & Behavior</em> <strong>83</strong>, 151–161 (2018).",
                "Bacigaluppi, S., Bragazzi, N. L. & Martini, M. Fedor Krause (1857–1937): the father of neurosurgery. <em>Neurosurg Rev</em> <strong>43</strong>, 1443–1449 (2020).",
                "Leblanc, R. Cushing, Penfield, and cortical stimulation. <em>Journal of Neurosurgery</em> <strong>130</strong>, 76–83 (2018).",
                "Leyton, A. S. F. & Sherrington, C. S. Observations on the Excitable Cortex of the Chimpanzee, Orang-Utan, and Gorilla. <em>Quarterly Journal of Experimental Physiology</em> <strong>11</strong>, 135–222 (1917).",
                "PENFIELD, W. MEMORY MECHANISMS. <em>AMA Arch NeurPsych</em> <strong>67</strong>, 178–198 (1952).",
                "Critchley, M. & Critchley, E. A. <em>John Hughlings Jackson: Father of English Neurology</em>. (Oxford University Press, USA, 1998).",
                "de Castro, F., López-Mascaraque, L. & De Carlos, J. A. Cajal: Lessons on brain development. <em>Brain Research Reviews</em> <strong>55</strong>, 481–489 (2007).",
                "Aloe, L. Rita Levi-Montalcini: the discovery of nerve growth factor and modern neurobiology. <em>Trends in Cell Biology</em> <strong>14</strong>, 395–399 (2004).",
                "Meyer, R. L. Roger Sperry and his chemoaffinity hypothesis. <em>Neuropsychologia</em> <strong>36</strong>, 957–980 (1998).",
                "Stelmack, R. M. & Stalikas, A. Galen and the humour theory of temperament. <em>Personality and Individual Differences</em> <strong>12</strong>, 255–263 (1991)."
              ]
            }
          ]
        },
        "content_text": "121 references."
      },
      "reason": "Recombine source reference 79 and remove its erroneously appended legacy continuation (item 122)."
    }
  ],
  "titles": [
    {
      "sectionSlug": "box-rete-mirabile",
      "sourceBlock": 170,
      "before": "Failures in comparative neuroanatomy: The rete mirabile and hippocampus minor",
      "after": "Failures in comparative neuroanatomy: The rete mirabile and hippocampus minor"
    },
    {
      "sectionSlug": "box-electrical-stim",
      "sourceBlock": 189,
      "before": "Electrical stimulation of the human brain: The story of Mary Rafferty",
      "after": "Electrical stimulation of the human brain: The story of Mary Rafferty and Roberts Bartholow"
    },
    {
      "sectionSlug": "box-ngf",
      "sourceBlock": 203,
      "before": "The developing brain: The discovery of nerve growth factor",
      "after": "The developing brain: The discovery of nerve growth factor and chemoaffinity"
    }
  ],
  "fragments": [
    {
      "sectionSlug": "box-rete-mirabile",
      "orderIndex": 0,
      "sourceBlock": 170,
      "requiredTitle": "Failures in comparative neuroanatomy: The rete mirabile and hippocampus minor",
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "hippocampus minor"
            }
          ]
        },
        "content_text": "hippocampus minor"
      },
      "restoreFields": {
        "has_animation": false,
        "animation_id": null,
        "animation_trigger": null,
        "is_subsection_header": false,
        "subsection_level": 0
      },
      "reason": "Exact trailing title fragment leaked into its own body paragraph by the importer; not a source prose paragraph."
    },
    {
      "sectionSlug": "box-electrical-stim",
      "orderIndex": 0,
      "sourceBlock": 189,
      "requiredTitle": "Electrical stimulation of the human brain: The story of Mary Rafferty and Roberts Bartholow",
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Rafferty and Roberts Bartholow"
            }
          ]
        },
        "content_text": "Rafferty and Roberts Bartholow"
      },
      "restoreFields": {
        "has_animation": false,
        "animation_id": null,
        "animation_trigger": null,
        "is_subsection_header": false,
        "subsection_level": 0
      },
      "reason": "Exact trailing title fragment leaked into its own body paragraph by the importer; not a source prose paragraph."
    },
    {
      "sectionSlug": "box-ngf",
      "orderIndex": 0,
      "sourceBlock": 203,
      "requiredTitle": "The developing brain: The discovery of nerve growth factor and chemoaffinity",
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "chemoaffinity"
            }
          ]
        },
        "content_text": "chemoaffinity"
      },
      "restoreFields": {
        "has_animation": false,
        "animation_id": null,
        "animation_trigger": null,
        "is_subsection_header": false,
        "subsection_level": 0
      },
      "reason": "Exact trailing title fragment leaked into its own body paragraph by the importer; not a source prose paragraph."
    }
  ],
  "figures": [
    {
      "animationKey": "animationFoundationsPenfieldOperative",
      "title": "Penfield’s operative photograph",
      "config": {
        "placeholder": true,
        "figureNumber": "H",
        "diagramType": "photo",
        "caption": "Figure H. Operative photo of one of Penfield’s patients (M.B.) related to removal of a microgyria. Letters indicate brain regions where electrical stimulation was performed. See Figure H for results of electrical stimulation. Source: Leblanc, Journal of Neurosurgery, 2021.",
        "images": [
          {
            "src": "/publicAssets/images/foundations/narrative/penfield-operative-h.jpg",
            "alt": "Operative photograph of patient M.B.’s exposed cortex, with lettered paper markers at electrical stimulation sites."
          }
        ],
        "source": {
          "document": "Foundations_ST7_NM3_LL.docx",
          "imageBlock": 197,
          "captionBlock": 197,
          "manuscriptLabel": "H"
        }
      },
      "imageFileUrl": "/publicAssets/images/foundations/narrative/penfield-operative-h.jpg",
      "sourceImage": {
        "zip_path": "word/media/image37.jpeg",
        "sha256": "2bf6e466121730790ff284b3d885bbda4a867db3973944977b52d15e8c1084f7",
        "width": 1024,
        "height": 993
      },
      "sectionSlug": "box-penfield",
      "orderIndex": 0,
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "Wilder Penfield was born in Spokane, Washington in 1891. He obtained a Bachelor of Arts in Philosophy from Princeton before moving to Oxford as a Rhodes Scholar in the lab of Charles Sherrington, where he obtained a Bachelor of Science in Physiology. Penfield then completed medical training at Johns Hopkins University and apprenticed with Harvey Cushing"
            },
            {
              "type": "citation_ref",
              "number": 110
            },
            {
              "type": "text",
              "content": ". Penfield took his first job as a neurosurgeon in New York City, where he started working with William Vernon Cone, who would remain his neurosurgical partner for most of his professional career"
            },
            {
              "type": "citation_ref",
              "number": 111
            },
            {
              "type": "text",
              "content": ". While working with Cone to refine neurosurgical techniques, Penfield developed an interest in research related to epilepsy. As part of this endeavour, in 1924 he travelled to Spain—where he studied under Ramón y Cajal’s pupil Pio del Rio-Hortega—to learn methods for studying glial cells, which allowed him to examine glial tumours and brain scars"
            },
            {
              "type": "citation_ref",
              "number": 112
            },
            {
              "type": "text",
              "content": "."
            }
          ]
        },
        "content_text": "Wilder Penfield was born in Spokane, Washington in 1891. He obtained a Bachelor of Arts in Philosophy from Princeton before moving to Oxford as a Rhodes Scholar in the lab of Charles Sherrington, where he obtained a Bachelor of Science in Physiology. Penfield then completed medical training at Johns Hopkins University and apprenticed with Harvey Cushing. Penfield took his first job as a neurosurgeon in New York City, where he started working with William Vernon Cone, who would remain his neurosurgical partner for most of his professional career. While working with Cone to refine neurosurgical "
      },
      "sourceCaption": "Figure H. Operative photo of one of Penfield’s patients (M.B.) related to removal of a microgyria. Letters indicate brain regions where electrical stimulation was performed. See Figure H for results of electrical stimulation. Source: Leblanc, Journal of Neurosurgery, 2021."
    },
    {
      "animationKey": "animationFoundationsPenfieldMap",
      "title": "Penfield’s map of case M.B.",
      "config": {
        "placeholder": true,
        "figureNumber": "I",
        "diagramType": "map",
        "caption": "Figure I. Penfield's map of case M.B. Stimulation at A and B produced sensation in the right leg from knee to the foot. Stimulation at C produced sensation in the right hand, which was most intense in the middle finger and produced a slight clonic tremor of the hand. Stimulation at D produced slight clonic movement of the right foot. Stimulation at E produced no response. Stimulation at F produced sensation in the right foot, and stimulation at H produced sensation in the leg. The dotted line encircling the microgyria indicates the resection margins. Source: Leblanc, Journal of Neurosurgery, 2021.",
        "images": [
          {
            "src": "/publicAssets/images/foundations/narrative/penfield-case-mb-i.jpg",
            "alt": "Penfield’s lateral brain map of case M.B., showing stimulation sites and a dotted resection boundary around the microgyria."
          }
        ],
        "source": {
          "document": "Foundations_ST7_NM3_LL.docx",
          "imageBlock": 198,
          "captionBlock": 198,
          "manuscriptLabel": "I"
        }
      },
      "imageFileUrl": "/publicAssets/images/foundations/narrative/penfield-case-mb-i.jpg",
      "sourceImage": {
        "zip_path": "word/media/image38.jpeg",
        "sha256": "5dafbf24227f3edcc51fa8ade70dd64af107163fd7dadf166f6b2e1f2fdd55d8",
        "width": 1024,
        "height": 980
      },
      "sectionSlug": "box-penfield",
      "orderIndex": 1,
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "In 1927, Penfield spent six months in Breslau, then part of Germany, to work with neurosurgeon Otfrid Foerster. Foerster had studied in Germany with Fedor Krause, who pioneered the use of electrical stimulation of cortex to guide removal of tissue resection as a treatment for epilepsy"
            },
            {
              "type": "citation_ref",
              "number": 113
            },
            {
              "type": "text",
              "content": ". Penfield was also aware that Cushing had briefly performed similar methods in a small number of patients around the turn of the century"
            },
            {
              "type": "citation_ref",
              "number": 114
            },
            {
              "type": "text",
              "content": ", and that Sherrington had performed related experiments in non-human primates"
            },
            {
              "type": "citation_ref",
              "number": 115
            },
            {
              "type": "text",
              "content": ". In Breslau, Penfield learned how to perform local cortical electrical stimulations while patients were treated with local anesthesia, as well as methods for excising brain scars"
            },
            {
              "type": "citation_ref",
              "number": 112
            },
            {
              "type": "text",
              "content": ". In 1928, after returning to New York City, Penfield, along with Cone, performed their version of the Foerster method for the first time, successfully treating an epilepsy patient"
            },
            {
              "type": "citation_ref",
              "number": 112
            },
            {
              "type": "text",
              "content": ". Later that year, Penfield and Cone moved to Montreal. In 1934, Penfield led the establishment of the Montreal Neurological Institute"
            },
            {
              "type": "citation_ref",
              "number": 111
            },
            {
              "type": "text",
              "content": ". There, along with Cone and many residents, Penfield continued refining the Foerster method and made it their own"
            },
            {
              "type": "citation_ref",
              "number": 111
            },
            {
              "type": "text",
              "content": ". They would carefully stimulate the brain surrounding an area where they thought the patient’s seizures were being generated. Then, if they were able to stimulate a seizure, they would carefully resect only the problematic piece of brain tissue. This became known as The Montreal Procedure (<strong>Figures H and I</strong>)."
            }
          ]
        },
        "content_text": "In 1927, Penfield spent six months in Breslau, then part of Germany, to work with neurosurgeon Otfrid Foerster. Foerster had studied in Germany with Fedor Krause, who pioneered the use of electrical stimulation of cortex to guide removal of tissue resection as a treatment for epilepsy. Penfield was also aware that Cushing had briefly performed similar methods in a small number of patients around the turn of the century, and that Sherrington had performed related experiments in non-human primates. In Breslau, Penfield learned how to perform local cortical electrical stimulations while patients "
      },
      "sourceCaption": "Figure I. Penfield's map of case M.B. Stimulation at A and B produced sensation in the right leg from knee to the foot. Stimulation at C produced sensation in the right hand, which was most intense in the middle finger and produced a slight clonic tremor of the hand. Stimulation at D produced slight clonic movement of the right foot. Stimulation at E produced no response. Stimulation at F produced sensation in the right foot, and stimulation at H produced sensation in the leg. The dotted line encircling the microgyria indicates the resection margins. Source: Leblanc, Journal of Neurosurgery, 2021."
    },
    {
      "animationKey": "animationFoundationsHippocratesBust",
      "title": "Bust of Hippocrates",
      "config": {
        "placeholder": true,
        "figureNumber": "K (Hippocrates)",
        "diagramType": "portrait",
        "caption": "Figure K. Bust of Hippocrates from the British Museum. Source: The Wellcome Collection.",
        "images": [
          {
            "src": "/publicAssets/images/foundations/narrative/hippocrates-bust.jpg",
            "alt": "Marble bust of Hippocrates in profile, from the British Museum."
          }
        ],
        "source": {
          "document": "Foundations_ST7_NM3_LL.docx",
          "imageBlock": 217,
          "captionBlock": 218,
          "manuscriptLabel": "K"
        }
      },
      "imageFileUrl": "/publicAssets/images/foundations/narrative/hippocrates-bust.jpg",
      "sourceImage": {
        "zip_path": "word/media/image41.jpeg",
        "sha256": "6a17c162d456752dd4fe131a2096c26f8f679a1032419b761ba488362765d1fb",
        "width": 407,
        "height": 698
      },
      "sectionSlug": "box-sacred-disease",
      "orderIndex": 1,
      "before": {
        "content": {
          "blocks": [
            {
              "type": "text",
              "content": "<em><strong>Figure</strong> <strong>K</strong></em>. Bust of Hippocrates from the British Museum. Source: The Wellcome Collection."
            }
          ]
        },
        "content_text": "Figure K. Bust of Hippocrates from the British Museum. Source: The Wellcome Collection."
      },
      "sourceCaption": "Figure K. Bust of Hippocrates from the British Museum. Source: The Wellcome Collection."
    }
  ],
  "referenceUpdates": [
    {
      "number": 79,
      "sourceBlock": 325,
      "before": {
        "authors": "Sakmann, B",
        "title": "Bernard Katz. 26 March 1911 — 20 April 2003: Elected",
        "journal": null,
        "year": 2003,
        "volume": null,
        "pages": null,
        "doi": null,
        "url": null,
        "pub_type": "other",
        "raw_text": "Sakmann, B. Bernard Katz. 26 March 1911 — 20 April 2003: Elected"
      },
      "after": {
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
      }
    }
  ],
  "furtherReading": {
    "sectionSlug": "further-reading",
    "title": "Further reading:",
    "sourceBlocks": [
      383,
      384
    ],
    "sourceSentence": "For a broader overview of the history of neuroscience, see these resources29,8,2.",
    "citationNumbers": [
      29,
      8,
      2
    ],
    "paragraph": {
      "content": {
        "blocks": [
          {
            "type": "further_reading",
            "title": "For a broader overview of the history of neuroscience, see these resources.",
            "links": [
              {
                "text": "29. Gross — Brain, Vision, Memory: Tales in the History of Neuroscience",
                "url": "#ref-29"
              },
              {
                "text": "8. Finger — Origins of Neuroscience: A History of Explorations Into Brain Function",
                "url": "#ref-8"
              },
              {
                "text": "2. Gross — A Hole in the Head",
                "url": "#ref-2"
              }
            ]
          }
        ]
      },
      "content_text": "For a broader overview of the history of neuroscience, see these resources."
    }
  }
}$history_source$::jsonb;
  item jsonb;
  chapter_ids uuid[];
  chapter_id uuid;
  section_id uuid;
  figure_id uuid;
  para public.paragraphs%rowtype;
  dep record;
  has_dependent boolean;
  blocked boolean;
  id_attnum smallint;
  affected integer;
begin
  -- A slug is unique only within a content version. Never pick an arbitrary
  -- version or silently change every version of the chapter.
  select array_agg(id) into chapter_ids from public.modules
  where slug = repair->>'chapterSlug';
  if cardinality(chapter_ids) > 1 then
    raise exception 'History source repair: ambiguous chapter slug across content versions; select an approved version before applying';
  end if;
  chapter_id := chapter_ids[1];
  if chapter_id is null then
    raise notice 'History source repair: chapter absent; nothing changed';
    return;
  end if;
  perform 1 from public.modules where id = chapter_id for update;

  for item in select value from jsonb_array_elements(repair->'paragraphUpdates') loop
    update public.paragraphs p
    set content = item->'after'->'content',
        content_text = item->'after'->>'content_text', updated_at = now()
    from public.sections s
    where p.section_id = s.id and s.module_id = chapter_id
      and s.slug = item->>'sectionSlug'
      and p.order_index = (item->>'orderIndex')::integer
      and p.content = item->'before'->'content'
      and p.content_text is not distinct from item->'before'->>'content_text';
    get diagnostics affected = row_count;
    raise notice 'History source repair: paragraph %/% updated % (zero means already repaired, missing, or divergent)',
      item->>'sectionSlug', item->>'orderIndex', affected;
  end loop;

  for item in select value from jsonb_array_elements(repair->'titles') loop
    if item->>'before' = item->>'after' then continue; end if;
    update public.sections s set title = item->>'after', updated_at = now()
    where s.module_id = chapter_id and s.slug = item->>'sectionSlug'
      and s.title = item->>'before';
    get diagnostics affected = row_count;
    raise notice 'History source repair: title % updated % (zero means already repaired, missing, or divergent)',
      item->>'sectionSlug', affected;
  end loop;

  select attnum into id_attnum from pg_attribute
    where attrelid = 'public.paragraphs'::regclass and attname = 'id';
  for item in select value from jsonb_array_elements(repair->'fragments') loop
    -- FOR UPDATE blocks new FK references while this transaction checks and
    -- deletes; existing references are preserved regardless of their FK action.
    select p.* into para from public.paragraphs p
    join public.sections s on s.id = p.section_id
    where s.module_id = chapter_id and s.slug = item->>'sectionSlug'
      and s.title = item->>'requiredTitle'
      and p.order_index = (item->>'orderIndex')::integer
      and p.content = item->'before'->'content'
      and p.content_text is not distinct from item->'before'->>'content_text'
      and p.has_animation is false and p.animation_id is null
      and p.animation_trigger is null and p.is_subsection_header is false
      and p.subsection_level = 0
    for update of p;
    if not found then
      raise notice 'History source repair: fragment % skipped (absent, changed, or noncanonical title)', item->>'sectionSlug';
      continue;
    end if;
    blocked := false;
    for dep in
      select c.conrelid, c.conname, c.conkey, c.confkey, a.attname
      from pg_constraint c
      left join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and c.confrelid = 'public.paragraphs'::regclass
    loop
      -- Fail closed for unexpected composite or non-id references.
      if array_length(dep.conkey, 1) <> 1 or dep.confkey <> array[id_attnum] then
        blocked := true;
        raise notice 'History source repair: fragment % retained; unsupported inbound FK %',
          item->>'sectionSlug', dep.conname;
        exit;
      end if;
      execute format('select exists (select 1 from %s where %I = $1)',
        dep.conrelid::regclass, dep.attname) into has_dependent using para.id;
      if has_dependent then
        blocked := true;
        raise notice 'History source repair: fragment % retained; dependent data in % (%)',
          item->>'sectionSlug', dep.conrelid::regclass, dep.conname;
        exit;
      end if;
    end loop;
    if not blocked then
      -- Original source snapshots are retained in the fixture. Log the runtime
      -- identity as an additional restoration aid; the operator backup is primary.
      raise notice 'History source repair: deleting exact fragment %; original row %',
        item->>'sectionSlug', to_jsonb(para);
      delete from public.paragraphs where id = para.id;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(repair->'referenceUpdates') loop
    update public."references" r set
      authors = item->'after'->>'authors', title = item->'after'->>'title',
      journal = item->'after'->>'journal', year = (item->'after'->>'year')::integer,
      volume = item->'after'->>'volume', pages = item->'after'->>'pages',
      doi = item->'after'->>'doi', url = item->'after'->>'url',
      pub_type = item->'after'->>'pub_type', raw_text = item->'after'->>'raw_text'
    where r.module_id = chapter_id and r.number = (item->>'number')::integer
      and to_jsonb(r) @> (item->'before');
    get diagnostics affected = row_count;
    raise notice 'History source repair: reference % updated % (zero means already repaired, missing, or divergent)',
      item->>'number', affected;
  end loop;

  for item in select value from jsonb_array_elements(repair->'figures') loop
    select p.* into para from public.paragraphs p
    join public.sections s on s.id = p.section_id
    where s.module_id = chapter_id and s.slug = item->>'sectionSlug'
      and p.order_index = (item->>'orderIndex')::integer
      and p.content = item->'before'->'content'
      and p.content_text is not distinct from item->'before'->>'content_text'
      and p.animation_id is null and p.has_animation is false
      and p.animation_trigger is null
    for update of p;
    if not found then
      raise notice 'History source repair: figure % attachment skipped (already attached, missing, or divergent)', item->>'animationKey';
      continue;
    end if;
    insert into public.animations
      (animation_key, title, media_type, interaction_type, component_name,
       config, image_file_url, scientific_domain, load_priority)
    values (item->>'animationKey', item->>'title', 'image', 'static_image',
      'IllustrationPlaceholder', item->'config', item->>'imageFileUrl', 'history', 'low')
    on conflict (animation_key) do nothing;
    select id into figure_id from public.animations
    where animation_key = item->>'animationKey' and title = item->>'title'
      and media_type = 'image' and interaction_type = 'static_image'
      and component_name = 'IllustrationPlaceholder' and config = item->'config'
      and image_file_url = item->>'imageFileUrl' and scientific_domain = 'history';
    if figure_id is null then
      raise notice 'History source repair: figure % retained existing divergent artwork; attachment skipped', item->>'animationKey';
      continue;
    end if;
    update public.paragraphs set animation_id = figure_id,
      has_animation = true, animation_trigger = 'auto', updated_at = now()
    where id = para.id;
    raise notice 'History source repair: figure % attached to %/%',
      item->>'animationKey', item->>'sectionSlug', item->>'orderIndex';
  end loop;

  item := repair->'furtherReading';
  select id into section_id from public.sections
    where module_id = chapter_id and slug = item->>'sectionSlug';
  if section_id is null then
    insert into public.sections (module_id, title, slug, order_index)
    select chapter_id, item->>'title', item->>'sectionSlug', coalesce(max(order_index), -1) + 1
    from public.sections where module_id = chapter_id
    returning id into section_id;
    insert into public.paragraphs (section_id, content, content_text, order_index)
    values (section_id, item->'paragraph'->'content', item->'paragraph'->>'content_text', 0);
    raise notice 'History source repair: restored source Further reading section';
  else
    raise notice 'History source repair: Further reading already exists; retained without changes';
  end if;
end
$history_repair$;
