import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ProdiDriveLink, SipItem, Purchase, Departemen, RenstraProgress } from '../types';

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
  searchQuery: string;
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
  setSearchQuery: (query: string) => void;
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
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
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCollapse = useCallback((id: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('sipp_sidebar_collapsed', String(next));
        return next;
      });
    }
  }, [isMobile]);

  // Clear search query on tab change
  useEffect(() => {
    setSearchQuery('');
  }, [tab]);

  return (
    <AppContext.Provider value={{
      tab, setTab, items, setItems, prodiLinks, setProdiLinks,
      purchases, setPurchases, departemen, setDepartemen,
      renstraProgress, setRenstraProgress, collapsed, toggleCollapse,
      sidebarCollapsed, toggleSidebar,
      filterYear, setFilterYear, filterTriwulan, setFilterTriwulan,
      filterProdi, setFilterProdi,
      searchQuery, setSearchQuery,
      isMobile, sidebarOpen, setSidebarOpen
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
