/**
 * Direct localStorage-based auth helpers to bypass supabase-js client issues
 * with the new sb_publishable_* key format
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
                    import.meta.env.VITE_SUPABASE_ANON_KEY;

export function getStorageKey() {
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1];
  return `sb-${projectRef}-auth-token`;
}

export function getSessionFromStorage() {
  try {
    const storageKey = getStorageKey();
    const sessionData = localStorage.getItem(storageKey);

    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);

    // Check if session is expired
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      console.log("authHelpers: Session expired");
      localStorage.removeItem(storageKey);
      return null;
    }

    return session;
  } catch (err) {
    console.error("authHelpers: Error reading session:", err);
    return null;
  }
}

export function saveSessionToStorage(session) {
  try {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(session));
  } catch (err) {
    console.error("authHelpers: Error saving session:", err);
  }
}

export function clearSessionFromStorage() {
  try {
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.error("authHelpers: Error clearing session:", err);
  }
}

export function listenToStorageChanges(callback) {
  const storageKey = getStorageKey();

  const handler = (e) => {
    if (e.key === storageKey) {
      const newSession = e.newValue ? JSON.parse(e.newValue) : null;
      callback(newSession);
    }
  };

  window.addEventListener('storage', handler);

  return () => window.removeEventListener('storage', handler);
}

export async function fetchProfileREST(userId, accessToken) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Profile fetch failed: ${response.status} - ${errorText}`);
    }

    const profiles = await response.json();
    return profiles[0] || null;
  } catch (err) {
    console.error("authHelpers: Error fetching profile:", err);
    return null;
  }
}

// Auth API methods using direct REST calls

export async function signInREST(email, password) {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data };
    }

    // The response contains access_token, refresh_token, user, etc.
    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      expires_in: data.expires_in,
      token_type: data.token_type,
      user: data.user,
    };

    saveSessionToStorage(session);

    return { data: { session, user: data.user }, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

export async function signUpREST(email, password, metadata = {}) {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        data: metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data };
    }

    // If email confirmation is disabled, session will be returned
    if (data.access_token) {
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        expires_in: data.expires_in,
        token_type: data.token_type,
        user: data.user,
      };
      saveSessionToStorage(session);
      return { data: { session, user: data.user }, error: null };
    }

    // Email confirmation required - just return user data
    return { data: { user: data.user || data, session: null }, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

export async function signOutREST() {
  try {
    const session = getSessionFromStorage();

    if (session?.access_token) {
      await fetch(`${supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
    }

    clearSessionFromStorage();

    return { error: null };
  } catch (err) {
    // Still clear local storage even if API call fails
    clearSessionFromStorage();
    return { error: { message: err.message } };
  }
}

export async function resetPasswordREST(email) {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}

export async function updatePasswordREST(newPassword) {
  try {
    const session = getSessionFromStorage();

    if (!session?.access_token) {
      return { data: null, error: { message: 'No active session' } };
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}
