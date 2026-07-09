import { useAuth, useApp } from '../contexts/AuthContext';
import { deleteItem } from '../services/items.service';
import { buildTree, isAncestorCollapsed, levelClass } from '../utils/helpers';
import type { SipItem, TreeNode } from '../types';

interface PembelajaranProps {
  items: SipItem[];
  onRefresh: () => void;
  onEditItem: (id: number) => void;
  onAddSubItem: (parentId: number, level: number) => void;
  onOpenDriveModal: (itemId: number, field: string) => void;
}

export function Pembelajaran({
  items,
  onRefresh,
  onEditItem,
  onAddSubItem,
  onOpenDriveModal
}: PembelajaranProps) {
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

  const renderRow = (node: TreeNode) => {
    const hidden = isAncestorCollapsed(node, map, collapsed);
    const hasKids = node.children && node.children.length > 0;
    const isCol = collapsed.has(node.id);
    const cls = levelClass(node.level);
    const indent = (node.level - 1) * 16;
    const prodiBadge = node.prodi_code ? <span className="badge-prodi">{node.prodi_code}</span> : null;

    if (hidden) return null;

    // Show drive links for Level 3+
    const showDukung = node.level >= 3;

    // Authorization
    const isOwner = isAdmin || (user?.role === 'user' && node.prodi_code === user.prodi_code);
    const canEdit = isOwner;
    const canDelete = isAdmin || (user?.role === 'user' && node.prodi_code === user.prodi_code && node.level > 1);
    const canAddSub = isOwner && node.level < 8;

    return (
      <tr key={node.id} className={cls}>
        <td className="text-left">{node.code}</td>
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
        <td className="text-center">{node.target_unit || ''}</td>
        <td className="text-center">{node.capaian || ''}</td>
        <td className="text-center">{node.capaian_pct || ''}%</td>
        <td className="text-left">{node.progress || ''}</td>
        <td className="text-center">
          {showDukung && (
            node.supporting_data_link ? (
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm btn-icon" 
                  onClick={() => onOpenDriveModal(node.id, 'supporting_data_link')}
                  title="Edit Data Dukung"
                >
                  <i className="fa-solid fa-database c-green"></i>
                </button>
                <a href={node.supporting_data_link} target="_blank" rel="noopener noreferrer" className="dlbadge has-link">
                  <i className="fa-brands fa-google-drive"></i> Open
                </a>
              </div>
            ) : (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => onOpenDriveModal(node.id, 'supporting_data_link')}
              >
                <i className="fa-solid fa-database"></i> Tambah
              </button>
            )
          )}
        </td>
        <td className="text-center">
          <div className="act-cell">
            {canAddSub && (
              <button 
                className="btn btn-success btn-sm btn-icon" 
                onClick={() => onAddSubItem(node.id, node.level + 1)}
                title="Tambah Sub-item"
              >
                <i className="fa-solid fa-plus"></i>
              </button>
            )}
            {canEdit && (
              <button 
                className="btn btn-secondary btn-sm btn-icon" 
                onClick={() => onEditItem(node.id)} 
                title="Edit"
              >
                <i className="fa-solid fa-pen"></i>
              </button>
            )}
            {canDelete && (
              <button 
                className="btn btn-danger btn-sm btn-icon" 
                onClick={() => handleDelete(node.id)} 
                title="Hapus"
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            )}
          </div>
        </td>
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
    <div className="view" id="view-pembelajaran">
      <div className="section-head">
        <div>
          <h2>Capaian Pembelajaran Lulusan (CPL)</h2>
          <p className="sub-text">Periode: Tahun {filterYear} — Prodi: {activeProdi || 'Semua'}</p>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="htable" id="tbl-pembelajaran">
          <thead>
            <tr>
              <th style={{ width: '80px' }} className="text-left">Kode</th>
              <th style={{ minWidth: '400px' }} className="text-left">Capaian Pembelajaran Lulusan (CPL)</th>
              <th style={{ width: '120px' }} className="text-center">Target Unit</th>
              <th style={{ width: '100px' }} className="text-center">Capaian</th>
              <th style={{ width: '100px' }} className="text-center">Capaian %</th>
              <th style={{ minWidth: '180px' }} className="text-left">Progress/Keterangan</th>
              <th style={{ width: '130px' }} className="text-center">Data Dukung</th>
              <th style={{ width: '100px' }} className="text-center">Aksi</th>
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
