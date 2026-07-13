import { useState, useEffect, useRef } from 'react';
import { useAuth, useApp } from './contexts/AuthContext';
import Swal from 'sweetalert2';

import { getItems, createItem, updateItem, updateDriveLink, importRenstra } from './services/items.service';
import { getProdiLinks, updateProdiLink, createProdiLink } from './services/prodi.service';
import { getPurchases, createPurchase, updatePurchase } from './services/purchases.service';
import { getDepartemen, createDepartemen, updateDepartemen } from './services/departemen.service';
import { getRenstraProgress, upsertRenstraProgress } from './services/renstra.service';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { FilterBar } from './components/FilterBar';

// Pages
import { Dashboard } from './pages/Dashboard';
import { RkaData } from './pages/RkaData';
import { RkaRpd } from './pages/RkaRpd';
import { RenstraTanggungJawab } from './pages/RenstraTanggungJawab';
import { RenstraCapaian } from './pages/RenstraCapaian';
import { Pembelajaran } from './pages/Pembelajaran';
import { Pembelian } from './pages/Pembelian';
import { ManajemenProdi } from './pages/ManajemenProdi';
import { ManajemenDepartemen } from './pages/ManajemenDepartemen';
import { ManajemenUser } from './pages/ManajemenUser';
import { Laporan } from './pages/Laporan';

import type { SipItem, Purchase, RenstraProgress } from './types';
import * as XLSX from 'xlsx';
import { buildTree, calculateAggregateAmounts } from './utils/helpers';

export function SippApp() {
  const { user, login } = useAuth();
  const {
    tab,
    filterYear,
    filterTriwulan,
    filterProdi,
    setProdiLinks,
    setDepartemen,
    prodiLinks,
    departemen
  } = useApp();

  const isAdmin = user?.role === 'admin';
  const importInputRef = useRef<HTMLInputElement>(null);

  // Login page inputs
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Tab items state
  const [items, setItems] = useState<SipItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [renstraProgress, setRenstraProgress] = useState<RenstraProgress[]>([]);

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // 1. Modal: Data Dukung (Receipt / Supporting link)
  const [ddItemId, setDdItemId] = useState<number | null>(null);
  const [ddField, setDdField] = useState('');
  const [ddLink, setDdLink] = useState('');

  // 2. Modal: Item RKA / Renstra / Pembelajaran
  const [miId, setMiId] = useState<number | null>(null);
  const [miType, setMiType] = useState('keuangan_rka');
  const [miLevel, setMiLevel] = useState(1);
  const [miParent, setMiParent] = useState<number | null>(null);
  const [miProdiCode, setMiProdiCode] = useState('');
  const [miCode, setMiCode] = useState('');
  const [miDesc, setMiDesc] = useState('');
  const [miVolume, setMiVolume] = useState('');
  const [miUnit, setMiUnit] = useState('');
  const [miPrice, setMiPrice] = useState('');
  const [miSource, setMiSource] = useState('');
  const [miSourceCustom, setMiSourceCustom] = useState('');
  const [miIncentive, setMiIncentive] = useState('');
  const [miReceipt, setMiReceipt] = useState('');
  const [miDukung, setMiDukung] = useState('');
  const [miRSatuan, setMiRSatuan] = useState('');
  const [miRTuniv, setMiRTuniv] = useState('');
  const [miRTunit, setMiRTunit] = useState('');
  const [miRAnggaran, setMiRAnggaran] = useState('');
  const [miPTunit, setMiPTunit] = useState('');
  const [miPCapaian, setMiPCapaian] = useState('');
  const [miPCapaianPct, setMiPCapaianPct] = useState('');
  const [miPProgress, setMiPProgress] = useState('');
  // RPD monthly inputs
  const [rpdMonths, setRpdMonths] = useState<Record<string, string>>({
    jan: '', feb: '', mar: '', apr: '', mei: '', jun: '',
    jul: '', aug: '', sep: '', oct: '', nov: '', dec: ''
  });

  // 3. Modal: Edit Capaian Renstra (Triwulan)
  const [mcrItemId, setMcrItemId] = useState<number | null>(null);
  const [mcrCapaian, setMcrCapaian] = useState('');
  const [mcrProgress, setMcrProgress] = useState('');
  const [mcrIssues, setMcrIssues] = useState('');
  const [mcrStrategy, setMcrStrategy] = useState('');
  const [mcrDukung, setMcrDukung] = useState('');

  // 4. Modal: Prodi Links
  const [mpId, setMpId] = useState<number | null>(null);
  const [mpName, setMpName] = useState('');
  const [mpCode, setMpCode] = useState('');
  const [mpLinks, setMpLinks] = useState<Record<string, string>>({
    l0: '', l1: '', l2: '', l3: '', l4: '', l5: '', l6: ''
  });
  const [mpKet, setMpKet] = useState('');

  // 5. Modal: Pembelian
  const [pbId, setPbId] = useState<number | null>(null);
  const [pbName, setPbName] = useState('');
  const [pbProdiCode, setPbProdiCode] = useState('');
  const [pbQty, setPbQty] = useState('1');
  const [pbPrice, setPbPrice] = useState('');
  const [pbLink, setPbLink] = useState('');
  const [pbKet, setPbKet] = useState('');

  // 6. Modal: Manajemen Prodi
  const [mprodiId, setMprodiId] = useState<number | null>(null);
  const [mprodiCode, setMprodiCode] = useState('');
  const [mprodiName, setMprodiName] = useState('');
  const [mprodiDept, setMprodiDept] = useState('');
  const [mprodiKet, setMprodiKet] = useState('');

  // 7. Modal: Manajemen Departemen
  const [mdeptId, setMdeptId] = useState<number | null>(null);
  const [mdeptCode, setMdeptCode] = useState('');
  const [mdeptName, setMdeptName] = useState('');

  // 8. Modal: Renstra Kegiatan (Rincian)
  const [rkItemId, setRkItemId] = useState<number | null>(null);
  const [rkTitle, setRkTitle] = useState('');

  // Trigger data fetching on filter or tab change
  const refreshData = async () => {
    if (!user) return;
    try {
      if (tab === 'rka-data' || tab === 'rka-rpd') {
        const data = await getItems('keuangan_rka');
        setItems(data);
      } else if (tab === 'renstra-tanggung' || tab === 'renstra-capaian') {
        const [itemsData, progressData] = await Promise.all([
          getItems('renstra'),
          getRenstraProgress(
            user.role === 'admin' ? filterProdi : (user.prodi_code || ''),
            filterTriwulan === 'Triwulan 1' ? 1 : filterTriwulan === 'Triwulan 2' ? 2 : filterTriwulan === 'Triwulan 3' ? 3 : 4
          )
        ]);
        setItems(itemsData);
        setRenstraProgress(progressData);
      } else if (tab === 'pembelajaran') {
        const data = await getItems('pembelajaran');
        setItems(data);
      } else if (tab === 'pembelian') {
        const data = await getPurchases();
        setPurchases(data);
      } else if (tab === 'manajemen-prodi') {
        const data = await getProdiLinks(user.role, user.username);
        setProdiLinks(data);
      } else if (tab === 'manajemen-departemen') {
        const data = await getDepartemen();
        setDepartemen(data);
      }
    } catch (err: any) {
      console.error('Refresh error:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [tab, filterYear, filterTriwulan, filterProdi, user]);

  // Load configuration dropdowns on boot
  useEffect(() => {
    async function loadConfig() {
      if (!user) return;
      try {
        const [prodis, depts] = await Promise.all([
          getProdiLinks(user.role, user.username),
          getDepartemen()
        ]);
        setProdiLinks(prodis);
        setDepartemen(depts);
      } catch (err) {
        console.error('Config fetch failed:', err);
      }
    }
    loadConfig();
  }, [user]);

  // Toggle body class for auth state (required by style.css rules)
  useEffect(() => {
    if (!user) {
      document.body.classList.add('not-logged-in');
    } else {
      document.body.classList.remove('not-logged-in');
    }
  }, [user]);

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setLoginError('');
    try {
      await login(loginUsername.trim(), loginPassword);
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal.');
    } finally {
      setVerifying(false);
    }
  };

  if (!user) {
    return (
      <div className="login-screen" id="login-screen">
        {/* Decorative SVG circle pattern — sama persis dengan FilterBar lap-banner */}
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMaxYMid slice"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          <circle cx="850" cy="300" r="280" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
          <circle cx="730" cy="540" r="340" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
          <circle cx="920" cy="-30" r="250" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          <circle cx="620" cy="120" r="160" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          <circle cx="150" cy="500" r="200" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <circle cx="50" cy="100" r="120" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </svg>

        <div className="login-card">
          <div className="login-logo">
            <span className="logo-sip-large">SIGAP</span>
            <p className="logo-subtitle">Sistem Gerak Anggaran & Pencapaian Prodi</p>
            <p className="logo-desc">Fakultas Vokasi — Universitas Negeri Yogyakarta</p>
          </div>

          {loginError && (
            <div className="login-error" id="login-error">
              <i className="fa-solid fa-circle-exclamation"></i> <span>{loginError}</span>
            </div>
          )}

          <form id="login-form" onSubmit={handleLoginSubmit}>
            <div className="form-group-login">
              <label htmlFor="login-username"><i className="fa-solid fa-user"></i> Username</label>
              <input 
                type="text" 
                id="login-username" 
                placeholder="Username (misal: d4-ts)..." 
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="form-group-login">
              <label htmlFor="login-password"><i className="fa-solid fa-lock"></i> Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id="login-password" 
                  placeholder="Password..." 
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  id="btn-toggle-password" 
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            <button type="submit" className="btn-login" id="btn-login-submit" disabled={verifying}>
              {verifying ? (
                <><span>Memverifikasi...</span> <i className="fa-solid fa-spinner fa-spin"></i></>
              ) : (
                <><span>Masuk</span> <i className="fa-solid fa-right-to-bracket"></i></>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MODAL ACTION FUNCTIONS ---

  const handleOpenDriveModal = (itemId: number, field: string) => {
    const item = items.find(i => i.id === itemId);
    setDdItemId(itemId);
    setDdField(field);
    setDdLink(item ? (item as any)[field] || '' : '');
    setActiveModal('dukung');
  };

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });

  const handleSaveDriveLink = async () => {
    if (!ddItemId || !ddField) return;
    if (!ddLink.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Input Link',
        text: 'Link Drive wajib diisi.',
        confirmButtonColor: '#0072ff'
      });
      return;
    }
    try {
      await updateDriveLink(ddItemId, ddField, ddLink.trim());
      setActiveModal(null);
      refreshData();
      Toast.fire({
        icon: 'success',
        title: 'Link Drive berhasil disimpan'
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    }
  };


  const handleOpenAddItem = () => {
    let type = 'keuangan_rka';
    if (tab === 'pembelajaran') type = 'pembelajaran';
    else if (tab === 'renstra-tanggung' || tab === 'renstra-capaian') type = 'renstra';

    setMiId(null);
    setMiType(type);
    setMiLevel(1);
    setMiParent(null);
    setMiProdiCode('');
    setMiCode('');
    setMiDesc('');
    setMiVolume('');
    setMiUnit('');
    setMiPrice('');
    setMiSource('');
    setMiSourceCustom('');
    setMiIncentive('');
    setMiReceipt('');
    setMiDukung('');
    setMiRSatuan('');
    setMiRTuniv('');
    setMiRTunit('');
    setMiRAnggaran('');
    setMiPTunit('');
    setMiPCapaian('');
    setMiPCapaianPct('');
    setMiPProgress('');
    setRpdMonths({
      jan: '', feb: '', mar: '', apr: '', mei: '', jun: '',
      jul: '', aug: '', sep: '', oct: '', nov: '', dec: ''
    });
    setActiveModal('item');
  };

  const handleOpenEditItem = (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    setMiId(id);
    setMiType(item.type);
    setMiLevel(item.level);
    setMiParent(item.parent_id);
    setMiProdiCode(item.prodi_code || '');
    setMiCode(item.code || '');
    setMiDesc(item.description || '');
    setMiDukung(item.supporting_data_link || '');

    if (item.type === 'renstra') {
      setMiRSatuan(item.satuan || '');
      setMiRTuniv(item.target_univ || '');
      setMiRTunit(item.target_unit || '');
      setMiRAnggaran(item.amount ? String(item.amount) : '');
    } else if (item.type === 'pembelajaran') {
      setMiPTunit(item.target_unit || '');
      setMiPCapaian(item.capaian || '');
      setMiPCapaianPct(item.capaian_pct || '');
      setMiPProgress(item.progress || '');
    } else {
      setMiVolume(item.volume || '');
      setMiUnit(item.unit || '');
      setMiPrice(item.price ? String(item.price) : '');
      setMiSource(item.source_of_fund || '');
      setMiIncentive(item.performance_incentive ? String(item.performance_incentive) : '');
      setMiReceipt(item.receipt_link || '');
      setRpdMonths({
        jan: item.jan ? String(item.jan) : '',
        feb: item.feb ? String(item.feb) : '',
        mar: item.mar ? String(item.mar) : '',
        apr: item.apr ? String(item.apr) : '',
        mei: item.mei ? String(item.mei) : '',
        jun: item.jun ? String(item.jun) : '',
        jul: item.jul ? String(item.jul) : '',
        aug: item.aug ? String(item.aug) : '',
        sep: item.sep ? String(item.sep) : '',
        oct: item.oct ? String(item.oct) : '',
        nov: item.nov ? String(item.nov) : '',
        dec: item.dec ? String(item.dec) : ''
      });
    }

    setActiveModal('item');
  };

  const handleOpenAddSubItem = (parentId: number, level: number) => {
    handleOpenAddItem();
    setMiParent(parentId);
    setMiLevel(level);
  };

  const handleSaveItem = async () => {
    if (!miDesc.trim()) return alert('Uraian/Deskripsi wajib diisi.');

    let finalProdiCode = miProdiCode || null;
    if (miParent) {
      const parentNode = items.find(i => i.id === miParent);
      if (parentNode) finalProdiCode = parentNode.prodi_code;
    }

    const payload: Partial<SipItem> = {
      parent_id: miParent,
      level: miLevel,
      code: miCode.trim(),
      description: miDesc.trim(),
      type: miType,
      supporting_data_link: miDukung.trim() || null,
      prodi_code: finalProdiCode
    };

    if (miType === 'keuangan_rka') {
      payload.volume = miVolume.trim() || null;
      payload.unit = miUnit.trim() || null;
      payload.price = miPrice ? parseFloat(miPrice) : null;
      payload.source_of_fund = miSource === '__new__' ? miSourceCustom.trim() : (miSource || null);
      payload.performance_incentive = miIncentive ? parseFloat(miIncentive) : null;
      payload.receipt_link = miReceipt.trim() || null;

      const vol = parseFloat(miVolume) || 0;
      payload.amount = payload.price ? payload.price * vol : 0;

      // RPD
      Object.keys(rpdMonths).forEach(m => {
        (payload as any)[m] = rpdMonths[m] ? parseFloat(rpdMonths[m]) : 0;
      });
    } else if (miType === 'renstra') {
      payload.satuan = miRSatuan.trim() || null;
      payload.target_univ = miRTuniv.trim() || null;
      payload.target_unit = miRTunit.trim() || null;
      payload.amount = miRAnggaran ? parseFloat(miRAnggaran) : 0;
    } else if (miType === 'pembelajaran') {
      payload.target_unit = miPTunit.trim() || null;
      payload.capaian = miPCapaian.trim() || null;
      payload.capaian_pct = miPCapaianPct.trim() || null;
      payload.progress = miPProgress.trim() || null;
    }

    // Assign created_at for matching RKA triwulan filters
    if (!miId) {
      const selectedYear = filterYear;
      const twMonthMap: Record<string, number> = {
        'Triwulan 1': 0, 'Triwulan 2': 3, 'Triwulan 3': 6, 'Triwulan 4': 9
      };
      const month = twMonthMap[filterTriwulan] ?? 0;
      (payload as any).created_at = new Date(Date.UTC(selectedYear, month, 1, 0, 0, 0)).toISOString();
    }

    try {
      if (miId) {
        await updateItem(miId, payload);
        Toast.fire({
          icon: 'success',
          title: 'Item berhasil diperbarui'
        });
      } else {
        await createItem(payload);
        Toast.fire({
          icon: 'success',
          title: 'Item berhasil ditambahkan'
        });
      }
      setActiveModal(null);
      refreshData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    }
  };


  // 3. Modal: Capaian Renstra (Triwulan progress)
  const handleOpenCapaianModal = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const prog = renstraProgress.find(p => p.item_id === itemId);

    setMcrItemId(itemId);
    setMcrCapaian(prog?.capaian || '');
    setMcrProgress(prog?.progress || '');
    setMcrIssues(prog?.issues || '');
    setMcrStrategy(prog?.strategy || '');
    setMcrDukung(prog?.supporting_data_link || '');
    setActiveModal('capaian-renstra');
  };

  const handleSaveCapaianRenstra = async () => {
    if (!mcrItemId) return;
    const activeProdi = user?.role === 'admin' ? filterProdi : (user?.prodi_code || '');
    if (!activeProdi) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Prodi',
        text: 'Pilih Prodi terlebih dahulu.',
        confirmButtonColor: '#0072ff'
      });
      return;
    }

    if (!mcrCapaian.trim() || !mcrProgress.trim() || !mcrIssues.trim() || !mcrStrategy.trim() || !mcrDukung.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Belum Lengkap',
        text: 'Pastikan seluruh isian (Capaian, Progress, Kendala, Strategi, Data Dukung) sudah terisi semua.',
        confirmButtonColor: '#0072ff'
      });
      return;
    }


    const activeTwNum = filterTriwulan === 'Triwulan 1' ? 1 
      : filterTriwulan === 'Triwulan 2' ? 2 
      : filterTriwulan === 'Triwulan 3' ? 3 
      : 4;

    const existingProg = renstraProgress.find(p => p.item_id === mcrItemId);

    // Auto calculate Capaian %
    const targetUnitStr = existingProg?.target_unit || '';
    const targetVal = parseFloat(targetUnitStr.replace(/[^0-9.]/g, ''));
    const capVal = parseFloat(mcrCapaian.replace(/[^0-9.]/g, ''));

    let capPct = '';
    if (!isNaN(targetVal) && !isNaN(capVal) && targetVal > 0) {
      capPct = Math.round((capVal / targetVal) * 100).toString();
    } else if (mcrCapaian === '0' || capVal === 0) {
      capPct = '0';
    }

    try {
      await upsertRenstraProgress({
        item_id: mcrItemId,
        prodi_code: activeProdi,
        triwulan: activeTwNum,
        capaian: mcrCapaian,
        capaian_pct: capPct,
        progress: mcrProgress.trim(),
        issues: mcrIssues.trim(),
        strategy: mcrStrategy.trim(),
        supporting_data_link: mcrDukung.trim(),
        target_unit: existingProg ? existingProg.target_unit : null,
        amount: existingProg ? existingProg.amount : 0
      });
      setActiveModal(null);
      refreshData();
      Toast.fire({
        icon: 'success',
        title: 'Capaian berhasil disimpan'
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    }
  };


  // 4. Modal: Add / Edit Purchase
  const handleOpenAddPurchase = () => {
    setPbId(null);
    setPbName('');
    setPbProdiCode(user?.role === 'admin' ? '' : (user?.prodi_code || ''));
    setPbQty('1');
    setPbPrice('');
    setPbLink('');
    setPbKet('');
    setActiveModal('pembelian');
  };

  const handleOpenEditPurchase = (id: number) => {
    const p = purchases.find(item => item.id === id);
    if (!p) return;

    setPbId(p.id);
    setPbName(p.item_name);
    setPbProdiCode(p.prodi_code || '');
    setPbQty(String(p.quantity));
    setPbPrice(String(p.price));
    setPbLink(p.drive_link);
    setPbKet(p.keterangan || '');
    setActiveModal('pembelian');
  };

  const handleSavePurchase = async () => {
    if (!pbName.trim() || !pbQty || !pbPrice || !pbLink.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Input Tidak Lengkap',
        text: 'Semua field bertanda * wajib diisi.',
        confirmButtonColor: '#0072ff'
      });
      return;
    }

    const payload = {
      item_name: pbName.trim(),
      quantity: parseInt(pbQty),
      price: parseFloat(pbPrice),
      drive_link: pbLink.trim(),
      keterangan: pbKet.trim(),
      prodi_code: pbProdiCode || null
    };

    try {
      if (pbId) {
        await updatePurchase(pbId, payload);
        Toast.fire({
          icon: 'success',
          title: 'Pembelian berhasil diperbarui'
        });
      } else {
        await createPurchase(payload);
        Toast.fire({
          icon: 'success',
          title: 'Pembelian berhasil ditambahkan'
        });
      }
      setActiveModal(null);
      refreshData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    }
  };


  // Excel Import/Export handlers
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Mengimpor file Excel baru akan menghapus semua data Renstra tahun ' + filterYear + '!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Impor!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (!result.isConfirmed) {
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

          let headerRowIdx = -1;
          let kodeColIdx = -1;

          for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            if (!row) continue;
            for (let j = 0; j < row.length; j++) {
              const cellVal = row[j] ? String(row[j]).trim().toUpperCase() : '';
              if (cellVal === 'KODE') {
                headerRowIdx = i;
                kodeColIdx = j;
                break;
              }
            }
            if (headerRowIdx >= 0) break;
          }

          if (headerRowIdx < 0 || kodeColIdx < 0) {
            Swal.fire({
              icon: 'error',
              title: 'Format Excel Salah',
              text: 'Format Excel tidak sesuai. Pastikan ada baris header dengan kolom "KODE".',
              confirmButtonColor: '#0072ff'
            });
            e.target.value = '';
            return;
          }


        const headerRow = rows[headerRowIdx];
        let satuanColIdx = kodeColIdx + 1;
        let targetFakColIdx = kodeColIdx + 2;
        let targetUnitColIdx = kodeColIdx + 3;
        let anggaranColIdx = kodeColIdx + 4;

        for (let j = kodeColIdx + 1; j < headerRow.length; j++) {
          const hdr = headerRow[j] ? String(headerRow[j]).trim().toUpperCase() : '';
          if (hdr.includes('SATUAN')) satuanColIdx = j;
          else if (hdr.includes('TARGET') && (hdr.includes('UNIV') || hdr.includes('FAKULTAS'))) targetFakColIdx = j;
          else if (hdr.includes('TARGET') && (hdr.includes('UNIT') || hdr.includes('PRODI'))) targetUnitColIdx = j;
          else if (hdr.includes('ANGGARAN') || hdr.includes('AMOUNT')) anggaranColIdx = j;
        }

        const merchantsEndCol = kodeColIdx;
        const itemsToInsert: any[] = [];
        let lastL1: any = null;
        let lastL2: any = null;
        let lastL3: any = null;
        let lastL4: any = null;

        for (let idx = headerRowIdx + 1; idx < rows.length; idx++) {
          const row = rows[idx];
          if (!row || row.length === 0) continue;

          let uraianParts: string[] = [];
          let lastNonEmptyCol = -1;

          for (let col = 0; col < merchantsEndCol; col++) {
            const cellVal = row[col] !== undefined && row[col] !== null ? String(row[col]).trim() : '';
            if (cellVal) {
              uraianParts.push(cellVal);
              lastNonEmptyCol = col;
            }
          }

          const description = uraianParts.join(' ').trim();
          if (!description) continue;

          if (description.toUpperCase() === 'URAIAN' ||
            description.toUpperCase().startsWith('DAFTAR KEGIATAN') ||
            description.toUpperCase().startsWith('RENSTRA') ||
            description.toUpperCase().startsWith('TAHUN:')) continue;

          let level = 0;
          const desc = description.toLowerCase();
          
          if (desc.includes('kegiatan') || desc.match(/^\d+\.\s*kegiatan/i)) level = 5;
          else if (desc.includes('[iku') || desc.match(/^[\d.]+\s*\[iku/i)) level = 4;
          else if (desc.includes('[p') && desc.match(/\[p\d/i)) level = 3;
          else if (desc.includes('bidang') || desc.match(/^\d+\.\s*bidang/i)) level = 2;
          else if (desc.includes('rencana strategis') || desc.startsWith('renstra')) level = 1;
          else {
            if (merchantsEndCol <= 1) {
              level = 5; // Default to lowest if no indentation and no text clues
            } else {
              if (lastNonEmptyCol === 0) level = 2;
              else if (lastNonEmptyCol === 1) level = 3;
              else if (lastNonEmptyCol === 2) level = 4;
              else level = 5;
            }
          }

          const kode = row[kodeColIdx] !== undefined && row[kodeColIdx] !== null ? String(row[kodeColIdx]).trim() : '';
          const satuan = row[satuanColIdx] !== undefined && row[satuanColIdx] !== null ? String(row[satuanColIdx]).trim() : '';
          const targetFakultas = row[targetFakColIdx] !== undefined && row[targetFakColIdx] !== null ? String(row[targetFakColIdx]).trim() : '';
          const targetUnit = row[targetUnitColIdx] !== undefined && row[targetUnitColIdx] !== null ? String(row[targetUnitColIdx]).trim() : '';

          let anggaran = 0;
          if (row[anggaranColIdx] !== undefined && row[anggaranColIdx] !== null) {
            const rawAngg = String(row[anggaranColIdx]).replace(/[^0-9.-]+/g, "");
            anggaran = parseFloat(rawAngg) || 0;
          }

          const itemObj: any = {
            tempId: idx,
            level,
            code: kode,
            description,
            satuan,
            target_univ: targetFakultas,
            target_unit: targetUnit,
            amount: anggaran,
            tempParentId: null
          };

          if (level === 1) {
            lastL1 = itemObj;
            lastL2 = null;
            lastL3 = null;
            lastL4 = null;
          } else if (level === 2) {
            if (lastL1) itemObj.tempParentId = lastL1.tempId;
            lastL2 = itemObj;
            lastL3 = null;
            lastL4 = null;
          } else if (level === 3) {
            if (lastL2) itemObj.tempParentId = lastL2.tempId;
            lastL3 = itemObj;
            lastL4 = null;
          } else if (level === 4) {
            if (lastL3) itemObj.tempParentId = lastL3.tempId;
            lastL4 = itemObj;
          } else if (level === 5) {
            if (lastL4) itemObj.tempParentId = lastL4.tempId;
          }

          itemsToInsert.push(itemObj);
        }

        if (itemsToInsert.length === 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Data Kosong',
            text: 'Format Excel tidak sesuai atau data kosong.',
            confirmButtonColor: '#0072ff'
          });
          e.target.value = '';
          return;
        }

        await importRenstra(itemsToInsert, filterYear);
        Toast.fire({
          icon: 'success',
          title: `Data Renstra berhasil diimpor! (${itemsToInsert.length} item)`
        });
        refreshData();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Mengimpor',
          text: err.message,
          confirmButtonColor: '#0072ff'
        });
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
    });
  };


  const handleExportClick = () => {
    const { roots: rawRoots } = buildTree(items);
    calculateAggregateAmounts(rawRoots);

    const isCapaian = tab === 'renstra-capaian';

    const dataRows: any[][] = [
      ['DAFTAR KEGIATAN RENSTRA'],
      [isCapaian ? 'RENSTRA CAPAIAN' : 'RENSTRA TANGGUNG JAWAB'],
      [`Tahun: ${filterYear} — Triwulan: ${isCapaian ? filterTriwulan : 'Semua'}`],
      [],
    ];

    const parseNumeric = (val: any) => {
      if (val === null || val === undefined || val === '') return '';
      if (val.toString().includes(':')) return val; // e.g. "1:20" ratio
      const cleaned = val.toString().replace(/,/g, '.');
      const num = Number(cleaned);
      return isNaN(num) ? val : num;
    };

    if (isCapaian) {
      dataRows.push(['URAIAN', '', '', '', '', 'KODE', 'SATUAN', 'TARGET FAKULTAS', 'TARGET UNIT', 'DATA PENDUKUNG', 'CAPAIAN', 'CAPAIAN %', 'PROGRESS/KEGIATAN', 'KENDALA/PERMASALAHAN', 'STRATEGI/TINDAK LANJUT']);
    } else {
      dataRows.push(['URAIAN', '', '', '', '', 'KODE', 'SATUAN', 'TARGET FAKULTAS', 'TARGET UNIT', 'ANGGARAN']);
    }

    const addNode = (node: any) => {
      if (node.level > 4) return;

      const prog = renstraProgress.find(p => p.item_id === node.id);

      if (isCapaian) {
        const cap = prog?.capaian || '';
        const capPct = prog?.capaian_pct || '';
        const progressVal = prog?.progress || '';
        const issuesVal = prog?.issues || '';
        const strategyVal = prog?.strategy || '';
        const dukungVal = prog?.supporting_data_link || '';

        const row = Array(15).fill('');
        let indentCol = 0;
        if (node.level === 1 || node.level === 2) indentCol = 0;
        else if (node.level === 3) indentCol = 1;
        else if (node.level === 4) indentCol = 2;
        else if (node.level >= 5) indentCol = 3;
        
        row[indentCol] = node.description;
        row[5] = node.code || '';
        row[6] = node.satuan || '';
        row[7] = parseNumeric(node.target_univ);
        row[8] = parseNumeric(prog?.target_unit);
        row[9] = dukungVal;
        row[10] = cap;
        row[11] = capPct ? capPct + '%' : '';
        row[12] = progressVal;
        row[13] = issuesVal;
        row[14] = strategyVal;
        
        dataRows.push(row);
      } else {
        const displayAmount = prog ? prog.amount : (node._progAmount !== undefined ? node._progAmount : node.amount);
        const row = Array(10).fill('');
        let indentCol = 0;
        if (node.level === 1 || node.level === 2) indentCol = 0;
        else if (node.level === 3) indentCol = 1;
        else if (node.level === 4) indentCol = 2;
        else if (node.level >= 5) indentCol = 3;
        
        row[indentCol] = node.description;
        row[5] = node.code || '';
        row[6] = node.satuan || '';
        row[7] = parseNumeric(node.target_univ);
        row[8] = parseNumeric(prog?.target_unit);
        row[9] = displayAmount || 0;
        
        dataRows.push(row);
      }

      if (node.children) {
        node.children.forEach(addNode);
      }
    };

    rawRoots.forEach(addNode);

    const ws = XLSX.utils.aoa_to_sheet(dataRows);

    // Dynamic columns configuration
    const maxCols = isCapaian ? 15 : 10;
    const cols = [
      { wch: 35 }, // Col A
      { wch: 30 }, // Col B
      { wch: 35 }, // Col C
      { wch: 40 }, // Col D
      { wch: 5 },  // Col E (Separator space)
      { wch: 10 }, // Col F (KODE)
      { wch: 12 }, // Col G (SATUAN)
      { wch: 18 }, // Col H (TARGET FAKULTAS)
      { wch: 18 }, // Col I (TARGET UNIT)
    ];
    if (isCapaian) {
      cols.push(
        { wch: 25 }, // Col J (DATA PENDUKUNG)
        { wch: 15 }, // Col K (CAPAIAN)
        { wch: 12 }, // Col L (CAPAIAN %)
        { wch: 35 }, // Col M (PROGRESS/KEGIATAN)
        { wch: 30 }, // Col N (KENDALA)
        { wch: 30 }  // Col O (STRATEGI)
      );
    } else {
      cols.push({ wch: 20 }); // Col J (ANGGARAN)
    }
    ws['!cols'] = cols;

    // Define cell merges
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: maxCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: maxCols - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } } // Merge URAIAN header columns A-E
    ];
    ws['!merges'] = merges;

    // Apply currency formatting to ANGGARAN column
    if (!isCapaian) {
      for (let r = 5; r < dataRows.length; r++) {
        const cellRef = XLSX.utils.encode_cell({ r, c: 9 });
        if (ws[cellRef]) {
          ws[cellRef].t = 'n';
          ws[cellRef].z = '#,##0'; // Indonesian thousands separator formatting
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Renstra');
    XLSX.writeFile(wb, `Renstra_${isCapaian ? 'Capaian' : 'TanggungJawab'}_${filterYear}.xlsx`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOpenProdiLinksModal = (id: number) => {
    const prodi = prodiLinks.find(p => p.id === id);
    if (!prodi) return;

    setMpId(prodi.id);
    setMpName(prodi.prodi_name);
    setMpCode(prodi.prodi_code);
    setMpLinks({
      l0: prodi.link_perjanjian_kinerja || '',
      l1: prodi.link_template_kinerja || '',
      l2: prodi.link_tw1 || '',
      l3: prodi.link_tw2 || '',
      l4: prodi.link_bukti_dukung_tw1 || '',
      l5: prodi.link_bukti_lama || '',
      l6: prodi.link_contoh_target || ''
    });
    setMpKet(prodi.keterangan || '');
    setActiveModal('prodi');
  };
  (window as any).handleOpenProdiLinksModal = handleOpenProdiLinksModal;

  const handleSaveProdiLinks = async () => {
    if (!mpName.trim() || !mpCode.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Input Tidak Lengkap',
        text: 'Nama dan Kode Prodi wajib diisi.',
        confirmButtonColor: '#0072ff'
      });
      return;
    }
    if (!mpId) return;

    const payload = {
      prodi_name: mpName.trim(),
      prodi_code: mpCode.trim(),
      link_perjanjian_kinerja: mpLinks.l0.trim(),
      link_template_kinerja: mpLinks.l1.trim(),
      link_tw1: mpLinks.l2.trim(),
      link_tw2: mpLinks.l3.trim(),
      link_bukti_dukung_tw1: mpLinks.l4.trim(),
      link_bukti_lama: mpLinks.l5.trim(),
      link_contoh_target: mpLinks.l6.trim(),
      keterangan: mpKet.trim()
    };

    try {
      await updateProdiLink(mpId, payload, user?.role || 'user');
      setActiveModal(null);
      refreshData();
      Toast.fire({
        icon: 'success',
        title: 'Link Prodi berhasil diperbarui'
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    }
  };


  // 6. Modal: Manajemen Prodi Add / Edit
  const handleOpenAddMprodi = () => {
    setMprodiId(null);
    setMprodiCode('');
    setMprodiName('');
    setMprodiDept('');
    setMprodiKet('');
    setActiveModal('mprodi');
  };

  const handleOpenEditMprodi = (id: number) => {
    const p = prodiLinks.find(x => x.id === id);
    if (!p) return;

    setMprodiId(p.id);
    setMprodiCode(p.prodi_code);
    setMprodiName(p.prodi_name);
    setMprodiDept(p.departemen_id ? String(p.departemen_id) : '');
    setMprodiKet(p.keterangan || '');
    setActiveModal('mprodi');
  };

  const handleSaveMprodi = async () => {
    if (!mprodiName.trim() || !mprodiCode.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Input Tidak Lengkap',
        text: 'Kode dan Nama Prodi wajib diisi.',
        confirmButtonColor: '#0072ff'
      });
      return;
    }

    const payload: any = {
      prodi_name: mprodiName.trim(),
      prodi_code: mprodiCode.trim(),
      departemen_id: mprodiDept ? parseInt(mprodiDept) : null,
      keterangan: mprodiKet.trim()
    };

    try {
      if (mprodiId) {
        const existing = prodiLinks.find(p => p.id === mprodiId);
        if (existing) {
          payload.link_perjanjian_kinerja = existing.link_perjanjian_kinerja || '';
          payload.link_template_kinerja = existing.link_template_kinerja || '';
          payload.link_tw1 = existing.link_tw1 || '';
          payload.link_tw2 = existing.link_tw2 || '';
          payload.link_bukti_dukung_tw1 = existing.link_bukti_dukung_tw1 || '';
          payload.link_bukti_lama = existing.link_bukti_lama || '';
          payload.link_contoh_target = existing.link_contoh_target || '';
        }
        await updateProdiLink(mprodiId, payload, 'admin');
        Toast.fire({
          icon: 'success',
          title: 'Data Prodi berhasil diperbarui'
        });
      } else {
        await createProdiLink(payload);
        Toast.fire({
          icon: 'success',
          title: 'Data Prodi berhasil ditambahkan'
        });
      }
      setActiveModal(null);
      refreshData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    }
  };


  // 7. Modal: Manajemen Departemen Add / Edit
  const handleOpenAddMdept = () => {
    setMdeptId(null);
    setMdeptCode('');
    setMdeptName('');
    setActiveModal('mdept');
  };

  const handleOpenEditMdept = (id: number) => {
    const d = departemen.find(x => x.id === id);
    if (!d) return;

    setMdeptId(d.id);
    setMdeptCode(d.kode_departemen);
    setMdeptName(d.nama_departemen);
    setActiveModal('mdept');
  };

  const handleSaveMdept = async () => {
    if (!mdeptCode.trim() || !mdeptName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Input Tidak Lengkap',
        text: 'Kode dan Nama Departemen wajib diisi.',
        confirmButtonColor: '#0072ff'
      });
      return;
    }

    try {
      if (mdeptId) {
        await updateDepartemen(mdeptId, mdeptCode.trim(), mdeptName.trim());
        Toast.fire({
          icon: 'success',
          title: 'Departemen berhasil diperbarui'
        });
      } else {
        await createDepartemen(mdeptCode.trim(), mdeptName.trim());
        Toast.fire({
          icon: 'success',
          title: 'Departemen berhasil ditambahkan'
        });
      }
      setActiveModal(null);
      refreshData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message,
        confirmButtonColor: '#0072ff'
      });
    }
  };


  // 8. Modal: Renstra Rincian Kegiatan
  const handleOpenKegiatanModal = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setRkItemId(itemId);
    setRkTitle(item.description);
    setActiveModal('kegiatan');
  };

  // --- RENDER CURRENT TAB VIEW ---
  const renderCurrentView = () => {
    switch (tab) {
      case 'dashboard':
        return <Dashboard />;
      case 'rka-data':
        return (
          <RkaData 
            items={items}
            onEditItem={handleOpenEditItem}
            onAddSubItem={handleOpenAddSubItem}
            onOpenDriveModal={handleOpenDriveModal}
            onRefresh={refreshData}
          />
        );
      case 'rka-rpd':
        return <RkaRpd items={items} />;
      case 'renstra-tanggung':
        return (
          <RenstraTanggungJawab 
            items={items}
            progress={renstraProgress}
            onRefresh={refreshData}
            onEditItem={handleOpenEditItem}
            onAddSubItem={handleOpenAddSubItem}
            onOpenKegiatanModal={handleOpenKegiatanModal}
          />
        );
      case 'renstra-capaian':
        return (
          <RenstraCapaian 
            items={items}
            progress={renstraProgress}
            onOpenCapaianModal={handleOpenCapaianModal}
            onRefresh={refreshData}
          />
        );
      case 'pembelajaran':
        return (
          <Pembelajaran 
            items={items}
            onRefresh={refreshData}
            onEditItem={handleOpenEditItem}
            onAddSubItem={handleOpenAddSubItem}
            onOpenDriveModal={handleOpenDriveModal}
          />
        );
      case 'pembelian':
        return (
          <Pembelian 
            purchases={purchases}
            onRefresh={refreshData}
            onAddPurchase={handleOpenAddPurchase}
            onEditPurchase={handleOpenEditPurchase}
          />
        );
      case 'manajemen-prodi':
        return (
          <ManajemenProdi 
            onRefresh={refreshData}
            onAddProdi={handleOpenAddMprodi}
            onEditProdi={handleOpenEditMprodi}
          />
        );
      case 'manajemen-departemen':
        return (
          <ManajemenDepartemen 
            onRefresh={refreshData}
            onAddDepartemen={handleOpenAddMdept}
            onEditDepartemen={handleOpenEditMdept}
          />
        );
      case 'manajemen-user':
        return <ManajemenUser />;
      case 'laporan':
        return <Laporan />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Topbar />
        
        <FilterBar 
          onAddClick={handleOpenAddItem} 
          onImportClick={() => importInputRef.current?.click()}
          onExportClick={handleExportClick}
          onRefresh={refreshData}
        />
        <input 
          type="file" 
          ref={importInputRef} 
          accept=".xlsx, .xls" 
          style={{ display: 'none' }} 
          onChange={handleImportFile}
        />
        
        <div className="content" id="content">
          {renderCurrentView()}
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* 1. Modal Data Dukung */}
      {activeModal === 'dukung' && (
        <div className="modal open" id="modal-dukung">
          <div className="modal-box">
            <div className="modal-hdr">
              <h3><i className="fa-brands fa-google-drive"></i> Data Pendukung</h3>
              <button className="close-x" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="alert-warn">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <strong>tambahkan link drive saja</strong> — Upload file lokal tidak diizinkan dalam sistem ini.
              </div>
              <div className="fg">
                <label>Link Google Drive <span className="req">*</span></label>
                <div className="input-icon">
                  <i className="fa-brands fa-google-drive c-green"></i>
                  <input 
                    type="url" 
                    placeholder="https://drive.google.com/..." 
                    value={ddLink}
                    onChange={(e) => setDdLink(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <small>Pastikan izin akses link Drive diatur ke <em>"Anyone with the link"</em>.</small>
              </div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
              <button className="btn btn-success" onClick={handleSaveDriveLink}>
                <i className="fa-solid fa-save"></i> Simpan Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Item (Add/Edit RKA/Renstra/CPL) */}
      {activeModal === 'item' && (
        <div className="modal open" id="modal-item">
          <div className="modal-box modal-lg">
            <div className="modal-hdr">
              <h3>
                <i className="fa-solid fa-plus-circle"></i>{' '}
                {miId ? 'Edit Item' : miType === 'pembelajaran' ? 'Tambah CPL' : miType === 'renstra' ? 'Tambah Renstra' : 'Tambah Item RKA'}
              </h3>
              <button className="close-x" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="fg">
                  <label>Tingkat/Level <span className="req">*</span></label>
                  <select 
                    className="flt-select"
                    value={miLevel}
                    onChange={(e) => setMiLevel(parseInt(e.target.value) || 1)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                      <option key={l} value={l}>Level {l} {l === 1 ? '— Menu Utama' : l === 2 ? '— Menu Tambahan' : l === 3 ? '— Menu Pendukung' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label>Item Induk (Parent)</label>
                  <select 
                    className="flt-select"
                    value={miParent || ''}
                    onChange={(e) => setMiParent(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">— Tanpa Induk (Root) —</option>
                    {items
                      .filter(i => i.level < miLevel && i.type === miType)
                      .map(i => (
                        <option key={i.id} value={i.id}>
                          [L{i.level}] {i.code} — {i.description.substring(0, 50)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {miLevel === 1 && user?.role === 'admin' && (
                <div className="fg" style={{ marginBottom: '15px' }}>
                  <label>Prodi Penanggung Jawab</label>
                  <select 
                    className="flt-select"
                    value={miProdiCode}
                    onChange={(e) => setMiProdiCode(e.target.value)}
                  >
                    <option value="">— Fakultas / Umum —</option>
                    {prodiLinks.map(p => (
                      <option key={p.id} value={p.prodi_code}>{p.prodi_code} — {p.prodi_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-grid-2">
                <div className="fg">
                  <label>Kode <span className="req">*</span></label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 5220101"
                    value={miCode}
                    onChange={(e) => setMiCode(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Uraian/Deskripsi <span className="req">*</span></label>
                  <input 
                    type="text" 
                    placeholder="Nama kegiatan atau program"
                    value={miDesc}
                    onChange={(e) => setMiDesc(e.target.value)}
                  />
                </div>
              </div>

              {miType === 'keuangan_rka' && (
                <div>
                  <div className="form-grid-3">
                    <div className="fg"><label>Volume</label><input type="text" placeholder="0" value={miVolume || ''} onChange={(e) => setMiVolume(e.target.value)}/></div>
                    <div className="fg"><label>Satuan</label><input type="text" placeholder="Prodi / Unit / Kali" value={miUnit} onChange={(e) => setMiUnit(e.target.value)}/></div>
                    <div className="fg"><label>Harga Satuan (Rp)</label><input type="number" placeholder="0" value={miPrice} onChange={(e) => setMiPrice(e.target.value)}/></div>
                  </div>
                  <div className="form-grid-2">
                    <div className="fg">
                      <label>Sumber Dana</label>
                      <select className="flt-select" value={miSource} onChange={(e) => setMiSource(e.target.value)}>
                        <option value="">— Pilih —</option>
                        {Array.from(new Set(['BPPTNBH', 'IPI', 'UKT/SPP', 'RM-RUTIN', ...items.map(i => i.source_of_fund).filter((x): x is string => !!x)])).map(src => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                        <option value="__new__">— Tulis Sumber Dana Baru... —</option>
                      </select>
                      {miSource === '__new__' && (
                        <div style={{ marginTop: '8px' }}>
                          <input 
                            type="text" 
                            placeholder="Ketik Sumber Dana Baru..."
                            value={miSourceCustom}
                            onChange={(e) => setMiSourceCustom(e.target.value)}
                            style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="fg"><label>Insentif Kinerja</label><input type="number" placeholder="0" value={miIncentive} onChange={(e) => setMiIncentive(e.target.value)}/></div>
                  </div>
                  <div className="fg">
                    <label>Kuitansi / Bukti Pembelian (Link Drive)</label>
                    <div className="input-icon">
                      <i className="fa-brands fa-google-drive c-green"></i>
                      <input type="url" placeholder="https://drive.google.com/..." value={miReceipt} onChange={(e) => setMiReceipt(e.target.value)}/>
                    </div>
                  </div>
                  
                  {/* RPD Bulanan */}
                  <div style={{ marginTop: '15px', borderTop: '1px dashed var(--border)', paddingTop: '15px' }}>
                    <h4 style={{ marginBottom: '10px', color: 'var(--primary)' }}>
                      <i className="fa-solid fa-calendar-days"></i> Rencana Penarikan Dana (RPD) Bulanan
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '13px', marginBottom: '13px' }}>
                      {['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].map(m => (
                        <div className="fg" key={m}>
                          <label style={{ textTransform: 'capitalize' }}>{m} (Rp)</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={rpdMonths[m] || ''}
                            onChange={(e) => setRpdMonths({ ...rpdMonths, [m]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {miType === 'renstra' && (
                <div>
                  <div className="form-grid-3">
                    <div className="fg"><label>Satuan</label><input type="text" placeholder="% / Dokumen" value={miRSatuan} onChange={(e) => setMiRSatuan(e.target.value)}/></div>
                    <div className="fg"><label>Target Fakultas</label><input type="text" placeholder="75%" value={miRTuniv} onChange={(e) => setMiRTuniv(e.target.value)}/></div>
                    <div className="fg"><label>Target Unit (Prodi)</label><input type="text" placeholder="75%" value={miRTunit} onChange={(e) => setMiRTunit(e.target.value)}/></div>
                  </div>
                  <div className="fg">
                    <label>Anggaran (Rp)</label>
                    <input type="number" placeholder="0" value={miRAnggaran} onChange={(e) => setMiRAnggaran(e.target.value)}/>
                  </div>
                </div>
              )}

              {miType === 'pembelajaran' && (
                <div>
                  <div className="form-grid-2">
                    <div className="fg"><label>Target Unit</label><input type="text" value={miPTunit} onChange={(e) => setMiPTunit(e.target.value)}/></div>
                    <div className="fg"><label>Capaian</label><input type="text" value={miPCapaian} onChange={(e) => setMiPCapaian(e.target.value)}/></div>
                  </div>
                  <div className="form-grid-2">
                    <div className="fg"><label>Capaian %</label><input type="text" value={miPCapaianPct} onChange={(e) => setMiPCapaianPct(e.target.value)}/></div>
                    <div className="fg"><label>Progress/Keterangan</label><input type="text" value={miPProgress} onChange={(e) => setMiPProgress(e.target.value)}/></div>
                  </div>
                </div>
              )}

              <div className="fg" style={{ marginTop: '12px' }}>
                <label>Data Dukung (Link Drive)</label>
                <div className="input-icon">
                  <i className="fa-brands fa-google-drive c-green"></i>
                  <input type="url" placeholder="https://drive.google.com/..." value={miDukung} onChange={(e) => setMiDukung(e.target.value)}/>
                </div>
              </div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveItem}><i className="fa-solid fa-save"></i> Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Capaian Renstra */}
      {activeModal === 'capaian-renstra' && (
        <div className="modal open" id="modal-capaian-renstra">
          <div className="modal-box modal-lg">
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-pen-to-square"></i> Capaian Renstra</h3>
              <button className="close-x" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="fg" style={{ marginBottom: '15px' }}>
                <label>Capaian <span className="req">*</span></label>
                <input 
                  type="text" 
                  value={mcrCapaian}
                  onChange={(e) => setMcrCapaian(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="fg" style={{ marginBottom: '15px' }}>
                <label>Progress/Kegiatan <span className="req">*</span></label>
                <textarea 
                  rows={4}
                  value={mcrProgress}
                  onChange={(e) => setMcrProgress(e.target.value)}
                  placeholder="Tulis progress kegiatan..."
                />
              </div>
              <div className="fg" style={{ marginBottom: '15px' }}>
                <label>Kendala/Permasalahan <span className="req">*</span></label>
                <textarea 
                  rows={4}
                  value={mcrIssues}
                  onChange={(e) => setMcrIssues(e.target.value)}
                  placeholder="Tulis kendala..."
                />
              </div>
              <div className="fg" style={{ marginBottom: '15px' }}>
                <label>Strategi/Tindak Lanjut <span className="req">*</span></label>
                <textarea 
                  rows={4}
                  value={mcrStrategy}
                  onChange={(e) => setMcrStrategy(e.target.value)}
                  placeholder="Tulis rencana penyelesaian..."
                />
              </div>
              <div className="fg">
                <label>Data Dukung (Google Drive Link) <span className="req">*</span></label>
                <input 
                  type="url"
                  value={mcrDukung}
                  onChange={(e) => setMcrDukung(e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveCapaianRenstra} style={{ background: '#0284c7', borderColor: '#0284c7' }}>
                <i className="fa-solid fa-save"></i> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Prodi Links */}
      {activeModal === 'prodi' && (
        <div className="modal open" id="modal-prodi">
          <div className="modal-box modal-lg">
            <div className="modal-hdr">
              <h3><i className="fa-brands fa-google-drive"></i> Edit Link Drive Prodi</h3>
              <button className="close-x" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="fg"><label>Nama Program Studi</label><input type="text" value={mpName} onChange={(e) => setMpName(e.target.value)} disabled={!isAdmin}/></div>
                <div className="fg"><label>Kode Prodi</label><input type="text" value={mpCode} onChange={(e) => setMpCode(e.target.value)} disabled={!isAdmin}/></div>
              </div>
              <div className="drive-links-form">
                <div className="dlf-header"><i className="fa-brands fa-google-drive"></i> 7 Link Google Drive Standar Prodi</div>
                {[
                  { key: 'l0', num: 1, label: 'PERJANJIAN KINERJA PRODI' },
                  { key: 'l1', num: 2, label: 'Template Kinerja Prodi' },
                  { key: 'l2', num: 3, label: 'TW1 (Januari - Maret 2026)' },
                  { key: 'l3', num: 4, label: 'TW 2 (April - Juni 2026)' },
                  { key: 'l4', num: 5, label: 'Bukti dukung kinerja prodi TW 1' },
                  { key: 'l5', num: 6, label: 'Bukti lama' },
                  { key: 'l6', num: 7, label: 'Contoh target capaian prodi' }
                ].map(f => (
                  <div className="fg dlf-item" key={f.key}>
                    <label><span className="folder-num">{f.num}</span> {f.label}</label>
                    <div className="input-icon">
                      <i className="fa-brands fa-google-drive c-green"></i>
                      <input 
                        type="url" 
                        value={mpLinks[f.key]}
                        onChange={(e) => setMpLinks({ ...mpLinks, [f.key]: e.target.value })}
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="fg" style={{ marginTop: '12px' }}>
                <label>Keterangan Tambahan</label>
                <input type="text" value={mpKet} onChange={(e) => setMpKet(e.target.value)}/>
              </div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveProdiLinks}><i className="fa-solid fa-save"></i> Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Pembelian */}
      {activeModal === 'pembelian' && (
        <div className="modal open" id="modal-pembelian">
          <div className="modal-box">
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-cart-plus"></i> Tambah Data Pembelian</h3>
              <button className="close-x" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="fg">
                <label>Nama Barang / Pengadaan / Dana <span className="req">*</span></label>
                <input type="text" value={pbName} onChange={(e) => setPbName(e.target.value)} placeholder="Contoh: Belanja Bahan Las"/>
              </div>
              <div className="fg">
                <label>Program Studi</label>
                <select className="flt-select" value={pbProdiCode} onChange={(e) => setPbProdiCode(e.target.value)} disabled={!isAdmin}>
                  <option value="">— Fakultas / Umum —</option>
                  {prodiLinks.map(p => (
                    <option key={p.id} value={p.prodi_code}>{p.prodi_code} — {p.prodi_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-grid-2">
                <div className="fg"><label>Kuantitas <span className="req">*</span></label><input type="number" value={pbQty} onChange={(e) => setPbQty(e.target.value)}/></div>
                <div className="fg"><label>Harga Satuan <span className="req">*</span></label><input type="number" value={pbPrice} onChange={(e) => setPbPrice(e.target.value)}/></div>
              </div>
              <div className="fg">
                <label>Dokumentasi Pembelian (Link Drive) <span className="req">*</span></label>
                <div className="input-icon">
                  <i className="fa-brands fa-google-drive c-green"></i>
                  <input type="url" value={pbLink} onChange={(e) => setPbLink(e.target.value)}/>
                </div>
              </div>
              <div className="fg"><label>Keterangan</label><input type="text" value={pbKet} onChange={(e) => setPbKet(e.target.value)}/></div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
              <button className="btn btn-success" onClick={handleSavePurchase}><i className="fa-solid fa-save"></i> Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Manajemen Prodi */}
      {activeModal === 'mprodi' && (
        <div className="modal open" id="modal-mprodi">
          <div className="modal-box">
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-graduation-cap"></i> Program Studi</h3>
              <button className="close-x" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="fg"><label>Kode Prodi <span className="req">*</span></label><input type="text" value={mprodiCode} onChange={(e) => setMprodiCode(e.target.value)}/></div>
              <div className="fg"><label>Nama Program Studi <span className="req">*</span></label><input type="text" value={mprodiName} onChange={(e) => setMprodiName(e.target.value)}/></div>
              <div className="fg">
                <label>Departemen</label>
                <select className="flt-select" value={mprodiDept} onChange={(e) => setMprodiDept(e.target.value)}>
                  <option value="">— Tidak Ada / Belum Ditentukan —</option>
                  {departemen.map(d => (
                    <option key={d.id} value={d.id}>{d.kode_departemen} — {d.nama_departemen}</option>
                  ))}
                </select>
              </div>
              <div className="fg"><label>Keterangan</label><input type="text" value={mprodiKet} onChange={(e) => setMprodiKet(e.target.value)}/></div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveMprodi}><i className="fa-solid fa-save"></i> Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Manajemen Departemen */}
      {activeModal === 'mdept' && (
        <div className="modal open" id="modal-mdept">
          <div className="modal-box">
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-building-columns"></i> Departemen</h3>
              <button className="close-x" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="fg"><label>Kode Departemen <span className="req">*</span></label><input type="text" value={mdeptCode} onChange={(e) => setMdeptCode(e.target.value)}/></div>
              <div className="fg"><label>Nama Departemen <span className="req">*</span></label><input type="text" value={mdeptName} onChange={(e) => setMdeptName(e.target.value)}/></div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveMdept}><i className="fa-solid fa-save"></i> Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Renstra Rincian Kegiatan */}
      {activeModal === 'kegiatan' && (
        <div className="modal open" id="modal-renstra-kegiatan">
          <div className="modal-box modal-lg">
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-list-check"></i> Rincian Kegiatan: {rkTitle}</h3>
              <button className="close-x" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="tbl-wrap">
                <table className="htable">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>No</th>
                      <th>Nama Kegiatan</th>
                      <th style={{ width: '150px', textAlign: 'right' }}>Anggaran (Rp)</th>
                      <th style={{ width: '200px', textAlign: 'center' }}>Data Dukung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter(i => i.parent_id === rkItemId)
                      .map((child, index) => (
                        <tr key={child.id}>
                          <td>{index + 1}</td>
                          <td>{child.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>{child.amount ? child.amount.toLocaleString('id-ID') : '0'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {child.supporting_data_link ? (
                              <a href={child.supporting_data_link} target="_blank" rel="noopener noreferrer" className="dlbadge has-link">
                                <i className="fa-brands fa-google-drive"></i> Open
                              </a>
                            ) : (
                              'Kosong'
                            )}
                          </td>
                        </tr>
                      ))}
                    {items.filter(i => i.parent_id === rkItemId).length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                          Belum ada rincian kegiatan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-ftr">
              <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
