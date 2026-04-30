// Centralized API helper — attaches Bearer token to every request [DRY, REH]
const API_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('access_token');
}

let refreshPromise = null;

async function tryRefresh() {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Refresh failed');

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    return data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function request(method, path, body, retry = true) {
  const token = getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  const opts = {
    method,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (body) opts.body = JSON.stringify(body);

  let res, data;
  try {
    res = await fetch(`${API_URL}${path}`, opts);
    data = await res.json().catch(() => ({}));
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('La solicitud tardó demasiado. Verificá tu conexión.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  // Auto-refresh on 401 and retry once
  if (res.status === 401 && retry) {
    try {
      await tryRefresh();
      return request(method, path, body, false);
    } catch {
      // Refresh failed — force logout by clearing storage and reloading
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
