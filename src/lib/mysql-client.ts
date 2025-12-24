// MySQL client wrapper that provides a database API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

class MySQLClient {
  private session: { token: string; expiresAt: string } | null = null;

  constructor() {
    // Load session from localStorage
    const stored = localStorage.getItem('mysql_session');
    console.log('🔍 Loading session from localStorage:', stored);
    if (stored) {
      this.session = JSON.parse(stored);
      console.log('🔍 Session loaded:', this.session);
    } else {
      console.log('🔍 No session found in localStorage');
    }
  }

  public getAuthHeaders() {
    if (!this.session) {
      return {};
    }
    const token = (this.session as any).access_token || this.session.token;
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  private saveSession(session: { token: string; expiresAt: string } | null) {
    console.log('🔍 Saving session:', session);
    this.session = session;
    if (session) {
      localStorage.setItem('mysql_session', JSON.stringify(session));
      console.log('🔍 Session saved to localStorage');
    } else {
      localStorage.removeItem('mysql_session');
      console.log('🔍 Session removed from localStorage');
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
      console.log('🔍 getSession called, current session:', this.session);
      if (!this.session) {
        console.log('🔍 No session in memory');
        return { data: { session: null }, error: null };
      }

      console.log('🔍 Verifying session with backend...');
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      console.log('🔍 Verify response status:', response.status);
      if (!response.ok) {
        // Don't clear session on rate limit errors (429)
        if (response.status === 429) {
          console.log('🔍 Rate limit hit, keeping session');
          return { data: { session: this.session }, error: null };
        }
        console.log('🔍 Session verification failed');
        this.saveSession(null);
        return { data: { session: null }, error: null };
      }

      const data = await response.json();
      console.log('🔍 Verify response data:', data);
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
          // Don't clear session on rate limit errors (429)
          if (response.status === 429) {
            console.log('🔍 Rate limit hit in getUser, keeping session');
            return { data: { user: this.session?.user || null }, error: null };
          }
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

      getProfile: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'GET',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data: data.data.user, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },

      updateProfile: async (updates: { name?: string; baleID?: string }) => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data: data.data.user, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
    };

    tags = {
      management: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/tags/management`, {
            method: 'GET',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      rename: async ({ id, newName }: { id: string; newName: string }) => {
        try {
          const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
            method: 'PUT',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newName }),
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      update: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
        try {
          const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
            method: 'PUT',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      remove: async (id: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
            method: 'DELETE',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      merge: async ({ sourceTagNames, targetTagName }: { sourceTagNames: string[]; targetTagName: string }) => {
        try {
          const response = await fetch(`${API_BASE_URL}/tags/merge`, {
            method: 'POST',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sourceTagNames, targetTagName }),
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
        },
      };

    participants = {
      list: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/participants`, {
            method: 'GET',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      merge: async ({ sourceNames, targetName }: { sourceNames: string[]; targetName: string }) => {
        try {
          const response = await fetch(`${API_BASE_URL}/participants/merge`, {
            method: 'POST',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sourceNames, targetName }),
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      rename: async ({ oldName, newName }: { oldName: string; newName: string }) => {
        try {
          const response = await fetch(`${API_BASE_URL}/participants/rename`, {
            method: 'PUT',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ oldName, newName }),
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      remove: async (name: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/participants/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            headers: {
              ...this.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();

          if (!response.ok) {
            return { data: null, error: data };
          }

          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
    };

  // Database methods
  from(table: string) {
    let queryOptions: any = {};

    const executeQuery = async () => {
      try {
        let url = '';
        
        if (table === 'meetings') {
          // Check if we're querying by ID (single meeting)
          if (queryOptions.eq?.id) {
            url = `${API_BASE_URL}/meetings/${queryOptions.eq.id}`;
            console.log('🔍 Using ID route:', url);
            // Clear query options since we're using the ID in the URL
            queryOptions = {};
          } else {
            url = `${API_BASE_URL}/meetings`;
            console.log('🔍 Using general route:', url);
          }
        } else if (table === 'tags') {
          url = `${API_BASE_URL}/tags`;
        } else if (table === 'meeting_tags') {
          url = `${API_BASE_URL}/meeting-tags`;
        } else {
          return { data: null, error: { message: 'Table not supported' } };
        }

        const params = new URLSearchParams();

        if (queryOptions.eq) {
          Object.entries(queryOptions.eq).forEach(([key, value]) => {
            params.append(key, String(value));
          });
        }

        if (table === 'tags' && queryOptions.withCount) {
          params.append('withCount', 'true');
        }

        if (queryOptions.orderBy) {
          params.append('orderBy', queryOptions.orderBy);
          if (queryOptions.orderDirection) {
            params.append('orderDirection', queryOptions.orderDirection);
          }
        }

        if (queryOptions.limit) {
          params.append('limit', String(queryOptions.limit));
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

               const authHeaders = this.getAuthHeaders();
               console.log('🔍 Making request to:', url, 'with headers:', authHeaders);
               const response = await fetch(url, {
                 headers: authHeaders,
               });

               console.log('🔍 Response status:', response.status);
               const data = await response.json();
               console.log('🔍 Response data:', data);
        
               if (!response.ok) {
                 return { data: null, error: data };
               }

        // Backend returns array directly, not wrapped in { data: array }
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    };

    const baseQuery = {
      select: (columns = '*') => {
        const queryBuilder = {
          eq: (column: string, value: any) => {
            queryOptions.eq = { ...queryOptions.eq, [column]: value };
            return queryBuilder;
          },
          order: (column: string, options: { ascending?: boolean } = {}) => {
            queryOptions.orderBy = column;
            queryOptions.orderDirection = options.ascending ? 'asc' : 'desc';
            return queryBuilder;
          },
          limit: (count: number) => {
            queryOptions.limit = count;
            return queryBuilder;
          },
          single: async () => {
            const result = await executeQuery();
            // Handle both array and object responses
            if (Array.isArray(result.data)) {
              return { data: result.data[0] || null, error: result.error };
            } else {
              return { data: result.data || null, error: result.error };
            }
          },
          then: (resolve: any, reject: any) => {
            executeQuery().then(resolve, reject);
          }
        };
        return queryBuilder;
      },

      insert: (values: any) => {
        let url = '';
        
        if (table === 'meetings') {
          url = `${API_BASE_URL}/meetings`;
        } else if (table === 'tags') {
          url = `${API_BASE_URL}/tags`;
        } else if (table === 'meeting_tags') {
          url = `${API_BASE_URL}/meeting-tags`;
        } else if (table === 'audio_files') {
          url = `${API_BASE_URL}/audio-files`;
        } else {
          return { data: null, error: { message: 'Table not supported' } };
        }

        const executeInsert = async () => {
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
        };

        // Return chainable object
        return {
          select: () => {
            return {
              single: async () => {
                const result = await executeInsert();
                return result;
              },
              then: (resolve: any, reject: any) => {
                executeInsert().then(resolve, reject);
              }
            };
          },
          then: (resolve: any, reject: any) => {
            executeInsert().then(resolve, reject);
          }
        };
      },

      update: (values: any) => {
        const queryBuilder = {
          eq: (column: string, value: any) => {
            const executeUpdate = async () => {
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
            };

            return {
              then: (resolve: any, reject: any) => {
                executeUpdate().then(resolve, reject);
              }
            };
          },
        };

        return queryBuilder;
      },

      delete: () => {
        const queryBuilder = {
          eq: (column: string, value: any) => {
            const executeDelete = async () => {
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
            };

            return {
              then: (resolve: any, reject: any) => {
                executeDelete().then(resolve, reject);
              }
            };
          },
        };

        return queryBuilder;
      },
    };

    return baseQuery;
  }
}

export const mysqlClient = new MySQLClient();