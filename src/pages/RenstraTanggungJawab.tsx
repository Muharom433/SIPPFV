import React from 'react';
import { useAuth, useApp } from '../contexts/AuthContext';
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
    filterTriwulan,
    filterProdi,
    collapsed,
    toggleCollapse
  } = useApp();

  const isAdmin = user?.role === 'admin';
  const activeProdi = !isAdmin ? (user?.prodi_code || '') : filterProdi;

  // Filter items by year
  const yearItems = items.filter(item => {
    const date = new Date(item.created_at);
    return date.getFullYear() === filterYear;
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

  const handleSaveTargetFakultas = async (id: number, val: string) => {
    try {
      await updateItem(id, { target_univ: val });
      onRefresh();
    } catch (err: any) {
      alert('Gagal menyimpan target fakultas: ' + err.message);
    }
  };

  const handleSaveTargetUnit = async (id: number, val: string) => {
    if (!activeProdi) {
      alert('Pilih Prodi terlebih dahulu untuk mengisi Target Unit.');
      return;
    }

    try {
      const activeTwNum = filterTriwulan === 'Triwulan 1' ? 1 
        : filterTriwulan === 'Triwulan 2' ? 2 
        : filterTriwulan === 'Triwulan 3' ? 3 
        : 4;

      const existingProg = progress.find(p => p.item_id === id);
      await upsertRenstraProgress({
        item_id: id,
        prodi_code: activeProdi,
        triwulan: activeTwNum,
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
    } catch (err: any) {
      alert('Gagal menyimpan target unit: ' + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus item ini beserta seluruh sub-item di bawahnya?')) {
      try {
        await deleteItem(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Warning for admin if no prodi is filtered
  if (!activeProdi && isAdmin) {
    return (
      <div className="view" id="view-renstra-tanggung">
        <div className="lap-banner" style={{
          background: 'linear-gradient(135deg, #0a192f 0%, #0d1e36 50%, #112240 100%)',
          borderRadius: '24px',
          padding: '32px 40px',
          color: 'var(--white)',
          position: 'relative',
          marginBottom: '24px',
          boxShadow: '0 20px 40px -15px rgba(10, 25, 47, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '280px', zIndex: 2 }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600, color: '#64ffda' }}>
              Renstra &bull; Rencana Strategis
            </span>
            <h2 style={{ fontSize: '1.9rem', margin: '16px 0 10px', fontWeight: 700, color: '#fff', fontFamily: 'Outfit' }}>
              Renstra - Tanggung Jawab
            </h2>
            <p style={{ fontSize: '0.95rem', opacity: 0.8, maxWidth: '600px', lineHeight: 1.65, color: '#a8b2d1', margin: 0 }}>
              Kelola pembagian tanggung jawab, target fakultas, target unit, dan alokasi anggaran Renstra.
            </p>
          </div>
          <div style={{ zIndex: 2, background: 'rgba(255,255,255,0.04)', padding: '24px 32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', minWidth: '220px', textAlign: 'center', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, marginBottom: '10px', color: '#a8b2d1', fontWeight: 600 }}>Tahun Anggaran</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e3a8a', background: 'var(--white)', padding: '10px 20px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
              <i className="fa-solid fa-calendar-days" style={{ color: '#1e40af' }}></i> TAHUN {filterYear}
            </div>
          </div>
        </div>
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

    const hidden = isAncestorCollapsed(node, map, collapsed);
    const isCol = collapsed.has(node.id);
    const cls = levelClass(node.level);
    const indent = (node.level - 1) * 16;
    const hasKids = node.children && node.children.length > 0 && node.level < 4;
    const prodiBadge = node.prodi_code ? <span className="badge-prodi">{node.prodi_code}</span> : null;

    const prog = node.level === 4 ? progress.find(p => p.item_id === node.id) : null;

    if (hidden) return null;

    // Render target unit input or text
    let targetFakultasHtml: React.ReactNode = '';
    let targetUnitHtml: React.ReactNode = '';

    if (node.level === 4) {
      if (isAdmin) {
        targetFakultasHtml = (
          <input 
            type="text" 
            className="table-input" 
            defaultValue={node.target_univ || ''} 
            onBlur={(e) => handleSaveTargetFakultas(node.id, e.target.value)}
          />
        );
      } else {
        targetFakultasHtml = node.target_univ || '';
      }

      const progTargetUnit = prog ? (prog.target_unit || '') : '';
      if (activeProdi) {
        targetUnitHtml = (
          <input 
            type="text" 
            className="table-input" 
            defaultValue={progTargetUnit} 
            onBlur={(e) => handleSaveTargetUnit(node.id, e.target.value)}
          />
        );
      } else {
        targetUnitHtml = progTargetUnit;
      }
    } else {
      targetFakultasHtml = node.target_univ || '';
      targetUnitHtml = '';
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
        <td className="text-center">{targetUnitHtml}</td>
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
    <div className="view" id="view-renstra-tanggung">
      <div className="lap-banner" style={{
        background: 'linear-gradient(135deg, #0a192f 0%, #0d1e36 50%, #112240 100%)',
        borderRadius: '24px',
        padding: '32px 40px',
        color: 'var(--white)',
        position: 'relative',
        marginBottom: '24px',
        boxShadow: '0 20px 40px -15px rgba(10, 25, 47, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '280px', zIndex: 2 }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '99px', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600, color: '#64ffda' }}>
            Renstra &bull; Prodi {activeProdi}
          </span>
          <h2 style={{ fontSize: '1.9rem', margin: '16px 0 10px', fontWeight: 700, color: '#fff', fontFamily: 'Outfit' }}>
            Renstra - Tanggung Jawab
          </h2>
          <p style={{ fontSize: '0.95rem', opacity: 0.8, maxWidth: '600px', lineHeight: 1.65, color: '#a8b2d1', margin: 0 }}>
            Kelola pembagian tanggung jawab, target fakultas, target unit, dan alokasi anggaran Renstra.
          </p>
        </div>
        <div style={{ zIndex: 2, background: 'rgba(255,255,255,0.04)', padding: '24px 32px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', minWidth: '220px', textAlign: 'center', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, marginBottom: '10px', color: '#a8b2d1', fontWeight: 600 }}>Tahun Anggaran</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e3a8a', background: 'var(--white)', padding: '10px 20px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
            <i className="fa-solid fa-calendar-days" style={{ color: '#1e40af' }}></i> TAHUN {filterYear}
          </div>
        </div>
      </div>
      <div className="tbl-wrap tbl-scroll">
        <table className="htable" id="tbl-renstra-tj">
          <thead>
            <tr>
              <th style={{ minWidth: '400px' }} className="text-left">Uraian</th>
              <th style={{ width: '80px' }} className="text-left">Kode</th>
              <th style={{ width: '80px' }} className="text-center">Satuan</th>
              <th style={{ width: '120px' }} className="text-center">Target Fakultas</th>
              <th style={{ width: '120px' }} className="text-center">Target Unit</th>
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
