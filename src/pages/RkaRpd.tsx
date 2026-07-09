import { useApp } from '../contexts/AuthContext';
import { fmtNum, buildTree, isAncestorCollapsed, levelClass } from '../utils/helpers';
import type { SipItem, TreeNode } from '../types';

interface RkaRpdProps {
  items: SipItem[];
}

export function RkaRpd({ items }: RkaRpdProps) {
  const {
    filterYear,
    filterProdi,
    collapsed,
    toggleCollapse
  } = useApp();

  const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

  // Apply frontend filtering
  const filteredItems = items.filter(item => {
    const date = new Date(item.created_at);
    return date.getFullYear() === filterYear;
  });

  // If prodi selected, perform the same tree filter
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
        {months.map(m => (
          <td key={m} className="text-right">{node[m] ? fmtNum(node[m]) : 0}</td>
        ))}
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
    <div className="view" id="view-rka-rpd">
      <div className="section-head">
        <div>
          <h2>Rencana Penarikan Dana (RPD) Bulanan</h2>
          <p className="sub-text">Periode: Tahun {filterYear}</p>
        </div>
      </div>
      <div className="tbl-wrap tbl-scroll" id="wrap-rka-rpd">
        <table className="htable" id="tbl-rka-rpd">
          <thead>
            <tr>
              <th style={{ minWidth: '100px' }} className="text-left">Kode</th>
              <th style={{ minWidth: '260px' }} className="text-left">Uraian</th>
              <th className="text-right">Jan</th>
              <th className="text-right">Feb</th>
              <th className="text-right">Mar</th>
              <th className="text-right">Apr</th>
              <th className="text-right">Mei</th>
              <th className="text-right">Jun</th>
              <th className="text-right">Jul</th>
              <th className="text-right">Agt</th>
              <th className="text-right">Sep</th>
              <th className="text-right">Okt</th>
              <th className="text-right">Nov</th>
              <th className="text-right">Des</th>
            </tr>
          </thead>
          <tbody>
            {roots.length > 0 ? (
              renderTree(roots)
            ) : (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Tidak ada data Rencana Penarikan Dana (RPD) untuk filter yang dipilih.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
