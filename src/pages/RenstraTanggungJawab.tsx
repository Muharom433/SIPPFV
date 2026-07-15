import React from 'react';
import { useAuth, useApp } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

import { 
  fmtNum, 
  buildTree, 
  isAncestorCollapsed, 
  levelClass,
  calculateAggregateAmounts
} from '../utils/helpers';
import { updateItem, deleteItem } from '../services/items.service';
import { upsertRenstraProgress } from '../services/renstra.service';
import type { SipItem, TreeNode, RenstraProgress } from '../types';

interface RenstraTanggungJawabProps {
  items: SipItem[];
  progress: RenstraProgress[];
  onRefresh: () => void;
  onEditItem: (id: number) => void;
  onAddSubItem: (parentId: number, level: number) => void;
  onOpenKegiatanModal: (itemId: number) => void;
}

export function RenstraTanggungJawab({
  items,
  progress,
  onRefresh,
  onEditItem,
  onAddSubItem,
  onOpenKegiatanModal
}: RenstraTanggungJawabProps) {
  const { user } = useAuth();
  const {
    filterYear,
    filterProdi,
    collapsed,
    toggleCollapse,
    searchQuery
  } = useApp();

  const isAdmin = user?.role === 'admin';
  const activeProdi = !isAdmin ? (user?.prodi_code || '') : filterProdi;

  // Filter items by year
  const yearItems = items.filter(item => {
    const date = new Date(item.created_at);
    return date.getUTCFullYear() === filterYear;
  });

  const { roots, map } = buildTree(yearItems);

  // Overlay progress data onto Level 4 items
  if (activeProdi && progress.length > 0) {
    progress.forEach(prog => {
      const node = map[prog.item_id];
      if (node) {
        node._progAmount = prog.amount || 0;
      }
    });
  }

  // Calculate aggregated amounts
  calculateAggregateAmounts(roots, activeProdi);

  // Visible IDs for search filter
  const visibleIds = React.useMemo(() => {
    const ids = new Set<number>();
    if (!searchQuery.trim()) return ids;

    const query = searchQuery.toLowerCase().trim();
    const matches = (n: TreeNode) => {
      return (n.description?.toLowerCase().includes(query) || n.code?.toLowerCase().includes(query));
    };

    const checkVisibility = (n: TreeNode): boolean => {
      let anyChildVisible = false;
      if (n.children) {
        n.children.forEach(child => {
          if (checkVisibility(child)) {
            anyChildVisible = true;
          }
        });
      }
      const isVisible = matches(n) || anyChildVisible;
      if (isVisible) {
        ids.add(n.id);
      }
      return isVisible;
    };

    roots.forEach(checkVisibility);
    return ids;
  }, [roots, searchQuery]);

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });

  const handleSaveTargetFakultas = async (id: number, val: string) => {
    try {
      await updateItem(id, { target_univ: val });
      onRefresh();
      Toast.fire({
        icon: 'success',
        title: 'Target Fakultas berhasil disimpan'
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

  const handleSaveTargetUnit = async (id: number, val: string, triwulanNum: number) => {
    if (!activeProdi) {
      Swal.fire({
        icon: 'warning',
        title: 'Pilih Prodi',
        text: 'Pilih Prodi terlebih dahulu untuk mengisi Target Unit.',
        confirmButtonColor: '#0072ff'
      });
      return;
    }

    try {
      const existingProg = progress.find(p => p.item_id === id && p.triwulan === triwulanNum);
      await upsertRenstraProgress({
        item_id: id,
        prodi_code: activeProdi,
        triwulan: triwulanNum,
        target_unit: val,
        capaian: existingProg ? existingProg.capaian : null,
        capaian_pct: existingProg ? existingProg.capaian_pct : null,
        progress: existingProg ? existingProg.progress : null,
        issues: existingProg ? existingProg.issues : null,
        strategy: existingProg ? existingProg.strategy : null,
        supporting_data_link: existingProg ? existingProg.supporting_data_link : null,
        amount: existingProg ? existingProg.amount : 0
      });
      onRefresh();
      Toast.fire({
        icon: 'success',
        title: `Target Unit TW${triwulanNum} berhasil disimpan`
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

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: 'Yakin ingin menghapus?',
      text: 'Seluruh sub-item di bawahnya juga akan ikut terhapus!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteItem(id);
          onRefresh();
          Toast.fire({
            icon: 'success',
            title: 'Item berhasil dihapus'
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


  // Warning for admin if no prodi is filtered
  if (!activeProdi && isAdmin) {
    return (
      <div className="view" id="view-renstra-tanggung" style={{ padding: '0 0 24px 0' }}>
        <div className="tbl-wrap">
          <table className="htable">
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  <i className="fa-solid fa-filter" style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'block' }}></i>
                  Silakan pilih <strong>Prodi</strong> pada filter di atas untuk melihat progress Renstra.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const renderRow = (node: TreeNode) => {
    if (node.level > 4) return null;

    if (searchQuery.trim() && !visibleIds.has(node.id)) return null;

    const hidden = searchQuery.trim() ? false : isAncestorCollapsed(node, map, collapsed);
    const isCol = searchQuery.trim() ? false : collapsed.has(node.id);
    const cls = levelClass(node.level);
    const indent = (node.level - 1) * 16;
    const hasKids = node.children && node.children.length > 0 && node.level < 4;
    const prodiBadge = node.prodi_code ? <span className="badge-prodi">{node.prodi_code}</span> : null;

    const prog = node.level === 4 ? progress.find(p => p.item_id === node.id) : null;

    if (hidden) return null;

    // Render target unit input or text
    let targetFakultasHtml: React.ReactNode = '';

    // Render 4 kolom Target Unit per triwulan
    const renderTargetUnitTw = (twNum: number): React.ReactNode => {
      if (node.level !== 4) return '';
      const progTw = progress.find(p => p.item_id === node.id && p.triwulan === twNum);
      const progTargetUnit = progTw ? (progTw.target_unit || '') : '';
      if (activeProdi) {
        return (
          <input
            key={`${filterYear}_tw${twNum}_${activeProdi}_${node.id}`}
            type="text"
            className="table-input"
            defaultValue={progTargetUnit}
            onBlur={(e) => handleSaveTargetUnit(node.id, e.target.value, twNum)}
          />
        );
      }
      return progTargetUnit;
    };

    if (node.level === 4) {
      if (isAdmin) {
        targetFakultasHtml = (
          <input 
            key={`${filterYear}_${node.id}`}
            type="text" 
            className="table-input" 
            defaultValue={node.target_univ || ''} 
            onBlur={(e) => handleSaveTargetFakultas(node.id, e.target.value)}
          />
        );
      } else {
        targetFakultasHtml = node.target_univ || '';
      }
    } else {
      targetFakultasHtml = node.target_univ || '';
    }

    const progAmount = prog ? prog.amount : null;
    const displayAmount = (progAmount !== null && progAmount !== undefined) ? progAmount : (node._progAmount !== undefined ? node._progAmount : node.amount);
    const anggaranText = displayAmount ? fmtNum(displayAmount) : '0';

    return (
      <tr key={node.id} className={cls}>
        <td className="text-left">
          <div className="tree-cell">
            <span className="indent" style={{ width: `${indent}px`, display: 'inline-block' }}></span>
            {hasKids ? (
              <button 
                className={`toggle-btn ${isCol ? 'collapsed' : ''}`} 
                onClick={() => toggleCollapse(node.id)}
              >
                <i className="fa-solid fa-chevron-down"></i>
              </button>
            ) : (
              <span className="no-toggle"></span>
            )}
            <span>{prodiBadge} {node.description}</span>
          </div>
        </td>
        <td className="text-left">{node.code || ''}</td>
        <td className="text-center">{node.satuan || ''}</td>
        <td className="text-center">{targetFakultasHtml}</td>
        <td className="text-center">{renderTargetUnitTw(1)}</td>
        <td className="text-center">{renderTargetUnitTw(2)}</td>
        <td className="text-center">{renderTargetUnitTw(3)}</td>
        <td className="text-center">{renderTargetUnitTw(4)}</td>
        <td className="text-right" style={{ fontWeight: 500 }}>{anggaranText}</td>
        <td className="text-center">
          {node.level === 4 && (
            <button 
              className="btn btn-secondary btn-sm btn-icon" 
              onClick={() => onOpenKegiatanModal(node.id)} 
              title="Lihat Rincian Kegiatan"
            >
              <i className="fa-solid fa-search"></i>
            </button>
          )}
        </td>
        {isAdmin && (
          <td className="admin-only text-center">
            <div className="act-cell">
              {node.level < 8 && (
                <button 
                  className="btn btn-success btn-sm btn-icon" 
                  onClick={() => onAddSubItem(node.id, node.level + 1)}
                  title="Tambah Sub-item"
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              )}
              <button 
                className="btn btn-secondary btn-sm btn-icon" 
                onClick={() => onEditItem(node.id)} 
                title="Edit"
              >
                <i className="fa-solid fa-pen"></i>
              </button>
              <button 
                className="btn btn-danger btn-sm btn-icon" 
                onClick={() => handleDelete(node.id)} 
                title="Hapus"
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        )}
      </tr>
    );
  };

  const renderTree = (nodes: TreeNode[]): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const walk = (node: TreeNode) => {
      elements.push(renderRow(node));
      if (node.children) {
        node.children.forEach(walk);
      }
    };
    nodes.forEach(walk);
    return elements;
  };

  return (
    <div className="view" id="view-renstra-tanggung" style={{ padding: '0 0 24px 0' }}>
      <div className="tbl-wrap tbl-scroll">
        <table className="htable" id="tbl-renstra-tj">
          <thead>
            <tr>
              <th style={{ minWidth: '400px' }} className="text-left">Uraian</th>
              <th style={{ width: '80px' }} className="text-left">Kode</th>
              <th style={{ width: '80px' }} className="text-center">Satuan</th>
              <th style={{ width: '120px' }} className="text-center">Target Fakultas</th>
              <th style={{ width: '110px' }} className="text-center">Target Unit TW 1</th>
              <th style={{ width: '110px' }} className="text-center">Target Unit TW 2</th>
              <th style={{ width: '110px' }} className="text-center">Target Unit TW 3</th>
              <th style={{ width: '110px' }} className="text-center">Target Unit TW 4</th>
              <th style={{ width: '140px' }} className="text-right">Jumlah Anggaran</th>
              <th style={{ width: '80px' }} className="text-center">Kegiatan</th>
              {isAdmin && <th style={{ width: '100px' }} className="admin-only text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {roots.map(r => renderTree([r]))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
