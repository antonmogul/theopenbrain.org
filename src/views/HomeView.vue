<script setup>
// Landing / about page. The chapter list lives in /chapters (single source of
// truth — see ChaptersView), so this page is the "what is this" entry point:
// hero + mission, how-it-works, a browse CTA, and the open-access / funding /
// credits footer. Copy mirrors the About drawer (MenuAbout.vue).
import { useGeneral } from "@/stores/index";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/composables/useAuth";

const store = useGeneral();
const authStore = useAuthStore();
const { isAuthenticated, user, userRole } = useAuth();

const openAuth = () => {
  store.activeMenu = false;
  store.activeAbout = false;
  authStore.openAuth();
};

// "How it works" — what makes this more than a PDF.
const features = [
  {
    eyebrow: "Read",
    title: "Diagrams that move with you",
    body: "Split-screen chapters pair the text with interactive illustrations — anatomy you can click through, animations that play as you scroll.",
  },
  {
    eyebrow: "Annotate",
    title: "Highlight, note, and keep your place",
    body: "Mark up the text, leave yourself notes, and your reading progress follows you across sessions.",
  },
  {
    eyebrow: "Practice",
    title: "Quizzes & spaced-repetition flashcards",
    body: "Check your understanding with timed quizzes, then lock it in with flashcards scheduled by an SM-2 algorithm.",
  },
];
</script>

<template>
  <main class="home">
    <!-- ── Hero / mission ── -->
    <header class="hero">
      <img
        src="/publicAssets/images/logo.svg"
        alt="The Open Brain"
        class="hero-logo"
      />
      <p class="hero-strap">
        An interactive, open access neuroscience learning tool
        &mdash;&thinsp;the natural evolution of a textbook.
      </p>

      <div class="hero-actions">
        <router-link to="/chapters" class="btn btn--solid">
          Browse chapters
        </router-link>
        <router-link to="/playground" class="btn btn--ghost">
          Python playground
        </router-link>
        <router-link
          v-if="isAuthenticated"
          to="/dashboard"
          class="btn btn--ghost"
        >
          Dashboard
        </router-link>
        <button v-else class="btn btn--ghost" @click="openAuth">Sign in</button>
      </div>

      <div v-if="isAuthenticated" class="hero-user">
        <span>{{ user?.email }}</span>
        <span v-if="userRole" class="role-tag" :class="`role-tag--${userRole}`">
          {{ userRole }}
        </span>
      </div>
    </header>

    <!-- ── Mission statement ── -->
    <section class="mission">
      <p class="eyebrow">About</p>
      <h2 class="mission-head">
        <em>The Open Brain</em> is an open access neuroscience textbook — free,
        forever, for anyone.
      </h2>
      <p class="mission-body">
        We&rsquo;re building the breadth of neuroscience into an interactive
        book that reads like a story and teaches like a lab. More chapters are
        on the way as the project grows.
      </p>
    </section>

    <!-- ── How it works ── -->
    <section class="how">
      <p class="eyebrow">How it works</p>
      <div class="how-grid">
        <article v-for="f in features" :key="f.title" class="feature">
          <p class="feature-eyebrow">{{ f.eyebrow }}</p>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-body">{{ f.body }}</p>
        </article>
      </div>
    </section>

    <!-- ── Browse CTA ── -->
    <section class="cta">
      <h2 class="cta-head">Start reading</h2>
      <p class="cta-body">
        Two chapters live now, with a history of neuroscience just landed. Pick
        one and dive in.
      </p>
      <router-link to="/chapters" class="btn btn--solid btn--lg">
        Browse all chapters
      </router-link>
    </section>

    <!-- ── Open access / funding / credits ── -->
    <footer class="foot">
      <div class="foot-cols">
        <div class="foot-col">
          <p class="foot-eyebrow">Open access</p>
          <p class="foot-text">
            theopenbrain.org is licensed under a
            <a
              href="http://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener"
              >Creative Commons Attribution 4.0 International License</a
            >
            — use, share, adapt, and redistribute freely with attribution.
          </p>
        </div>
        <div class="foot-col">
          <p class="foot-eyebrow">Funding</p>
          <p class="foot-text">
            Funded by the
            <a
              href="https://www.mcgill.ca/neuro/open-science/tanenbaum-open-science-institute-tosi"
              target="_blank"
              rel="noopener"
              >Tanenbaum Open Science Institute</a
            >
            at the
            <a
              href="https://www.mcgill.ca/neuro/"
              target="_blank"
              rel="noopener"
              >Montreal Neurological Institute</a
            >, McGill University.
          </p>
        </div>
        <div class="foot-col">
          <p class="foot-eyebrow">Credits</p>
          <p class="foot-text">
            Editor: Stuart Trenholm · Chapter authors: Arjun Krishnaswamy,
            Stuart Trenholm · Design &amp; illustration:
            <a href="https://malpeso.info/" target="_blank" rel="noopener"
              >Malpeso Studio</a
            >.
          </p>
        </div>
      </div>
      <p class="foot-legal">
        An open access project · Montreal Neurological Institute
      </p>
    </footer>
  </main>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: rgb(var(--color-bg));
  color: rgb(var(--color-ink));
  font-family: var(--font-body);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.eyebrow,
.feature-eyebrow,
.foot-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgb(var(--color-mute));
  margin: 0 0 0.625rem;
}

/* ── Hero ── */
.hero {
  width: 100%;
  max-width: 720px;
  padding: 4.375rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.hero-logo {
  width: min(300px, 72vw);
  height: auto;
  margin-bottom: 1.5rem;
}
.hero-strap {
  font-size: 1.0625rem;
  line-height: 1.55;
  color: rgb(var(--color-mute));
  max-width: 480px;
  margin: 0 0 1.625rem;
  font-style: italic;
}
.hero-actions {
  display: flex;
  gap: 0.625rem;
  flex-wrap: wrap;
  justify-content: center;
}
.hero-user {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(var(--color-mute));
}

/* ── Buttons ── */
.btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-radius: 999px;
  padding: 0.5625rem 1.125rem;
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
  text-decoration: none;
  display: inline-block;
}
.btn--solid {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-bg));
  border: 1px solid rgb(var(--color-ink));
}
.btn--solid:hover {
  background: rgb(var(--color-accent));
  border-color: rgb(var(--color-accent));
  color: #fff;
}
.btn--ghost {
  background: transparent;
  color: rgb(var(--color-ink));
  border: 1px solid rgb(var(--color-ink) / 0.85);
}
.btn--ghost:hover {
  background: rgb(var(--color-ink));
  color: rgb(var(--color-bg));
}
.btn--lg {
  font-size: 0.84375rem;
  padding: 0.6875rem 1.5rem;
}

/* ── Mission ── */
.mission {
  width: 100%;
  max-width: 720px;
  padding: 1.875rem 1.5rem;
  border-top: 1px solid rgb(var(--color-line));
}
.mission-head {
  font-size: 1.75rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.015em;
  margin: 0 0 0.875rem;
}
.mission-head em {
  font-style: italic;
}
.mission-body {
  font-size: 1rem;
  line-height: 1.6;
  color: rgb(var(--color-mute));
  margin: 0;
  max-width: 560px;
}

/* ── How it works ── */
.how {
  width: 100%;
  max-width: 960px;
  padding: 1.875rem 1.5rem;
}
.how-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}
.feature {
  border: 1px solid rgb(var(--color-line));
  border-radius: 4px;
  background: rgb(var(--color-paper));
  padding: 1.25rem 1.125rem;
}
.feature-eyebrow {
  color: rgb(var(--color-accent));
  margin-bottom: 0.5rem;
}
.feature-title {
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.01em;
  margin: 0 0 0.5625rem;
}
.feature-body {
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgb(var(--color-mute));
  margin: 0;
}

/* ── CTA ── */
.cta {
  width: 100%;
  max-width: 720px;
  padding: 2.5rem 1.5rem;
  text-align: center;
}
.cta-head {
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: -0.012em;
  margin: 0 0 0.625rem;
}
.cta-body {
  font-size: 0.9375rem;
  line-height: 1.55;
  color: rgb(var(--color-mute));
  margin: 0 auto 1.25rem;
  max-width: 460px;
}

/* ── Footer ── */
.foot {
  width: 100%;
  border-top: 1px solid rgb(var(--color-line));
  padding: 2.1875rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.foot-cols {
  width: 100%;
  max-width: 960px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.875rem;
}
.foot-text {
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(var(--color-mute));
  margin: 0;
}
.foot-text a {
  color: rgb(var(--color-ink));
  text-decoration: underline;
  text-decoration-color: rgb(var(--color-line));
}
.foot-text a:hover {
  text-decoration-color: rgb(var(--color-accent));
}
.foot-legal {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  color: rgb(var(--color-mute));
  margin: 0;
}

/* ── Role tag (signed-in pill) ── */
.role-tag {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.125rem 0.4375rem;
  border-radius: 999px;
  border: 1px solid rgb(var(--color-line));
}

/* ── Responsive ── */
@media (max-width: 860px) {
  .how-grid,
  .foot-cols {
    grid-template-columns: 1fr;
  }
}
</style>
