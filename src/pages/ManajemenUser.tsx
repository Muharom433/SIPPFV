import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/user.service';
import { useApp } from '../contexts/AuthContext';
import type { User } from '../types';
import Swal from 'sweetalert2';


export function ManajemenUser() {
  const { prodiLinks } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formId, setFormId] = useState<number | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formProdiCode, setFormProdiCode] = useState('');
  const [saving, setSaving] = useState(false);

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Pengguna',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadUsers();
  }, []);

  const openAdd = () => {
    setModalMode('add');
    setFormId(null);
    setFormUsername('');
    setFormPassword('');
    setFormRole('user');
    setFormProdiCode('');
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setModalMode('edit');
    setFormId(user.id);
    setFormUsername(user.username);
    setFormPassword(''); // Biarkan kosong, isi jika ingin mengubah
    setFormRole(user.role);
    setFormProdiCode(user.prodi_code || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, username: string) => {
    Swal.fire({
      title: 'Yakin ingin menghapus?',
      text: `Pengguna "${username}" akan dihapus permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteUser(id);
          loadUsers();
          Toast.fire({
            icon: 'success',
            title: 'Pengguna berhasil dihapus'
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === 'add') {
        if (!formPassword) throw new Error('Password wajib diisi untuk pengguna baru.');
        await createUser({
          username: formUsername,
          password: formPassword,
          role: formRole,
          prodi_code: formRole === 'admin' ? null : (formProdiCode || null)
        });
        Toast.fire({
          icon: 'success',
          title: 'Pengguna berhasil ditambahkan'
        });
      } else {
        await updateUser(formId!, {
          username: formUsername,
          password: formPassword || undefined,
          role: formRole,
          prodi_code: formRole === 'admin' ? null : (formProdiCode || null)
        });
        Toast.fire({
          icon: 'success',
          title: 'Pengguna berhasil diperbarui'
        });
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="view" id="view-manajemen-user">
      {/* Banner Title mirip RenstraCapaian (lap-banner) */}
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
        <svg 
          viewBox="0 0 1000 200" 
          preserveAspectRatio="xMaxYMid slice"
          style={{
            position: 'absolute', top: 0, right: 0, width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 1
          }}
        >
          <path d="M750,-100 C850,50 950,50 1050,-100 Z" fill="rgba(255,255,255,0.03)" />
          <path d="M800,-50 C880,80 980,80 1050,-50 Z" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          <circle cx="850" cy="100" r="300" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <circle cx="950" cy="50" r="200" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <circle cx="900" cy="150" r="150" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
        </svg>
        <div className="lap-banner-header" style={{ position: 'relative', zIndex: 2, flex: '1 1 300px' }}>
          <div className="lap-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.2)', padding: '6px 12px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '16px', textTransform: 'uppercase' }}>
            <i className="fa-solid fa-users-gear"></i> Administrasi Sistem
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Manajemen User</h2>
          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.5, maxWidth: '600px' }}>
            Kelola data pengguna, hak akses, dan password — Hanya Admin.
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
                placeholder="Cari user, role, atau prodi..." 
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
        <button className="btn" onClick={openAdd} style={{ background: 'linear-gradient(135deg, #0072ff 0%, #00c6ff 100%)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 114, 255, 0.2)' }}>
          <i className="fa-solid fa-user-plus"></i> Tambah User
        </button>
      </div>



      <div className="tbl-wrap">
        <table className="ftable" id="tbl-manajemen-user">
          <thead>
            <tr>
              <th className="text-center" style={{ width: '50px' }}>No</th>
              <th className="text-left" style={{ minWidth: '150px' }}>Username</th>
              <th className="text-left" style={{ minWidth: '100px' }}>Role</th>
              <th className="text-left" style={{ minWidth: '150px' }}>Kode Prodi</th>
              <th className="text-center" style={{ width: '120px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center" style={{ padding: '40px' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: '#0072ff' }}></i>
                </td>
              </tr>
            ) : users.filter(u => 
              u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
              u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (u.prodi_code && u.prodi_code.toLowerCase().includes(searchQuery.toLowerCase()))
            ).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">Tidak ada data pengguna</td>
              </tr>
            ) : (
              users.filter(u => 
                u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.prodi_code && u.prodi_code.toLowerCase().includes(searchQuery.toLowerCase()))
              ).map((u, i) => (
                <tr key={u.id}>
                  <td className="text-center">{i + 1}</td>
                  <td className="text-left"><strong>{u.username}</strong></td>
                  <td className="text-left">
                    <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-left">
                    {u.role === 'admin' ? <em style={{ color: '#94a3b8' }}>All Access</em> : (u.prodi_code || '—')}
                  </td>
                  <td className="text-center">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn btn-sm btn-outline-primary" title="Edit" onClick={() => openEdit(u)}>
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Hapus" onClick={() => handleDelete(u.id, u.username)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal open" id="modal-manajemen-user">
          <div className="modal-box">
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-users-gear"></i> {modalMode === 'add' ? 'Tambah User Baru' : 'Edit User'}</h3>
              <button type="button" className="close-x" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="form-user" onSubmit={handleSubmit}>
                <div className="fg">
                  <label>Username <span className="req">*</span></label>
                  <input type="text" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} required />
                </div>
                <div className="fg">
                  <label>Password {modalMode === 'edit' && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(Kosongkan jika tidak ingin mengubah)</span>} <span className="req">{modalMode === 'add' ? '*' : ''}</span></label>
                  <input type="text" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} required={modalMode === 'add'} placeholder={modalMode === 'edit' ? 'Ketik password baru...' : 'Ketik password...'} />
                </div>
                <div className="fg">
                  <label>Role</label>
                  <select className="flt-select" value={formRole} onChange={(e) => setFormRole(e.target.value as 'admin'|'user')}>
                    <option value="user">USER</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </div>
                {formRole === 'user' && (
                  <div className="fg">
                    <label>Kode Prodi (opsional jika departemen)</label>
                    <select 
                      className="flt-select" 
                      value={formProdiCode} 
                      onChange={(e) => setFormProdiCode(e.target.value)}
                    >
                      <option value="">— Pilih Program Studi (opsional) —</option>
                      {prodiLinks.map((p) => (
                        <option key={p.id} value={p.prodi_code}>
                          {p.prodi_code} — {p.prodi_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="modal-ftr" style={{ marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-save"></i> Simpan</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
