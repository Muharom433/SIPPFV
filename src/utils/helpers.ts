/* ═══════════════════════════════════════════════
   SIPP — Utility Functions
   ═══════════════════════════════════════════════ */

export function escapeHTML(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g,
    (tag: string) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

export function fmtNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '0';
  return parseFloat(String(n)).toLocaleString('id-ID');
}

export function rupiah(n: number | string | null | undefined): string {
  if (!n) return 'Rp 0';
  return 'Rp ' + parseFloat(String(n)).toLocaleString('id-ID');
}

export function getActiveTwNumber(triwulan: string): number {
  if (triwulan === 'Triwulan 1') return 1;
  if (triwulan === 'Triwulan 2') return 2;
  if (triwulan === 'Triwulan 3') return 3;
  if (triwulan === 'Triwulan 4') return 4;
  return 1;
}

export function getActiveTwKey(triwulan: string): string {
  if (triwulan === 'Triwulan 1') return 'tw1';
  if (triwulan === 'Triwulan 2') return 'tw2';
  if (triwulan === 'Triwulan 3') return 'tw3';
  if (triwulan === 'Triwulan 4') return 'tw4';
  return 'tw1';
}

import type { SipItem, TreeNode } from '../types';

export function buildTree(items: SipItem[]): { roots: TreeNode[]; map: Record<number, TreeNode> } {
  const map: Record<number, TreeNode> = {};
  items.forEach(i => { map[i.id] = { ...i, children: [] }; });
  const roots: TreeNode[] = [];
  items.forEach(i => {
    if (i.parent_id && map[i.parent_id]) map[i.parent_id].children.push(map[i.id]);
    else roots.push(map[i.id]);
  });
  return { roots, map };
}

export function isAncestorCollapsed(item: SipItem, map: Record<number, TreeNode>, collapsed: Set<number>): boolean {
  let pid = item.parent_id;
  while (pid) {
    if (collapsed.has(pid)) return true;
    pid = map[pid] ? map[pid].parent_id : null;
  }
  return false;
}

export function levelClass(lvl: number): string {
  const n = Math.min(lvl, 9);
  return `r${n}`;
}

export function calculateAggregateAmounts(nodes: TreeNode[], activeProdi?: string): void {
  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      calculateAggregateAmounts(node.children, activeProdi);
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

export function getTwValue(fieldVal: string | null | undefined, twKey: string): string {
  if (!fieldVal) return '';
  try {
    const json = JSON.parse(fieldVal);
    if (json && typeof json === 'object' && json[twKey] !== undefined) {
      return json[twKey] || '';
    }
  } catch {
    if (twKey === 'tw1') return fieldVal;
  }
  return '';
}
