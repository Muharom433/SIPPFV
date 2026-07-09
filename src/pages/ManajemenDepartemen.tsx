import { useApp } from '../contexts/AuthContext';
import { deleteDepartemen } from '../services/departemen.service';


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

  const handleDelete = async (id: number) => {
    const d = departemen.find(x => x.id === id);
    const name = d ? d.nama_departemen : '';
    if (window.confirm(`Yakin ingin menghapus departemen "${name}"?`)) {
      try {
        await deleteDepartemen(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="view" id="view-manajemen-departemen">
      <div className="section-head">
        <div>
          <h2><i className="fa-solid fa-building-columns"></i> Manajemen Departemen</h2>
          <p className="sub-text">Kelola data Departemen — Hanya Admin</p>
        </div>
        <button className="btn btn-success admin-only" onClick={onAddDepartemen}>
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
            {departemen.map((d, i) => {
              const prodiCount = prodiLinks.filter(p => p.departemen_id === d.id).length;
              return (
                <tr key={d.id}>
                  <td className="text-center">{i + 1}</td>
                  <td className="text-left"><strong>{d.kode_departemen}</strong></td>
                  <td className="text-left">{d.nama_departemen}</td>
                  <td className="text-center">
                    <span className="badge-prodi">{prodiCount} Prodi</span>
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
            })}
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
