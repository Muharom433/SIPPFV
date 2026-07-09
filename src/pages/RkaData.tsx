import React from 'react';
import { useAuth, useApp } from '../contexts/AuthContext';
import { deleteItem } from '../services/items.service';
import { fmtNum, buildTree, isAncestorCollapsed, levelClass } from '../utils/helpers';
import type { SipItem, TreeNode } from '../types';

interface RkaDataProps {
  onEditItem: (id: number) => void;
  onAddSubItem: (parentId: number, level: number) => void;
  onOpenDriveModal: (itemId: number, field: string) => void;
  items: SipItem[];
  onRefresh: () => void;
}

export function RkaData({ onEditItem, onAddSubItem, onOpenDriveModal, items, onRefresh }: RkaDataProps) {
  const { user } = useAuth();
  const {
    filterYear,
    filterProdi,
    collapsed,
    toggleCollapse
  } = useApp();

  const isAdmin = user?.role === 'admin';

  // Apply frontend filtering
  const filteredItems = items.filter(item => {
    const date = new Date(item.created_at);
    return date.getFullYear() === filterYear;
  });

  // If a prodi is selected, filter RKA items down by prodi code, keeping parents visible
  let visibleItems = filteredItems;
  if (filterProdi) {
    const nodeMap: Record<number, TreeNode & { visible: boolean }> = {};
    filteredItems.forEach(item => {
      nodeMap[item.id] = { ...item, visible: false, children: [] };
    });

    filteredItems.forEach(item => {
      if (item.parent_id && nodeMap[item.parent_id]) {
        nodeMap[item.parent_id].children.push(nodeMap[item.id]);
      }
    });

    const markVisible = (node: TreeNode & { visible: boolean }): boolean => {
      let hasVisibleChild = false;
      node.children.forEach(child => {
        const childNode = nodeMap[child.id];
        if (childNode && markVisible(childNode)) {
          hasVisibleChild = true;
        }
      });

      if (node.level < 4) {
        node.visible = hasVisibleChild;
      } else if (node.level === 4) {
        node.visible = !node.prodi_code || node.prodi_code === filterProdi || hasVisibleChild;
      } else {
        node.visible = node.prodi_code === filterProdi;
      }
      return node.visible;
    };

    filteredItems.forEach(item => {
      if (!item.parent_id && nodeMap[item.id]) {
        markVisible(nodeMap[item.id]);
      }
    });

    visibleItems = filteredItems.filter(item => nodeMap[item.id]?.visible);
  }

  const { roots, map } = buildTree(visibleItems);

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

    if (hidden) return null;

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
            <span>{node.description}</span>
          </div>
        </td>
        <td className="text-center">{node.volume || ''}</td>
        <td className="text-right">{node.price ? fmtNum(node.price) : ''}</td>
        <td className="text-right">{node.amount ? fmtNum(node.amount) : 0}</td>
        <td className="text-center">{node.source_of_fund || ''}</td>
        <td className="text-right">{node.performance_incentive ? fmtNum(node.performance_incentive) : ''}</td>
        <td className="text-center">
          {node.receipt_link ? (
            <a href={node.receipt_link} target="_blank" rel="noopener noreferrer" className="dlbadge has-link">
              <i className="fa-brands fa-google-drive"></i> Drive Link
            </a>
          ) : (
            <span 
              className="dlbadge no-link" 
              onClick={() => onOpenDriveModal(node.id, 'receipt_link')}
            >
              <i className="fa-solid fa-plus"></i> Tambah Link
            </span>
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
    <div className="view" id="view-rka-data">
      <div className="section-head">
        <div>
          <h2>Data Perencanaan RKA</h2>
          <p className="sub-text">Periode: Tahun {filterYear}</p>
        </div>
      </div>
      <div className="tbl-wrap" id="wrap-rka-data">
        <table className="htable" id="tbl-rka-data">
          <thead>
            <tr>
              <th style={{ width: '100px' }} className="text-left">Kode</th>
              <th className="text-left">Uraian</th>
              <th style={{ width: '100px' }} className="text-center">Volume</th>
              <th style={{ width: '130px' }} className="text-right">Harga Satuan</th>
              <th style={{ width: '130px' }} className="text-right">Jumlah</th>
              <th style={{ width: '120px' }} className="text-center">Sumber Dana</th>
              <th style={{ width: '130px' }} className="text-right">Insentif Kinerja</th>
              <th style={{ width: '150px' }} className="text-center">Kuitansi / Link Drive</th>
              {isAdmin && <th style={{ width: '100px' }} className="admin-only text-center">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {roots.length > 0 ? (
              renderTree(roots)
            ) : (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Tidak ada data perencanaan RKA untuk filter yang dipilih.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
