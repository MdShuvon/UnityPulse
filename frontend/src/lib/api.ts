// src/lib/api.ts
// Update to match your backend session-based auth

const BASE_URL = 'http://localhost:3001'; // Development

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function api(endpoint: string, options: FetchOptions = {}) {
  const { skipAuth, ...fetchOptions } = options;
  
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Don't set Content-Type for FormData (multipart)
  if (fetchOptions.body instanceof FormData) {
    delete (defaultHeaders as any)['Content-Type'];
  }
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...fetchOptions.headers,
    },
    credentials: 'include', // Send cookies automatically
  });
  
  // Handle 401 Unauthorized
  if (response.status === 401 && !skipAuth) {
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }
  
  // Handle rate limiting
  if (response.status === 429) {
    throw new Error('অনেক বেশি request - একটু অপেক্ষা করো');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }
  
  return data;
}

// Convenience methods
export const get = (endpoint: string) => api(endpoint);
export const post = (endpoint: string, body: any) => 
  api(endpoint, { method: 'POST', body: JSON.stringify(body) });
export const patch = (endpoint: string, body: any) => 
  api(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (endpoint: string) => 
  api(endpoint, { method: 'DELETE' });

// Auth specific API calls
export const authApi = {
  login: (email: string, password: string) => 
    post('/api/auth/login', { email, password }),
  register: (userData: any) => 
    post('/api/auth/register', userData),
  logout: () => 
    post('/api/auth/logout', {}),
  getCurrentUser: () => 
    get('/api/auth/me'),
};

// Notification specific API calls
export const notifApi = {
  getNotifications: () => 
    get('/api/notifications'),
  markAsRead: (id: string) => 
    patch(`/api/notifications/${id}/read`, {}),
  markAllAsRead: () => 
    patch('/api/notifications/read-all', {}),
  deleteNotification: (id: string) => 
    del(`/api/notifications/${id}`),
};