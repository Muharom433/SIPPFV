import { supabase } from '../lib/supabase';
import type { Purchase } from '../types';

export async function getPurchases(): Promise<Purchase[]> {
  const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Purchase[];
}

export async function createPurchase(body: Partial<Purchase>): Promise<{ id: number }> {
  if (!body.item_name || !body.quantity || !body.price || !body.drive_link)
    throw new Error('Nama barang, kuantitas, harga, dan link Drive wajib diisi.');

  const total = (body.price || 0) * (body.quantity || 1);
  const { data, error } = await supabase.from('purchases').insert([{
    item_name: body.item_name,
    quantity: body.quantity,
    price: body.price,
    total_amount: total,
    drive_link: body.drive_link,
    keterangan: body.keterangan || '',
    prodi_code: body.prodi_code || null
  }]).select();

  if (error) throw new Error(error.message);
  return { id: data![0].id };
}

export async function updatePurchase(id: number, body: Partial<Purchase>): Promise<void> {
  if (!body.item_name || !body.quantity || !body.price || !body.drive_link)
    throw new Error('Nama barang, kuantitas, harga, dan link Drive wajib diisi.');

  const total = (body.price || 0) * (body.quantity || 1);
  const { error } = await supabase.from('purchases').update({
    item_name: body.item_name,
    quantity: body.quantity,
    price: body.price,
    total_amount: total,
    drive_link: body.drive_link,
    keterangan: body.keterangan || '',
    prodi_code: body.prodi_code || null
  }).eq('id', id);

  if (error) throw new Error(error.message);
}

export async function deletePurchase(id: number): Promise<void> {
  const { error } = await supabase.from('purchases').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
