import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@workspace/api-client-react';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react/custom-fetch';

interface AuthContextType {
  currentUser: UserProfile | null;
  token: string | null;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  activePartyId: number | null;
  setActivePartyId: (id: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePartyId, setActivePartyIdState] = useState<number | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('cyoa_token');
    const savedUser = localStorage.getItem('cyoa_user');
    const savedPartyId = localStorage.getItem('cyoa_party_id');

    // Configure api-client globally
    setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ''));
    setAuthTokenGetter(() => localStorage.getItem('cyoa_token'));

    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    }
    
    if (savedPartyId) {
      setActivePartyIdState(Number(savedPartyId));
    }

    setIsLoading(false);
  }, []);

  const login = (newToken: string, user: UserProfile) => {
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
    setToken(null);
    setCurrentUser(null);
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
        isLoading,
        isAuthenticated: !!token,
        activePartyId,
        setActivePartyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}