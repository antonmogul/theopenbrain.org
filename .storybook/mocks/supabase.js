/*
 * Chainable, read-safe Supabase SDK double for Storybook.
 *
 * Stories provide table fixtures through `parameters.supabase`; for example:
 *   parameters: { supabase: { profiles: [{ id: "reader-1" }] } }
 *
 * Query modifiers are deliberately no-ops. They retain Supabase's thenable
 * shape without attempting to emulate PostgREST in the component catalog.
 */

let tables = {};

export function configureSupabaseMock(nextTables = {}) {
  tables = { ...nextTables };
}

function clone(value) {
  return structuredClone(value);
}

function queryFor(table) {
  const state = { single: false, writeValue: undefined };
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    neq: () => query,
    in: () => query,
    is: () => query,
    limit: () => query,
    range: () => query,
    match: () => query,
    filter: () => query,
    insert: (value) => {
      state.writeValue = value;
      return query;
    },
    upsert: (value) => {
      state.writeValue = value;
      return query;
    },
    update: (value) => {
      state.writeValue = value;
      return query;
    },
    delete: () => {
      state.writeValue = null;
      return query;
    },
    single: () => {
      state.single = true;
      return query;
    },
    maybeSingle: () => {
      state.single = true;
      return query;
    },
    then(resolve, reject) {
      const configured = tables[table];
      const rows = configured === undefined ? [] : clone(configured);
      const data =
        state.writeValue !== undefined
          ? clone(state.writeValue)
          : state.single
            ? Array.isArray(rows)
              ? (rows[0] ?? null)
              : rows
            : rows;
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    },
  };
  return query;
}

const authResult = async () => ({
  data: { user: null, session: null },
  error: null,
});

export const supabase = {
  from: (table) => queryFor(table),
  rpc: async () => ({ data: null, error: null }),
  auth: {
    getSession: authResult,
    getUser: authResult,
    signInWithPassword: authResult,
    signUp: authResult,
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe() {} } },
    }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      remove: async () => ({ data: [], error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "storybook://asset" } }),
    }),
  },
};
