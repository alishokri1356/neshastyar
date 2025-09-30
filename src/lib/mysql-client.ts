// MySQL client wrapper that mimics Supabase API
const SUPABASE_URL = "https://xfbxbbepvtwpuhuxtsyy.supabase.co";

class MySQLClient {
  private session: { token: string; expiresAt: string } | null = null;

  constructor() {
    // Load session from localStorage
    const stored = localStorage.getItem('mysql_session');
    if (stored) {
      this.session = JSON.parse(stored);
    }
  }

  private getAuthHeaders() {
    if (!this.session) {
      return {};
    }
    return {
      'authorization': `Bearer ${this.session.token}`,
    };
  }

  private saveSession(session: { token: string; expiresAt: string } | null) {
    this.session = session;
    if (session) {
      localStorage.setItem('mysql_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('mysql_session');
    }
  }

  // Auth methods
  auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { data: { user: null, session: null }, error: data };
      }

      this.saveSession(data.session);
      return { data: { user: data.user, session: data.session }, error: null };
    },

    signUp: async ({ email, password, options }: any) => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: options?.data?.name }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { data: { user: null, session: null }, error: data };
      }

      this.saveSession(data.session);
      return { data: { user: data.user, session: data.session }, error: null };
    },

    signOut: async () => {
      if (!this.session) {
        return { error: null };
      }

      await fetch(`${SUPABASE_URL}/functions/v1/auth-logout`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      this.saveSession(null);
      return { error: null };
    },

    getSession: async () => {
      if (!this.session) {
        return { data: { session: null }, error: null };
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-verify`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.saveSession(null);
        return { data: { session: null }, error: null };
      }

      const data = await response.json();
      return { data: { session: data.session }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Simple implementation - just check current session
      this.auth.getSession().then(({ data }) => {
        callback(data.session ? 'SIGNED_IN' : 'SIGNED_OUT', data.session);
      });

      return {
        data: { subscription: { unsubscribe: () => {} } },
      };
    },
  };

  // Database methods
  from(table: string) {
    return {
      select: async (columns = '*', options: any = {}) => {
        const endpoint = table === 'meetings' ? 'meetings-api' : 
                        table === 'tags' ? 'tags-api' : 
                        table === 'meeting_tags' ? 'meeting-tags-api' : null;

        if (!endpoint) {
          return { data: null, error: { message: 'Table not supported' } };
        }

        let url = `${SUPABASE_URL}/functions/v1/${endpoint}`;
        const params = new URLSearchParams();

        if (options.eq) {
          Object.entries(options.eq).forEach(([key, value]) => {
            params.append(key, String(value));
          });
        }

        if (table === 'tags' && options.withCount) {
          params.append('with_count', 'true');
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
          headers: this.getAuthHeaders(),
        });

        const data = await response.json();
        
        if (!response.ok) {
          return { data: null, error: data };
        }

        return { data, error: null };
      },

      insert: async (values: any) => {
        const endpoint = table === 'meetings' ? 'meetings-api' : 
                        table === 'tags' ? 'tags-api' : 
                        table === 'meeting_tags' ? 'meeting-tags-api' : null;

        if (!endpoint) {
          return { data: null, error: { message: 'Table not supported' } };
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
          method: 'POST',
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });

        const data = await response.json();
        
        if (!response.ok) {
          return { data: null, error: data };
        }

        return { data, error: null };
      },

      update: async (values: any) => {
        return {
          eq: async (column: string, value: any) => {
            const endpoint = table === 'meetings' ? 'meetings-api' : 
                            table === 'tags' ? 'tags-api' : null;

            if (!endpoint) {
              return { data: null, error: { message: 'Table not supported' } };
            }

            const response = await fetch(
              `${SUPABASE_URL}/functions/v1/${endpoint}?${column}=${value}`,
              {
                method: 'PUT',
                headers: {
                  ...this.getAuthHeaders(),
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
              }
            );

            const data = await response.json();
            
            if (!response.ok) {
              return { data: null, error: data };
            }

            return { data, error: null };
          },
        };
      },

      delete: async () => {
        return {
          eq: async (column: string, value: any) => {
            const endpoint = table === 'meetings' ? 'meetings-api' : 
                            table === 'tags' ? 'tags-api' : 
                            table === 'meeting_tags' ? 'meeting-tags-api' : null;

            if (!endpoint) {
              return { error: { message: 'Table not supported' } };
            }

            const response = await fetch(
              `${SUPABASE_URL}/functions/v1/${endpoint}?${column}=${value}`,
              {
                method: 'DELETE',
                headers: this.getAuthHeaders(),
              }
            );

            const data = await response.json();
            
            if (!response.ok) {
              return { error: data };
            }

            return { error: null };
          },
        };
      },
    };
  }
}

export const mysqlClient = new MySQLClient();
