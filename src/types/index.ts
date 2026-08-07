/* ═══════════════════════════════════════════════
   SIPP — TypeScript Type Definitions
   ═══════════════════════════════════════════════ */

export interface User {
  // Data dari tabel SIGAP (otorisasi khusus SIGAP)
  id: string;                    // uuid dari tabel SIGAP
  username: string;              // username di tabel SIGAP
  role: 'admin' | 'prodi';      // role di SIGAP
  id_prodi: string | null;      // FK ke study_programs
  id_user: string | null;       // FK ke users (SIMPEL)

  // Data JOIN dari tabel users (SIMPEL) — profil lengkap
  full_name?: string | null;
  email?: string | null;
  identity_number?: string | null;

  // Data JOIN dari tabel study_programs (SIMPEL) — data prodi
  prodi_name?: string | null;
  prodi_code?: string | null;   // kode prodi (misal D4-TI) dari study_programs
}

export interface AuthSession {
  user: User;
}

export interface SipItem {
  id: number;
  parent_id: number | null;
  level: number;
  code: string;
  description: string;
  volume: string | null;
  unit: string | null;
  price: number | null;
  amount: number;
  source_of_fund: string | null;
  performance_incentive: number | null;
  receipt_link: string | null;
  supporting_data_link: string | null;
  type: string;
  satuan: string | null;
  target_univ: string | null;
  target_unit: string | null;
  capaian: string | null;
  capaian_pct: string | null;
  progress: string | null;
  issues: string | null;
  strategy: string | null;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  mei: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  prodi_code: string | null;
  created_at: string;
  // Runtime-only fields
  children?: TreeNode[];
  _progAmount?: number;
}

export interface TreeNode extends SipItem {
  children: TreeNode[];
  visible?: boolean;
  _progAmount?: number;
}

export interface Departemen {
  id: number;
  kode_departemen: string;
  nama_departemen: string;
  created_at: string;
  updated_at: string;
}

export interface ProdiDriveLink {
  id: number;
  prodi_name: string;
  prodi_code: string;
  departemen_id: number | null;
  departemen?: Departemen | null;
  link_perjanjian_kinerja: string;
  link_template_kinerja: string;
  link_tw1: string;
  link_tw2: string;
  link_bukti_dukung_tw1: string;
  link_bukti_lama: string;
  link_contoh_target: string;
  keterangan: string;
  updated_at: string;
  created_at: string;
}

export interface RenstraProgress {
  id: number;
  item_id: number;
  prodi_code: string;
  triwulan: number;
  target_unit: string | null;
  capaian: string | null;
  capaian_pct: string | null;
  progress: string | null;
  issues: string | null;
  strategy: string | null;
  supporting_data_link: string | null;
  amount: number;
  updated_at: string;
}

export interface Purchase {
  id: number;
  item_name: string;
  quantity: number;
  price: number;
  total_amount: number;
  drive_link: string;
  keterangan: string | null;
  prodi_code: string | null;
  created_at: string;
}
