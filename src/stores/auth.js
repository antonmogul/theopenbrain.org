import { defineStore } from "pinia";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    activeAuth: false,
    authView: "register", // 'register', 'login', 'forgot'
    authLoading: false,
    authError: null,
    authSuccess: null,
  }),
  actions: {
    // "Sign in" buttons open the login form; Register is one link away in it.
    openAuth(view = "login") {
      this.activeAuth = true;
      this.authView = view;
      this.authError = null;
      this.authSuccess = null;
    },
    closeAuth() {
      this.activeAuth = false;
      this.authError = null;
      this.authSuccess = null;
    },
    setView(view) {
      this.authView = view;
      this.authError = null;
      this.authSuccess = null;
    },
    setError(error) {
      this.authError = error;
      this.authSuccess = null;
    },
    setSuccess(message) {
      this.authSuccess = message;
      this.authError = null;
    },
    setLoading(loading) {
      this.authLoading = loading;
    },
    clearMessages() {
      this.authError = null;
      this.authSuccess = null;
    },
  },
});
