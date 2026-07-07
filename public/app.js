/* ═══════════════════════════════════════════════
   SIPP Web App — Frontend Application Logic
   ═══════════════════════════════════════════════ */

'use strict';

// ─── STATE ─────────────────────────────────────────────────────────────────
const S = {
  token: null,
  role: null,
  username: null,
  prodiCode: null,
  prodiName: null,
  tab: 'dashboard',
  items: [],
  prodiLinks: [],
  purchases: [],
  departemen: [],
  renstraProgress: [],  // per-prodi per-triwulan progress data
  collapsed: new Set(),
  sidebarCollapsed: localStorage.getItem('sipp_sidebar_collapsed') === 'true',
};

// ─── DOM ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLoginFlow();
  checkAuth();

  // Bind logout button once globally to ensure it works reliably
  const logoutBtn = $('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
        localStorage.removeItem('sipp_session');
        location.reload();
      }
    });
  }
});

function checkAuth() {
  const cached = localStorage.getItem('sipp_session');
  if (cached) {
    try {
      const session = JSON.parse(cached);
      if (session && session.token && session.user) {
        S.token = session.token;
        S.role = session.user.role;
        S.username = session.user.username;
        S.prodiCode = session.user.prodi_code;
        S.prodiName = session.user.prodi_name;

        applyUserSession();

        bindNav();
        bindModals();
        bindForms();
        bindSidebarToggle();

        navigate('dashboard');
        loadDashboard();
        loadSidebarBudget();
        fetchProdiLinks();
        return;
      } else {
        localStorage.removeItem('sipp_session');
      }
    } catch (e) {
      console.error('Failed to parse cached session', e);
      localStorage.removeItem('sipp_session');
    }
  }

  // Show login screen
  document.body.className = 'not-logged-in';
}

function applyUserSession() {
  document.body.classList.remove('not-logged-in');
  document.body.classList.add(`role-${S.role}`);

  // Display name
  const nameEl = $('user-display-name');
  const roleEl = $('user-role-text');
  const avatarEl = $('user-avatar');

  if (S.role === 'admin') {
    nameEl.textContent = 'Superadmin';
    roleEl.textContent = 'Administrator';
    avatarEl.textContent = 'SA';
    avatarEl.style.background = 'var(--accent)';
  } else {
    nameEl.textContent = S.prodiName || S.username.toUpperCase();
    roleEl.textContent = `User Prodi (${S.prodiCode})`;
    avatarEl.textContent = S.prodiCode ? S.prodiCode.replace('D4-', '').replace('D3-', '') : 'US';
    avatarEl.style.background = 'var(--blue)';
  }
}

// ─── LOGIN FLOW ──────────────────────────────────────────────────────────────
function initLoginFlow() {
  // Toggle password visibility
  $('btn-toggle-password').addEventListener('click', () => {
    const pwdInput = $('login-password');
    const icon = $('btn-toggle-password').querySelector('i');
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      icon.className = 'fa-solid fa-eye-slash';
    } else {
      pwdInput.type = 'password';
      icon.className = 'fa-solid fa-eye';
    }
  });



  // Handle submit form login
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('login-username').value.trim();
    const password = $('login-password').value;
    const btnSubmit = $('btn-login-submit');
    const errorEl = $('login-error');

    // Disable form / show loader
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>Memverifikasi...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
    errorEl.style.display = 'none';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login gagal.');

      // Save session to localStorage
      localStorage.setItem('sipp_session', JSON.stringify(data));

      // Success: reload or init app
      checkAuth();

      // Reset form fields
      $('login-username').value = '';
      $('login-password').value = '';
    } catch (err) {
      errorEl.style.display = 'flex';
      $('login-error-text').textContent = err.message;
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>Masuk</span> <i class="fa-solid fa-right-to-bracket"></i>';
    }
  });
}

// ─── NAVIGATION ─────────────────────────────────────────────────────────────
const TAB_CONFIG = {
  'dashboard': { title: 'Dashboard', showFilter: false, showBulan: false },
  'rka-data': { title: 'RKA / Data', showFilter: true, showBulan: false, addLabel: 'Tambah RKA', addType: 'keuangan_rka' },
  'rka-rpd': { title: 'RKA / RPD', showFilter: true, showBulan: false },
  'renstra-tanggung': { title: 'Renstra / Tanggung Jawab', showFilter: true, showBulan: true, addLabel: 'Tambah Renstra', addType: 'renstra' },
  'renstra-capaian': { title: 'Renstra / Capaian', showFilter: true, showBulan: true, addLabel: 'Tambah Renstra', addType: 'renstra' },
  'pembelajaran': { title: 'Data Pembelajaran', showFilter: true, showBulan: false, addLabel: 'Tambah CPL', addType: 'pembelajaran' },
  /* HIDDEN: 'prodi-links': { title: 'Link Drive Prodi (7 Folder)',        showFilter: false, showBulan: false }, */
  'pembelian': { title: 'Transaksi / Pembelian', showFilter: false, showBulan: false },
  'manajemen-prodi': { title: 'Manajemen Prodi & Dept / Prodi', showFilter: false, showBulan: false },
  'manajemen-departemen': { title: 'Manajemen Prodi & Dept / Departemen', showFilter: false, showBulan: false },
  'laporan': { title: 'Laporan', showFilter: false, showBulan: false },
};

function bindNav() {
  // Nav items — attach click on inner <a> only (avoids bubble double-fire)
  $$('.nav-item').forEach(el => {
    const anchor = el.querySelector('a') || el;
    anchor.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const tab = el.dataset.tab;
      if (tab) navigate(tab);
    });
  });

  // Nav groups (with submenu)
  $$('.nav-group').forEach(grp => {
    grp.querySelector('.nav-group-header').addEventListener('click', () => {
      grp.classList.toggle('open');
    });

    grp.querySelectorAll('.nav-sub li').forEach(li => {
      li.addEventListener('click', e => {
        e.stopPropagation();
        const tab = li.dataset.tab;
        if (tab) navigate(tab);
      });
    });
  });
}


function navigate(tab) {
  S.tab = tab;
  const cfg = TAB_CONFIG[tab] || {};

  // Update breadcrumb
  $('bc-main').textContent = cfg.title || tab;

  // Hide all views, show active
  $$('.view').forEach(v => { v.style.display = 'none'; });
  const viewEl = $(`view-${tab}`);
  if (viewEl) viewEl.style.display = 'block';

  // Filter bar
  $('filter-bar').style.display = cfg.showFilter ? 'block' : 'none';
  $('fg-bulan').style.display = cfg.showBulan ? 'flex' : 'none';

  // Excel buttons visibility
  const isRenstra = tab === 'renstra-tanggung' || tab === 'renstra-capaian';
  $('btn-import-renstra').style.display = (isRenstra && S.role === 'admin') ? 'inline-flex' : 'none';
  $('btn-export-renstra').style.display = isRenstra ? 'inline-flex' : 'none';

  // Add button
  const btnAdd = $('btn-add-main');
  if (cfg.addLabel) {
    btnAdd.style.display = 'inline-flex';
    $('btn-add-label').textContent = cfg.addLabel;
    btnAdd.dataset.type = cfg.addType || '';
  } else {
    btnAdd.style.display = 'none';
  }

  // Active nav highlighting
  $$('.nav-item, .nav-sub li').forEach(el => el.classList.remove('active'));
  const match = document.querySelector(`[data-tab="${tab}"]`);
  if (match) {
    match.classList.add('active');
    const subParent = match.closest('.nav-group');
    if (subParent) subParent.classList.add('open');
  }

  // Close sidebar on mobile
  const sidebar = $('sidebar');
  if (sidebar) sidebar.classList.remove('open');

  // Load data
  loadTabData(tab);
}

function loadTabData(tab) {
  if (tab === 'dashboard') loadDashboard();
  else if (tab === 'rka-data') fetchItems('keuangan_rka', renderRkaData);
  else if (tab === 'rka-rpd') fetchItems('keuangan_rka', renderRkaRpd);
  else if (tab === 'renstra-tanggung') fetchItems('renstra', renderRenstra.bind(null, 'tj'));
  else if (tab === 'renstra-capaian') fetchItems('renstra', renderRenstra.bind(null, 'capaian'));
  else if (tab === 'pembelajaran') fetchItems('pembelajaran', renderPembelajaran);
  else if (tab === 'prodi-links') fetchProdiLinks();
  else if (tab === 'pembelian') fetchPurchases();
  else if (tab === 'manajemen-prodi') fetchManajemenProdi();
  else if (tab === 'manajemen-departemen') fetchManajemenDepartemen();
  else if (tab === 'laporan') loadLaporan();
}

function renderCurrentView() { loadTabData(S.tab); }

function renderCurrentViewLocally() {
  const tab = S.tab;
  if (tab === 'rka-data') renderRkaData();
  else if (tab === 'rka-rpd') renderRkaRpd();
  else if (tab === 'renstra-tanggung') renderRenstra('tj');
  else if (tab === 'renstra-capaian') renderRenstra('capaian');
  else if (tab === 'pembelajaran') renderPembelajaran();
  else renderCurrentView();
}

// ─── SIDEBAR TOGGLE ──────────────────────────────────────────────────────────
function applySidebarState() {
  const sidebar = $('sidebar');
  if (!sidebar) return;
  if (S.sidebarCollapsed) {
    sidebar.classList.add('collapsed');
  } else {
    sidebar.classList.remove('collapsed');
  }
}

function bindSidebarToggle() {
  // Toggle sidebar state based on screen size
  $('btn-sidebar-toggle').addEventListener('click', () => {
    if (window.innerWidth > 900) {
      S.sidebarCollapsed = !S.sidebarCollapsed;
      localStorage.setItem('sipp_sidebar_collapsed', S.sidebarCollapsed);
      applySidebarState();
    } else {
      $('sidebar').classList.add('open');
    }
  });

  // Mobile close via X button
  const closeBtn = $('btn-sidebar-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      $('sidebar').classList.remove('open');
    });
  }

  // Mobile close via backdrop click
  const overlay = $('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      $('sidebar').classList.remove('open');
    });
  }

  // Initial apply for desktop
  applySidebarState();
}

// ─── DATA FETCHING ────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (S.token) {
    headers['Authorization'] = `Bearer ${S.token}`;
  }
  const opts = {
    method,
    headers
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) {
    if (path !== '/api/auth/login' && (res.status === 401 || res.status === 403 || (data.error && data.error.toLowerCase().includes('token')))) {
      localStorage.removeItem('sipp_session');
      alert('Sesi Anda telah kedaluwarsa. Silakan masuk kembali.');
      location.reload();
      return;
    }
    throw new Error(data.error || 'Request gagal');
  }
  return data;
}

// Helper: get active triwulan as integer (1-4)
function getActiveTwNumber() {
  const val = $('flt-bulan').value;
  if (val === 'Triwulan 1') return 1;
  if (val === 'Triwulan 2') return 2;
  if (val === 'Triwulan 3') return 3;
  if (val === 'Triwulan 4') return 4;
  return 1;
}

// Helper: get active prodi code from filter (respects admin vs user)
function getActiveProdiCode() {
  if (S.role === 'user' && S.prodiCode) return S.prodiCode;
  return $('flt-unit') ? $('flt-unit').value : '';
}

// Helper: get progress record for a given item from S.renstraProgress
function getProgress(itemId) {
  return S.renstraProgress.find(p => p.item_id === itemId) || null;
}

async function fetchItems(type, cb) {
  try {
    const rawItems = await api('GET', `/api/items?type=${type}`);

    // Filter berdasarkan Tahun dan Triwulan di frontend
    const selectedYear = parseInt($('flt-tahun').value) || 2026;
    const selectedMonthName = $('flt-bulan').value;
    const twMap = {
      'Triwulan 1': [0, 1, 2],
      'Triwulan 2': [3, 4, 5],
      'Triwulan 3': [6, 7, 8],
      'Triwulan 4': [9, 10, 11]
    };
    const allowedMonths = twMap[selectedMonthName] || [0, 1, 2];

    const cfg = TAB_CONFIG[S.tab] || {};
    const isRenstraTab = (S.tab === 'renstra-tanggung' || S.tab === 'renstra-capaian');

    const filtered = rawItems.filter(item => {
      const date = new Date(item.created_at);
      const matchYear = date.getFullYear() === selectedYear;
      if (cfg.showBulan && type !== 'renstra') {
        return matchYear && allowedMonths.includes(date.getMonth());
      }
      return matchYear;
    });

    const selectedProdi = $('flt-unit') ? $('flt-unit').value : '';
    if (selectedProdi && !isRenstraTab) {
      // Non-renstra prodi filtering (existing logic)
      const nodeMap = {};
      rawItems.forEach(item => {
        nodeMap[item.id] = { ...item, visible: false, children: [] };
      });

      rawItems.forEach(item => {
        if (item.parent_id && nodeMap[item.parent_id]) {
          nodeMap[item.parent_id].children.push(nodeMap[item.id]);
        }
      });

      function markVisible(node) {
        let hasVisibleChild = false;
        node.children.forEach(child => {
          if (markVisible(child)) {
            hasVisibleChild = true;
          }
        });

        if (node.level < 4) {
          node.visible = hasVisibleChild;
        } else if (node.level === 4) {
          node.visible = !node.prodi_code || node.prodi_code === selectedProdi || hasVisibleChild;
        } else {
          node.visible = node.prodi_code === selectedProdi;
        }
        return node.visible;
      }

      rawItems.forEach(item => {
        if (!item.parent_id && nodeMap[item.id]) {
          markVisible(nodeMap[item.id]);
        }
      });

      S.items = filtered.filter(item => nodeMap[item.id] && nodeMap[item.id].visible);
    } else {
      S.items = filtered;
    }

    // ── Fetch Renstra Progress (per prodi per triwulan) ──
    if (isRenstraTab) {
      const activeProdi = getActiveProdiCode();
      const activeTwNum = getActiveTwNumber();
      if (activeProdi) {
        try {
          S.renstraProgress = await api('GET', `/api/renstra-progress?prodi_code=${encodeURIComponent(activeProdi)}&triwulan=${activeTwNum}`);
        } catch (e) {
          console.error('Failed to fetch renstra progress:', e);
          S.renstraProgress = [];
        }
      } else {
        S.renstraProgress = [];
      }
    }

    // Update periode sub-text di UI
    const activeProdiLabel = getActiveProdiCode();
    let periodText = cfg.showBulan ? `Periode: ${selectedMonthName} ${selectedYear}` : `Periode: Tahun ${selectedYear}`;
    if (isRenstraTab && activeProdiLabel) {
      const prodiObj = S.prodiLinks.find(p => p.prodi_code === activeProdiLabel);
      const prodiLabel = prodiObj ? prodiObj.prodi_name : activeProdiLabel;
      periodText += ` — Prodi: ${prodiLabel}`;
    }
    const subMap = {
      'rka-data': 'sub-rka-data',
      'rka-rpd': 'sub-rka-rpd',
      'renstra-tanggung': 'sub-renstra-tj',
      'renstra-capaian': 'sub-renstra-capaian',
      'pembelajaran': 'sub-pembelajaran'
    };
    const activeSubId = subMap[S.tab];
    if (activeSubId && $(activeSubId)) {
      $(activeSubId).textContent = periodText;
    }

    cb && cb();
    if (type === 'keuangan_rka') {
      loadSidebarBudget();
    }
  } catch (e) { console.error(e); }
}

async function fetchProdiLinks() {
  try {
    S.prodiLinks = await api('GET', '/api/prodi-links');
    renderProdiLinks();
    populateFilterProdiDropdown();
  } catch (e) { console.error(e); }
}

function populateFilterProdiDropdown() {
  const sel = $('flt-unit');
  if (!sel) return;
  
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">— Semua Prodi / Vokasi —</option>';
  
  if (S.role === 'user' && S.prodiCode) {
    const opt = document.createElement('option');
    opt.value = S.prodiCode;
    opt.textContent = `${S.prodiCode} — ${S.prodiName || S.prodiCode}`;
    opt.selected = true;
    sel.appendChild(opt);
    sel.disabled = true;
  } else {
    S.prodiLinks.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.prodi_code;
      opt.textContent = `${p.prodi_code} — ${p.prodi_name}`;
      if (p.prodi_code === currentVal) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.disabled = false;
  }
}

async function fetchPurchases() {
  try {
    const [purchases, prodis] = await Promise.all([
      api('GET', '/api/purchases'),
      api('GET', '/api/prodi-links')
    ]);
    S.purchases = purchases;
    S.prodiLinks = prodis;
    renderPurchases();
  } catch (e) { console.error(e); }
}



async function loadDashboard() {
  try {
    const [items, purchases, prodiLinks] = await Promise.all([
      api('GET', '/api/items?type=keuangan_rka'),
      api('GET', '/api/purchases'),
      api('GET', '/api/prodi-links'),
    ]);

    // Total Anggaran RKA from root-level items
    const { roots } = buildTree(items);
    let totalRka = 0;
    roots.forEach(r => { totalRka += (r.amount || 0); });
    $('ds-total-rka').textContent = rupiah(totalRka);

    const totalP = purchases.reduce((s, p) => s + p.total_amount, 0);
    const filledProdi = prodiLinks.filter(p =>
      p.link_perjanjian_kinerja || p.link_tw1 || p.link_tw2
    ).length;

    $('ds-total-purchases').textContent = rupiah(totalP);
    $('ds-prodi-linked').textContent = `${filledProdi} / ${prodiLinks.length} Prodi`;
  } catch (e) { console.error(e); }
}

// ─── TREE BUILDER ─────────────────────────────────────────────────────────────
function buildTree(items) {
  const map = {};
  items.forEach(i => { map[i.id] = { ...i, children: [] }; });
  const roots = [];
  items.forEach(i => {
    if (i.parent_id && map[i.parent_id]) map[i.parent_id].children.push(map[i.id]);
    else roots.push(map[i.id]);
  });
  return { roots, map };
}

function isAncestorCollapsed(item, map) {
  let pid = item.parent_id;
  while (pid) {
    if (S.collapsed.has(pid)) return true;
    pid = map[pid] ? map[pid].parent_id : null;
  }
  return false;
}

function levelClass(lvl) {
  const n = Math.min(lvl, 9);
  return `r${n}`;
}

// ─── RENDER: RKA DATA ─────────────────────────────────────────────────────────
function renderRkaData() {
  const tbody = $('tbody-rka-data');
  if (!tbody) return;
  const { roots, map } = buildTree(S.items);
  let html = '';

  function walk(node) {
    const hidden = isAncestorCollapsed(node, map);
    const hasKids = node.children.length > 0;
    const isCol = S.collapsed.has(node.id);
    const cls = levelClass(node.level);
    const indent = (node.level - 1) * 16;

    const receiptHtml = driveCell(node.receipt_link, node.id, 'receipt_link', true);
    const displayStyle = hidden ? 'display: none;' : '';

    html += `
      <tr class="${cls}" style="${displayStyle}">
        <td class="text-left">${escapeHTML(node.code)}</td>
        <td class="text-left">
          <div class="tree-cell">
            <span class="indent" style="width:${indent}px"></span>
            ${hasKids
              ? `<button class="toggle-btn ${isCol ? 'collapsed' : ''}" onclick="toggleCollapse(${node.id})"><i class="fa-solid fa-chevron-down"></i></button>`
              : `<span class="no-toggle"></span>`}
            <span>${escapeHTML(node.description)}</span>
          </div>
        </td>
        <td class="text-center">${node.volume ? escapeHTML(node.volume) : ''}</td>
        <td class="text-right">${node.price ? fmtNum(node.price) : ''}</td>
        <td class="text-right">${node.amount ? fmtNum(node.amount) : 0}</td>
        <td class="text-center">${node.source_of_fund ? escapeHTML(node.source_of_fund) : ''}</td>
        <td class="text-right">${node.performance_incentive ? fmtNum(node.performance_incentive) : ''}</td>
        <td class="text-center">${receiptHtml}</td>
        <td class="admin-only text-center">
          <div class="act-cell">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="openEditItem(${node.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteItem(${node.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
    node.children.forEach(walk);
  }

  roots.forEach(walk);
  tbody.innerHTML = html;
}

// ─── RENDER: RKA RPD ──────────────────────────────────────────────────────────
function renderRkaRpd() {
  const tbody = $('tbody-rka-rpd');
  if (!tbody) return;
  const { roots, map } = buildTree(S.items);
  const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  let html = '';

  function walk(node) {
    const hidden = isAncestorCollapsed(node, map);
    const hasKids = node.children.length > 0;
    const isCol = S.collapsed.has(node.id);
    const cls = levelClass(node.level);
    const indent = (node.level - 1) * 16;

    const monthCols = months.map(m => `<td class="text-right">${node[m] ? fmtNum(node[m]) : 0}</td>`).join('');
    const displayStyle = hidden ? 'display: none;' : '';

    html += `
      <tr class="${cls}" style="${displayStyle}">
        <td class="text-left">${escapeHTML(node.code)}</td>
        <td class="text-left">
          <div class="tree-cell">
            <span class="indent" style="width:${indent}px"></span>
            ${hasKids
              ? `<button class="toggle-btn ${isCol ? 'collapsed' : ''}" onclick="toggleCollapse(${node.id})"><i class="fa-solid fa-chevron-down"></i></button>`
              : `<span class="no-toggle"></span>`}
            <span>${escapeHTML(node.description)}</span>
          </div>
        </td>
        ${monthCols}
      </tr>
    `;
    node.children.forEach(walk);
  }
  roots.forEach(walk);
  tbody.innerHTML = html;
}

// ─── HELPER: ACTION CELL AND DELEGATION ──────────────────────────────────────
function renderActionCell(node) {
  const isOwner = S.role === 'admin' || (S.role === 'user' && node.prodi_code === S.prodiCode);
  const canEdit = isOwner;
  const canDelete = S.role === 'admin' || (S.role === 'user' && node.prodi_code === S.prodiCode && node.level > 1);
  const canAddSub = isOwner && node.level < 8;

  let html = `<div class="act-cell">`;
  if (canAddSub) {
    html += `<button class="btn btn-success btn-sm btn-icon" onclick="openAddSubItem(${node.id}, ${node.level + 1}, '${node.type}')" title="Tambah Sub-item"><i class="fa-solid fa-plus"></i></button>`;
  }
  if (canEdit) {
    html += `<button class="btn btn-secondary btn-sm btn-icon" onclick="openEditItem(${node.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>`;
  }
  if (canDelete) {
    html += `<button class="btn btn-danger btn-sm btn-icon" onclick="deleteItem(${node.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>`;
  }
  html += `</div>`;
  return html;
}

window.openAddSubItem = function (parentId, targetLevel, type) {
  resetItemForm();
  $('mi-type').value = type;

  const isRenstra = type === 'renstra';
  if (type === 'pembelajaran') {
    $('modal-item-title').innerHTML = `<i class="fa-solid fa-plus-circle"></i> Tambah Sub CPL (L${targetLevel})`;
  } else if (isRenstra) {
    $('modal-item-title').innerHTML = `<i class="fa-solid fa-plus-circle"></i> Tambah Sub Renstra (L${targetLevel})`;
  } else {
    $('modal-item-title').innerHTML = `<i class="fa-solid fa-plus-circle"></i> Tambah Sub Item RKA (L${targetLevel})`;
  }

  const showKeuangan = type !== 'pembelajaran' && !isRenstra;
  $('fi-keuangan').style.display = showKeuangan ? 'block' : 'none';
  $('fi-pembelajaran').style.display = showKeuangan ? 'none' : 'block';

  $('mi-level').value = targetLevel;
  populateParentDropdown(parentId, type);
  $('mi-parent').value = parentId;

  // Sembunyikan prodi dropdown untuk sub-item karena otomatis diwarisi dari parent
  $('fg-mi-prodi').style.display = 'none';

  if (S.role !== 'admin') {
    $('mi-level').disabled = true;
    $('mi-parent').disabled = true;
  } else {
    $('mi-level').disabled = false;
    $('mi-parent').disabled = false;
  }

  openModal('modal-item');
};

function populateProdiDropdown(selectedCode) {
  const sel = $('mi-prodi-code');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Fakultas / Umum —</option>';
  S.prodiLinks.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.prodi_code;
    opt.textContent = `${p.prodi_code} — ${p.prodi_name}`;
    if (p.prodi_code === selectedCode) opt.selected = true;
    sel.appendChild(opt);
  });
}

function populatePurchasesProdiDropdown(selectedCode) {
  const sel = $('pb-prodi-code');
  if (!sel) return;

  if (S.role !== 'admin') {
    // User prodi: pre-select their prodi code, and disable the select input
    sel.innerHTML = `<option value="${S.prodiCode}">${S.prodiCode} — ${S.prodiName || S.prodiCode}</option>`;
    sel.disabled = true;
    sel.style.backgroundColor = '#e2e8f0';
  } else {
    // Admin: allow selecting any prodi
    sel.innerHTML = '<option value="">— Fakultas / Umum —</option>';
    S.prodiLinks.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.prodi_code;
      opt.textContent = `${p.prodi_code} — ${p.prodi_name}`;
      if (p.prodi_code === selectedCode) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.disabled = false;
    sel.style.backgroundColor = '';
  }
}

function getActiveTwKey() {
  const val = $('flt-bulan').value;
  if (val === 'Triwulan 1') return 'tw1';
  if (val === 'Triwulan 2') return 'tw2';
  if (val === 'Triwulan 3') return 'tw3';
  if (val === 'Triwulan 4') return 'tw4';
  return 'tw1';
}

// Legacy helpers — kept for backward compat with non-renstra code
function getTwValue(fieldVal, twKey) {
  if (!fieldVal) return '';
  try {
    const json = JSON.parse(fieldVal);
    if (json && typeof json === 'object' && json[twKey] !== undefined) {
      return json[twKey] || '';
    }
  } catch (e) {
    if (twKey === 'tw1') return fieldVal;
  }
  return '';
}

function updateTwValue(existingFieldVal, twKey, newVal) {
  let json = {};
  if (existingFieldVal) {
    try {
      json = JSON.parse(existingFieldVal);
      if (typeof json !== 'object' || json === null) {
        json = { 'tw1': existingFieldVal };
      }
    } catch (e) {
      json = { 'tw1': existingFieldVal };
    }
  }
  json[twKey] = newVal;
  return JSON.stringify(json);
}

function findNodeProdiCode(node, map) {
  let curr = node;
  while (curr) {
    if (curr.prodi_code) return curr.prodi_code;
    curr = curr.parent_id ? map[curr.parent_id] : null;
  }
  return null;
}

// ─── RENDER: RENSTRA ──────────────────────────────────────────────────────────
function renderRenstra(key) {
  const isCapaian = key === 'capaian';
  const tbodyId = isCapaian ? 'tbody-renstra-capaian' : 'tbody-renstra-tj';
  const tbody = $(tbodyId);
  if (!tbody) return;
  const { roots, map } = buildTree(S.items);

  const activeProdi = getActiveProdiCode();

  // Overlay progress data onto tree nodes for Level 4 items
  if (activeProdi && S.renstraProgress.length > 0) {
    overlayProgressOnTree(map);
  }

  // Aggregasi anggaran dari level 4 ke level 3, 2, 1
  calculateAggregateAmounts(roots, activeProdi);

  let html = '';

  // Show info banner if no prodi selected (admin only)
  if (!activeProdi && S.role === 'admin') {
    html = `<tr><td colspan="12" style="text-align:center;padding:32px;color:var(--muted);">
      <i class="fa-solid fa-filter" style="font-size:1.5rem;margin-bottom:8px;display:block;"></i>
      Silakan pilih <strong>Prodi</strong> pada filter di atas untuk melihat progress Renstra.
    </td></tr>`;
    tbody.innerHTML = html;
    return;
  }

  function walk(node) {
    // ONLY render up to Level 4 (IKU)
    if (node.level > 4) return;

    const hidden = isAncestorCollapsed(node, map);
    const isCol = S.collapsed.has(node.id);
    const cls = levelClass(node.level);
    const indent = (node.level - 1) * 16;

    // Expand/collapse chevron for any parent that has children (Level < 4)
    const hasKids = node.children && node.children.length > 0 && node.level < 4;

    const prodiBadge = node.prodi_code ? `<span class="badge-prodi">${escapeHTML(node.prodi_code)}</span> ` : '';

    // Get progress data for this node (Level 4 items)
    const prog = (node.level === 4) ? getProgress(node.id) : null;

    // Render target columns as inline inputs where applicable
    let targetFakultasHtml = '';
    let targetUnitHtml = '';

    if (node.level === 4) {
      if (S.role === 'admin') {
        targetFakultasHtml = `<input type="text" class="table-input" value="${escapeHTML(node.target_univ || '')}" onblur="saveTargetFakultas(${node.id}, this.value)">`;
      } else {
        targetFakultasHtml = escapeHTML(node.target_univ || '');
      }

      // Target Unit now comes from progress data
      const progTargetUnit = prog ? (prog.target_unit || '') : '';
      if (activeProdi) {
        targetUnitHtml = `<input type="text" class="table-input" value="${escapeHTML(progTargetUnit)}" onblur="saveTargetUnit(${node.id}, this.value)">`;
      } else {
        targetUnitHtml = escapeHTML(progTargetUnit);
      }
    } else {
      targetFakultasHtml = node.target_univ ? escapeHTML(node.target_univ) : '';
      targetUnitHtml = '';
    }

    // Kegiatan column: 🔍 button to view and upload drive links for Level 4 IKU activities
    let kegiatanHtml = '';
    if (node.level === 4) {
      kegiatanHtml = `<button class="btn btn-secondary btn-sm btn-icon" onclick="openRenstraKegiatan(${node.id})" title="Lihat Rincian Kegiatan"><i class="fa-solid fa-search"></i></button>`;
    }

    // Format anggaran — from progress if available, else from master
    const progAmount = prog ? prog.amount : null;
    const displayAmount = (progAmount !== null && progAmount !== undefined) ? progAmount : (node._progAmount !== undefined ? node._progAmount : node.amount);
    const anggaranText = displayAmount ? fmtNum(displayAmount) : '0';
    const displayStyle = hidden ? 'display: none;' : '';

    if (isCapaian) {
      // All capaian fields now come from progress data
      const capVal = prog ? (prog.capaian || '') : '';
      const capPctVal = prog ? (prog.capaian_pct || '') : '';
      const progVal = prog ? (prog.progress || '') : '';
      const issVal = prog ? (prog.issues || '') : '';
      const stratVal = prog ? (prog.strategy || '') : '';
      const dukungVal = prog ? (prog.supporting_data_link || '') : '';

      // Pencil icon only for Level 4 IKU items when a prodi is selected
      let pencilHtml = '';
      if (node.level === 4 && activeProdi) {
        pencilHtml = `<button class="btn btn-secondary btn-sm btn-icon" onclick="openCapaianRenstra(${node.id})" title="Isi Capaian"><i class="fa-solid fa-pencil"></i></button>`;
      }

      // Preview Data Dukung button under column 6 (Data Pendukung)
      let previewDukungHtml = '';
      if (node.level === 4) {
        if (dukungVal && dukungVal.trim() !== '') {
          previewDukungHtml = `<button class="btn btn-secondary btn-sm btn-icon" onclick="window.open('${escapeHTML(dukungVal.trim())}', '_blank')" title="Preview Data Dukung (Google Drive)"><i class="fa-solid fa-search c-blue" style="color: var(--blue);"></i></button>`;
        } else {
          previewDukungHtml = `<button class="btn btn-secondary btn-sm btn-icon" onclick="alert('Belum ada data dukung (Google Drive) yang diunggah untuk periode ini.')" title="Data Dukung Kosong" style="opacity: 0.5;"><i class="fa-solid fa-search"></i></button>`;
        }
      }

      html += `
        <tr class="${cls}" style="${displayStyle}">
          <td class="text-left">
            <div class="tree-cell">
              <span class="indent" style="width:${indent}px"></span>
              ${hasKids
                ? `<button class="toggle-btn ${isCol ? 'collapsed' : ''}" onclick="toggleCollapse(${node.id})"><i class="fa-solid fa-chevron-down"></i></button>`
                : `<span class="no-toggle"></span>`}
              <span>${prodiBadge}${escapeHTML(node.description)}</span>
            </div>
          </td>
          <td class="text-left">${node.code ? escapeHTML(node.code) : ''}</td>
          <td class="text-center">${node.satuan ? escapeHTML(node.satuan) : ''}</td>
          <td class="text-center">${targetFakultasHtml}</td>
          <td class="text-center">${targetUnitHtml}</td>
          <td class="text-center">${pencilHtml}</td>
          <td class="text-center">${previewDukungHtml}</td>
          <td class="text-center">${capVal ? escapeHTML(capVal) : '0'}</td>
          <td class="text-center">${capPctVal ? escapeHTML(capPctVal) : '0'}</td>
          <td class="text-left">${progVal ? escapeHTML(progVal) : ''}</td>
          <td class="text-left">${issVal ? escapeHTML(issVal) : ''}</td>
          <td class="text-left">${stratVal ? escapeHTML(stratVal) : ''}</td>
        </tr>
      `;
    } else {
      html += `
        <tr class="${cls}" style="${displayStyle}">
          <td class="text-left">
            <div class="tree-cell">
              <span class="indent" style="width:${indent}px"></span>
              ${hasKids
                ? `<button class="toggle-btn ${isCol ? 'collapsed' : ''}" onclick="toggleCollapse(${node.id})"><i class="fa-solid fa-chevron-down"></i></button>`
                : `<span class="no-toggle"></span>`}
              <span>${prodiBadge}${escapeHTML(node.description)}</span>
            </div>
          </td>
          <td class="text-left">${node.code ? escapeHTML(node.code) : ''}</td>
          <td class="text-center">${node.satuan ? escapeHTML(node.satuan) : ''}</td>
          <td class="text-center">${targetFakultasHtml}</td>
          <td class="text-center">${targetUnitHtml}</td>
          <td class="text-right" style="font-weight: 500;">${anggaranText}</td>
          <td class="text-center">${kegiatanHtml}</td>
          <td class="admin-only text-center">${renderActionCell(node)}</td>
        </tr>
      `;
    }
    
    if (node.children) {
      node.children.forEach(walk);
    }
  }
  roots.forEach(walk);
  tbody.innerHTML = html;
}

// Overlay progress data from S.renstraProgress onto tree nodes
function overlayProgressOnTree(map) {
  S.renstraProgress.forEach(prog => {
    const node = map[prog.item_id];
    if (node) {
      // Store progress amount for aggregation
      node._progAmount = prog.amount || 0;
    }
  });
}

// ─── RENDER: PEMBELAJARAN ─────────────────────────────────────────────────────
function renderPembelajaran() {
  const tbody = $('tbody-pembelajaran');
  if (!tbody) return;
  const { roots, map } = buildTree(S.items);
  let html = '';

  function walk(node) {
    const hidden = isAncestorCollapsed(node, map);
    const hasKids = node.children.length > 0;
    const isCol = S.collapsed.has(node.id);
    const cls = levelClass(node.level);
    const indent = (node.level - 1) * 16;

    const dukungHtml = dukungCell(node.id, node.supporting_data_link, node.level >= 3);
    const prodiBadge = node.prodi_code ? `<span class="badge-prodi">${escapeHTML(node.prodi_code)}</span> ` : '';
    const displayStyle = hidden ? 'display: none;' : '';

    html += `
      <tr class="${cls}" style="${displayStyle}">
        <td class="text-left">${escapeHTML(node.code)}</td>
        <td class="text-left">
          <div class="tree-cell">
            <span class="indent" style="width:${indent}px"></span>
            ${hasKids
              ? `<button class="toggle-btn ${isCol ? 'collapsed' : ''}" onclick="toggleCollapse(${node.id})"><i class="fa-solid fa-chevron-down"></i></button>`
              : `<span class="no-toggle"></span>`}
            <span>${prodiBadge}${escapeHTML(node.description)}</span>
          </div>
        </td>
        <td class="text-center">${node.target_unit ? escapeHTML(node.target_unit) : ''}</td>
        <td class="text-center">${node.capaian ? escapeHTML(node.capaian) : ''}</td>
        <td class="text-center">${node.capaian_pct ? escapeHTML(node.capaian_pct) : ''}</td>
        <td class="text-left">${node.progress ? escapeHTML(node.progress) : ''}</td>
        <td class="text-center">${dukungHtml}</td>
        <td class="text-center">${renderActionCell(node)}</td>
      </tr>
    `;
    node.children.forEach(walk);
  }
  roots.forEach(walk);
  tbody.innerHTML = html;
}

// ─── RENDER: PRODI DRIVE LINKS (7 folder) ────────────────────────────────────
const DRIVE_FOLDERS = [
  { key: 'link_perjanjian_kinerja', num: '1', label: 'PERJANJIAN KINERJA PRODI' },
  { key: 'link_template_kinerja', num: '2', label: 'Template Kinerja Prodi' },
  { key: 'link_tw1', num: '3', label: 'TW1 (Januari - Maret 2026)' },
  { key: 'link_tw2', num: '4', label: 'TW 2 (April - Juni 2026)' },
  { key: 'link_bukti_dukung_tw1', num: '5', label: 'Bukti dukung kinerja prodi TW 1' },
  { key: 'link_bukti_lama', num: '6', label: 'Bukti lama' },
  { key: 'link_contoh_target', num: '7', label: 'Contoh target capaian prodi' },
];

function isEditAllowedForProdi(prodiCode) {
  return S.role === 'admin' || (S.role === 'user' && S.prodiCode === prodiCode);
}

function renderProdiLinks() {
  const container = $('prodi-cards');
  container.innerHTML = '';

  let list = S.prodiLinks;
  if (S.role === 'user' && S.prodiCode) {
    list = S.prodiLinks.filter(p => p.prodi_code === S.prodiCode);
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="info-box"><p>Belum ada data prodi. Klik "+ Tambah Prodi" untuk menambahkan.</p></div>';
    return;
  }

  list.forEach(prodi => {
    const filledCount = DRIVE_FOLDERS.filter(f => prodi[f.key] && prodi[f.key].trim() !== '').length;

    const linksHtml = DRIVE_FOLDERS.map(f => {
      const link = prodi[f.key];
      const hasLink = link && link.trim() !== '';
      return `
        <div class="prodi-link-row">
          <div class="prodi-link-num">${f.num}</div>
          <div class="prodi-link-info">
            <div class="prodi-link-label">${f.label}</div>
          </div>
          <div class="prodi-link-action">
            ${hasLink
          ? `<a href="${escapeHTML(link)}" target="_blank" class="dlbadge has-link"><i class="fa-brands fa-google-drive"></i> Buka Drive</a>`
          : (isEditAllowedForProdi(prodi.prodi_code)
            ? `<span class="dlbadge no-link" onclick="openProdiLinkEdit(${prodi.id})"><i class="fa-solid fa-plus"></i> Isi Link</span>`
            : `<span class="dlbadge no-link" style="opacity: 0.5; cursor: not-allowed;" title="Akses terkunci"><i class="fa-solid fa-lock"></i> Kosong</span>`)}
          </div>
        </div>
      `;
    }).join('');

    const dotsHtml = DRIVE_FOLDERS.map(f =>
      `<div class="prog-dot ${prodi[f.key] ? 'filled' : ''}"></div>`
    ).join('');

    const card = document.createElement('div');
    card.className = 'prodi-card';
    card.innerHTML = `
      <div class="prodi-card-header">
        <h3><i class="fa-solid fa-graduation-cap"></i> ${escapeHTML(prodi.prodi_name)}</h3>
        <span class="prodi-card-code">${escapeHTML(prodi.prodi_code)}</span>
      </div>
      <div class="prodi-card-body">
        <div class="prodi-links-grid">${linksHtml}</div>
      </div>
      <div class="prodi-card-footer">
        <div class="progress-dots" title="${filledCount}/7 link terisi">
          ${dotsHtml}
          <span style="font-size:.75rem;color:var(--muted);margin-left:6px">${filledCount}/7 terisi</span>
        </div>
        <div class="act-cell">
          ${isEditAllowedForProdi(prodi.prodi_code)
        ? `<button class="btn btn-secondary btn-sm" onclick="openProdiLinkEdit(${prodi.id})">
                 <i class="fa-solid fa-pen"></i> Edit Semua Link
               </button>`
        : ''}
          ${S.role === 'admin'
        ? `<button class="btn btn-danger btn-sm" onclick="deleteProdi(${prodi.id})" title="Hapus Prodi">
                 <i class="fa-solid fa-trash"></i> Hapus
               </button>`
        : ''}
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Update dashboard stat
  const dsEl = $('ds-prodi-linked');
  if (dsEl) {
    const filled = S.prodiLinks.filter(p => DRIVE_FOLDERS.some(f => p[f.key])).length;
    dsEl.textContent = `${filled} / ${S.prodiLinks.length} Prodi`;
  }
}

// ─── RENDER: PURCHASES ───────────────────────────────────────────────────────
function renderPurchases() {
  const tbody = $('tbody-pembelian');
  tbody.innerHTML = '';

  S.purchases.forEach((p, i) => {
    const date = new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    // Tampilkan tombol Edit dan Hapus hanya jika user adalah Admin atau pemilik data pembelian (prodi yang sama)
    const isOwner = S.role === 'admin' || (S.role === 'user' && p.prodi_code === S.prodiCode);
    const actionsHtml = isOwner
      ? `<div class="act-cell">
           <button class="btn btn-secondary btn-sm btn-icon" onclick="openEditPurchase(${p.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
           <button class="btn btn-danger btn-sm btn-icon" onclick="deletePurchase(${p.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
         </div>`
      : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${i + 1}</td>
      <td class="text-left"><strong>${escapeHTML(p.item_name)}</strong></td>
      <td class="text-center">${p.quantity}</td>
      <td class="text-right">${fmtNum(p.price)}</td>
      <td class="c-blue text-right" style="font-weight:700">${rupiah(p.total_amount)}</td>
      <td class="text-center">${p.prodi_code ? `<span class="badge-prodi">${escapeHTML(p.prodi_code)}</span>` : '<span class="badge-prodi badge-prodi-fac">Fakultas</span>'}</td>
      <td class="text-center"><a href="${escapeHTML(p.drive_link)}" target="_blank" class="dlbadge has-link"><i class="fa-brands fa-google-drive"></i> Drive Link</a></td>
      <td class="text-left">${p.keterangan ? escapeHTML(p.keterangan) : '-'}</td>
      <td class="text-center" style="font-size:.78rem;color:var(--muted)">${date}</td>
      <td class="text-center">${actionsHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── HELPER: Drive Badge Cells ────────────────────────────────────────────────
function driveCell(link, itemId, field, showIfEmpty) {
  if (!showIfEmpty && !link) return '';
  if (link) {
    return `<a href="${escapeHTML(link)}" target="_blank" class="dlbadge has-link"><i class="fa-brands fa-google-drive"></i> Drive Link</a>`;
  }
  return `<span class="dlbadge no-link" onclick="openDriveModal(${itemId},'${field}')"><i class="fa-solid fa-plus"></i> Tambah Link</span>`;
}

function dukungCell(itemId, link, show) {
  if (!show) return '';
  if (link) {
    return `
      <div style="display:flex;gap:5px;align-items:center">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="openDriveModal(${itemId},'supporting_data_link')" title="Edit Data Dukung"><i class="fa-solid fa-database c-green"></i></button>
        <a href="${escapeHTML(link)}" target="_blank" class="dlbadge has-link"><i class="fa-brands fa-google-drive"></i> Open</a>
      </div>`;
  }
  return `<button class="btn btn-secondary btn-sm" onclick="openDriveModal(${itemId},'supporting_data_link')"><i class="fa-solid fa-database"></i> Tambah</button>`;
}

// ─── COLLAPSE TREE ────────────────────────────────────────────────────────────
window.toggleCollapse = function (id) {
  S.collapsed.has(id) ? S.collapsed.delete(id) : S.collapsed.add(id);
  renderCurrentViewLocally();
};

// ─── MODALS ───────────────────────────────────────────────────────────────────
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

function bindModals() {
  // Close on overlay click or X button
  $$('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
  });
  $$('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
}

// ─── DATA DUKUNG MODAL ───────────────────────────────────────────────────────
window.openDriveModal = function (itemId, field) {
  $('dd-item-id').value = itemId;
  $('dd-field').value = field;

  const item = S.items.find(i => i.id === itemId);
  const curLink = item ? item[field] : '';

  $('dd-link').value = curLink || '';

  const curDiv = $('dd-current');
  if (curLink) {
    curDiv.style.display = 'flex';
    $('dd-current-a').href = curLink;
  } else {
    curDiv.style.display = 'none';
  }

  openModal('modal-dukung');
};

// ─── ITEM MODAL (Add / Edit) ──────────────────────────────────────────────────
function resetItemForm() {
  ['mi-id', 'mi-level', 'mi-parent', 'mi-code', 'mi-desc', 'mi-volume', 'mi-unit', 'mi-price',
    'mi-source', 'mi-incentive', 'mi-receipt', 'mi-tuniv', 'mi-tunit', 'mi-capaian',
    'mi-capaian-pct', 'mi-satuan', 'mi-progress', 'mi-issues', 'mi-strategy', 'mi-dukung',
    'mi-jan', 'mi-feb', 'mi-mar', 'mi-apr', 'mi-mei', 'mi-jun', 'mi-jul', 'mi-aug', 'mi-sep', 'mi-oct', 'mi-nov', 'mi-dec'].forEach(id => {
      const el = $(id);
      if (el) el.value = el.tagName === 'SELECT' ? (el.options[0]?.value || '') : '';
    });
}

function populateSourceOfFundDropdown(selectedVal) {
  const sel = $('mi-source');
  if (!sel) return;

  const defaults = ['BPPTNBH', 'IPI', 'UKT/SPP', 'RM-RUTIN'];
  const uniqueSources = new Set(defaults);

  S.items.forEach(item => {
    if (item.source_of_fund) {
      uniqueSources.add(item.source_of_fund);
    }
  });

  sel.innerHTML = '<option value="">— Pilih —</option>';
  uniqueSources.forEach(src => {
    const opt = document.createElement('option');
    opt.value = src;
    opt.textContent = src;
    if (src === selectedVal) opt.selected = true;
    sel.appendChild(opt);
  });

  const optNew = document.createElement('option');
  optNew.value = '__new__';
  optNew.textContent = '— Tulis Sumber Dana Baru... —';
  sel.appendChild(optNew);

  const customContainer = $('fg-mi-source-custom');
  const customInput = $('mi-source-custom');

  customContainer.style.display = 'none';
  customInput.value = '';

  sel.onchange = () => {
    if (sel.value === '__new__') {
      customContainer.style.display = 'block';
      customInput.focus();
    } else {
      customContainer.style.display = 'none';
    }
  };
}

function openAddItem(type) {
  resetItemForm();
  $('mi-type').value = type;

  const isRenstra = S.tab === 'renstra-tanggung' || S.tab === 'renstra-capaian';
  if (type === 'pembelajaran') {
    $('modal-item-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Tambah Capaian Pembelajaran (CPL)';
  } else if (isRenstra) {
    $('modal-item-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Tambah Renstra';
  } else {
    $('modal-item-title').innerHTML = '<i class="fa-solid fa-plus-circle"></i> Tambah Item RKA';
  }

  const showKeuangan = type !== 'pembelajaran' && !isRenstra;
  $('fi-keuangan').style.display = showKeuangan ? 'block' : 'none';
  $('fi-pembelajaran').style.display = type === 'pembelajaran' ? 'block' : 'none';
  $('fi-renstra').style.display = isRenstra ? 'block' : 'none';

  // Level 1: Tampilkan penanggung jawab untuk Admin
  if (S.role === 'admin') {
    populateProdiDropdown('');
    $('fg-mi-prodi').style.display = 'block';
  } else {
    $('fg-mi-prodi').style.display = 'none';
  }

  $('mi-level').disabled = false;
  $('mi-parent').disabled = false;

  if (showKeuangan) {
    populateSourceOfFundDropdown('');
  }

  populateParentDropdown(null, type);
  openModal('modal-item');
}

window.openEditItem = function (id) {
  const item = S.items.find(i => i.id === id);
  if (!item) return;

  resetItemForm();

  $('mi-id').value = id;
  $('mi-type').value = item.type;
  $('modal-item-title').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Item';
  $('mi-level').value = item.level;
  $('mi-code').value = item.code || '';
  $('mi-desc').value = item.description || '';
  $('mi-dukung').value = item.supporting_data_link || '';

  const isRenstra = item.type === 'renstra' || S.tab === 'renstra-tanggung' || S.tab === 'renstra-capaian';
  const isPembelajaran = item.type === 'pembelajaran';

  if (item.level === 1 && S.role === 'admin') {
    populateProdiDropdown(item.prodi_code || '');
    $('fg-mi-prodi').style.display = 'block';
  } else {
    $('fg-mi-prodi').style.display = 'none';
  }

  if (S.role !== 'admin') {
    $('mi-level').disabled = true;
    $('mi-parent').disabled = true;
  } else {
    $('mi-level').disabled = false;
    $('mi-parent').disabled = false;
  }

  if (isRenstra) {
    $('fi-keuangan').style.display = 'none';
    $('fi-pembelajaran').style.display = 'none';
    $('fi-renstra').style.display = 'block';
    $('mi-r-satuan').value = item.satuan || '';
    $('mi-r-tuniv').value = item.target_univ || '';
    $('mi-r-tunit').value = item.target_unit || '';
    $('mi-r-anggaran').value = item.amount || '';
  } else if (isPembelajaran) {
    $('fi-keuangan').style.display = 'none';
    $('fi-pembelajaran').style.display = 'block';
    $('fi-renstra').style.display = 'none';
    $('mi-p-tunit').value = item.target_unit || '';
    $('mi-p-capaian').value = item.capaian || '';
    $('mi-p-capaian-pct').value = item.capaian_pct || '';
    $('mi-p-progress').value = item.progress || '';
  } else {
    $('fi-keuangan').style.display = 'block';
    $('fi-pembelajaran').style.display = 'none';
    $('fi-renstra').style.display = 'none';
    $('mi-volume').value = item.volume || '';
    $('mi-unit').value = item.unit || '';
    $('mi-price').value = item.price || '';
    populateSourceOfFundDropdown(item.source_of_fund || '');
    $('mi-incentive').value = item.performance_incentive || '';
    $('mi-receipt').value = item.receipt_link || '';

    // RPD bulanan
    $('mi-jan').value = item.jan || '';
    $('mi-feb').value = item.feb || '';
    $('mi-mar').value = item.mar || '';
    $('mi-apr').value = item.apr || '';
    $('mi-mei').value = item.mei || '';
    $('mi-jun').value = item.jun || '';
    $('mi-jul').value = item.jul || '';
    $('mi-aug').value = item.aug || '';
    $('mi-sep').value = item.sep || '';
    $('mi-oct').value = item.oct || '';
    $('mi-nov').value = item.nov || '';
    $('mi-dec').value = item.dec || '';
  }

  populateParentDropdown(item.parent_id, item.type);
  openModal('modal-item');
};

function populateParentDropdown(selectedId, type) {
  const sel = $('mi-parent');
  const curLevel = parseInt($('mi-level').value) || 1;
  sel.innerHTML = '<option value="">— Tanpa Induk (Root) —</option>';

  S.items.filter(i => i.level < curLevel && i.type === type).forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.id;
    opt.textContent = `[L${i.level}] ${i.code} — ${i.description.substring(0, 50)}`;
    if (i.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

$('mi-level').addEventListener('change', () => {
  populateParentDropdown(null, $('mi-type').value);
});

// ─── PRODI LINKS MODAL ────────────────────────────────────────────────────────
window.openProdiLinkEdit = function (id) {
  const prodi = S.prodiLinks.find(p => p.id === id);
  if (!prodi) return;

  $('mp-id').value = prodi.id;
  $('mp-name').value = prodi.prodi_name;
  $('mp-code').value = prodi.prodi_code;
  $('mp-l0').value = prodi.link_perjanjian_kinerja || '';
  $('mp-l1').value = prodi.link_template_kinerja || '';
  $('mp-l2').value = prodi.link_tw1 || '';
  $('mp-l3').value = prodi.link_tw2 || '';
  $('mp-l4').value = prodi.link_bukti_dukung_tw1 || '';
  $('mp-l5').value = prodi.link_bukti_lama || '';
  $('mp-l6').value = prodi.link_contoh_target || '';
  $('mp-ket').value = prodi.keterangan || '';

  if (S.role === 'admin') {
    $('mp-name').readOnly = false;
    $('mp-code').readOnly = false;
    $('mp-name').style.backgroundColor = '';
    $('mp-code').style.backgroundColor = '';
  } else {
    $('mp-name').readOnly = true;
    $('mp-code').readOnly = true;
    $('mp-name').style.backgroundColor = '#e2e8f0';
    $('mp-code').style.backgroundColor = '#e2e8f0';
  }

  $('modal-prodi-title').innerHTML = `<i class="fa-brands fa-google-drive"></i> Edit Link Drive — ${prodi.prodi_name}`;
  openModal('modal-prodi');
};

function openAddProdi() {
  $('mp-id').value = '';
  $('mp-name').readOnly = false;
  $('mp-code').readOnly = false;
  $('mp-name').style.backgroundColor = '';
  $('mp-code').style.backgroundColor = '';
  ['mp-name', 'mp-code', 'mp-l0', 'mp-l1', 'mp-l2', 'mp-l3', 'mp-l4', 'mp-l5', 'mp-l6', 'mp-ket']
    .forEach(id => { $(id).value = ''; });
  $('modal-prodi-title').innerHTML = '<i class="fa-brands fa-google-drive"></i> Tambah Prodi Baru';
  openModal('modal-prodi');
}
window.openAddPurchase = function () {
  $('pb-id').value = '';
  $('pb-name').value = '';
  $('pb-qty').value = '1';
  $('pb-price').value = '';
  $('pb-link').value = '';
  $('pb-ket').value = '';
  populatePurchasesProdiDropdown('');
  $('modal-pembelian-title').innerHTML = '<i class="fa-solid fa-cart-plus"></i> Tambah Data Pembelian';
  openModal('modal-pembelian');
};

window.openEditPurchase = function (id) {
  const p = S.purchases.find(item => item.id === id);
  if (!p) return;

  $('pb-id').value = p.id;
  $('pb-name').value = p.item_name;
  $('pb-qty').value = p.quantity;
  $('pb-price').value = p.price;
  $('pb-link').value = p.drive_link;
  $('pb-ket').value = p.keterangan || '';
  populatePurchasesProdiDropdown(p.prodi_code || '');

  $('modal-pembelian-title').innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Edit Data Pembelian';
  openModal('modal-pembelian');
};


// ─── BIND FORMS ───────────────────────────────────────────────────────────────
function bindForms() {
  // Add main button
  $('btn-add-main').addEventListener('click', () => {
    const type = $('btn-add-main').dataset.type || 'keuangan_rka';
    openAddItem(type);
  });

  $('btn-tampilkan').addEventListener('click', renderCurrentView);
  $('flt-bulan').addEventListener('change', renderCurrentView);
  $('flt-unit').addEventListener('change', renderCurrentView);

  // Import / Export Excel
  $('btn-import-renstra').addEventListener('click', () => {
    $('input-import-renstra').click();
  });

  $('input-import-renstra').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Peringatan: Mengimpor file Excel baru akan menghapus semua data Renstra tahun ' + $('flt-tahun').value + '. Apakah Anda yakin ingin melanjutkan?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // ─── Step 1: Find header row and column positions dynamically ───
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
          alert('Format Excel tidak sesuai. Pastikan ada baris header dengan kolom "KODE".');
          e.target.value = '';
          return;
        }

        // Determine data column positions relative to KODE
        const headerRow = rows[headerRowIdx];
        let satuanColIdx = kodeColIdx + 1;
        let targetFakColIdx = kodeColIdx + 2;
        let targetUnitColIdx = kodeColIdx + 3;
        let anggaranColIdx = kodeColIdx + 4;

        // Try to find columns by header name if available
        for (let j = kodeColIdx + 1; j < headerRow.length; j++) {
          const hdr = headerRow[j] ? String(headerRow[j]).trim().toUpperCase() : '';
          if (hdr.includes('SATUAN')) satuanColIdx = j;
          else if (hdr.includes('TARGET') && (hdr.includes('UNIV') || hdr.includes('FAKULTAS'))) targetFakColIdx = j;
          else if (hdr.includes('TARGET') && (hdr.includes('UNIT') || hdr.includes('PRODI'))) targetUnitColIdx = j;
          else if (hdr.includes('ANGGARAN') || hdr.includes('AMOUNT')) anggaranColIdx = j;
        }

        // URAIAN area spans from column 0 to kodeColIdx - 1
        const uraianEndCol = kodeColIdx; // exclusive

        // ─── Step 2: Parse data rows ───
        const itemsToInsert = [];
        let lastL1 = null;
        let lastL2 = null;
        let lastL3 = null;
        let lastL4 = null;

        for (let idx = headerRowIdx + 1; idx < rows.length; idx++) {
          const row = rows[idx];
          if (!row || row.length === 0) continue;

          // Collect all text from URAIAN columns (columns 0 to uraianEndCol-1)
          let uraianParts = [];
          let lastNonEmptyCol = -1;

          for (let col = 0; col < uraianEndCol; col++) {
            const cellVal = row[col] !== undefined && row[col] !== null ? String(row[col]).trim() : '';
            if (cellVal) {
              uraianParts.push(cellVal);
              lastNonEmptyCol = col;
            }
          }

          const description = uraianParts.join(' ').trim();
          if (!description) continue;

          // Skip header-like rows
          if (description.toUpperCase() === 'URAIAN' ||
            description.toUpperCase().startsWith('DAFTAR KEGIATAN') ||
            description.toUpperCase().startsWith('RENSTRA') ||
            description.toUpperCase().startsWith('TAHUN:')) continue;

          // Determine level based on which column has the text
          // The rightmost column with text indicates indentation depth
          let level = 0;
          if (uraianEndCol <= 1) {
            // Only 1 column for URAIAN — detect level by text patterns
            const desc = description.toLowerCase();
            if (desc.includes('kegiatan:') || desc.startsWith('kegiatan ')) level = 5;
            else if (desc.includes('[iku') || desc.match(/^[\d.]+\s*\[iku/i)) level = 4;
            else if (desc.includes('[p') && desc.match(/\[p\d/i)) level = 3;
            else if (desc.includes('bidang') || desc.match(/^\d+\.\s*bidang/i)) level = 2;
            else level = 1;
          } else {
            // Multi-column URAIAN — level = lastNonEmptyCol + 1 (clamped 1-5)
            level = Math.min(Math.max(lastNonEmptyCol + 1, 1), 5);
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

          const itemObj = {
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
          alert('Format Excel tidak sesuai atau data kosong.');
          e.target.value = '';
          return;
        }

        const selectedYear = parseInt($('flt-tahun').value) || 2026;
        await api('POST', '/api/items/import-renstra', { items: itemsToInsert, year: selectedYear });
        alert('Data Renstra berhasil diimpor! (' + itemsToInsert.length + ' item)');
        renderCurrentView();
      } catch (err) {
        alert('Gagal mengimpor file: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  });


  $('btn-export-renstra').addEventListener('click', exportRenstraToExcel);

  // Save data dukung link
  $('btn-save-dukung').addEventListener('click', async () => {
    const id = $('dd-item-id').value;
    const field = $('dd-field').value;
    const link = $('dd-link').value.trim();

    if (!link) return alert('Link Drive wajib diisi.');
    if (!link.startsWith('http://') && !link.startsWith('https://'))
      return alert('Link harus diawali dengan http:// atau https://');

    try {
      await api('PUT', `/api/items/${id}/drive-link`, { field, link });
      closeModal('modal-dukung');
      // Update local state
      const item = S.items.find(i => i.id == id);
      if (item) item[field] = link;
      renderCurrentView();
    } catch (e) { alert(e.message); }
  });

  // Save item (RKA / Pembelajaran)
  $('btn-save-item').addEventListener('click', async () => {
    const id = $('mi-id').value;
    const type = $('mi-type').value;
    const parentId = $('mi-parent').value ? parseInt($('mi-parent').value) : null;

    // Tentukan prodi_code (warisi dari induk jika ada parent, atau ambil dari dropdown admin)
    let prodiCode = null;
    if (parentId) {
      const parentItem = S.items.find(i => i.id === parentId);
      if (parentItem) prodiCode = parentItem.prodi_code;
    } else {
      prodiCode = $('mi-prodi-code').value || null;
    }

    const body = {
      parent_id: parentId,
      level: parseInt($('mi-level').value),
      code: $('mi-code').value.trim(),
      description: $('mi-desc').value.trim(),
      type,
      supporting_data_link: $('mi-dukung').value.trim() || null,
      prodi_code: prodiCode
    };

    if (!id) {
      if (parentId) {
        // Inherit parent's created_at to stay in the same triwulan
        const parentItem = S.items.find(i => i.id === parentId);
        if (parentItem && parentItem.created_at) {
          body.created_at = parentItem.created_at;
        }
      }

      if (!body.created_at) {
        const selectedYear = parseInt($('flt-tahun').value) || 2026;
        const selectedMonthName = $('flt-bulan').value;
        const twMonthMap = {
          'Triwulan 1': 0,
          'Triwulan 2': 3,
          'Triwulan 3': 6,
          'Triwulan 4': 9
        };
        const selectedMonth = twMonthMap[selectedMonthName] !== undefined ? twMonthMap[selectedMonthName] : 0;
        body.created_at = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0)).toISOString();
      }
    }

    if (!body.description) return alert('Uraian/Deskripsi wajib diisi.');

    if (type === 'keuangan_rka') {
      body.volume = $('mi-volume').value.trim() || null;
      body.unit = $('mi-unit').value.trim() || null;

      const priceVal = parseFloat($('mi-price').value);
      body.price = isNaN(priceVal) ? null : priceVal;

      // Sumber dana kustom
      const sourceSelect = $('mi-source').value;
      if (sourceSelect === '__new__') {
        const customVal = $('mi-source-custom').value.trim();
        if (!customVal) return alert('Sumber Dana Baru wajib ditulis.');
        body.source_of_fund = customVal;
      } else {
        body.source_of_fund = sourceSelect || null;
      }

      const incentiveVal = parseFloat($('mi-incentive').value);
      body.performance_incentive = isNaN(incentiveVal) ? null : incentiveVal;

      body.receipt_link = $('mi-receipt').value.trim() || null;

      const volNum = parseFloat(body.volume);
      body.amount = !isNaN(volNum) && body.price !== null ? body.price * volNum : 0;

      // RPD bulanan
      ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].forEach(m => {
        const val = parseFloat($(`mi-${m}`).value);
        body[m] = isNaN(val) ? 0 : val;
      });
    } else if (type === 'renstra') {
      body.satuan = $('mi-r-satuan').value.trim() || null;
      body.target_univ = $('mi-r-tuniv').value.trim() || null;
      body.target_unit = $('mi-r-tunit').value.trim() || null;
      const rAnggaran = parseFloat($('mi-r-anggaran').value);
      body.amount = isNaN(rAnggaran) ? 0 : rAnggaran;
    } else if (type === 'pembelajaran') {
      body.target_unit = $('mi-p-tunit').value.trim() || null;
      body.capaian = $('mi-p-capaian').value.trim() || null;
      body.capaian_pct = $('mi-p-capaian-pct').value.trim() || null;
      body.progress = $('mi-p-progress').value.trim() || null;
    }

    try {
      if (id) {
        await api('PUT', `/api/items/${id}`, body);
      } else {
        await api('POST', '/api/items', body);
      }
      closeModal('modal-item');
      const renderFn = S.tab === 'pembelajaran' ? renderPembelajaran
        : S.tab === 'rka-rpd' ? renderRkaRpd
          : S.tab === 'renstra-tanggung' ? renderRenstra.bind(null, 'tj')
            : S.tab === 'renstra-capaian' ? renderRenstra.bind(null, 'capaian')
              : renderRkaData;
      fetchItems(type, renderFn);
    } catch (e) { alert(e.message); }
  });

  // Save Capaian Renstra (to renstra_progress per prodi per triwulan)
  $('btn-save-capaian-renstra').addEventListener('click', async () => {
    const id = parseInt($('mcr-item-id').value);
    const item = S.items.find(i => i.id === id);
    if (!item) return;

    const activeProdi = getActiveProdiCode();
    const activeTwNum = getActiveTwNumber();

    if (!activeProdi) {
      alert('Pilih Prodi terlebih dahulu.');
      return;
    }

    // Get existing progress for auto-calc
    const existingProg = getProgress(id);
    
    // Auto-calculate Capaian % if both Target Unit and Capaian are numbers
    const targetUnitStr = existingProg ? (existingProg.target_unit || '') : '';
    const capStr = $('mcr-capaian').value.trim();

    const targetVal = parseFloat(targetUnitStr.replace(/[^0-9.]/g, ''));
    const capVal = parseFloat(capStr.replace(/[^0-9.]/g, ''));

    let capPct = '';
    if (!isNaN(targetVal) && !isNaN(capVal) && targetVal > 0) {
      capPct = Math.round((capVal / targetVal) * 100).toString();
    } else if (capStr === '0' || capVal === 0) {
      capPct = '0';
    }

    const body = {
      item_id: id,
      prodi_code: activeProdi,
      triwulan: activeTwNum,
      capaian: capStr,
      capaian_pct: capPct,
      progress: $('mcr-progress').value.trim(),
      issues: $('mcr-issues').value.trim(),
      strategy: $('mcr-strategy').value.trim(),
      supporting_data_link: $('mcr-dukung').value.trim(),
      // Preserve existing target_unit and amount
      target_unit: existingProg ? existingProg.target_unit : null,
      amount: existingProg ? existingProg.amount : 0
    };

    try {
      await api('PUT', '/api/renstra-progress', body);
      
      // Update local state
      if (existingProg) {
        existingProg.capaian = capStr;
        existingProg.capaian_pct = capPct;
        existingProg.progress = body.progress;
        existingProg.issues = body.issues;
        existingProg.strategy = body.strategy;
        existingProg.supporting_data_link = body.supporting_data_link;
      } else {
        S.renstraProgress.push({ ...body, id: Date.now() });
      }

      closeModal('modal-capaian-renstra');
      renderRenstra('capaian');
    } catch (e) {
      alert('Gagal menyimpan capaian: ' + e.message);
    }
  });

  // Save prodi drive links
  $('btn-save-prodi').addEventListener('click', async () => {
    const id = $('mp-id').value;
    const body = {
      prodi_name: $('mp-name').value.trim(),
      prodi_code: $('mp-code').value.trim(),
      link_perjanjian_kinerja: $('mp-l0').value.trim(),
      link_template_kinerja: $('mp-l1').value.trim(),
      link_tw1: $('mp-l2').value.trim(),
      link_tw2: $('mp-l3').value.trim(),
      link_bukti_dukung_tw1: $('mp-l4').value.trim(),
      link_bukti_lama: $('mp-l5').value.trim(),
      link_contoh_target: $('mp-l6').value.trim(),
      keterangan: $('mp-ket').value.trim(),
    };

    if (!body.prodi_name || !body.prodi_code) return alert('Nama dan Kode Prodi wajib diisi.');

    try {
      if (id) {
        await api('PUT', `/api/prodi-links/${id}`, body);
      } else {
        await api('POST', '/api/prodi-links', body);
      }
      closeModal('modal-prodi');
      fetchProdiLinks();
    } catch (e) { alert(e.message); }
  });

  // Add prodi button
  $('btn-add-prodi').addEventListener('click', openAddProdi);

  // Save pembelian
  $('btn-save-pembelian').addEventListener('click', async () => {
    const id = $('pb-id').value;
    const body = {
      item_name: $('pb-name').value.trim(),
      quantity: parseInt($('pb-qty').value),
      price: parseFloat($('pb-price').value),
      drive_link: $('pb-link').value.trim(),
      keterangan: $('pb-ket').value.trim(),
      prodi_code: $('pb-prodi-code').value || null,
    };

    if (!body.item_name || isNaN(body.quantity) || isNaN(body.price) || !body.drive_link)
      return alert('Semua field bertanda * wajib diisi.');

    try {
      if (id) {
        await api('PUT', `/api/purchases/${id}`, body);
      } else {
        await api('POST', '/api/purchases', body);
      }
      closeModal('modal-pembelian');
      fetchPurchases();
      $('pb-id').value = '';
      ['pb-name', 'pb-qty', 'pb-price', 'pb-link', 'pb-ket'].forEach(id => { $(id).value = ''; });
    } catch (e) { alert(e.message); }
  });

  $('btn-add-pembelian').addEventListener('click', openAddPurchase);

  // ── Manajemen Prodi ──
  $('btn-add-mprodi').addEventListener('click', openAddManajemenProdi);
  $('btn-save-mprodi').addEventListener('click', async () => {
    const id = $('mprodi-id').value;
    const body = {
      prodi_name: $('mprodi-name').value.trim(),
      prodi_code: $('mprodi-code').value.trim(),
      departemen_id: $('mprodi-dept').value ? parseInt($('mprodi-dept').value) : null,
      keterangan: $('mprodi-ket').value.trim(),
    };

    if (!body.prodi_name || !body.prodi_code) return alert('Kode dan Nama Prodi wajib diisi.');

    try {
      if (id) {
        // Preserve existing link fields when editing from manajemen prodi
        const existing = S.prodiLinks.find(p => p.id == id);
        if (existing) {
          body.link_perjanjian_kinerja = existing.link_perjanjian_kinerja || '';
          body.link_template_kinerja = existing.link_template_kinerja || '';
          body.link_tw1 = existing.link_tw1 || '';
          body.link_tw2 = existing.link_tw2 || '';
          body.link_bukti_dukung_tw1 = existing.link_bukti_dukung_tw1 || '';
          body.link_bukti_lama = existing.link_bukti_lama || '';
          body.link_contoh_target = existing.link_contoh_target || '';
        }
        await api('PUT', `/api/prodi-links/${id}`, body);
      } else {
        await api('POST', '/api/prodi-links', body);
      }
      closeModal('modal-mprodi');
      fetchManajemenProdi();
    } catch (e) { alert(e.message); }
  });

  // ── Manajemen Departemen ──
  $('btn-add-mdept').addEventListener('click', openAddDepartemen);
  $('btn-save-mdept').addEventListener('click', async () => {
    const id = $('mdept-id').value;
    const body = {
      kode_departemen: $('mdept-code').value.trim(),
      nama_departemen: $('mdept-name').value.trim(),
    };

    if (!body.kode_departemen || !body.nama_departemen) return alert('Kode dan Nama Departemen wajib diisi.');

    try {
      if (id) {
        await api('PUT', `/api/departemen/${id}`, body);
      } else {
        await api('POST', '/api/departemen', body);
      }
      closeModal('modal-mdept');
      fetchManajemenDepartemen();
    } catch (e) { alert(e.message); }
  });

}

// ─── DELETE ACTIONS ────────────────────────────────────────────────────────────
window.deleteProdi = async function (id) {
  const prodi = S.prodiLinks.find(p => p.id === id);
  const name = prodi ? prodi.prodi_name : '';
  if (!confirm(`Yakin ingin menghapus prodi "${name}" beserta seluruh data link dan akun user terkait?`)) return;
  try {
    await api('DELETE', `/api/prodi-links/${id}`);
    fetchProdiLinks();
  } catch (e) { alert(e.message); }
};

window.deleteItem = async function (id) {
  if (!confirm('Yakin ingin menghapus item ini beserta seluruh sub-item di bawahnya?')) return;
  const type = S.items.find(i => i.id == id)?.type || 'keuangan_rka';
  try {
    await api('DELETE', `/api/items/${id}`);
    fetchItems(type, renderCurrentView);
  } catch (e) { alert(e.message); }
};

window.deletePurchase = async function (id) {
  if (!confirm('Yakin ingin menghapus data pembelian ini?')) return;
  try {
    await api('DELETE', `/api/purchases/${id}`);
    fetchPurchases();
  } catch (e) { alert(e.message); }
};



// ─── SIDEBAR BUDGET CARD ──────────────────────────────────────────────────────
async function loadSidebarBudget() {
  try {
    const items = await api('GET', '/api/items?type=keuangan_rka');
    const { roots } = buildTree(items);

    // Alokasi = total amount dari item root (level 1)
    let alokasi = 0;
    roots.forEach(r => { alokasi += (r.amount || 0); });

    // RKA per sumber dana — kumpulkan dari item yang punya source_of_fund
    const bySource = {};
    let totalRka = 0;
    items.forEach(item => {
      if (item.source_of_fund && item.amount) {
        const src = item.source_of_fund;
        if (!bySource[src]) bySource[src] = 0;
        bySource[src] += item.amount;
        totalRka += item.amount;
      }
    });

    const selisih = alokasi - totalRka;

    // Update sidebar values
    $('sc-alokasi').textContent = rupiah(alokasi);
    $('sc-rka').textContent = rupiah(totalRka);
    $('sc-selisih').textContent = rupiah(selisih);

    // Render sumber dana table
    const tbody = $('sc-sumber-tbody');
    tbody.innerHTML = '';

    Object.keys(bySource).forEach(src => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHTML(src)}</td><td class="tr">${fmtNum(bySource[src])}</td>`;
      tbody.appendChild(tr);
    });

    // Total row
    const trTotal = document.createElement('tr');
    trTotal.className = 'bold';
    trTotal.innerHTML = `<td>TOTAL</td><td class="tr">${fmtNum(totalRka)}</td>`;
    tbody.appendChild(trTotal);
  } catch (e) {
    console.error('Sidebar budget error:', e);
  }
}

// ─── LAPORAN REALISASI ANGGARAN ───────────────────────────────────────────────
async function loadLaporan() {
  try {
    const items = await api('GET', '/api/items?type=keuangan_rka');
    const purchases = await api('GET', '/api/purchases');
    const { roots, map } = buildTree(items);

    // Compute total pagu from root-level items (level 1)
    let totalPagu = 0;
    roots.forEach(r => { totalPagu += (r.amount || 0); });

    // Compute realisasi from purchases
    let totalRealisasi = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // Group leaf-level items by source_of_fund for breakdown
    const bySource = {};
    items.forEach(item => {
      const src = item.source_of_fund || 'Lainnya';
      if (!bySource[src]) bySource[src] = { pagu: 0, realisasi: 0 };
      if (item.source_of_fund && item.amount) {
        bySource[src].pagu += item.amount;
      }
    });

    // Distribute purchases total as general realisasi if no per-source tracking
    // For now, assign all realisasi to the breakdown proportionally or show total
    const sisa = totalPagu - totalRealisasi;
    const persen = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(2) : '0.00';

    // Update stat cards
    $('lap-pagu').textContent = rupiah(totalPagu);
    $('lap-realisasi').textContent = rupiah(totalRealisasi);
    $('lap-sisa').textContent = rupiah(sisa);
    $('lap-persen').textContent = persen + '%';

    // Render breakdown table
    const tbody = $('tbody-laporan');
    tbody.innerHTML = '';

    const sourceKeys = Object.keys(bySource).filter(k => k !== 'Lainnya');
    sourceKeys.forEach(src => {
      const entry = bySource[src];
      const srcSisa = entry.pagu; // Realisasi per-source not tracked yet
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-left"><strong>${escapeHTML(src)}</strong></td>
        <td class="text-right">${rupiah(entry.pagu)}</td>
        <td class="text-right">-</td>
        <td class="text-right">-</td>
        <td class="text-center">-</td>
      `;
      tbody.appendChild(tr);
    });

    // Total row
    const trTotal = document.createElement('tr');
    trTotal.style.fontWeight = '700';
    trTotal.style.background = 'var(--surface)';
    trTotal.innerHTML = `
      <td class="text-left">TOTAL</td>
      <td class="text-right">${rupiah(totalPagu)}</td>
      <td class="text-right">${rupiah(totalRealisasi)}</td>
      <td class="text-right">${rupiah(sisa)}</td>
      <td class="text-center">${persen}%</td>
    `;
    tbody.appendChild(trTotal);
  } catch (e) {
    console.error('Laporan error:', e);
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function fmtNum(n) {
  return parseFloat(n).toLocaleString('id-ID');
}

function rupiah(n) {
  if (!n) return 'Rp 0';
  return 'Rp ' + parseFloat(n).toLocaleString('id-ID');
}

// ─── MANAJEMEN PRODI (CRUD) ──────────────────────────────────────────────────
async function fetchManajemenProdi() {
  try {
    const [prodis, depts] = await Promise.all([
      api('GET', '/api/prodi-links'),
      api('GET', '/api/departemen')
    ]);
    S.prodiLinks = prodis;
    S.departemen = depts;
    renderManajemenProdi();
  } catch (e) { console.error(e); }
}

function renderManajemenProdi() {
  const tbody = $('tbody-manajemen-prodi');
  tbody.innerHTML = '';

  if (S.prodiLinks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px">Belum ada data Program Studi.</td></tr>';
    return;
  }

  S.prodiLinks.forEach((p, i) => {
    const deptName = p.departemen ? p.departemen.nama_departemen : '<span style="color:var(--muted)">—</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${i + 1}</td>
      <td class="text-left"><strong>${escapeHTML(p.prodi_code)}</strong></td>
      <td class="text-left">${escapeHTML(p.prodi_name)}</td>
      <td class="text-left">${deptName}</td>
      <td class="text-left">${p.keterangan ? escapeHTML(p.keterangan) : '<span style="color:var(--muted)">-</span>'}</td>
      <td class="text-center">
        <div class="act-cell">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="openEditManajemenProdi(${p.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteManajemenProdi(${p.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateDeptDropdown(selectId, selectedId) {
  const sel = $(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">— Tidak Ada / Belum Ditentukan —</option>';
  S.departemen.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.kode_departemen} — ${d.nama_departemen}`;
    if (d.id === selectedId || d.id == selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function openAddManajemenProdi() {
  $('mprodi-id').value = '';
  $('mprodi-code').value = '';
  $('mprodi-name').value = '';
  $('mprodi-ket').value = '';
  populateDeptDropdown('mprodi-dept', '');
  $('modal-mprodi-title').innerHTML = '<i class="fa-solid fa-graduation-cap"></i> Tambah Program Studi Baru';
  openModal('modal-mprodi');
}

window.openEditManajemenProdi = function (id) {
  const p = S.prodiLinks.find(x => x.id === id);
  if (!p) return;
  $('mprodi-id').value = p.id;
  $('mprodi-code').value = p.prodi_code;
  $('mprodi-name').value = p.prodi_name;
  $('mprodi-ket').value = p.keterangan || '';
  populateDeptDropdown('mprodi-dept', p.departemen_id);
  $('modal-mprodi-title').innerHTML = `<i class="fa-solid fa-pen"></i> Edit Prodi — ${escapeHTML(p.prodi_name)}`;
  openModal('modal-mprodi');
};

window.deleteManajemenProdi = async function (id) {
  const p = S.prodiLinks.find(x => x.id === id);
  const name = p ? p.prodi_name : '';
  if (!confirm(`Yakin ingin menghapus prodi "${name}" beserta akun user terkait?`)) return;
  try {
    await api('DELETE', `/api/prodi-links/${id}`);
    fetchManajemenProdi();
  } catch (e) { alert(e.message); }
};

// ─── MANAJEMEN DEPARTEMEN (CRUD) ─────────────────────────────────────────────
async function fetchManajemenDepartemen() {
  try {
    const [depts, prodis] = await Promise.all([
      api('GET', '/api/departemen'),
      api('GET', '/api/prodi-links')
    ]);
    S.departemen = depts;
    S.prodiLinks = prodis;
    renderManajemenDepartemen();
  } catch (e) { console.error(e); }
}

function renderManajemenDepartemen() {
  const tbody = $('tbody-manajemen-dept');
  tbody.innerHTML = '';

  if (S.departemen.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px">Belum ada data Departemen.</td></tr>';
    return;
  }

  S.departemen.forEach((d, i) => {
    // Count prodi linked to this departemen
    const prodiCount = S.prodiLinks.filter(p => p.departemen_id === d.id).length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${i + 1}</td>
      <td class="text-left"><strong>${escapeHTML(d.kode_departemen)}</strong></td>
      <td class="text-left">${escapeHTML(d.nama_departemen)}</td>
      <td class="text-center"><span class="badge-prodi">${prodiCount} Prodi</span></td>
      <td class="text-center">
        <div class="act-cell">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="openEditDepartemen(${d.id})" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteDepartemen(${d.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddDepartemen() {
  $('mdept-id').value = '';
  $('mdept-code').value = '';
  $('mdept-name').value = '';
  $('modal-mdept-title').innerHTML = '<i class="fa-solid fa-building-columns"></i> Tambah Departemen Baru';
  openModal('modal-mdept');
}

window.openEditDepartemen = function (id) {
  const d = S.departemen.find(x => x.id === id);
  if (!d) return;
  $('mdept-id').value = d.id;
  $('mdept-code').value = d.kode_departemen;
  $('mdept-name').value = d.nama_departemen;
  $('modal-mdept-title').innerHTML = `<i class="fa-solid fa-pen"></i> Edit Departemen — ${escapeHTML(d.nama_departemen)}`;
  openModal('modal-mdept');
};

window.deleteDepartemen = async function (id) {
  const d = S.departemen.find(x => x.id === id);
  const name = d ? d.nama_departemen : '';
  if (!confirm(`Yakin ingin menghapus departemen "${name}"?`)) return;
  try {
    await api('DELETE', `/api/departemen/${id}`);
    fetchManajemenDepartemen();
  } catch (e) { alert(e.message); }
};

// ─── RENSTRA EXCEL & INLINE EDITS HELPERS ──────────────────────────────────────
function calculateAggregateAmounts(nodes, activeProdi) {
  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      calculateAggregateAmounts(node.children, activeProdi);
      // If prodi is selected, use progress amounts for L4; otherwise master amounts
      if (activeProdi) {
        node.amount = node.children.reduce((sum, child) => {
          const amt = child._progAmount !== undefined ? child._progAmount : (child.amount || 0);
          return sum + amt;
        }, 0);
        node._progAmount = node.amount;
      } else {
        node.amount = node.children.reduce((sum, child) => sum + (child.amount || 0), 0);
      }
    }
  });
}

window.saveTargetFakultas = async function (id, value) {
  try {
    await api('PUT', `/api/items/${id}`, { target_univ: value });
    const item = S.items.find(i => i.id === id);
    if (item) item.target_univ = value;
  } catch (e) {
    alert('Gagal menyimpan target fakultas: ' + e.message);
  }
};

// Save target unit to renstra_progress (per prodi per triwulan)
window.saveTargetUnit = async function (id, value) {
  const activeProdi = getActiveProdiCode();
  const activeTwNum = getActiveTwNumber();

  if (!activeProdi) {
    alert('Pilih Prodi terlebih dahulu untuk mengisi Target Unit.');
    return;
  }

  try {
    // Get existing progress data for this item
    const existingProg = getProgress(id);
    const body = {
      item_id: id,
      prodi_code: activeProdi,
      triwulan: activeTwNum,
      target_unit: value,
      // Preserve existing values
      capaian: existingProg ? existingProg.capaian : null,
      capaian_pct: existingProg ? existingProg.capaian_pct : null,
      progress: existingProg ? existingProg.progress : null,
      issues: existingProg ? existingProg.issues : null,
      strategy: existingProg ? existingProg.strategy : null,
      supporting_data_link: existingProg ? existingProg.supporting_data_link : null,
      amount: existingProg ? existingProg.amount : 0
    };

    await api('PUT', '/api/renstra-progress', body);

    // Update local state
    if (existingProg) {
      existingProg.target_unit = value;
    } else {
      S.renstraProgress.push({ ...body, id: Date.now() });
    }
  } catch (e) {
    alert('Gagal menyimpan target unit: ' + e.message);
  }
};

window.openRenstraKegiatan = function (id) {
  const item = S.items.find(i => i.id === id);
  if (!item) return;

  $('modal-rk-title').innerHTML = `<i class="fa-solid fa-list-check"></i> Rincian Kegiatan: ${escapeHTML(item.description)}`;
  const tbody = $('tbody-renstra-kegiatan');
  tbody.innerHTML = '';

  const children = S.items.filter(i => i.parent_id === id);

  if (children.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">Belum ada rincian kegiatan.</td></tr>';
  } else {
    children.forEach((child, index) => {
      const tr = document.createElement('tr');
      const dukungCellHtml = dukungCell(child.id, child.supporting_data_link, true);
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHTML(child.description)}</td>
        <td style="text-align: right; font-weight: 500;">${child.amount ? fmtNum(child.amount) : '0'}</td>
        <td style="text-align: center;">${dukungCellHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  openModal('modal-renstra-kegiatan');
};

window.openCapaianRenstra = function (id) {
  const item = S.items.find(i => i.id === id);
  if (!item) return;

  const activeProdi = getActiveProdiCode();
  if (!activeProdi) {
    alert('Pilih Prodi terlebih dahulu untuk mengisi Capaian.');
    return;
  }

  // Authorization: admin can always edit, user can only edit their own prodi
  const isAllowed = (S.role === 'admin') || (S.role === 'user' && S.prodiCode === activeProdi);

  const selectedYear = $('flt-tahun').value;
  const twLabel = $('flt-bulan').value;

  // Get existing progress data
  const prog = getProgress(id);

  $('modal-cr-title').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Capaian ${twLabel} ${selectedYear}`;
  $('mcr-item-id').value = id;

  $('mcr-target-univ').textContent = `${item.target_univ || '-'} (${item.satuan || '%'})`;
  $('mcr-target-unit').textContent = `${prog ? (prog.target_unit || '-') : '-'} (${item.satuan || '%'})`;

  // Fill from progress data (not from sip_items)
  $('mcr-capaian').value = prog ? (prog.capaian || '') : '';
  $('mcr-progress').value = prog ? (prog.progress || '') : '';
  $('mcr-issues').value = prog ? (prog.issues || '') : '';
  $('mcr-strategy').value = prog ? (prog.strategy || '') : '';
  $('mcr-dukung').value = prog ? (prog.supporting_data_link || '') : '';

  const saveBtn = $('btn-save-capaian-renstra');
  if (isAllowed) {
    $('mcr-capaian').disabled = false;
    $('mcr-progress').disabled = false;
    $('mcr-issues').disabled = false;
    $('mcr-strategy').disabled = false;
    $('mcr-dukung').disabled = false;
    saveBtn.style.display = 'inline-flex';
  } else {
    $('mcr-capaian').disabled = true;
    $('mcr-progress').disabled = true;
    $('mcr-issues').disabled = true;
    $('mcr-strategy').disabled = true;
    $('mcr-dukung').disabled = true;
    saveBtn.style.display = 'none';
  }

  openModal('modal-capaian-renstra');
};

// showRenstraKegiatan removed — Kegiatan column now uses dukungCell for data dukung


function exportRenstraToExcel() {
  const { roots, map } = buildTree(S.items);
  calculateAggregateAmounts(roots);

  const isCapaian = S.tab === 'renstra-capaian';
  const activeTw = getActiveTwKey();

  const dataRows = [
    ['DAFTAR KEGIATAN RENSTRA'],
    [isCapaian ? 'RENSTRA CAPAIAN' : 'RENSTRA TANGGUNG JAWAB'],
    [`Tahun: ${$('flt-tahun').value} — Triwulan: ${isCapaian ? $('flt-bulan').value : 'Semua'}`],
    [],
  ];

  if (isCapaian) {
    dataRows.push(['URAIAN', '', '', '', '', 'KODE', 'SATUAN', 'TARGET FAKULTAS', 'TARGET UNIT', 'DATA PENDUKUNG', 'CAPAIAN', 'CAPAIAN %', 'PROGRESS/KEGIATAN', 'KENDALA/PERMASALAHAN', 'STRATEGI/TINDAK LANJUT']);
  } else {
    dataRows.push(['URAIAN', '', '', '', '', 'KODE', 'SATUAN', 'TARGET FAKULTAS', 'TARGET UNIT', 'ANGGARAN']);
  }

  function addNode(node) {
    if (node.level > 4) return;

    if (isCapaian) {
      const cap = getTwValue(node.capaian, activeTw);
      const capPct = getTwValue(node.capaian_pct, activeTw);
      const prog = getTwValue(node.progress, activeTw);
      const iss = getTwValue(node.issues, activeTw);
      const strat = getTwValue(node.strategy, activeTw);
      const dukung = getTwValue(node.supporting_data_link, activeTw);
      row = ['', '', '', '', '', node.code || '', node.satuan || '', node.target_univ || '', node.target_unit || '', dukung || '', cap, capPct, prog, iss, strat];
    } else {
      row = ['', '', '', '', '', node.code || '', node.satuan || '', node.target_univ || '', node.target_unit || '', node.amount || 0];
    }
    
    if (node.level === 1) {
      row[0] = node.description;
    } else if (node.level === 2) {
      row[1] = node.description;
    } else if (node.level === 3) {
      row[2] = node.description;
    } else if (node.level === 4) {
      row[3] = node.description;
    }

    dataRows.push(row);
    if (node.children) {
      node.children.forEach(addNode);
    }
  }

  roots.forEach(addNode);

  const worksheet = XLSX.utils.aoa_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Renstra');

  XLSX.writeFile(workbook, `Renstra_${isCapaian ? 'Capaian' : 'Tanggung_Jawab'}_${$('flt-tahun').value}.xlsx`);
}

