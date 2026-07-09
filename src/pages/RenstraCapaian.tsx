import React from 'react';
import { useAuth, useApp } from '../contexts/AuthContext';
import { 
  buildTree, 
  isAncestorCollapsed, 
  levelClass 
} from '../utils/helpers';
import type { SipItem, TreeNode, RenstraProgress } from '../types';

interface RenstraCapaianProps {
  items: SipItem[];
  progress: RenstraProgress[];
  onOpenCapaianModal: (itemId: number) => void;
  onRefresh: () => void;
}

export function RenstraCapaian({
  items,
  progress,
  onOpenCapaianModal
}: RenstraCapaianProps) {
  const { user } = useAuth();
  const {
    filterYear,
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

  // Warning for admin if no prodi is filtered
  if (!activeProdi && isAdmin) {
    return (
      <div className="view" id="view-renstra-capaian">
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
              Renstra - Capaian
            </h2>
            <p style={{ fontSize: '0.95rem', opacity: 0.8, maxWidth: '600px', lineHeight: 1.65, color: '#a8b2d1', margin: 0 }}>
              Pantau capaian target indikator kinerja utama Renstra Anda untuk periode berjalan.
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

    const targetFakultasHtml = node.target_univ || '';
    const targetUnitHtml = prog ? (prog.target_unit || '') : '';

    const capVal = prog ? (prog.capaian || '') : '';
    const capPctVal = prog ? (prog.capaian_pct || '') : '0';
    const progVal = prog ? (prog.progress || '') : '';
    const issVal = prog ? (prog.issues || '') : '';
    const stratVal = prog ? (prog.strategy || '') : '';
    const dukungVal = prog ? (prog.supporting_data_link || '') : '';

    // Can edit capaian if it's Level 4 and prodi is selected
    const canEditCapaian = node.level === 4 && activeProdi;

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
        <td className="text-center">
          {canEditCapaian && (
            <button 
              className="btn btn-secondary btn-sm btn-icon" 
              onClick={() => onOpenCapaianModal(node.id)} 
              title="Isi Capaian"
            >
              <i className="fa-solid fa-pencil"></i>
            </button>
          )}
        </td>
        <td className="text-center">
          {node.level === 4 && (
            dukungVal ? (
              <a href={dukungVal} target="_blank" rel="noopener noreferrer" className="dlbadge has-link">
                <i className="fa-brands fa-google-drive"></i> Open
              </a>
            ) : (
              <button 
                className="btn btn-secondary btn-sm btn-icon" 
                onClick={() => alert('Belum ada data dukung (Google Drive) yang diunggah untuk periode ini.')} 
                title="Data Dukung Kosong" 
                style={{ opacity: 0.5 }}
              >
                <i className="fa-solid fa-search"></i>
              </button>
            )
          )}
        </td>
        <td className="text-center">{capVal || '0'}</td>
        <td className="text-center">{capPctVal || '0'}%</td>
        <td className="text-left">{progVal}</td>
        <td className="text-left">{issVal}</td>
        <td className="text-left">{stratVal}</td>
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
    <div className="view" id="view-renstra-capaian">
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
            Renstra - Capaian
          </h2>
          <p style={{ fontSize: '0.95rem', opacity: 0.8, maxWidth: '600px', lineHeight: 1.65, color: '#a8b2d1', margin: 0 }}>
            Pantau capaian target indikator kinerja utama Renstra Anda untuk periode berjalan.
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
        <table className="htable" id="tbl-renstra-capaian">
          <thead>
            <tr>
              <th style={{ minWidth: '400px' }} className="text-left">Uraian</th>
              <th style={{ width: '80px' }} className="text-left">Kode</th>
              <th style={{ width: '80px' }} className="text-center">Satuan</th>
              <th style={{ width: '130px' }} className="text-center">Target Fakultas</th>
              <th style={{ width: '130px' }} className="text-center">Target Unit</th>
              <th style={{ width: '60px' }} className="text-center">Aksi</th>
              <th style={{ width: '130px' }} className="text-center">Data Pendukung</th>
              <th style={{ width: '90px' }} className="text-center">Capaian</th>
              <th style={{ width: '90px' }} className="text-center">Capaian %</th>
              <th className="text-left">Progress/Kegiatan</th>
              <th className="text-left">Kendala/Permasalahan</th>
              <th className="text-left">Strategi/Tindak lanjut</th>
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
