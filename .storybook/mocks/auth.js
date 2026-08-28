import { computed, ref } from "vue";

const user = ref(null);
const session = ref(null);
const profile = ref(null);
const loading = ref(false);
const profileLoading = ref(false);
const devRoleOverride = ref(null);

export function configureAuthMock(next = {}) {
  const authenticated = next.authenticated === true;
  const role = next.role || "student";
  user.value = authenticated
    ? {
        id: next.userId || "storybook-student",
        email: next.email || "reader@openbrain.test",
        user_metadata: { role, full_name: next.name || "Maya Chen" },
      }
    : null;
  session.value = authenticated
    ? { access_token: "storybook-token", user: user.value }
    : null;
  profile.value = authenticated
    ? { id: user.value.id, role, full_name: next.name || "Maya Chen" }
    : null;
  devRoleOverride.value = null;
}

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(user.value));
  const userRole = computed(
    () => devRoleOverride.value || profile.value?.role || null
  );
  const signOut = async () => {
    configureAuthMock();
    return { error: null };
  };
  return {
    user,
    session,
    profile,
    loading,
    profileLoading,
    devRoleOverride,
    isAuthenticated,
    userRole,
    isCreator: computed(() => userRole.value === "creator"),
    isProfessor: computed(() => userRole.value === "professor"),
    isStudent: computed(() => userRole.value === "student"),
    signIn: async () => ({
      data: { session: session.value, user: user.value },
    }),
    signUp: async () => ({
      data: { session: session.value, user: user.value },
    }),
    signOut,
    resetPassword: async () => ({ data: {} }),
    updatePassword: async () => ({ data: {} }),
    refreshProfile: async () => profile.value,
  };
}

configureAuthMock();
