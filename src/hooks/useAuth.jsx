import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { api, cancelAllRequests, setSessionToken } from '../services/api';

const TOKEN_KEY = 'habitTracker.accessToken';
const AuthContext = createContext(null);

function savedToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => ({
    user: null,
    status: savedToken() ? 'restoring' : 'anonymous',
    error: '',
  }));
  const generation = useRef(0);
  const tokenRef = useRef(null);
  const logout = useCallback(() => {
    generation.current += 1;
    tokenRef.current = null;
    setSessionToken(null);
    cancelAllRequests();
    let error = '';
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      error =
        'This browser could not remove the saved token. Clear site storage before using another account on this device.';
    }
    setSession({ user: null, status: 'anonymous', error });
  }, []);
  const expire = useCallback(() => {
    logout();
    setSession({
      user: null,
      status: 'anonymous',
      error: 'Your session has expired. Please sign in again.',
    });
  }, [logout]);

  useEffect(() => {
    const controller = new AbortController();
    const seq = ++generation.current;
    const token = savedToken();
    tokenRef.current = token;
    setSessionToken(token, expire);
    if (token) {
      api('/api/auth/me', { signal: controller.signal })
        .then((user) => {
          if (seq === generation.current)
            setSession({ user, status: 'authenticated', error: '' });
        })
        .catch((error) => {
          if (error.name !== 'AbortError' && seq === generation.current) {
            logout();
            setSession({
              user: null,
              status: 'anonymous',
              error:
                error.status === 401
                  ? 'Your session has expired. Please sign in again.'
                  : error.message,
            });
          }
        });
    }
    const storage = (event) => {
      if (event.key !== TOKEN_KEY || event.newValue === tokenRef.current)
        return;
      // Clear this tab immediately without deleting a newer tab's saved token.
      generation.current += 1;
      tokenRef.current = null;
      setSessionToken(null);
      cancelAllRequests();
      setSession({
        user: null,
        status: 'anonymous',
        error:
          'Your session changed in another tab. Sign in again or reload to restore the saved session.',
      });
    };
    window.addEventListener('storage', storage);
    return () => {
      controller.abort();
      window.removeEventListener('storage', storage);
      // StrictMode may immediately restore again. Old requests must stay cancelled.
      cancelAllRequests();
    };
  }, [logout, expire]);

  const authenticate = useCallback(
    async (route, values) => {
      const seq = ++generation.current;
      const response = await api(`/api/auth/${route}`, {
        method: 'POST',
        body: values,
        auth: false,
      });
      if (seq !== generation.current)
        throw new DOMException('Sign in cancelled', 'AbortError');
      let error = '';
      try {
        window.localStorage.setItem(TOKEN_KEY, response.access_token);
      } catch {
        error =
          'Signed in for this tab only: the browser could not save your session.';
      }
      tokenRef.current = response.access_token;
      setSessionToken(response.access_token, expire);
      setSession({ user: response.user, status: 'authenticated', error });
      return response.user;
    },
    [expire]
  );
  const login = useCallback(
    (values) => authenticate('login', values),
    [authenticate]
  );
  const register = useCallback(
    (values) => authenticate('register', values),
    [authenticate]
  );
  const updateUser = useCallback(async (changes) => {
    const seq = generation.current;
    const user = await api('/api/auth/me', { method: 'PATCH', body: changes });
    if (seq !== generation.current)
      throw new DOMException('Account changed', 'AbortError');
    setSession((current) => ({ ...current, user }));
    return user;
  }, []);
  return (
    <AuthContext.Provider
      value={{ ...session, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// This module deliberately exports the provider and its matching hook together.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
