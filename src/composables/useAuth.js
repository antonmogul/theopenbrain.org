import { ref, computed } from "vue";
import {
  getSessionFromStorage,
  fetchProfileREST,
  signInREST,
  signUpREST,
  signOutREST,
  resetPasswordREST,
  updatePasswordREST,
  listenToStorageChanges,
  saveSessionToStorage,
  clearSessionFromStorage,
} from "@/utils/authHelpers";

const user = ref(null);
const session = ref(null);
const profile = ref(null);
const loading = ref(true);
const profileLoading = ref(false);

// Dev-only role override
const devRoleOverride = ref(null);

// Fetch user profile using REST API
const fetchUserProfile = async (userId, accessToken) => {
  if (!userId || !accessToken) {
    profile.value = null;
    return;
  }

  profileLoading.value = true;
  try {
    const profileData = await fetchProfileREST(userId, accessToken);
    profile.value = profileData;
  } catch (err) {
    console.error("useAuth: Profile fetch error:", err);
    profile.value = null;
  } finally {
    profileLoading.value = false;
  }
};

// Initialize auth state from localStorage
function initializeAuth() {
  console.log("useAuth: Initializing auth state...");

  const storedSession = getSessionFromStorage();

  if (storedSession) {
    console.log("useAuth: Found session for:", storedSession.user?.email);
    session.value = storedSession;
    user.value = storedSession.user ?? null;

    if (storedSession.user?.id && storedSession.access_token) {
      fetchUserProfile(storedSession.user.id, storedSession.access_token);
    }
  } else {
    console.log("useAuth: No session found");
  }

  loading.value = false;

  // Listen for storage changes (sign in/out in other tabs)
  listenToStorageChanges((newSession) => {
    console.log(
      "useAuth: Storage changed, new session:",
      newSession?.user?.email || "none",
    );
    session.value = newSession;
    user.value = newSession?.user ?? null;

    if (newSession?.user) {
      fetchUserProfile(newSession.user.id, newSession.access_token);
    } else {
      profile.value = null;
    }
  });
}

// Initialize on module load
initializeAuth();

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);

  const userRole = computed(() => {
    // Dev override takes precedence
    if (import.meta.env.DEV && devRoleOverride.value) {
      return devRoleOverride.value;
    }
    // Primary source: profiles table (fetched automatically)
    // Fallback: user_metadata (set during signup)
    return profile.value?.role ?? user.value?.user_metadata?.role ?? null;
  });

  const isCreator = computed(() => userRole.value === "creator");
  const isProfessor = computed(() => userRole.value === "professor");
  const isStudent = computed(() => userRole.value === "student");

  // Refresh the user's profile (useful after profile updates)
  const refreshProfile = async () => {
    if (user.value?.id && session.value?.access_token) {
      await fetchUserProfile(user.value.id, session.value.access_token);
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    const result = await signUpREST(email, password, metadata);

    if (result.data?.session) {
      session.value = result.data.session;
      user.value = result.data.user;

      if (result.data.user?.id && result.data.session?.access_token) {
        await fetchUserProfile(
          result.data.user.id,
          result.data.session.access_token,
        );
      }
    }

    return result;
  };

  const signIn = async (email, password) => {
    const result = await signInREST(email, password);

    if (result.data?.session) {
      session.value = result.data.session;
      user.value = result.data.user;

      if (result.data.user?.id && result.data.session?.access_token) {
        await fetchUserProfile(
          result.data.user.id,
          result.data.session.access_token,
        );
      }
    }

    return result;
  };

  const signOut = async () => {
    const result = await signOutREST();

    // Clear local state
    session.value = null;
    user.value = null;
    profile.value = null;

    return result;
  };

  const resetPassword = async (email) => {
    return await resetPasswordREST(email);
  };

  const updatePassword = async (newPassword) => {
    return await updatePasswordREST(newPassword);
  };

  return {
    user,
    session,
    profile,
    loading,
    profileLoading,
    isAuthenticated,
    userRole,
    isCreator,
    isProfessor,
    isStudent,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
    devRoleOverride,
  };
}
