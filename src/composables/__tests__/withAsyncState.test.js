import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref } from "vue";

import { withAsyncState } from "@/composables/withAsyncState";

describe("withAsyncState", () => {
    let loading;
    let error;
    let consoleErrorSpy;

    beforeEach(() => {
        loading = ref(false);
        error = ref(null);
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("success path: runs fn, returns its value, clears error, resets loading", async () => {
        const fn = vi.fn(async () => {
            // loading is set true before fn runs
            expect(loading.value).toBe(true);
            expect(error.value).toBe(null);
            return "ok";
        });

        const result = await withAsyncState(
            { loading, error },
            "Error doing thing:",
            fn,
        );

        expect(fn).toHaveBeenCalledTimes(1);
        expect(result).toBe("ok");
        expect(error.value).toBe(null);
        expect(loading.value).toBe(false);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("error path: sets error.value to err.message and resets loading", async () => {
        const fn = vi.fn(async () => {
            throw new Error("boom");
        });

        const result = await withAsyncState(
            { loading, error },
            "Error doing thing:",
            fn,
        );

        // swallowed, not re-thrown -> resolves to undefined
        expect(result).toBeUndefined();
        expect(error.value).toBe("boom");
        expect(loading.value).toBe(false);
    });

    it("error path: calls console.error with the logLabel and the error", async () => {
        const thrown = new Error("kaboom");
        const fn = vi.fn(async () => {
            throw thrown;
        });

        await withAsyncState({ loading, error }, "Error fetching X:", fn);

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching X:", thrown);
    });

    it("sets loading=true and error=null at start before fn resolves", async () => {
        // Pre-dirty the refs to prove they are reset.
        loading.value = false;
        error.value = "stale";

        let observedLoading;
        let observedError;
        const fn = vi.fn(async () => {
            observedLoading = loading.value;
            observedError = error.value;
        });

        await withAsyncState({ loading, error }, "label", fn);

        expect(observedLoading).toBe(true);
        expect(observedError).toBe(null);
        expect(loading.value).toBe(false);
    });
});
