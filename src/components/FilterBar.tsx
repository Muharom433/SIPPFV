import { useAuth, useApp } from '../contexts/AuthContext';

interface FilterBarProps {
  onAddClick?: () => void;
  onImportClick?: () => void;
  onExportClick?: () => void;
  onRefresh?: () => void;
}

export function FilterBar({ onAddClick, onImportClick, onExportClick, onRefresh }: FilterBarProps) {
  const { user } = useAuth();
  const {
    tab,
    filterYear,
    setFilterYear,
    filterTriwulan,
    setFilterTriwulan,
    filterProdi,
    setFilterProdi,
    prodiLinks
  } = useApp();

  const isAdmin = user?.role === 'admin';

  const showFilter = ['rka-data', 'rka-rpd', 'renstra-tanggung', 'renstra-capaian', 'pembelajaran'].includes(tab);
  const showBulan = ['renstra-tanggung', 'renstra-capaian'].includes(tab);
  const isRenstra = tab === 'renstra-tanggung' || tab === 'renstra-capaian';

  let bannerTitle = '';
  let bannerSub = '';
  let bannerLabel = '';
  let addButtonLabel = '';

  if (tab === 'rka-data') {
    bannerTitle = 'Rencana Kerja & Anggaran (RKA) - Data';
    bannerSub = 'Kelola data anggaran program studi dan alokasi dana operasional.';
    bannerLabel = 'Keuangan';
    addButtonLabel = 'Tambah RKA';
  } else if (tab === 'rka-rpd') {
    bannerTitle = 'Rencana Kerja & Anggaran (RKA) - RPD';
    bannerSub = 'Pantau rencana penarikan dana per triwulan secara real-time.';
    bannerLabel = 'Keuangan';
  } else if (tab === 'renstra-tanggung') {
    bannerTitle = 'Renstra - Tanggung Jawab';
    bannerSub = 'Kelola pembagian tanggung jawab, target fakultas, target unit, dan alokasi anggaran Renstra.';
    bannerLabel = 'Rencana Strategis';
    addButtonLabel = 'Tambah Renstra';
  } else if (tab === 'renstra-capaian') {
    bannerTitle = 'Renstra - Capaian';
    bannerSub = 'Pantau capaian target indikator kinerja utama Renstra Anda untuk periode berjalan.';
    bannerLabel = 'Rencana Strategis';
    addButtonLabel = 'Tambah Renstra';
  } else if (tab === 'pembelajaran') {
    bannerTitle = 'Pembelajaran';
    bannerSub = 'Kelola kurikulum, Capaian Pembelajaran Lulusan (CPL), dan standar mutu pembelajaran.';
    bannerLabel = 'Akademik';
    addButtonLabel = 'Tambah CPL';
  }

  if (!showFilter) return null;

  const activeProdi = !isAdmin ? (user?.prodi_code || '') : filterProdi;

  return (
    <div style={{ padding: '24px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. PAPAN INFORMASI (Navy Banner at the Very Top) */}
      <div className="lap-banner" style={{
        background: 'linear-gradient(135deg, #0a192f 0%, #0d1e36 50%, #112240 100%)',
        borderRadius: '24px',
        padding: '32px 40px',
        color: 'var(--white)',
        position: 'relative',
        boxShadow: '0 20px 40px -15px rgba(10, 25, 47, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '280px', zIndex: 2 }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600, color: '#64ffda' }}>
            {bannerLabel} &bull; {activeProdi ? `Prodi ${activeProdi}` : 'General'}
          </span>
          <h2 style={{ fontSize: '1.9rem', margin: '16px 0 10px', fontWeight: 700, color: '#fff', fontFamily: 'Outfit' }}>
            {bannerTitle}
          </h2>
          <p style={{ fontSize: '0.95rem', opacity: 0.8, maxWidth: '600px', lineHeight: 1.65, color: '#a8b2d1', margin: 0 }}>
            {bannerSub}
          </p>
        </div>

        {/* 2. ACTION BUTTONS INSIDE BANNER (Gambar 4 & Gambar 2 style) */}
        <div style={{ zIndex: 2, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isRenstra && isAdmin && (
            <button 
              className="btn" 
              id="btn-import-renstra"
              onClick={onImportClick}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              <i className="fa-solid fa-file-import"></i> Impor Excel
            </button>
          )}
          {isRenstra && (
            <button 
              className="btn" 
              id="btn-export-renstra"
              onClick={onExportClick}
              style={{
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              <i className="fa-solid fa-file-export"></i> Download Excel
            </button>
          )}
          {addButtonLabel && isAdmin && (
            <button 
              className="btn" 
              id="btn-add-main"
              onClick={onAddClick}
              style={{
                background: '#1e40af',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              <i className="fa-solid fa-plus"></i> {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* 3. FILTER ROW (Gambar 3 style: white card, inline filters, blue magnifying glass button) */}
      <div className="filter-bar-inner" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '16px 28px',
        background: 'var(--white)',
        borderRadius: '20px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        flexWrap: 'wrap',
        width: 'fit-content',
        minWidth: '450px'
      }}>
        {showBulan && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>Triwulan:</span>
            <select 
              id="flt-bulan" 
              className="flt-select"
              value={filterTriwulan}
              onChange={(e) => {
                setFilterTriwulan(e.target.value);
                onRefresh?.();
              }}
              style={{ height: '40px', borderRadius: '10px', border: '1px solid var(--border)', padding: '0 12px', fontWeight: 500, color: 'var(--text)', background: '#f8fafc', outline: 'none' }}
            >
              <option>Triwulan 1</option>
              <option>Triwulan 2</option>
              <option>Triwulan 3</option>
              <option>Triwulan 4</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>Tahun:</span>
          <select 
            id="flt-tahun" 
            className="flt-select"
            value={filterYear}
            onChange={(e) => {
              setFilterYear(parseInt(e.target.value) || 2026);
              onRefresh?.();
            }}
            style={{ height: '40px', borderRadius: '10px', border: '1px solid var(--border)', padding: '0 12px', fontWeight: 500, color: 'var(--text)', background: '#f8fafc', outline: 'none' }}
          >
            <option>2026</option>
            <option>2027</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>Program Studi:</span>
          <select 
            id="flt-unit" 
            className="flt-select wide"
            disabled={!isAdmin}
            value={!isAdmin ? (user?.prodi_code || '') : filterProdi}
            onChange={(e) => {
              setFilterProdi(e.target.value);
              onRefresh?.();
            }}
            style={{ flex: 1, height: '40px', borderRadius: '10px', border: '1px solid var(--border)', padding: '0 12px', fontWeight: 500, color: 'var(--text)', background: '#f8fafc', outline: 'none' }}
          >
            {!isAdmin ? (
              <option value={user?.prodi_code || ''}>
                {user?.prodi_code} — {user?.prodi_name || user?.prodi_code}
              </option>
            ) : (
              <>
                <option value="">— Semua Prodi / Vokasi —</option>
                {prodiLinks.map((p) => (
                  <option key={p.id} value={p.prodi_code}>
                    {p.prodi_code} — {p.prodi_name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* 4. BLUE MAGNIFYING GLASS SEARCH BUTTON (Gambar 3 style) */}
        <button 
          id="btn-tampilkan" 
          className="btn btn-primary" 
          onClick={onRefresh}
          style={{
            height: '40px',
            width: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            padding: 0,
            flexShrink: 0,
            background: '#1e40af',
            borderColor: '#1e40af',
            boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)',
            cursor: 'pointer'
          }}
          title="Tampilkan"
        >
          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '1rem', color: '#fff' }}></i>
        </button>
      </div>
    </div>
  );
}
