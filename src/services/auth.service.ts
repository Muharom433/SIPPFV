import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import type { User } from '../types';

export async function loginUser(username: string, password: string): Promise<{ user: User }> {
  const usernameLC = username.toLowerCase().trim();

  // ─── Step 1: Cek apakah username ada di tabel SIGAP ──────────────
  const { data: sigapUser, error } = await supabase
    .from('SIGAP')
    .select('*')
    .eq('username', usernameLC)
    .single();

  if (error || !sigapUser) {
    throw new Error('Username atau password salah.');
  }

  // ─── Step 2: Verifikasi password ─────────────────────────────────
  if (sigapUser.role === 'admin' && sigapUser.id_user) {
    // ═══ ADMIN: Password diambil dari tabel SIMPEL `users` ═══
    const { data: simpelUser } = await supabase
      .from('users')
      .select('password, full_name, email, identity_number, username')
      .eq('id', sigapUser.id_user)
      .single();

    if (!simpelUser || !simpelUser.password) {
      throw new Error('Akun SIMPEL tidak ditemukan atau belum memiliki password.');
    }

    const isMatch = await bcrypt.compare(password, simpelUser.password);
    if (!isMatch) {
      throw new Error('Username atau password salah.');
    }

    // Ambil nama prodi (jika ada)
    let prodiName: string | null = null;
    if (sigapUser.id_prodi) {
      const { data: prodi } = await supabase
        .from('study_programs')
        .select('name')
        .eq('id', sigapUser.id_prodi)
        .single();
      if (prodi) prodiName = prodi.name;
    }

    return {
      user: {
        id: sigapUser.id,
        username: sigapUser.username,
        role: sigapUser.role,
        id_prodi: sigapUser.id_prodi,
        id_user: sigapUser.id_user,
        full_name: simpelUser.full_name,
        email: simpelUser.email,
        identity_number: simpelUser.identity_number,
        prodi_name: prodiName,
        prodi_code: null
      }
    };

  } else {
    // ═══ PRODI / ADMIN lama (tanpa id_user): Password dari tabel SIGAP ═══
    if (!sigapUser.password) {
      throw new Error('Akun belum memiliki password.');
    }

    const isMatch = await bcrypt.compare(password, sigapUser.password);
    if (!isMatch) {
      throw new Error('Username atau password salah.');
    }

    // Ambil profil dari SIMPEL jika ada id_user
    let fullName: string | null = null;
    let email: string | null = null;
    let identityNumber: string | null = null;

    if (sigapUser.id_user) {
      const { data: simpelUser } = await supabase
        .from('users')
        .select('full_name, email, identity_number')
        .eq('id', sigapUser.id_user)
        .single();
      if (simpelUser) {
        fullName = simpelUser.full_name;
        email = simpelUser.email;
        identityNumber = simpelUser.identity_number;
      }
    }

    // Ambil nama prodi dari study_programs
    let prodiName: string | null = null;
    if (sigapUser.id_prodi) {
      const { data: prodi } = await supabase
        .from('study_programs')
        .select('name')
        .eq('id', sigapUser.id_prodi)
        .single();
      if (prodi) prodiName = prodi.name;
    }

    return {
      user: {
        id: sigapUser.id,
        username: sigapUser.username,
        role: sigapUser.role,
        id_prodi: sigapUser.id_prodi,
        id_user: sigapUser.id_user,
        full_name: fullName,
        email: email,
        identity_number: identityNumber,
        prodi_name: prodiName,
        prodi_code: sigapUser.role === 'admin' ? null : sigapUser.username
      }
    };
  }
}
