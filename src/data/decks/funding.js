/**
 * The funding deck as of October 2026, frozen (Claude Design handoff "Open
 * Brain Funding Deck", 7 Oct 2026). Six slides for the pitch, then three
 * appendix slides, one per role. Each entry names a layout from
 * src/components/deck/slides/layouts.js and the props it renders with;
 * `notes` are the speaker notes (N when presenting).
 *
 * The live deck is edited in Dashboard → Decks (OPENBRAIN-129) and lives in
 * the database. This copy is:
 *   - the seed: scripts/decks/gen-deck-seed.mjs (npm run deck:seed-sql)
 *     writes supabase/migrations/20261007010100_seed_funding_deck.sql from
 *     it. The script loads this file on its own, so keep it free of imports;
 *   - the fallback /deck shows when the database has no pinned deck or can't
 *     be reached (useDeckSource);
 *   - the fixture stories and tests use (propsOf(FUNDING_DECK, '<id>'),
 *     layouts.test.js reads entry "trajectory"), so keep the ids.
 * See docs/funding-deck.md.
 */

const IMAGES = "/publicAssets/images";

export const FUNDING_DECK = [
  {
    id: "intro",
    label: "Intro",
    notes:
      "Introduce The Open Brain: a free, interactive, open-access neuroscience textbook built with McGill's Tanenbaum Open Science Institute.",
    layout: "hero",
    props: {
      brand: true,
      kicker: "Funding overview · 2026",
      title: "The Open Brain",
      size: "display",
      lead: "An interactive, open-access neuroscience textbook — free, forever, for anyone.",
      footnote:
        "With the Tanenbaum Open Science Institute · The Neuro · McGill University",
      image: {
        src: `${IMAGES}/00-matisse-bg.jpg`,
        alt: "Matisse, Marguerite with black cat",
      },
    },
  },
  {
    id: "team",
    label: "Team",
    notes:
      "The people behind the book: founder and co-lead editors, platform engineering, design.",
    layout: "team",
    props: {
      eyebrow: "02 · Team",
      title: "Our Team",
      people: [
        {
          name: "Stuart Trenholm",
          role: "Founder and co-lead editor · McGill University",
          photo: "",
        },
        { name: "Sheena Josselyn", role: "Co-lead editor", photo: "" },
        {
          name: "Anton Morrison",
          role: "Platform and engineering · 11Eight Innovation",
          photo: "",
        },
        {
          name: "Sonia",
          role: "Design and illustration · Studio Malpeso",
          photo: "",
        },
        { name: "Tyler", role: "Role to confirm", photo: "" },
      ],
    },
  },
  {
    id: "textbook-today",
    label: "Textbook Today",
    notes:
      "Walk through the new features: imagery, interactive figures, accounts, highlights and notes, quizzes, flashcards, Python labs, professor courses and analytics.",
    layout: "video",
    props: {
      eyebrow: "03 · Product",
      title: "The Textbook Today",
      aside: "Reader · Study tools · Courses · Analytics",
      src: "",
      placeholder: "Feature walkthrough video",
    },
  },
  {
    id: "users",
    label: "Users",
    notes:
      "The platform serves four kinds of users: creators who write the book, professors who teach from it, students who study with it, and the public, who can read it freely with no account.",
    layout: "audience",
    props: {
      eyebrow: "04 · Platform",
      title: "Four Kinds of Users",
      roles: [
        {
          role: "creator",
          icon: "notes",
          audience: "Authors and editors",
          name: "Creator",
          value:
            "Anyone on the team can write, edit and publish chapters without a developer.",
          features: ["Chapter wizard", "Inline editing", "Media library"],
        },
        {
          role: "professor",
          icon: "graduation",
          audience: "Instructors",
          name: "Professor",
          value:
            "Build a course from exactly the chapters they teach, and see how students are doing.",
          features: ["Course builder", "One course link", "Enroll students"],
        },
        {
          role: "student",
          icon: "book",
          audience: "Learners with an account",
          name: "Student",
          value: "Turn the book into a complete, personal study guide — free.",
          features: ["Highlights", "Notes", "Flashcards"],
        },
        {
          role: "public",
          icon: "globe",
          audience: "Anyone, anywhere",
          name: "Public",
          value: "Read the whole book online — no account, no paywall.",
          features: ["Open access", "Interactive figures", "No sign-up"],
        },
      ],
    },
  },
  {
    id: "trajectory",
    label: "Trajectory",
    notes:
      "One chapter launched last year; five more arrive by the end of this year, alongside the full platform. Twelve of thirty-six chapters are funded; the remaining twenty-four — two thirds of the book — still need funding.",
    layout: "trajectory",
    props: {
      eyebrow: "05 · Trajectory",
      title: "Trajectory to 2027",
      milestones: [
        {
          when: "2025",
          heading: "Chapter 1 published",
          detail:
            "The Retina, with interactive figures, live at theopenbrain.org",
        },
        {
          when: "2026",
          heading: "Five new chapters and a full platform",
          detail:
            "Book management for authors, courses for professors, study tools for students",
          highlight: true,
        },
        {
          when: "End of 2027",
          heading: "All 12 funded chapters complete",
          detail: "The remaining 24 chapters depend on new funding",
          later: true,
        },
      ],
      summary: "24 of 36 chapters still need funding",
      chapters: { live: 1, inProgress: 5, funded: 6, unfunded: 24 },
    },
  },
  {
    id: "finishing",
    label: "Finishing the Book",
    notes:
      "Soft ask: invite a conversation about philanthropic support to fund the remaining chapters.",
    layout: "hero",
    props: {
      eyebrow: "06 · Next steps",
      title: "Finishing the Book",
      lead: "We would welcome a conversation about philanthropic support to bring the remaining 24 chapters to every student, free.",
      person: {
        name: "Stuart Trenholm",
        role: "Founder and co-lead editor · theopenbrain.org",
      },
      image: {
        src: `${IMAGES}/foundations/fig07-01.jpg`,
        alt: "Vesalius, De humani corporis fabrica",
      },
    },
  },
  {
    id: "appendix-creator",
    label: "Appendix · Creator",
    notes: "Creator features and the value they bring.",
    layout: "role",
    props: {
      role: "creator",
      eyebrow: "A1 · Authors and editors",
      icon: "notes",
      name: "Creator",
      value:
        "Anyone on the team can write, edit and publish chapters without a developer.",
      features: [
        {
          icon: "book",
          name: "Chapter wizard",
          detail:
            "Upload markdown or Word; sections are detected automatically",
        },
        {
          icon: "notes",
          name: "Inline editing",
          detail: "Edit text in place, right on the page",
        },
        {
          icon: "image",
          name: "Media library",
          detail: "Images, animations and 3D models in one place",
        },
        {
          icon: "widget",
          name: "Interactive widgets",
          detail: "Drop research-grade widgets into any chapter",
        },
        {
          icon: "quiz",
          name: "Quiz & flashcard builder",
          detail: "Write assessments alongside the text",
        },
        {
          icon: "chart",
          name: "Platform analytics",
          detail: "See how every chapter is being read",
        },
      ],
    },
  },
  {
    id: "appendix-professor",
    label: "Appendix · Professor",
    notes: "Professor features and the value they bring.",
    layout: "role",
    props: {
      role: "professor",
      eyebrow: "A2 · Instructors",
      icon: "graduation",
      name: "Professor",
      value:
        "Build a course from exactly the chapters they teach, and see how students are doing.",
      features: [
        {
          icon: "layers",
          name: "Course builder",
          detail: "Assemble a course from any subset of the book",
        },
        {
          icon: "share",
          name: "One course link",
          detail: "Publish a unique URL for each class",
        },
        {
          icon: "users",
          name: "Enroll students",
          detail: "Invite a class and manage the roster",
        },
        {
          icon: "clipboard",
          name: "Assessments",
          detail: "Assign quizzes and track scores",
        },
        {
          icon: "chart",
          name: "Student progress",
          detail: "Reading, quiz and lab activity per student",
        },
        {
          icon: "highlight",
          name: "Class highlights",
          detail: "See what the class finds important",
        },
      ],
    },
  },
  {
    id: "appendix-student",
    label: "Appendix · Student",
    notes: "Student features and the value they bring.",
    layout: "role",
    props: {
      role: "student",
      eyebrow: "A3 · Readers and learners",
      icon: "book",
      name: "Student",
      value: "Turn the book into a complete, personal study guide — free.",
      features: [
        {
          icon: "highlight",
          name: "Highlights",
          detail: "Four colours, saved to their account",
        },
        {
          icon: "notes",
          name: "Notes",
          detail: "A notebook that follows every chapter",
        },
        {
          icon: "flashcard",
          name: "Flashcards",
          detail: "Spaced review of key terms",
        },
        {
          icon: "quiz",
          name: "Quizzes",
          detail: "Instant feedback with explanations",
        },
        {
          icon: "code",
          name: "Python labs",
          detail: "Run real simulations in the browser",
        },
        {
          icon: "chart",
          name: "Progress",
          detail: "Pick up exactly where they left off",
        },
      ],
    },
  },
];
