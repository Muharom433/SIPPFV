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
    setOpenGroups(prev => {
      if (prev[group]) {
        // Close if already open
        return { rka: false, renstra: false, transaksi: false, manajemen: false };
      } else {
        // Close others, open this one
        return { rka: false, renstra: false, transaksi: false, manajemen: false, [group]: true };
      }
    });
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
      <style>{`
        .sidebar {
          background: #ffffff !important;
          border-right: 1px solid #f1f5f9 !important;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02) !important;
        }
        .sidebar-logo {
          border-bottom: 1px solid #f1f5f9 !important;
          background: #ffffff !important;
          padding: 24px 20px !important;
        }
        .logo-sip {
          font-family: 'Outfit', sans-serif;
          color: #0072ff !important;
          font-weight: 800;
          font-style: normal;
          font-size: 2rem !important;
          letter-spacing: -0.5px;
        }
        /* Collapsed specific overrides to prevent clipping and hide yellow dot */
        .sidebar.collapsed:not(:hover) .sidebar-logo {
          padding: 24px 0 !important;
          justify-content: center !important;
        }
        .sidebar.collapsed:not(:hover) .logo-sip {
          font-size: 1.25rem !important;
          letter-spacing: -0.5px !important;
          display: block !important;
          text-align: center !important;
          width: 100% !important;
        }
        .sidebar.collapsed:not(:hover) .sidenav .nav-item.active > a::after {
          display: none !important;
        }

        .sidenav .nav-item a, .sidenav .nav-group-header {
          border-radius: 99px !important;
          margin: 6px 16px !important;
          padding: 12px 20px !important;
          border-left: none !important;
          color: #64748b !important;
          transition: all 0.3s ease !important;
          font-weight: 500 !important;
          font-size: 0.95rem !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
        }
        .sidenav .nav-item a span, .sidenav .nav-group-header span {
          flex: 1 !important;
          white-space: normal !important;
          line-height: 1.25 !important;
          text-align: left !important;
        }

        .sidenav .nav-item a:hover, .sidenav .nav-group-header:hover {
          background: #f8fafc !important;
          color: #0f172a !important;
        }
        .sidenav .nav-item.active > a, .sidenav .nav-group.open > .nav-group-header {
          background: linear-gradient(135deg, #0072ff 0%, #00c6ff 100%) !important;
          color: #ffffff !important;
          box-shadow: 0 8px 20px -6px rgba(0, 114, 255, 0.4) !important;
          font-weight: 600 !important;
          position: relative !important;
        }
        .sidenav .nav-item.active > a i, .sidenav .nav-group.open > .nav-group-header i {
          color: #ffffff !important;
        }
        /* Yellow dot on active main menu items */
        .sidenav .nav-item.active > a::after {
          content: '';
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background-color: #fbbf24 !important;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
        }
        .nav-sub {
          background: transparent !important;
          padding-left: 12px !important;
          margin-top: 4px !important;
          margin-bottom: 8px !important;
        }
        .nav-sub li {
          border-radius: 12px !important;
          margin: 4px 16px !important;
          padding: 10px 16px !important;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          list-style: none;
        }
        .nav-sub li a {
          padding: 0 !important;
          background: transparent !important;
          color: #64748b !important;
          border-left: none !important;
          display: flex !important;
          width: 100%;
          font-size: 0.9rem !important;
          white-space: normal !important;
          line-height: 1.25 !important;
        }
        .nav-sub li.active {
          background: #f0f9ff !important;
        }
        .nav-sub li.active a {
          color: #0284c7 !important;
          font-weight: 600 !important;
        }
        .nav-sub li:hover:not(.active) {
          background: #f8fafc !important;
        }
        .nav-sub li:hover:not(.active) a {
          color: #0f172a !important;
        }
        .sidebar-card {
          margin: 20px 16px !important;
          border-radius: 20px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05) !important;
          background: #ffffff !important;
          padding: 16px !important;
        }
      `}</style>
      <div className="sidebar-logo">
        <span className="logo-sip">SIGAP</span>
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

          {isAdmin && (
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
          )}

          {isAdmin && (
            <li className={`nav-item ${tab === 'pembelajaran' ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleTabClick('pembelajaran'); }}>
                <i className="fa-solid fa-graduation-cap"></i>
                <span>Pembelajaran</span>
              </a>
            </li>
          )}

          {isAdmin && (
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
          )}

          {isAdmin && (
            <li className={`nav-group admin-only ${openGroups.manajemen ? 'open' : ''}`}>
              <div className="nav-group-header" onClick={() => toggleGroup('manajemen')}>
                <i className="fa-solid fa-server"></i>
                <span>Administrasi Sistem</span>
                <i className="fa-solid fa-chevron-down caret"></i>
              </div>
              <ul className="nav-sub">
                <li className={tab === 'manajemen-prodi' ? 'active' : ''} onClick={() => handleTabClick('manajemen-prodi')}>
                  <a href="#" onClick={(e) => e.preventDefault()}>Manajemen Prodi</a>
                </li>
                <li className={tab === 'manajemen-departemen' ? 'active' : ''} onClick={() => handleTabClick('manajemen-departemen')}>
                  <a href="#" onClick={(e) => e.preventDefault()}>Manajemen Departemen</a>
                </li>
                <li className={tab === 'manajemen-user' ? 'active' : ''} onClick={() => handleTabClick('manajemen-user')}>
                  <a href="#" onClick={(e) => e.preventDefault()}>Manajemen User</a>
                </li>
              </ul>
            </li>
          )}

          {isAdmin && (
            <li className={`nav-item ${tab === 'laporan' ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); handleTabClick('laporan'); }}>
                <i className="fa-solid fa-chart-bar"></i>
                <span>Laporan Keuangan</span>
              </a>
            </li>
          )}
        </ul>
      </nav>

      {/* Sidebar Budget Card (Admin Only) */}
      {isAdmin && (
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
      )}
    </aside>
  );
}
