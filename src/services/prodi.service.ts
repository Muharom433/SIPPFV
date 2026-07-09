import { supabase } from '../lib/supabase';
import type { ProdiDriveLink } from '../types';

export async function getProdiLinks(role: string, username: string): Promise<ProdiDriveLink[]> {
  let query = supabase
    .from('prodi_drive_links')
    .select('*, departemen(id, kode_departemen, nama_departemen)')
    .order('prodi_name', { ascending: true });

  if (role !== 'admin') {
    const { data: user } = await supabase.from('users').select('prodi_code').eq('username', username).single();
    if (user && user.prodi_code) {
      query = query.eq('prodi_code', user.prodi_code);
    } else {
      return [];
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as ProdiDriveLink[];
}

export async function getProdiLink(id: number): Promise<ProdiDriveLink> {
  const { data, error } = await supabase
    .from('prodi_drive_links')
    .select('*, departemen(id, kode_departemen, nama_departemen)')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('Prodi tidak ditemukan.');
  return data as ProdiDriveLink;
}

export async function createProdiLink(body: Partial<ProdiDriveLink>): Promise<{ id: number }> {
  if (!body.prodi_name || !body.prodi_code)
    throw new Error('Nama Prodi dan Kode Prodi wajib diisi.');

  const { data, error } = await supabase.from('prodi_drive_links').insert([{
    prodi_name: body.prodi_name,
    prodi_code: body.prodi_code,
    departemen_id: (body as any).departemen_id || null,
    link_perjanjian_kinerja: body.link_perjanjian_kinerja || '',
    link_template_kinerja: body.link_template_kinerja || '',
    link_tw1: body.link_tw1 || '',
    link_tw2: body.link_tw2 || '',
    link_bukti_dukung_tw1: body.link_bukti_dukung_tw1 || '',
    link_bukti_lama: body.link_bukti_lama || '',
    link_contoh_target: body.link_contoh_target || '',
    keterangan: body.keterangan || ''
  }]).select();

  if (error) throw new Error(error.message);

  // Auto-create user for new prodi
  const newUsername = body.prodi_code.toLowerCase();
  const { data: existingUser } = await supabase.from('users')
    .select('id')
    .eq('username', newUsername)
    .maybeSingle();

  if (!existingUser) {
    await supabase.from('users').insert([{
      username: newUsername,
      password: 'vokasi123',
      role: 'user',
      prodi_code: body.prodi_code
    }]);
  }

  return { id: data![0].id };
}

export async function updateProdiLink(id: number, body: any, role: string): Promise<void> {
  const updateData: any = {
    link_perjanjian_kinerja: body.link_perjanjian_kinerja || '',
    link_template_kinerja: body.link_template_kinerja || '',
    link_tw1: body.link_tw1 || '',
    link_tw2: body.link_tw2 || '',
    link_bukti_dukung_tw1: body.link_bukti_dukung_tw1 || '',
    link_bukti_lama: body.link_bukti_lama || '',
    link_contoh_target: body.link_contoh_target || '',
    keterangan: body.keterangan || '',
    updated_at: new Date().toISOString()
  };

  if (role === 'admin') {
    updateData.prodi_name = body.prodi_name;
    updateData.prodi_code = body.prodi_code;
    updateData.departemen_id = body.departemen_id !== undefined ? (body.departemen_id || null) : undefined;
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
  }

  const { error } = await supabase.from('prodi_drive_links').update(updateData).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteProdiLink(id: number): Promise<void> {
  const { data: prodi } = await supabase.from('prodi_drive_links').select('prodi_code').eq('id', id).single();
  if (!prodi) throw new Error('Prodi tidak ditemukan.');

  const { error } = await supabase.from('prodi_drive_links').delete().eq('id', id);
  if (error) throw new Error(error.message);

  await supabase.from('users').delete().eq('prodi_code', prodi.prodi_code);
}
