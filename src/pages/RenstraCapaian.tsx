import React from 'react';
import { useAuth, useApp } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

import { 
  buildTree, 
  isAncestorCollapsed, 
  levelClass,
  handlePreviewDukung
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

  // Warning for admin if no prodi is filtered
  if (!activeProdi && isAdmin) {
    return (
      <div className="view" id="view-renstra-capaian" style={{ padding: '0 0 24px 0' }}>
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
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  handlePreviewDukung(dukungVal);
                }} 
                className="dlbadge has-link"
              >
                <i className={dukungVal.startsWith('data:') ? "fa-solid fa-file" : "fa-brands fa-google-drive"}></i> Open
              </a>
            ) : (
              <button 
                className="btn btn-secondary btn-sm btn-icon" 
                onClick={() => Swal.fire({
                  icon: 'info',
                  title: 'Data Dukung Kosong',
                  text: 'Belum ada data dukung (Google Drive) yang diunggah untuk periode ini.',
                  confirmButtonColor: '#0072ff'
                })} 
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
    <div className="view" id="view-renstra-capaian" style={{ padding: '0 0 24px 0' }}>
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
