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

  let addButtonLabel = '';
  if (tab === 'rka-data') addButtonLabel = 'Tambah RKA';
  else if (tab === 'renstra-tanggung' || tab === 'renstra-capaian') addButtonLabel = 'Tambah Renstra';
  else if (tab === 'pembelajaran') addButtonLabel = 'Tambah CPL';

  if (!showFilter) return null;

  return (
    <div className="filter-bar" id="filter-bar">
      <div className="filter-row">
        {showBulan && (
          <div className="fg" id="fg-bulan">
            <label>Triwulan</label>
            <select 
              id="flt-bulan" 
              className="flt-select"
              value={filterTriwulan}
              onChange={(e) => {
                setFilterTriwulan(e.target.value);
                onRefresh?.();
              }}
            >
              <option>Triwulan 1</option>
              <option>Triwulan 2</option>
              <option>Triwulan 3</option>
              <option>Triwulan 4</option>
            </select>
          </div>
        )}
        <div className="fg">
          <label>Tahun</label>
          <select 
            id="flt-tahun" 
            className="flt-select"
            value={filterYear}
            onChange={(e) => {
              setFilterYear(parseInt(e.target.value) || 2026);
              onRefresh?.();
            }}
          >
            <option>2026</option>
            <option>2027</option>
          </select>
        </div>
        <div className="fg">
          <label>Prodi</label>
          <select 
            id="flt-unit" 
            className="flt-select wide"
            disabled={!isAdmin}
            value={!isAdmin ? (user?.prodi_code || '') : filterProdi}
            onChange={(e) => {
              setFilterProdi(e.target.value);
              onRefresh?.();
            }}
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
        
        <button 
          className="btn btn-primary" 
          id="btn-tampilkan"
          onClick={onRefresh}
        >
          Tampilkan
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isRenstra && isAdmin && (
            <button 
              className="btn btn-secondary admin-only" 
              id="btn-import-renstra"
              onClick={onImportClick}
            >
              <i className="fa-solid fa-file-import"></i> Impor Excel
            </button>
          )}
          {isRenstra && (
            <button 
              className="btn btn-success" 
              id="btn-export-renstra"
              onClick={onExportClick}
            >
              <i className="fa-solid fa-file-export"></i> Download Excel
            </button>
          )}
          {addButtonLabel && isAdmin && (
            <button 
              className="btn btn-success admin-only" 
              id="btn-add-main"
              onClick={onAddClick}
            >
              <i className="fa-solid fa-plus"></i> <span id="btn-add-label">{addButtonLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
