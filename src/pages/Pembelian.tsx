import { useAuth, useApp } from '../contexts/AuthContext';
import { deletePurchase } from '../services/purchases.service';
import { rupiah, fmtNum } from '../utils/helpers';
import type { Purchase } from '../types';

interface PembelianProps {
  purchases: Purchase[];
  onRefresh: () => void;
  onAddPurchase: () => void;
  onEditPurchase: (id: number) => void;
}

export function Pembelian({
  purchases,
  onRefresh,
  onAddPurchase,
  onEditPurchase
}: PembelianProps) {
  const { user } = useAuth();
  const { filterProdi } = useApp();

  const isAdmin = user?.role === 'admin';

  // Filter purchases based on user role and selected filter
  const visiblePurchases = purchases.filter(p => {
    // If standard user, only show their own prodi code
    if (!isAdmin && user?.prodi_code) {
      return p.prodi_code === user.prodi_code;
    }
    // If admin is filtering by a specific prodi
    if (isAdmin && filterProdi) {
      return p.prodi_code === filterProdi;
    }
    return true;
  });

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus data pembelian ini?')) {
      try {
        await deletePurchase(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="view" id="view-pembelian">
      <div className="section-head">
        <div>
          <h2>Data Pembelian Barang & Pengadaan</h2>
          <p className="sub-text">
            Seluruh dokumentasi pembelian dikonsolidasikan dalam satu Link Google Drive per transaksi.
          </p>
        </div>
        <button className="btn btn-success" onClick={onAddPurchase}>
          <i className="fa-solid fa-plus"></i> Tambah Pembelian
        </button>
      </div>
      <div className="tbl-wrap">
        <table className="ftable" id="tbl-pembelian">
          <thead>
            <tr>
              <th style={{ width: '50px' }} className="text-center">No</th>
              <th style={{ minWidth: '300px' }} className="text-left">Nama Barang / Pengadaan</th>
              <th style={{ width: '60px' }} className="text-center">Qty</th>
              <th style={{ width: '130px' }} className="text-right">Harga Satuan</th>
              <th style={{ width: '130px' }} className="text-right">Total Dana</th>
              <th style={{ width: '100px' }} className="text-center">Prodi</th>
              <th style={{ width: '150px' }} className="text-center">Dokumentasi (Link Drive)</th>
              <th className="text-left">Keterangan</th>
              <th style={{ width: '120px' }} className="text-center">Tanggal</th>
              <th style={{ width: '100px' }} className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visiblePurchases.map((p, i) => {
              const date = new Date(p.created_at).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              });

              const isOwner = isAdmin || (user?.role === 'user' && p.prodi_code === user.prodi_code);

              return (
                <tr key={p.id}>
                  <td className="text-center">{i + 1}</td>
                  <td className="text-left"><strong>{p.item_name}</strong></td>
                  <td className="text-center">{p.quantity}</td>
                  <td className="text-right">{fmtNum(p.price)}</td>
                  <td className="c-blue text-right" style={{ fontWeight: 700 }}>{rupiah(p.total_amount)}</td>
                  <td className="text-center">
                    {p.prodi_code ? (
                      <span className="badge-prodi">{p.prodi_code}</span>
                    ) : (
                      <span className="badge-prodi badge-prodi-fac">Fakultas</span>
                    )}
                  </td>
                  <td className="text-center">
                    <a href={p.drive_link} target="_blank" rel="noopener noreferrer" className="dlbadge has-link">
                      <i className="fa-brands fa-google-drive"></i> Drive Link
                    </a>
                  </td>
                  <td className="text-left">{p.keterangan || '-'}</td>
                  <td className="text-center" style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{date}</td>
                  <td className="text-center">
                    {isOwner && (
                      <div className="act-cell">
                        <button 
                          className="btn btn-secondary btn-sm btn-icon" 
                          onClick={() => onEditPurchase(p.id)}
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
                    )}
                  </td>
                </tr>
              );
            })}
            {visiblePurchases.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Belum ada data pembelian barang.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
