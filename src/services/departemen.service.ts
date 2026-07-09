import { supabase } from '../lib/supabase';
import type { Departemen } from '../types';

export async function getDepartemen(): Promise<Departemen[]> {
  const { data, error } = await supabase
    .from('departemen')
    .select('*')
    .order('kode_departemen', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Departemen[];
}

export async function createDepartemen(kode_departemen: string, nama_departemen: string): Promise<{ id: number }> {
  if (!kode_departemen || !nama_departemen)
    throw new Error('Kode Departemen dan Nama Departemen wajib diisi.');

  const { data, error } = await supabase.from('departemen').insert([{
    kode_departemen,
    nama_departemen
  }]).select();

  if (error) throw new Error(error.message);
  return { id: data![0].id };
}

export async function updateDepartemen(id: number, kode_departemen: string, nama_departemen: string): Promise<void> {
  if (!kode_departemen || !nama_departemen)
    throw new Error('Kode Departemen dan Nama Departemen wajib diisi.');

  const { error } = await supabase.from('departemen').update({
    kode_departemen,
    nama_departemen,
    updated_at: new Date().toISOString()
  }).eq('id', id);

  if (error) throw new Error(error.message);
}

export async function deleteDepartemen(id: number): Promise<void> {
  const { data: linkedProdi } = await supabase
    .from('prodi_drive_links')
    .select('id, prodi_name')
    .eq('departemen_id', id);

  if (linkedProdi && linkedProdi.length > 0) {
    const names = linkedProdi.map(p => p.prodi_name).join(', ');
    throw new Error(`Tidak dapat menghapus departemen. Masih ada ${linkedProdi.length} prodi terkait: ${names}.`);
  }

  const { error } = await supabase.from('departemen').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
