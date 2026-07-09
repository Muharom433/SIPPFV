import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, ProdiDriveLink, SipItem, Purchase, Departemen, RenstraProgress } from '../types';
import { loginUser } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem('sipp_session');
    if (cached) {
      try {
        const session = JSON.parse(cached);
        if (session && session.user) {
          setUser(session.user);
        }
      } catch {
        localStorage.removeItem('sipp_session');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginUser(username, password);
    setUser(result.user);
    localStorage.setItem('sipp_session', JSON.stringify(result));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sipp_session');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

/* ─── APP STATE CONTEXT ─────────────────────────────────────────── */
interface AppState {
  tab: string;
  items: SipItem[];
  prodiLinks: ProdiDriveLink[];
  purchases: Purchase[];
  departemen: Departemen[];
  renstraProgress: RenstraProgress[];
  collapsed: Set<number>;
  sidebarCollapsed: boolean;
  filterYear: number;
  filterTriwulan: string;
  filterProdi: string;
}

interface AppContextType extends AppState {
  setTab: (tab: string) => void;
  setItems: (items: SipItem[]) => void;
  setProdiLinks: (links: ProdiDriveLink[]) => void;
  setPurchases: (purchases: Purchase[]) => void;
  setDepartemen: (depts: Departemen[]) => void;
  setRenstraProgress: (progress: RenstraProgress[]) => void;
  toggleCollapse: (id: number) => void;
  toggleSidebar: () => void;
  setFilterYear: (year: number) => void;
  setFilterTriwulan: (tw: string) => void;
  setFilterProdi: (prodi: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState('dashboard');
  const [items, setItems] = useState<SipItem[]>([]);
  const [prodiLinks, setProdiLinks] = useState<ProdiDriveLink[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [departemen, setDepartemen] = useState<Departemen[]>([]);
  const [renstraProgress, setRenstraProgress] = useState<RenstraProgress[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem('sipp_sidebar_collapsed') === 'true'
  );
  const [filterYear, setFilterYear] = useState(2026);
  const [filterTriwulan, setFilterTriwulan] = useState('Triwulan 1');
  const [filterProdi, setFilterProdi] = useState('');

  const toggleCollapse = useCallback((id: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sipp_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      tab, setTab, items, setItems, prodiLinks, setProdiLinks,
      purchases, setPurchases, departemen, setDepartemen,
      renstraProgress, setRenstraProgress, collapsed, toggleCollapse,
      sidebarCollapsed, toggleSidebar,
      filterYear, setFilterYear, filterTriwulan, setFilterTriwulan,
      filterProdi, setFilterProdi
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
