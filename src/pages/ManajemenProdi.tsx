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
      <div className="section-head">
        <div>
          <h2><i className="fa-solid fa-graduation-cap"></i> Manajemen Program Studi</h2>
          <p className="sub-text">Kelola data Program Studi (Prodi) — Hanya Admin</p>
        </div>
        <button className="btn btn-success admin-only" onClick={onAddProdi}>
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
            {prodiLinks.map((p, i) => {
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
            })}
            {prodiLinks.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Belum ada data Program Studi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
