import { useState } from 'react';
import { useApp } from '../contexts/AuthContext';
import { deleteProdiLink } from '../services/prodi.service';


interface ManajemenProdiProps {
  onRefresh: () => void;
  onAddProdi: () => void;
  onEditProdi: (id: number) => void;
}

export function ManajemenProdi({
  onRefresh,
  onAddProdi,
  onEditProdi
}: ManajemenProdiProps) {
  const { prodiLinks } = useApp();
  const [searchQuery, setSearchQuery] = useState('');


  const handleDelete = async (id: number) => {
    const prodi = prodiLinks.find(p => p.id === id);
    const name = prodi ? prodi.prodi_name : '';
    if (window.confirm(`Yakin ingin menghapus prodi "${name}" beserta seluruh data link dan akun user terkait?`)) {
      try {
        await deleteProdiLink(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="view" id="view-manajemen-prodi">
      {/* Banner Title */}
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
        flexWrap: 'wrap',
        marginBottom: '24px'
      }}>
        {/* Decorative SVG */}
        <svg viewBox="0 0 1000 200" preserveAspectRatio="xMaxYMid slice" style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
          <path d="M750,-100 C850,50 950,50 1050,-100 Z" fill="rgba(255,255,255,0.03)" />
          <path d="M800,-50 C880,80 980,80 1050,-50 Z" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          <circle cx="850" cy="100" r="300" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <circle cx="950" cy="50" r="200" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <circle cx="900" cy="150" r="150" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
        </svg>
        <div className="lap-banner-header" style={{ position: 'relative', zIndex: 2, flex: '1 1 300px' }}>
          <div className="lap-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.2)', padding: '6px 12px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '16px', textTransform: 'uppercase' }}>
            <i className="fa-solid fa-graduation-cap"></i> Administrasi Sistem
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Manajemen Program Studi</h2>
          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.5, maxWidth: '600px' }}>
            Kelola data Program Studi (Prodi) — Hanya Admin
          </p>
        </div>
      </div>

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
        width: '100%',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '320px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, position: 'relative' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>Cari:</span>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="text" 
                placeholder="Cari prodi atau kode..." 
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
        </div>
        <button className="btn admin-only" onClick={onAddProdi} style={{ background: 'linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 114, 255, 0.2)' }}>
          <i className="fa-solid fa-plus"></i> Tambah Prodi
        </button>
      </div>


      <div className="tbl-wrap">
        <table className="ftable" id="tbl-manajemen-prodi">
          <thead>
            <tr>
              <th className="text-center" style={{ width: '50px' }}>No</th>
              <th className="text-left" style={{ width: '150px' }}>Kode Prodi</th>
              <th className="text-left" style={{ minWidth: '250px' }}>Nama Program Studi</th>
              <th className="text-left" style={{ minWidth: '250px' }}>Departemen</th>
              <th className="text-left">Keterangan</th>
              <th className="text-center" style={{ width: '120px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {prodiLinks.filter(p => 
              p.prodi_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              p.prodi_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (p.departemen && p.departemen.nama_departemen.toLowerCase().includes(searchQuery.toLowerCase()))
            ).length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">Tidak ada prodi ditemukan</td>
              </tr>
            ) : (
              prodiLinks.filter(p => 
                p.prodi_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.prodi_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.departemen && p.departemen.nama_departemen.toLowerCase().includes(searchQuery.toLowerCase()))
              ).map((p, i) => {
                const deptName = p.departemen ? p.departemen.nama_departemen : '—';
                return (
                  <tr key={p.id}>
                    <td className="text-center">{i + 1}</td>
                    <td className="text-left"><strong>{p.prodi_code}</strong></td>
                    <td className="text-left">{p.prodi_name}</td>

                  <td className="text-left">{deptName}</td>
                  <td className="text-left">{p.keterangan || '-'}</td>
                  <td className="text-center">
                    <div className="act-cell">
                      <button 
                        className="btn btn-secondary btn-sm btn-icon" 
                        onClick={() => onEditProdi(p.id)}
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button 
                        className="btn btn-danger btn-sm btn-icon" 
                        onClick={() => handleDelete(p.id)}
                        title="Hapus"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}
