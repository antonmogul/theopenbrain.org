import { ref, computed } from "vue";
import { supabase } from "@/lib/supabase";

const user = ref(null);
const session = ref(null);
const profile = ref(null);
const loading = ref(true);
const profileLoading = ref(false);

// Fetch user profile from profiles table
const fetchUserProfile = async (userId) => {
  if (!userId) {
    profile.value = null;
    return;
  }

  profileLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      profile.value = null;
    } else {
      profile.value = data;
    }
  } catch (err) {
    console.error("Profile fetch error:", err);
    profile.value = null;
  } finally {
    profileLoading.value = false;
  }
};

// Initialize auth state
supabase.auth.getSession().then(async ({ data }) => {
  session.value = data.session;
  user.value = data.session?.user ?? null;
  if (data.session?.user) {
    await fetchUserProfile(data.session.user.id);
  }
  loading.value = false;
});

// Listen for auth changes
supabase.auth.onAuthStateChange(async (_event, newSession) => {
  session.value = newSession;
  user.value = newSession?.user ?? null;

  if (newSession?.user) {
    await fetchUserProfile(newSession.user.id);
  } else {
    profile.value = null;
  }
  loading.value = false;
});

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);

  const userRole = computed(() => {
    // Primary source: profiles table (fetched automatically)
    // Fallback: user_metadata (set during signup)
    return profile.value?.role ?? user.value?.user_metadata?.role ?? null;
  });

  const isCreator = computed(() => userRole.value === "creator");
  const isProfessor = computed(() => userRole.value === "professor");
  const isStudent = computed(() => userRole.value === "student");

  // Refresh the user's profile (useful after profile updates)
  const refreshProfile = async () => {
    if (user.value?.id) {
      await fetchUserProfile(user.value.id);
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // Additional user metadata
      },
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
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
  };
}
