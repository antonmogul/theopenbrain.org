import { mount } from "@vue/test-utils";

// Shallow render-smoke helper for dashboard section components. Stubs teleport
// (modals use it) so mounting doesn't require a real DOM target. Section
// components are presentational — they receive the owning view's composable
// refs as props and emit action events — so a smoke mount just proves the
// template compiles and renders its data without throwing.
export function mountSection(Component, props = {}, global = {}) {
    return mount(Component, {
        props,
        global: { stubs: { teleport: true }, ...global },
    });
}
