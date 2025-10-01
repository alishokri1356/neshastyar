// MySQL client wrapper that provides a database API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Debug: Log the API URL being used
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('🔧 VITE_API_URL env var:', import.meta.env.VITE_API_URL);

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
      'Authorization': `Bearer ${this.session.access_token || this.session.token}`,
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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { data: { user: null, session: null }, error: data };
      }

      this.saveSession(data.data.session);
      return { data: { user: data.data.user, session: data.data.session }, error: null };
    },

    signUp: async ({ email, password, options }: any) => {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: options?.data?.name }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { data: { user: null, session: null }, error: data };
      }

      this.saveSession(data.data.session);
      return { data: { user: data.data.user, session: data.data.session }, error: null };
    },

    signOut: async () => {
      if (!this.session) {
        return { error: null };
      }

      await fetch(`${API_BASE_URL}/auth/logout`, {
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

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
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
      return { data: { session: data.data.session }, error: null };
    },

    getUser: async () => {
      if (!this.session) {
        return { data: { user: null }, error: null };
      }

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.saveSession(null);
        return { data: { user: null }, error: null };
      }

      const data = await response.json();
      return { data: { user: data.data.session?.user }, error: null };
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
    const baseQuery = {
      select: async (columns = '*', options: any = {}) => {
        let url = '';
        
        if (table === 'meetings') {
          url = `${API_BASE_URL}/meetings`;
        } else if (table === 'tags') {
          url = `${API_BASE_URL}/tags`;
        } else if (table === 'meeting_tags') {
          url = `${API_BASE_URL}/meeting-tags`;
        } else {
          return { data: null, error: { message: 'Table not supported' } };
        }

        const params = new URLSearchParams();

        if (options.eq) {
          Object.entries(options.eq).forEach(([key, value]) => {
            params.append(key, String(value));
          });
        }

        if (table === 'tags' && options.withCount) {
          params.append('withCount', 'true');
        }

        if (options.orderBy) {
          params.append('orderBy', options.orderBy);
          if (options.orderDirection) {
            params.append('orderDirection', options.orderDirection);
          }
        }

        if (options.limit) {
          params.append('limit', String(options.limit));
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

      // Add support for .single() method
      single: async () => {
        const result = await baseQuery.select('*', {});
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          return { data: result.data[0], error: null };
        } else {
          return { data: null, error: { message: 'No data found' } };
        }
      },

      // Add support for .order() method
      order: (column: string, options: { ascending?: boolean } = {}) => {
        return {
          ...baseQuery,
          select: async (columns = '*', selectOptions: any = {}) => {
            const orderOptions = {
              ...selectOptions,
              orderBy: column,
              orderDirection: options.ascending ? 'ASC' : 'DESC'
            };
            return baseQuery.select(columns, orderOptions);
          }
        };
      },

      // Add support for .limit() method
      limit: (count: number) => {
        return {
          ...baseQuery,
          select: async (columns = '*', selectOptions: any = {}) => {
            const limitOptions = {
              ...selectOptions,
              limit: count
            };
            return baseQuery.select(columns, limitOptions);
          }
        };
      },

      // Add support for .eq() method
      eq: (column: string, value: any) => {
        return {
          ...baseQuery,
          select: async (columns = '*', selectOptions: any = {}) => {
            const eqOptions = {
              ...selectOptions,
              eq: {
                ...selectOptions.eq,
                [column]: value
              }
            };
            return baseQuery.select(columns, eqOptions);
          }
        };
      },

      insert: async (values: any) => {
        let url = '';
        
        if (table === 'meetings') {
          url = `${API_BASE_URL}/meetings`;
        } else if (table === 'tags') {
          url = `${API_BASE_URL}/tags`;
        } else if (table === 'meeting_tags') {
          url = `${API_BASE_URL}/meeting-tags`;
        } else {
          return { data: null, error: { message: 'Table not supported' } };
        }

        const response = await fetch(url, {
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
            let url = '';
            
            if (table === 'meetings') {
              url = `${API_BASE_URL}/meetings/${value}`;
            } else if (table === 'tags') {
              url = `${API_BASE_URL}/tags/${value}`;
            } else {
              return { data: null, error: { message: 'Table not supported' } };
            }

            const response = await fetch(url, {
              method: 'PUT',
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
        };
      },

      delete: async () => {
        return {
          eq: async (column: string, value: any) => {
            let url = '';
            
            if (table === 'meetings') {
              url = `${API_BASE_URL}/meetings/${value}`;
            } else if (table === 'tags') {
              url = `${API_BASE_URL}/tags/${value}`;
            } else if (table === 'meeting_tags') {
              url = `${API_BASE_URL}/meeting-tags`;
            } else {
              return { error: { message: 'Table not supported' } };
            }

            const response = await fetch(url, {
              method: 'DELETE',
              headers: this.getAuthHeaders(),
            });

            const data = await response.json();
            
            if (!response.ok) {
              return { error: data };
            }

            return { error: null };
          },
        };
      },
    };

    return baseQuery;
  }
}

export const mysqlClient = new MySQLClient();