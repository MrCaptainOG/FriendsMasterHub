import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AuthUser {
  usertag: string;
  token: string;
  credits: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (usertag: string, token: string, credits: number) => void;
  logout: () => void;
  updateCredits: (credits: number) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  updateCredits: () => {},
});

const STORAGE_KEY = "fmh_auth";

function loadStored(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStored);

  const login = useCallback((usertag: string, token: string, credits: number) => {
    const u = { usertag, token, credits };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateCredits = useCallback((credits: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      const u = { ...prev, credits };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      return u;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
