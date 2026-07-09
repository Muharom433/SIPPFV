import { useAuth, useApp } from '../contexts/AuthContext';

const TAB_CONFIG: Record<string, { title: string }> = {
  'dashboard': { title: 'Dashboard' },
  'rka-data': { title: 'RKA / Data' },
  'rka-rpd': { title: 'RKA / RPD' },
  'renstra-tanggung': { title: 'Renstra / Tanggung Jawab' },
  'renstra-capaian': { title: 'Renstra / Capaian' },
  'pembelajaran': { title: 'Data Pembelajaran' },
  'pembelian': { title: 'Transaksi / Pembelian' },
  'manajemen-prodi': { title: 'Manajemen Prodi & Dept / Prodi' },
  'manajemen-departemen': { title: 'Manajemen Prodi & Dept / Departemen' },
  'laporan': { title: 'Laporan' },
};

export function Topbar() {
  const { user, logout } = useAuth();
  const { tab, toggleSidebar } = useApp();

  const currentTabConfig = TAB_CONFIG[tab] || { title: tab };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      logout();
    }
  };

  const getAvatarText = () => {
    if (!user) return 'US';
    if (user.role === 'admin') return 'SA';
    return user.prodi_code ? user.prodi_code.replace('D4-', '').replace('D3-', '') : 'US';
  };

  const getDisplayName = () => {
    if (!user) return '';
    if (user.role === 'admin') return 'Superadmin';
    return user.prodi_name || user.username.toUpperCase();
  };

  const getRoleText = () => {
    if (!user) return '';
    if (user.role === 'admin') return 'Administrator';
    return `User Prodi (${user.prodi_code})`;
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          id="btn-sidebar-toggle" 
          className="icon-btn" 
          onClick={toggleSidebar}
        >
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="breadcrumb" id="breadcrumb">
          <i className="fa-solid fa-house"></i>
          <span id="bc-main" style={{ marginLeft: '8px' }}>{currentTabConfig.title}</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="user-chip">
          <div 
            className="user-avatar" 
            id="user-avatar"
            style={{
              background: user?.role === 'admin' ? 'var(--accent)' : 'var(--blue)'
            }}
          >
            {getAvatarText()}
          </div>
          <div>
            <div className="user-name" id="user-display-name">
              {getDisplayName()}
            </div>
            <div className="user-role-text" id="user-role-text">
              {getRoleText()}
            </div>
          </div>
        </div>
        <button 
          id="btn-logout" 
          type="button" 
          className="btn btn-secondary btn-sm" 
          title="Keluar dari Sistem"
          onClick={handleLogout}
          style={{ borderRadius: '20px', padding: '6px 14px', marginLeft: '12px' }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> 
          <span style={{ marginLeft: '6px' }}>Logout</span>
        </button>
      </div>
    </header>
  );
}
