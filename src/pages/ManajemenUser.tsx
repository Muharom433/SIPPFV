import { useState, useEffect, useRef } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getSimpelUsers, getStudyPrograms } from '../services/user.service';
import type { SimpelUser, StudyProgram } from '../services/user.service';
import type { User } from '../types';
import Swal from 'sweetalert2';

/* ═══════════════════════════════════════════════
   Inline CSS for searchable dropdown
   ═══════════════════════════════════════════════ */
const SEARCHABLE_CSS = `
  .searchable-dropdown {
    position: relative;
  }
  .searchable-dropdown .sd-input {
    width: 100%;
    height: 44px;
    border-radius: 10px;
    border: 1px solid var(--border, #e2e8f0);
    padding: 0 36px 0 14px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text, #0f172a);
    background: #f8fafc;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    cursor: text;
  }
  .searchable-dropdown .sd-input:focus {
    border-color: #0072ff;
    box-shadow: 0 0 0 3px rgba(0, 114, 255, 0.12);
  }
  .searchable-dropdown .sd-caret {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 0.75rem;
    pointer-events: none;
    transition: transform 0.2s;
  }
  .searchable-dropdown.open .sd-caret {
    transform: translateY(-50%) rotate(180deg);
  }
  .searchable-dropdown .sd-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 220px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 12px 32px -4px rgba(0,0,0,0.12);
    z-index: 50;
    padding: 6px;
  }
  .searchable-dropdown .sd-item {
    padding: 10px 14px;
    font-size: 0.88rem;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.15s;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .searchable-dropdown .sd-item:hover {
    background: #f0f9ff;
    color: #0072ff;
  }
  .searchable-dropdown .sd-item .sd-sub {
    font-size: 0.75rem;
    color: #94a3b8;
    font-weight: 400;
  }
  .searchable-dropdown .sd-empty {
    padding: 16px;
    text-align: center;
    color: #94a3b8;
    font-size: 0.85rem;
  }
`;


export function ManajemenUser() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Data for dropdowns
  const [simpelUsers, setSimpelUsers] = useState<SimpelUser[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formId, setFormId] = useState<string | null>(null);
  const [formRole, setFormRole] = useState<'admin' | 'prodi'>('prodi');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formIdProdi, setFormIdProdi] = useState('');
  const [formIdUser, setFormIdUser] = useState('');
  const [saving, setSaving] = useState(false);

  // Searchable admin dropdown
  const [adminSearch, setAdminSearch] = useState('');
  const [adminDropOpen, setAdminDropOpen] = useState(false);
  const adminDropRef = useRef<HTMLDivElement>(null);

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });

  // ── Load data ──
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

  const loadDropdownData = async () => {
    try {
      const [simpelData, prodiData] = await Promise.all([
        getSimpelUsers(),
        getStudyPrograms()
      ]);
      setSimpelUsers(simpelData);
      setStudyPrograms(prodiData);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadDropdownData();
  }, []);

  // Close admin dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target as Node)) {
        setAdminDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Modal helpers ──
  const openAdd = () => {
    setModalMode('add');
    setFormId(null);
    setFormRole('prodi');
    setFormUsername('');
    setFormPassword('');
    setFormIdProdi('');
    setFormIdUser('');
    setAdminSearch('');
    setIsModalOpen(true);
  };

  const openEdit = (user: User) => {
    setModalMode('edit');
    setFormId(user.id);
    setFormRole(user.role as 'admin' | 'prodi');
    setFormUsername(user.username);
    setFormPassword('');
    setFormIdProdi(user.id_prodi || '');
    setFormIdUser(user.id_user || '');
    // Pre-fill admin search with name
    if (user.role === 'admin' && user.full_name) {
      setAdminSearch(user.full_name);
    } else {
      setAdminSearch('');
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, username: string) => {
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
      if (formRole === 'admin' && !formIdUser) {
        throw new Error('Silakan pilih user SIMPEL untuk dijadikan Admin.');
      }
      if (formRole === 'prodi' && !formUsername.trim()) {
        throw new Error('Username prodi wajib diisi.');
      }
      if (formRole === 'prodi' && !formIdProdi) {
        throw new Error('Program Studi wajib dipilih.');
      }

      if (modalMode === 'add') {
        // Admin: username = SIMPEL username, no password (pakai SIMPEL)
        // Prodi: username = input manual, password wajib
        if (formRole === 'prodi' && !formPassword) {
          throw new Error('Password wajib diisi untuk akun Prodi.');
        }

        const selectedSimpelUser = simpelUsers.find(u => u.id === formIdUser);
        const username = formRole === 'admin'
          ? (selectedSimpelUser?.username || '').trim()
          : formUsername.trim();

        if (formRole === 'admin' && !username) {
          throw new Error('User SIMPEL yang dipilih tidak memiliki username.');
        }

        await createUser({
          username,
          password: formRole === 'prodi' ? formPassword : undefined,
          role: formRole,
          id_prodi: formRole === 'prodi' ? formIdProdi : null,
          id_user: formRole === 'admin' ? formIdUser : null
        });
        Toast.fire({ icon: 'success', title: 'Pengguna berhasil ditambahkan' });
      } else {
        const selectedSimpelUser = simpelUsers.find(u => u.id === formIdUser);
        const username = formRole === 'admin'
          ? (selectedSimpelUser?.username || formUsername).trim()
          : formUsername.trim();

        await updateUser(formId!, {
          username,
          password: formRole === 'prodi' ? (formPassword || undefined) : undefined,
          role: formRole,
          id_prodi: formRole === 'prodi' ? formIdProdi : null,
          id_user: formRole === 'admin' ? formIdUser : null
        });
        Toast.fire({ icon: 'success', title: 'Pengguna berhasil diperbarui' });
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

  // ── Filtered admin users for dropdown ──
  const filteredAdminUsers = simpelUsers.filter(u =>
    u.full_name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(adminSearch.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(adminSearch.toLowerCase()))
  );

  // ── Filter only Vokasi study programs (exclude Fakultas, Pasca Sarjana etc.) ──
  const VOKASI_CODES = ['ADP', 'AKT', 'MP', 'PUR', 'PTI', 'PROMKES', 'BOGA', 'BUSANA', 'RIAS', 'ELKO', 'ELKA', 'MESIN', 'OTO', 'SIPIL'];
  const vokasiPrograms = studyPrograms.filter(sp => VOKASI_CODES.includes(sp.code));

  return (
    <div className="view" id="view-manajemen-user">
      <style>{SEARCHABLE_CSS}</style>

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
            Kelola akun login SIGAP — tambah, edit, dan hapus user Prodi & Admin.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar-inner" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        padding: '16px 28px',
        background: 'var(--white)',
        borderRadius: '16px',
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

      {/* Table */}
      <div className="tbl-wrap">
        <table className="ftable" id="tbl-manajemen-user">
          <thead>
            <tr>
              <th className="text-center" style={{ width: '50px' }}>No</th>
              <th className="text-left" style={{ minWidth: '180px' }}>Username</th>
              <th className="text-left" style={{ minWidth: '100px' }}>Role</th>
              <th className="text-left" style={{ minWidth: '180px' }}>Nama / Prodi</th>
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
            ) : (() => {
              const sortedUsers = [...users].sort((a, b) => {
                if (a.role === 'admin' && b.role !== 'admin') return -1;
                if (a.role !== 'admin' && b.role === 'admin') return 1;
                return a.username.localeCompare(b.username);
              });
              const filtered = sortedUsers.filter(u => 
                u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.prodi_name && u.prodi_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.prodi_code && u.prodi_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
              );

              if (filtered.length === 0) {
                return (
                  <tr>
                    <td colSpan={5} className="text-center">Tidak ada data pengguna</td>
                  </tr>
                );
              }

              return filtered.map((u, i) => (
                <tr key={u.id}>
                  <td className="text-center">{i + 1}</td>
                  <td className="text-left"><strong>{u.username}</strong></td>
                  <td className="text-left">
                    <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-left">
                    {u.role === 'admin' ? (
                      <span>
                        {u.full_name ? (
                          <><i className="fa-solid fa-user-shield" style={{ color: '#0072ff', marginRight: '6px' }}></i>{u.full_name}</>
                        ) : (
                          <em style={{ color: '#94a3b8' }}>Admin</em>
                        )}
                      </span>
                    ) : (
                      <span>
                        {u.prodi_name ? (
                          <><span style={{ color: '#0072ff', fontWeight: 600, marginRight: '6px' }}>{u.prodi_code}</span> — {u.prodi_name}</>
                        ) : (
                          <em style={{ color: '#94a3b8' }}>—</em>
                        )}
                      </span>
                    )}
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
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* ═══ MODAL ═══ */}
      {isModalOpen && (
        <div className="modal open" id="modal-manajemen-user">
          <div className="modal-box">
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-users-gear"></i> {modalMode === 'add' ? 'Tambah User Baru' : 'Edit User'}</h3>
              <button type="button" className="close-x" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form id="form-user" onSubmit={handleSubmit}>

                {/* ── 1. ROLE (paling atas) ── */}
                <div className="fg">
                  <label><i className="fa-solid fa-shield-halved" style={{ marginRight: '6px', color: '#0072ff' }}></i>Role <span className="req">*</span></label>
                  <select 
                    className="flt-select" 
                    value={formRole} 
                    onChange={(e) => {
                      const newRole = e.target.value as 'admin' | 'prodi';
                      setFormRole(newRole);
                      // Reset relevant fields
                      setFormUsername('');
                      setFormIdProdi('');
                      setFormIdUser('');
                      setAdminSearch('');
                    }}
                  >
                    <option value="prodi">PRODI</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </div>

                {/* ── 2a. PRODI FORM ── */}
                {formRole === 'prodi' && (
                  <>
                    <div className="fg">
                      <label>Username <span className="req">*</span></label>
                      <input 
                        type="text" 
                        value={formUsername} 
                        onChange={(e) => setFormUsername(e.target.value)} 
                        required 
                        placeholder="Contoh: d4-te, d4-ak, d3-te..."
                      />
                    </div>
                    <div className="fg">
                      <label>Password {modalMode === 'edit' && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(Kosongkan jika tidak ingin mengubah)</span>} <span className="req">{modalMode === 'add' ? '*' : ''}</span></label>
                      <input 
                        type="text" 
                        value={formPassword} 
                        onChange={(e) => setFormPassword(e.target.value)} 
                        required={modalMode === 'add'} 
                        placeholder={modalMode === 'edit' ? 'Ketik password baru...' : 'Ketik password...'}
                      />
                    </div>
                    <div className="fg">
                      <label><i className="fa-solid fa-graduation-cap" style={{ marginRight: '6px', color: '#0072ff' }}></i>Program Studi <span className="req">*</span></label>
                      <select 
                        className="flt-select" 
                        value={formIdProdi} 
                        onChange={(e) => setFormIdProdi(e.target.value)}
                        required
                      >
                        <option value="">— Pilih Program Studi —</option>
                        {vokasiPrograms.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.code} — {sp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* ── 2b. ADMIN FORM ── */}
                {formRole === 'admin' && (
                  <>
                    <div className="fg">
                      <label><i className="fa-solid fa-user-tie" style={{ marginRight: '6px', color: '#0072ff' }}></i>Pilih User SIMPEL <span className="req">*</span></label>
                      <div className={`searchable-dropdown ${adminDropOpen ? 'open' : ''}`} ref={adminDropRef}>
                        <input
                          type="text"
                          className="sd-input"
                          placeholder="Ketik nama atau username untuk mencari..."
                          value={adminSearch}
                          onChange={(e) => {
                            setAdminSearch(e.target.value);
                            setAdminDropOpen(true);
                            if (!e.target.value.trim()) setFormIdUser('');
                          }}
                          onFocus={() => setAdminDropOpen(true)}
                        />
                        <i className="fa-solid fa-chevron-down sd-caret"></i>
                        {adminDropOpen && (
                          <div className="sd-list">
                            {filteredAdminUsers.length === 0 ? (
                              <div className="sd-empty">
                                <i className="fa-solid fa-search" style={{ marginRight: '6px' }}></i>
                                Tidak ditemukan user dengan kata kunci tersebut
                              </div>
                            ) : (
                              filteredAdminUsers.slice(0, 20).map((su) => (
                                <div
                                  key={su.id}
                                  className="sd-item"
                                  onClick={() => {
                                    setFormIdUser(su.id);
                                    setAdminSearch(su.full_name);
                                    setFormUsername(su.username || su.full_name);
                                    setAdminDropOpen(false);
                                  }}
                                  style={formIdUser === su.id ? { background: '#eff6ff', color: '#0072ff' } : {}}
                                >
                                  <span>{su.full_name}</span>
                                  <span className="sd-sub" style={{ color: '#0072ff' }}>@{su.username || '—'}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {formIdUser && (() => {
                        const selectedUser = simpelUsers.find(u => u.id === formIdUser);
                        return (
                          <div style={{ marginTop: '8px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '0.85rem', color: '#15803d' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <i className="fa-solid fa-circle-check"></i>
                              <strong>{selectedUser?.full_name}</strong>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#0072ff', marginLeft: '22px' }}>
                              Username login SIGAP: <strong>@{selectedUser?.username}</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '22px', marginTop: '2px' }}>
                              Password menggunakan password SIMPEL
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
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
