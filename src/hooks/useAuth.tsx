import { api, clearTokens, getAccessToken, setTokens } from "@/services/api";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@/types/api";
import type { ReactNode } from "react";
import {
    createContext,
    useCallback,
    useContext,
    useState,
} from "react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadInitialUser(): { user: User | null; loading: boolean } {
  const token = getAccessToken();
  return { user: null, loading: !!token };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = loadInitialUser();
  const [user, setUser] = useState<User | null>(initial.user);
  const [isLoading, setIsLoading] = useState(initial.loading);
  const [initialized, setInitialized] = useState(false);

  // Fetch user from server on first render if token exists
  if (!initialized) {
    setInitialized(true);
    if (getAccessToken()) {
      api
        .get<User>("/api/auth/me")
        .then((u) => {
          setUser(u);
          setIsLoading(false);
        })
        .catch(() => {
          clearTokens();
          setIsLoading(false);
        });
    }
  }

  const login = useCallback(async (data: LoginRequest) => {
    const res = await api.post<AuthResponse>("/api/auth/login", data);
    setTokens(res.tokens.access_token, res.tokens.refresh_token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await api.post<AuthResponse>("/api/auth/register", data);
    setTokens(res.tokens.access_token, res.tokens.refresh_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.get<User>("/api/auth/me");
      setUser(u);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
