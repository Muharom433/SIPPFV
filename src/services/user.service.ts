import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import type { User } from '../types';

/* ═══════════════════════════════════════════════
   Tipe untuk user SIMPEL (dropdown admin)
   ═══════════════════════════════════════════════ */
export interface SimpelUser {
  id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  identity_number: string | null;
  role: string | null;
}

/* ═══════════════════════════════════════════════
   Tipe untuk study_programs SIMPEL (dropdown prodi)
   ═══════════════════════════════════════════════ */
export interface StudyProgram {
  id: string;
  code: string;
  name: string;
}

/* ═══════════════════════════════════════════════
   GET — Ambil semua akun SIGAP (dengan JOIN)
   ═══════════════════════════════════════════════ */
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('SIGAP')
    .select('*, study_programs(id, name, code), users(id, full_name, email, identity_number, username)')
    .order('username', { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    id: row.id,
    username: row.username,
    role: row.role as 'admin' | 'prodi',
    id_prodi: row.id_prodi,
    id_user: row.id_user,
    full_name: row.users?.full_name || null,
    email: row.users?.email || null,
    identity_number: row.users?.identity_number || null,
    prodi_name: row.study_programs?.name || null,
    prodi_code: row.study_programs?.code || null
  }));
}

/* ═══════════════════════════════════════════════
   GET — Ambil daftar user SIMPEL (untuk dropdown admin)
   Hanya ambil user non-student
   ═══════════════════════════════════════════════ */
export async function getSimpelUsers(): Promise<SimpelUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, username, email, identity_number, role')
    .not('role', 'eq', 'student')
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/* ═══════════════════════════════════════════════
   GET — Ambil daftar study_programs SIMPEL (untuk dropdown prodi)
   ═══════════════════════════════════════════════ */
export async function getStudyPrograms(): Promise<StudyProgram[]> {
  const { data, error } = await supabase
    .from('study_programs')
    .select('id, code, name')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/* ═══════════════════════════════════════════════
   CREATE — Buat akun SIGAP baru
   ═══════════════════════════════════════════════ */
export async function createUser(payload: {
  username: string;
  password?: string;
  role: 'admin' | 'prodi';
  id_prodi?: string | null;
  id_user?: string | null;
}): Promise<User> {
  if (!payload.username) throw new Error('Username wajib diisi.');

  const insertObj: any = {
    username: payload.username.toLowerCase().trim(),
    role: payload.role,
    id_prodi: payload.id_prodi || null,
    id_user: payload.id_user || null
  };

  // Admin: password tidak disimpan di SIGAP (pakai password SIMPEL)
  // Prodi: password wajib dan di-hash ke SIGAP
  if (payload.role === 'prodi') {
    if (!payload.password) throw new Error('Password wajib diisi untuk akun Prodi.');
    const salt = await bcrypt.genSalt(10);
    insertObj.password = await bcrypt.hash(payload.password, salt);
  } else {
    // Admin — set password null, login pakai password SIMPEL
    insertObj.password = null;
  }

  const { data, error } = await supabase
    .from('SIGAP')
    .insert([insertObj])
    .select('*, study_programs(id, name, code), users(id, full_name, email, username)')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    username: data.username,
    role: data.role,
    id_prodi: data.id_prodi,
    id_user: data.id_user,
    full_name: data.users?.full_name || null,
    prodi_name: data.study_programs?.name || null,
    prodi_code: data.study_programs?.code || null
  };
}

/* ═══════════════════════════════════════════════
   UPDATE — Edit akun SIGAP
   ═══════════════════════════════════════════════ */
export async function updateUser(id: string, payload: {
  username?: string;
  password?: string;
  role?: 'admin' | 'prodi';
  id_prodi?: string | null;
  id_user?: string | null;
}): Promise<User> {
  const updateObj: any = {};
  if (payload.username) updateObj.username = payload.username.toLowerCase().trim();
  if (payload.role) updateObj.role = payload.role;

  // Explicitly set FK based on role
  if (payload.role === 'admin') {
    updateObj.id_user = payload.id_user || null;
    updateObj.id_prodi = null;
    // Admin — clear password (pakai password SIMPEL)
    updateObj.password = null;
  } else if (payload.role === 'prodi') {
    updateObj.id_prodi = payload.id_prodi || null;
    updateObj.id_user = null;
    // Prodi — hash password jika diisi
    if (payload.password && payload.password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateObj.password = await bcrypt.hash(payload.password, salt);
    }
  }

  const { data, error } = await supabase
    .from('SIGAP')
    .update(updateObj)
    .eq('id', id)
    .select('*, study_programs(id, name, code), users(id, full_name, email, username)')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    username: data.username,
    role: data.role,
    id_prodi: data.id_prodi,
    id_user: data.id_user,
    full_name: data.users?.full_name || null,
    prodi_name: data.study_programs?.name || null,
    prodi_code: data.study_programs?.code || null
  };
}

/* ═══════════════════════════════════════════════
   DELETE — Hapus akun SIGAP
   ═══════════════════════════════════════════════ */
export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('SIGAP')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
