import api from '../lib/api';

export interface AuthResponse {
  accessToken: string;
  user: { id: string; name: string; email: string };
}

export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', data).then((r) => r.data),

  refresh: () =>
    api.post<{ accessToken: string }>('/api/auth/refresh').then((r) => r.data),

  logout: () => api.post('/api/auth/logout'),
};
