/**
 * Direct localStorage-based auth helpers to bypass supabase-js client issues
 * with the new sb_publishable_* key format
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
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

    // An expired session isn't signed in. Keep it in storage while it still
    // has a refresh token, so ensureFreshSession() can renew it
    // (OPENBRAIN-77); without one it's useless and goes.
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      if (!session.refresh_token) localStorage.removeItem(storageKey);
      return null;
    }

    return session;
  } catch (err) {
    console.error("authHelpers: Error reading session:", err);
    return null;
  }
}

/** The stored session as-is, expired or not (null if none). */
export function getStoredSession() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Swap a refresh token for a new session (Supabase Auth over REST). Throws
 * with `status` set when Supabase refuses it.
 */
export async function refreshSessionREST(refreshToken) {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: { apikey: supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      data.error_description || data.msg || "Session refresh failed"
    );
    err.status = response.status;
    throw err;
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    expires_in: data.expires_in,
    token_type: data.token_type,
    user: data.user,
  };
}

/* Renew this long before expiry, so a request in flight never carries a
   token that expires on the way. */
export const REFRESH_MARGIN_MS = 90 * 1000;
let inflight = null;

/**
 * A session that's good for a while yet, renewing the stored one when it is
 * close to expiry or already expired (OPENBRAIN-77). Readers were signed out
 * silently after about an hour because nothing ever used the refresh token.
 * One refresh at a time: concurrent callers share it. Resolves to the
 * session, or null when there is none or Supabase refuses the refresh.
 */
export function ensureFreshSession({ force = false } = {}) {
  if (inflight) return inflight;
  const current = getStoredSession();
  if (!current?.access_token) return Promise.resolve(null);
  const expiresAt = (current.expires_at || 0) * 1000;
  const stillValid = expiresAt > Date.now();
  if (!force && expiresAt - Date.now() > REFRESH_MARGIN_MS)
    return Promise.resolve(current);
  if (!current.refresh_token) {
    if (!stillValid) clearSessionFromStorage();
    return Promise.resolve(stillValid ? current : null);
  }
  inflight = refreshSessionREST(current.refresh_token)
    .then((next) => {
      saveSessionToStorage(next);
      return next;
    })
    .catch((err) => {
      // Refused (revoked, reused, signed out elsewhere): the session is over.
      // A network failure keeps the current one while it's still valid.
      if (err.status && err.status < 500) {
        clearSessionFromStorage();
        return null;
      }
      return stillValid ? current : null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
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

  window.addEventListener("storage", handler);

  return () => window.removeEventListener("storage", handler);
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
      throw new Error(
        `Profile fetch failed: ${response.status} - ${errorText}`
      );
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
    const response = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message:
            data.error_description ||
            data.msg ||
            data.message ||
            data.error ||
            "Login failed",
        },
      };
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
      method: "POST",
      headers: {
        apikey: supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        data: metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message:
            data.error_description ||
            data.msg ||
            data.message ||
            data.error ||
            "Sign up failed",
        },
      };
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
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
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
      method: "POST",
      headers: {
        apikey: supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message:
            data.error_description ||
            data.msg ||
            data.message ||
            data.error ||
            "Password reset failed",
        },
      };
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
      return { data: null, error: { message: "No active session" } };
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: {
          message:
            data.error_description ||
            data.msg ||
            data.message ||
            data.error ||
            "Password update failed",
        },
      };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}
