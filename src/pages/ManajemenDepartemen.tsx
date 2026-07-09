import { useState } from 'react';
import { useApp } from '../contexts/AuthContext';
import { deleteDepartemen } from '../services/departemen.service';
import Swal from 'sweetalert2';



interface ManajemenDepartemenProps {
  onRefresh: () => void;
  onAddDepartemen: () => void;
  onEditDepartemen: (id: number) => void;
}

export function ManajemenDepartemen({
  onRefresh,
  onAddDepartemen,
  onEditDepartemen
}: ManajemenDepartemenProps) {
  const { departemen, prodiLinks } = useApp();
  const [searchQuery, setSearchQuery] = useState('');


  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });

  const handleDelete = async (id: number) => {
    const d = departemen.find(x => x.id === id);
    const name = d ? d.nama_departemen : '';
    Swal.fire({
      title: 'Yakin ingin menghapus?',
      text: `Departemen "${name}" akan dihapus permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDepartemen(id);
          onRefresh();
          Toast.fire({
            icon: 'success',
            title: 'Departemen berhasil dihapus'
          });
        } catch (err: any) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: err.message,
            confirmButtonColor: '#0072ff'
          });
        }
      }
    });
  };


  return (
    <div className="view" id="view-manajemen-departemen">
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
            <i className="fa-solid fa-building-columns"></i> Administrasi Sistem
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Manajemen Departemen</h2>
          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.5, maxWidth: '600px' }}>
            Kelola data Departemen — Hanya Admin
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '320px', minWidth: '240px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, position: 'relative' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>Cari:</span>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                type="text" 
                placeholder="Cari departemen atau kode..." 
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
        <button className="btn admin-only" onClick={onAddDepartemen} style={{ background: 'linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 114, 255, 0.2)' }}>
          <i className="fa-solid fa-plus"></i> Tambah Departemen
        </button>
      </div>


      <div className="tbl-wrap">
        <table className="ftable" id="tbl-manajemen-dept">
          <thead>
            <tr>
              <th className="text-center" style={{ width: '50px' }}>No</th>
              <th className="text-left" style={{ width: '200px' }}>Kode Departemen</th>
              <th className="text-left" style={{ minWidth: '250px' }}>Nama Departemen</th>
              <th className="text-center" style={{ width: '150px' }}>Jumlah Prodi</th>
              <th className="text-center" style={{ width: '120px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {departemen.filter(d => 
              d.nama_departemen.toLowerCase().includes(searchQuery.toLowerCase()) || 
              d.kode_departemen.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">Tidak ada departemen ditemukan</td>
              </tr>
            ) : (
              departemen.filter(d => 
                d.nama_departemen.toLowerCase().includes(searchQuery.toLowerCase()) || 
                d.kode_departemen.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((d, i) => {
                const prodiCount = prodiLinks.filter(p => p.departemen_id === d.id).length;
                return (
                  <tr key={d.id}>
                    <td className="text-center">{i + 1}</td>
                    <td className="text-left"><strong>{d.kode_departemen}</strong></td>
                    <td className="text-left">{d.nama_departemen}</td>
                    <td className="text-center">
                      <span className="badge badge-primary">{prodiCount} Prodi</span>
                    </td>
                    <td className="text-center">
                      <div className="act-cell">
                        <button 
                          className="btn btn-secondary btn-sm btn-icon" 
                          onClick={() => onEditDepartemen(d.id)}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button 
                          className="btn btn-danger btn-sm btn-icon" 
                          onClick={() => handleDelete(d.id)}
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
            {departemen.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Belum ada data Departemen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
