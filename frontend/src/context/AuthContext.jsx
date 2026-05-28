import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

// Simple in-memory cache for /api/settings to avoid repeated fetches
let _settingsCache = null;
let _settingsCacheTime = 0;
const SETTINGS_TTL = 5 * 60 * 1000; // 5 minutes

async function getSettings() {
  const now = Date.now();
  if (_settingsCache && now - _settingsCacheTime < SETTINGS_TTL) return _settingsCache;
  const data = await api.get('/api/settings').catch(() => null);
  if (data) { _settingsCache = data; _settingsCacheTime = now; }
  return data;
}

export { getSettings };

export function clearSettingsCache() {
  _settingsCache = null;
  _settingsCacheTime = 0;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodBalance, setPeriodBalance] = useState(null);

  function clearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('session_date');
    setUser(null);
  }

  async function loadPeriodBalance() {
    if (!localStorage.getItem('access_token')) return;
    try {
      const now = new Date();
      const settings = await getSettings();
      const period = settings?.commission_period ?? 'weekly';
      let from, to;
      if (period === 'daily') {
        from = new Date(now); from.setHours(0, 0, 0, 0);
        to   = new Date(now); to.setHours(23, 59, 59, 999);
      } else if (period === 'monthly') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to   = new Date(now.getFullYear(), now.getMonth() + 1, 0); to.setHours(23, 59, 59, 999);
      } else {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        from = new Date(now); from.setDate(now.getDate() + diff); from.setHours(0, 0, 0, 0);
        to   = new Date(from); to.setDate(from.getDate() + 6); to.setHours(23, 59, 59, 999);
      }
      const fmtISO = (d) => d.toISOString().split('T')[0];
      const history = await api.get(`/api/commissions/history?from=${fmtISO(from)}&to=${fmtISO(to)}`);
      const total = (history ?? []).reduce((s, sale) => s + (sale.commission_earned ?? 0), 0);
      setPeriodBalance(total);
    } catch { /* keep null */ }
  }

  async function refreshUser() {
    try {
      const fresh = await api.get('/api/auth/me');
      localStorage.setItem('user', JSON.stringify(fresh));
      setUser(fresh);
    } catch (err) {
      // Only clear session on HTTP auth/forbidden errors (401, 403).
      // Network errors (backend down, no connectivity) keep the session
      // so a brief outage doesn't kick out a valid user.
      if (err.status === 401 || err.status === 403) {
        clearSession();
      }
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      localStorage.removeItem('user');
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Client-side guard: if stored profile has no company_id, wipe immediately
      // without waiting for the backend (handles stale sessions from before the fix)
      if (!parsed.company_id) {
        clearSession();
        setLoading(false);
        return;
      }
      // Daily session: vendedor and cajero must log in again each new day
      const DAILY_SESSION_ROLES = ['vendedor', 'cajero'];
      if (DAILY_SESSION_ROLES.includes(parsed.role)) {
        const sessionDate = localStorage.getItem('session_date');
        const today = new Date().toISOString().split('T')[0];
        if (sessionDate !== today) {
          clearSession();
          setLoading(false);
          return;
        }
      }
      setUser(parsed);
    }
    // Keep loading=true until token is validated — prevents showing wrong state
    refreshUser().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load period balance when user role is known
  useEffect(() => {
    if (user?.id && user.role !== 'dueno') {
      loadPeriodBalance();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function login(email, password) {
    const data = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Record the login date for daily session enforcement
    localStorage.setItem('session_date', new Date().toISOString().split('T')[0]);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('session_date');
    setUser(null);
  }

  // Realtime: sync commission_balance when updated in DB (e.g. after a sale completes)
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`user_profile_${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'users',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new) {
          const updated = { ...user, ...payload.new };
          localStorage.setItem('user', JSON.stringify(updated));
          setUser(updated);
          // Refresh period balance whenever commission_balance updates
          if (updated.role !== 'dueno') loadPeriodBalance();
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const hasRole = (...roles) => roles.includes(user?.role);

  // Default views per role (when no custom config is set by the owner)
  const DEFAULT_VIEWS = {
    vendedor:  ['tables', 'stock', 'sales', 'commissions', 'prices'],
    cajero:    ['tables', 'cashier', 'cash', 'stock', 'sales', 'commissions', 'prices'],
    encargado: ['tables', 'cashier', 'cash', 'stock', 'sales', 'commissions', 'employees'],
  };

  // Returns true if the current user is allowed to access the given view key.
  // dueno always has full access. Other roles use custom permissions or the defaults.
  const canSeeView = (viewKey) => {
    if (!user) return false;
    if (user.role === 'dueno') return true;
    const views = user.allowed_views ?? DEFAULT_VIEWS[user.role] ?? [];
    return views.includes(viewKey);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, canSeeView, refreshUser, periodBalance, loadPeriodBalance }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
