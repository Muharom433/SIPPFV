import { useState, useEffect, useRef } from 'react';
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
    prodiLinks,
    searchQuery,
    setSearchQuery
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

  // --- Custom Searchable Dropdown state & ref ---
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [prodiSearch, setProdiSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!showFilter) return null;

  const activeProdi = !isAdmin ? (user?.prodi_code || '') : filterProdi;
  const currentProdiName = prodiLinks.find(p => p.prodi_code === activeProdi)?.prodi_name || '';

  // Filter prodi list based on search text inside dropdown
  const filteredProdis = prodiLinks.filter(p =>
    p.prodi_name.toLowerCase().includes(prodiSearch.toLowerCase()) ||
    p.prodi_code.toLowerCase().includes(prodiSearch.toLowerCase())
  );

  return (
    <div style={{ padding: '24px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encapsulated style overrides to remove parent border and default white background */}
      <style>{`
        #filter-bar.filter-bar {
          background: transparent !important;
          border-bottom: none !important;
          padding: 0 !important;
        }
      `}</style>

      {/* 1. PAPAN INFORMASI (Bright Cyan-Blue Glassmorphism) */}
      <div className="lap-banner" style={{
        background: 'linear-gradient(135deg, #0072ff 0%, #00bfff 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '24px',
        padding: '32px 40px',
        color: 'var(--white)',
        position: 'relative',
        boxShadow: '0 20px 40px -15px rgba(0, 114, 255, 0.4)',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Glow effect elements behind glass */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />

        <div style={{ flex: 1, minWidth: '280px', zIndex: 2 }}>
          <span style={{ 
            fontSize: '0.72rem', 
            letterSpacing: '0.12em', 
            textTransform: 'uppercase', 
            background: 'rgba(255,255,255,0.06)', 
            padding: '6px 14px', 
            borderRadius: '99px', 
            border: '1px solid rgba(255,255,255,0.1)', 
            fontWeight: 600, 
            color: '#64ffda' 
          }}>
            {bannerLabel} &bull; {activeProdi ? `Prodi ${activeProdi}` : 'General'}
          </span>
          <h2 style={{ fontSize: '1.9rem', margin: '16px 0 10px', fontWeight: 700, color: '#fff', fontFamily: 'Outfit' }}>
            {bannerTitle}
          </h2>
          <p style={{ fontSize: '0.95rem', opacity: 0.8, maxWidth: '600px', lineHeight: 1.65, color: '#a8b2d1', margin: 0 }}>
            {bannerSub}
          </p>
        </div>

        {/* 2. ACTION BUTTONS INSIDE BANNER (Glassy, Modern Alignment on the right) */}
        <div style={{ 
          zIndex: 2, 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          marginLeft: 'auto' 
        }}>
          {isRenstra && isAdmin && (
            <button 
              className="btn" 
              id="btn-import-renstra"
              onClick={onImportClick}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'none';
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
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
                e.currentTarget.style.transform = 'none';
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
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <i className="fa-solid fa-plus"></i> {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* 3. FILTER ROW (White Card, stretched full-width, search input added on the right) */}
      <div className="filter-bar-inner" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        padding: '16px 28px',
        background: 'var(--white)',
        borderRadius: '20px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 16px -6px rgba(0, 0, 0, 0.03)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        flexWrap: 'wrap',
        width: '100%'
      }}>
        {/* Left Side: Select Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', flex: 1 }}>
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
                style={{ 
                  height: '40px', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border)', 
                  padding: '0 12px', 
                  fontWeight: 500, 
                  color: 'var(--text)', 
                  background: '#f8fafc', 
                  outline: 'none',
                  cursor: 'pointer'
                }}
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
              style={{ 
                height: '40px', 
                borderRadius: '10px', 
                border: '1px solid var(--border)', 
                padding: '0 12px', 
                fontWeight: 500, 
                color: 'var(--text)', 
                background: '#f8fafc', 
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option>2026</option>
              <option>2027</option>
            </select>
          </div>

          {/* Program Studi: Custom Searchable Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', position: 'relative' }} ref={dropdownRef}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>Program Studi:</span>
            {!isAdmin ? (
              <div style={{
                flex: 1,
                height: '40px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                padding: '0 12px',
                fontWeight: 500,
                color: 'var(--text)',
                background: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.88rem',
                userSelect: 'none'
              }}>
                {user?.prodi_code} — {user?.prodi_name || user?.prodi_code}
              </div>
            ) : (
              <div style={{ flex: 1, position: 'relative' }}>
                {/* Dropdown Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    padding: '0 12px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    background: '#f8fafc',
                    outline: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeProdi ? `${activeProdi} — ${currentProdiName}` : '— Semua Prodi / Vokasi —'}
                  </span>
                  <i className={`fa-solid fa-chevron-down`} style={{ fontSize: '0.8rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }}></i>
                </button>

                {/* Dropdown Body */}
                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '46px',
                    left: 0,
                    width: '320px',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid var(--border)',
                    padding: '12px',
                    zIndex: 999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {/* Live Search Input inside Dropdown */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Cari program studi..."
                        value={prodiSearch}
                        onChange={(e) => setProdiSearch(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          padding: '0 10px 0 30px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          background: '#f8fafc',
                          color: 'var(--text)'
                        }}
                      />
                      <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.8rem' }}></i>
                    </div>

                    {/* Options List */}
                    <div style={{ 
                      maxHeight: '220px', 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '4px',
                      paddingRight: '4px'
                    }}>
                      <div
                        onClick={() => {
                          setFilterProdi('');
                          setIsDropdownOpen(false);
                          setProdiSearch('');
                          onRefresh?.();
                        }}
                        style={{
                          width: '100%',
                          minHeight: '44px',
                          padding: '12px 16px',
                          textAlign: 'left',
                          background: activeProdi === '' ? '#e0f2fe' : 'transparent',
                          color: activeProdi === '' ? '#0369a1' : 'var(--text)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: activeProdi === '' ? 600 : 500,
                          fontSize: '0.88rem',
                          lineHeight: '1.5',
                          transition: 'all 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          boxSizing: 'border-box',
                          userSelect: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (activeProdi !== '') e.currentTarget.style.background = '#f1f5f9';
                        }}
                        onMouseLeave={(e) => {
                          if (activeProdi !== '') e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        — Semua Prodi / Vokasi —
                      </div>

                      {filteredProdis.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setFilterProdi(p.prodi_code);
                            setIsDropdownOpen(false);
                            setProdiSearch('');
                            onRefresh?.();
                          }}
                          style={{
                            width: '100%',
                            minHeight: '44px',
                            padding: '12px 16px',
                            textAlign: 'left',
                            background: activeProdi === p.prodi_code ? '#e0f2fe' : 'transparent',
                            color: activeProdi === p.prodi_code ? '#0369a1' : 'var(--text)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: activeProdi === p.prodi_code ? 600 : 500,
                            fontSize: '0.88rem',
                            lineHeight: '1.5',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                            userSelect: 'none'
                          }}
                          title={`${p.prodi_code} — ${p.prodi_name}`}
                          onMouseEnter={(e) => {
                            if (activeProdi !== p.prodi_code) {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#0284c7';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeProdi !== p.prodi_code) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--text)';
                            }
                          }}
                        >
                          {p.prodi_code} — {p.prodi_name}
                        </div>
                      ))}

                      {filteredProdis.length === 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          Prodi tidak ditemukan
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Uraian/Kode Search box & Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '320px', flexShrink: 0 }}>
          {/* Search Box on the Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, position: 'relative' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>Cari:</span>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="text" 
                placeholder="Cari Kode atau Uraian..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  padding: '0 12px 0 34px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  background: '#f8fafc',
                  outline: 'none',
                  fontSize: '0.85rem'
                }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.85rem' }}></i>
            </div>
          </div>

          {/* Blue Search Refresh Button */}
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
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Tampilkan"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1d4ed8';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1e40af';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <i className="fa-solid fa-arrows-rotate" style={{ fontSize: '1rem', color: '#fff' }}></i>
          </button>
        </div>
      </div>
    </div>
  );
}
