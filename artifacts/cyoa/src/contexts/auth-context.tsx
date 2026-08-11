import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile } from '@workspace/api-client-react';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react/custom-fetch';

// Extend UserProfile with fields the server now returns
export type UserProfileExt = UserProfile & {
  hasCharacter?: boolean;
};

interface AuthContextType {
  currentUser: UserProfileExt | null;
  token: string | null;
  login: (token: string, user: UserProfileExt) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCharacter: boolean;
  activePartyId: number | null;
  setActivePartyId: (id: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getBaseUrl() {
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfileExt | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePartyId, setActivePartyIdState] = useState<number | null>(null);

  // Fetch /me and update user state
  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('cyoa_token');
    if (!savedToken) return;
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const user: UserProfileExt = await res.json();
        setCurrentUser(user);
        localStorage.setItem('cyoa_user', JSON.stringify(user));
        if (user.activePartyId) {
          setActivePartyIdState(user.activePartyId);
          localStorage.setItem('cyoa_party_id', String(user.activePartyId));
        }
      } else if (res.status === 401) {
        // Token invalid — clear session
        localStorage.removeItem('cyoa_token');
        localStorage.removeItem('cyoa_user');
        setToken(null);
        setCurrentUser(null);
      }
    } catch {
      // Network error — keep existing state
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('cyoa_token');
    const savedPartyId = localStorage.getItem('cyoa_party_id');

    setBaseUrl(getBaseUrl());
    setAuthTokenGetter(() => localStorage.getItem('cyoa_token'));

    if (savedPartyId) {
      setActivePartyIdState(Number(savedPartyId));
    }

    if (savedToken) {
      setToken(savedToken);
      // Always re-fetch /me on mount to get fresh hasCharacter + other server state
      fetch(`${getBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then(r => (r.ok ? r.json() : null))
        .then((user: UserProfileExt | null) => {
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('cyoa_user', JSON.stringify(user));
            if (user.activePartyId) {
              setActivePartyIdState(user.activePartyId);
              localStorage.setItem('cyoa_party_id', String(user.activePartyId));
            }
          } else {
            // Server rejected token
            localStorage.removeItem('cyoa_token');
            localStorage.removeItem('cyoa_user');
            setToken(null);
          }
        })
        .catch(() => {
          // Network down — load from localStorage as fallback
          const savedUser = localStorage.getItem('cyoa_user');
          if (savedUser) setCurrentUser(JSON.parse(savedUser));
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, user: UserProfileExt) => {
    localStorage.setItem('cyoa_token', newToken);
    localStorage.setItem('cyoa_user', JSON.stringify(user));
    if (user.activePartyId) {
      localStorage.setItem('cyoa_party_id', String(user.activePartyId));
      setActivePartyIdState(user.activePartyId);
    }
    setToken(newToken);
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem('cyoa_token');
    localStorage.removeItem('cyoa_user');
    localStorage.removeItem('cyoa_party_id');
    setToken(null);
    setCurrentUser(null);
    setActivePartyIdState(null);
  };

  const setActivePartyId = (id: number) => {
    localStorage.setItem('cyoa_party_id', String(id));
    setActivePartyIdState(id);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        login,
        logout,
        refreshUser,
        isLoading,
        isAuthenticated: !!token,
        hasCharacter: currentUser?.hasCharacter ?? false,
        activePartyId,
        setActivePartyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
