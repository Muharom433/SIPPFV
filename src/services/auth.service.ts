import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import type { User } from '../types';

export async function loginUser(username: string, password: string): Promise<{ user: User }> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();

  if (error || !user) {
    throw new Error('Username atau password salah.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Username atau password salah.');
  }

  let prodi_name: string | null = null;
  if (user.prodi_code) {
    const { data: prodi } = await supabase
      .from('prodi_drive_links')
      .select('prodi_name')
      .eq('prodi_code', user.prodi_code)
      .single();
    if (prodi) prodi_name = prodi.prodi_name;
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      prodi_code: user.prodi_code,
      prodi_name
    }
  };
}
