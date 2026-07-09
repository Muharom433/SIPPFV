import { useApp } from '../contexts/AuthContext';
import { rupiah, fmtNum, buildTree } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getItems } from '../services/items.service';

export function Sidebar() {
  const { user } = useAuth();
  const { 
    tab, 
    setTab, 
    sidebarCollapsed, 
    toggleSidebar,
    items, 
    setItems 
  } = useApp();

  const isAdmin = user?.role === 'admin';

  // Submenu toggle state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    rka: ['rka-data', 'rka-rpd'].includes(tab),
    renstra: ['renstra-tanggung', 'renstra-capaian'].includes(tab),
    transaksi: ['pembelian'].includes(tab),
    manajemen: ['manajemen-prodi', 'manajemen-departemen'].includes(tab)
  });

  // Sync open groups with active tab changes
  useEffect(() => {
    setOpenGroups(prev => ({
      ...prev,
      rka: prev.rka || ['rka-data', 'rka-rpd'].includes(tab),
      renstra: prev.renstra || ['renstra-tanggung', 'renstra-capaian'].includes(tab),
      transaksi: prev.transaksi || ['pembelian'].includes(tab),
      manajemen: prev.manajemen || ['manajemen-prodi', 'manajemen-departemen'].includes(tab)
    }));
  }, [tab]);

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Load RKA items for the sidebar budget card
  useEffect(() => {
    async function loadBudget() {
      try {
        const data = await getItems('keuangan_rka');
        setItems(data);
      } catch (err) {
        console.error('Sidebar budget error:', err);
      }
    }
    loadBudget();
  }, [setItems]);

  // Aggregate budget calculations
  const { roots } = buildTree(items);
  let alokasi = 0;
  roots.forEach(r => { alokasi += (r.amount || 0); });

  const bySource: Record<string, number> = {};
  let totalRka = 0;
  items.forEach(item => {
    if (item.source_of_fund && item.amount) {
      const src = item.source_of_fund;
      if (!bySource[src]) bySource[src] = 0;
      bySource[src] += item.amount;
      totalRka += item.amount;
    }
  });
  const selisih = alokasi - totalRka;

  const handleTabClick = (newTab: string) => {
    setTab(newTab);
  };

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} id="sidebar">
      <div className="sidebar-logo">
        <span className="logo-sip">SIPP</span>
        <button id="btn-sidebar-close" className="sidebar-close-btn" aria-label="Tutup Menu" onClick={toggleSidebar}>
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      <nav className="sidenav">
        <ul>
          <li className={`nav-item ${tab === 'dashboard' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); handleTabClick('dashboard'); }}>
              <i className="fa-solid fa-gauge-high"></i>
              <span>Dashboard</span>
            </a>
          </li>

          <li className={`nav-group ${openGroups.rka ? 'open' : ''}`}>
            <div className="nav-group-header" onClick={() => toggleGroup('rka')}>
              <i className="fa-solid fa-wallet"></i>
              <span>RKA</span>
              <i className="fa-solid fa-chevron-down caret"></i>
            </div>
            <ul className="nav-sub">
              <li className={tab === 'rka-data' ? 'active' : ''} onClick={() => handleTabClick('rka-data')}>
                <a href="#" onClick={(e) => e.preventDefault()}>Data</a>
              </li>
              <li className={tab === 'rka-rpd' ? 'active' : ''} onClick={() => handleTabClick('rka-rpd')}>
                <a href="#" onClick={(e) => e.preventDefault()}>RPD</a>
              </li>
            </ul>
          </li>

          <li className={`nav-group ${openGroups.renstra ? 'open' : ''}`}>
            <div className="nav-group-header" onClick={() => toggleGroup('renstra')}>
              <i className="fa-solid fa-bullseye"></i>
              <span>Renstra</span>
              <i className="fa-solid fa-chevron-down caret"></i>
            </div>
            <ul className="nav-sub">
              <li className={tab === 'renstra-tanggung' ? 'active' : ''} onClick={() => handleTabClick('renstra-tanggung')}>
                <a href="#" onClick={(e) => e.preventDefault()}>Tanggung Jawab</a>
              </li>
              <li className={tab === 'renstra-capaian' ? 'active' : ''} onClick={() => handleTabClick('renstra-capaian')}>
                <a href="#" onClick={(e) => e.preventDefault()}>Capaian</a>
              </li>
            </ul>
          </li>

          <li className={`nav-item ${tab === 'pembelajaran' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); handleTabClick('pembelajaran'); }}>
              <i className="fa-solid fa-graduation-cap"></i>
              <span>Pembelajaran</span>
            </a>
          </li>

          <li className={`nav-group ${openGroups.transaksi ? 'open' : ''}`}>
            <div className="nav-group-header" onClick={() => toggleGroup('transaksi')}>
              <i className="fa-solid fa-receipt"></i>
              <span>Transaksi</span>
              <i className="fa-solid fa-chevron-down caret"></i>
            </div>
            <ul className="nav-sub">
              <li className={tab === 'pembelian' ? 'active' : ''} onClick={() => handleTabClick('pembelian')}>
                <a href="#" onClick={(e) => e.preventDefault()}>Data Pembelian</a>
              </li>
            </ul>
          </li>

          {isAdmin && (
            <li className={`nav-group admin-only ${openGroups.manajemen ? 'open' : ''}`}>
              <div className="nav-group-header" onClick={() => toggleGroup('manajemen')}>
                <i className="fa-solid fa-building-columns"></i>
                <span>Manajemen Prodi & Dept</span>
                <i className="fa-solid fa-chevron-down caret"></i>
              </div>
              <ul className="nav-sub">
                <li className={tab === 'manajemen-prodi' ? 'active' : ''} onClick={() => handleTabClick('manajemen-prodi')}>
                  <a href="#" onClick={(e) => e.preventDefault()}>Manajemen Prodi</a>
                </li>
                <li className={tab === 'manajemen-departemen' ? 'active' : ''} onClick={() => handleTabClick('manajemen-departemen')}>
                  <a href="#" onClick={(e) => e.preventDefault()}>Manajemen Departemen</a>
                </li>
              </ul>
            </li>
          )}

          <li className={`nav-item ${tab === 'laporan' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); handleTabClick('laporan'); }}>
              <i className="fa-solid fa-chart-bar"></i>
              <span>Laporan</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* Sidebar Budget Card */}
      <div className="sidebar-card" id="sidebar-card">
        <div className="sc-row"><span className="sc-label">Alokasi</span></div>
        <div className="sc-val" id="sc-alokasi">{rupiah(alokasi)}</div>
        <div className="sc-row mt8"><span className="sc-label">RKA</span></div>
        <div className="sc-val c-blue" id="sc-rka">{rupiah(totalRka)}</div>
        <div className="sc-row mt8"><span className="sc-label">Selisih</span></div>
        <div className="sc-val c-red" id="sc-selisih">{rupiah(selisih)}</div>
        <table className="sc-table">
          <thead>
            <tr>
              <th>Sumber Dana</th>
              <th>RKA</th>
            </tr>
          </thead>
          <tbody id="sc-sumber-tbody">
            {Object.entries(bySource).map(([src, val]) => (
              <tr key={src}>
                <td>{src}</td>
                <td className="tr">{fmtNum(val)}</td>
              </tr>
            ))}
            {Object.keys(bySource).length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  Tidak ada data
                </td>
              </tr>
            )}
            {Object.keys(bySource).length > 0 && (
              <tr className="bold">
                <td>TOTAL</td>
                <td className="tr">{fmtNum(totalRka)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
