import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import Swal from 'sweetalert2';


const TAB_CONFIG: Record<string, { title: string }> = {
  'dashboard': { title: 'Dashboard' },
  'rka-data': { title: 'RKA / Data' },
  'rka-rpd': { title: 'RKA / RPD' },
  'renstra-tanggung': { title: 'Renstra / Tanggung Jawab' },
  'renstra-capaian': { title: 'Renstra / Capaian' },
  'pembelajaran': { title: 'Data Pembelajaran' },
  'pembelian': { title: 'Transaksi / Pembelian' },
  'manajemen-prodi': { title: 'Administrasi Sistem / Prodi' },
  'manajemen-departemen': { title: 'Administrasi Sistem / Departemen' },
  'manajemen-user': { title: 'Administrasi Sistem / User' },
  'laporan': { title: 'Laporan' },
};

export function Topbar() {
  const { user, logout } = useAuth();
  const { tab, setTab, toggleSidebar, isMobile } = useApp();

  const currentTabConfig = TAB_CONFIG[tab] || { title: tab };

  const handleLogout = () => {
    Swal.fire({
      title: 'Yakin ingin keluar?',
      text: 'Anda akan keluar dari sistem SIGAP.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Keluar!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setTab('dashboard');
        logout();
      }
    });
  };

  const getAvatarText = () => {
    if (!user) return 'US';
    if (user.role === 'admin') return 'SA';
    let raw = user.prodi_code || user.username || '';
    raw = raw.replace(/^D[34]-/i, '').replace(/^d[34]-/i, '').trim().toUpperCase();
    if (!raw) return 'PR';
    return raw.length <= 3 ? raw : raw.substring(0, 3);
  };

  const getDisplayName = () => {
    if (!user) return '';
    if (user.role === 'admin') return user.full_name || 'Superadmin';
    return user.prodi_name || user.full_name || user.username.toUpperCase();
  };

  const getRoleText = () => {
    if (!user) return '';
    if (user.role === 'admin') return 'Administrator';
    return `Prodi ${user.prodi_code || user.username.toUpperCase() || ''}`;
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
        <div className="breadcrumb" id="breadcrumb" style={{ display: isMobile ? 'none' : 'flex' }}>
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
              background: user?.role === 'admin' ? 'var(--accent)' : 'var(--blue)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              fontSize: '0.75rem',
              lineHeight: 1,
              padding: '0 4px',
              boxSizing: 'border-box'
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
