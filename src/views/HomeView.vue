<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
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

// --- Chapter 1: Matisse eye parallax ---
const ch1Card = ref(null);
const ch1EyeX = ref(0);
const ch1EyeY = ref(0);

// --- Chapter 2: placeholder tracking ---
const ch2Card = ref(null);
const ch2ShiftX = ref(0);
const ch2ShiftY = ref(0);

function handleMouseMove(e) {
    if (ch1Card.value) {
        const rect = ch1Card.value.$el
            ? ch1Card.value.$el.getBoundingClientRect()
            : ch1Card.value.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        ch1EyeX.value = dx * 5;
        ch1EyeY.value = dy * 3;
    }

    if (ch2Card.value) {
        const rect = ch2Card.value.$el
            ? ch2Card.value.$el.getBoundingClientRect()
            : ch2Card.value.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        ch2ShiftX.value = dx * 5;
        ch2ShiftY.value = dy * 3;
    }
}

onMounted(() => {
    window.addEventListener("mousemove", handleMouseMove);
});

onBeforeUnmount(() => {
    window.removeEventListener("mousemove", handleMouseMove);
});
</script>

<template>
    <main class="home-page">
        <!-- Hero -->
        <header class="hero">
            <img
                src="/publicAssets/images/logo.svg"
                alt="The Open Brain"
                class="hero-logo"
            />
            <p class="hero-strapline">
                An interactive, open access neuroscience learning tool
                &mdash;&thinsp;the natural evolution of a textbook.
            </p>
        </header>

        <!-- Chapters -->
        <section class="chapters">
            <h2 class="chapters-label">Chapters</h2>

            <div class="chapters-row">
                <!-- Chapter 1: The Retina -->
                <router-link
                    to="/chapter/1/the-retina"
                    class="card"
                    ref="ch1Card"
                >
                    <div class="card__visual">
                        <img
                            src="/publicAssets/images/00-matisse-bg.jpg"
                            alt="The Retina"
                            class="card__img card__img--ch1"
                        />
                        <!-- Matisse eye overlays -->
                        <img
                            src="/publicAssets/images/00-matisse-auge-1.jpg"
                            class="card__eye card__eye--left"
                            :style="{
                                transform: `translate(${ch1EyeX}px, ${ch1EyeY}px)`,
                            }"
                        />
                        <img
                            src="/publicAssets/images/00-matisse-auge-2.jpg"
                            class="card__eye card__eye--right"
                            :style="{
                                transform: `translate(${ch1EyeX}px, ${ch1EyeY}px)`,
                            }"
                        />
                        <div class="card__gradient"></div>
                    </div>
                    <div class="card__meta">
                        <span class="card__num">01</span>
                        <h3 class="card__title">The Retina</h3>
                        <p class="card__desc">
                            Structure, photoreceptors &amp; neural circuits
                        </p>
                    </div>
                </router-link>

                <!-- Chapter 2 -->
                <router-link
                    to="/chapter/2/visual-perception-ux"
                    class="card"
                    ref="ch2Card"
                >
                    <div class="card__visual">
                        <img
                            src="/publicAssets/images/marguerite.png"
                            alt="Visual Perception & UX"
                            class="card__img card__img--ch2"
                            :style="{
                                transform: `scale(1.04) translate(${ch2ShiftX * 0.4}px, ${ch2ShiftY * 0.4}px)`,
                            }"
                        />
                        <div class="card__gradient"></div>
                    </div>
                    <div class="card__meta">
                        <span class="card__num">02</span>
                        <h3 class="card__title">Visual Perception &amp; UX</h3>
                        <p class="card__desc">
                            How we process visual information
                        </p>
                    </div>
                </router-link>
            </div>
        </section>

        <!-- Footer -->
        <footer class="home-foot">
            <div class="home-foot__actions">
                <router-link
                    v-if="isAuthenticated"
                    to="/dashboard"
                    class="pill-btn pill-btn--dark"
                >
                    Dashboard
                </router-link>
                <button
                    v-else
                    @click="openAuth"
                    class="pill-btn pill-btn--dark"
                >
                    Sign In
                </button>
            </div>

            <div v-if="isAuthenticated" class="home-foot__user">
                <span>{{ user?.email }}</span>
                <span
                    v-if="userRole"
                    class="role-tag"
                    :class="`role-tag--${userRole}`"
                >
                    {{ userRole }}
                </span>
            </div>

            <p class="home-foot__legal">
                An
                <a
                    href="http://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    >open access</a
                >
                project &middot;
                <a href="https://www.mcgill.ca/neuro/" target="_blank"
                    >Montreal Neurological Institute</a
                >
            </p>
        </footer>
    </main>
</template>

<style scoped>
/* ═══════════════════════════════════
   HOME — gallery / shorts aesthetic
   ═══════════════════════════════════ */

.home-page {
    min-height: 100vh;
    background: #f8f7f4;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* ── Hero ── */
.hero {
    width: 100%;
    max-width: 720px;
    padding: 7rem 2.4rem 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.hero-logo {
    width: min(300px, 72vw);
    height: auto;
    margin-bottom: 2.4rem;
}

.hero-strapline {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.6rem;
    line-height: 1.55;
    color: #6a6a6a;
    max-width: 480px;
    margin: 0;
    font-style: italic;
}

/* ── Chapters ── */
.chapters {
    width: 100%;
    max-width: 720px;
    padding: 2rem 2.4rem 5rem;
}

.chapters-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    font-weight: 400;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #b5b5b5;
    margin-bottom: 2rem;
}

.chapters-row {
    display: flex;
    gap: 2rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.4rem;
}

/* ── Card (9:16 Short) ── */
.card {
    flex: 0 0 auto;
    width: min(300px, 72vw);
    aspect-ratio: 9 / 16;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    text-decoration: none;
    color: white;
    scroll-snap-align: start;
    cursor: pointer;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.card:hover {
    transform: scale(1.02);
}

.card__visual {
    position: absolute;
    inset: 0;
    overflow: hidden;
}

.card__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.card__img--ch1 {
    object-position: center 10%;
}

.card__img--ch2 {
    object-position: center 20%;
}

.card:hover .card__img {
    transform: scale(1.04);
}

/* Dark gradient at bottom */
.card__gradient {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 55%;
    background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.75) 0%,
        rgba(0, 0, 0, 0.35) 50%,
        transparent 100%
    );
    pointer-events: none;
}

/* Text overlay at bottom */
.card__meta {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 2.4rem;
    z-index: 2;
}

.card__num {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.6);
    display: block;
    margin-bottom: 0.6rem;
}

.card__title {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 2.2rem;
    font-weight: 600;
    line-height: 1.15;
    margin: 0 0 0.6rem;
    color: white;
}

.card__desc {
    font-family: "IBM Plex Sans", sans-serif;
    font-size: 1.2rem;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.65);
    margin: 0;
}

/* ── Matisse eyes (Ch1) ── */
.card__eye {
    position: absolute;
    width: 32px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    transition: transform 0.12s ease-out;
    pointer-events: none;
    z-index: 1;
}

.card__eye--left {
    top: 27.5%;
    left: 39%;
}

.card__eye--right {
    top: 27%;
    left: 52%;
}

/* ── Footer ── */
.home-foot {
    width: 100%;
    max-width: 720px;
    padding: 0 2.4rem 5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
}

.home-foot__actions {
    display: flex;
    gap: 1rem;
}

.pill-btn {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.15rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-decoration: none;
    padding: 0.9rem 2.4rem;
    border-radius: 999px;
    border: 1px solid #dedede;
    background: transparent;
    color: #343434;
    cursor: pointer;
    transition: all 0.25s;
}

.pill-btn:hover {
    border-color: rgb(151, 71, 255);
    color: rgb(151, 71, 255);
}

.pill-btn--dark {
    background: #202020;
    color: white;
    border-color: #202020;
}

.pill-btn--dark:hover {
    background: rgb(151, 71, 255);
    border-color: rgb(151, 71, 255);
}

.home-foot__user {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.05rem;
    color: #898989;
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.role-tag {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
}

.role-tag--creator {
    background: rgba(151, 71, 255, 0.12);
    color: rgb(151, 71, 255);
}

.role-tag--professor {
    background: rgba(59, 130, 246, 0.12);
    color: rgb(59, 130, 246);
}

.role-tag--student {
    background: rgba(34, 197, 94, 0.12);
    color: rgb(34, 197, 94);
}

.home-foot__legal {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.05rem;
    color: #b5b5b5;
    text-align: center;
}

.home-foot__legal a {
    color: #898989;
    text-decoration: underline;
    text-underline-offset: 2px;
}

.home-foot__legal a:hover {
    color: rgb(151, 71, 255);
}

/* ── Mobile ── */
@media (max-width: 479px) {
    .hero {
        padding: 5rem 2rem 2rem;
    }

    .hero-logo {
        width: 220px;
    }

    .hero-strapline {
        font-size: 1.4rem;
    }

    .chapters {
        padding: 1.6rem 1.6rem 3.5rem;
    }

    .card {
        width: min(260px, 72vw);
    }

    .card__title {
        font-size: 1.9rem;
    }
}
</style>
