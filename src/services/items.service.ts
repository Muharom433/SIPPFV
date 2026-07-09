import { supabase } from '../lib/supabase';
import type { SipItem } from '../types';

export async function getItems(type: string): Promise<SipItem[]> {
  const { data, error } = await supabase
    .from('sip_items')
    .select('*')
    .eq('type', type)
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as SipItem[];
}

export async function createItem(item: Partial<SipItem>): Promise<{ id: number }> {
  if (!item.description) throw new Error('Uraian/Deskripsi wajib diisi.');
  if (item.receipt_link && !validateDriveLink(item.receipt_link))
    throw new Error('Kuitansi harus berupa URL (http/https).');
  if (item.supporting_data_link && !validateDriveLink(item.supporting_data_link))
    throw new Error('Data Dukung harus berupa URL (http/https).');

  const insertObj = buildInsertObj(item);
  const { data, error } = await supabase.from('sip_items').insert([insertObj]).select();
  if (error) throw new Error(error.message);
  return { id: data![0].id };
}

export async function updateItem(id: number, updates: Partial<SipItem>): Promise<void> {
  if (updates.receipt_link && !validateDriveLink(updates.receipt_link))
    throw new Error('Kuitansi harus berupa URL.');
  if (updates.supporting_data_link && !validateDriveLink(updates.supporting_data_link))
    throw new Error('Data Dukung harus berupa URL.');

  const { error } = await supabase.from('sip_items').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateDriveLink(id: number, field: string, link: string): Promise<void> {
  const allowed = ['supporting_data_link', 'receipt_link'];
  if (!allowed.includes(field)) throw new Error('Field tidak valid.');
  if (!validateDriveLink(link)) throw new Error('Link harus berupa URL (http/https).');

  const { error } = await supabase.from('sip_items').update({ [field]: link }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteItem(id: number): Promise<void> {
  const { error } = await supabase.from('sip_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function importRenstra(items: any[], year: number): Promise<void> {
  const startDate = `${year}-01-01T00:00:00.000Z`;
  const endDate = `${year}-12-31T23:59:59.999Z`;

  const { error: deleteError } = await supabase
    .from('sip_items')
    .delete()
    .eq('type', 'renstra')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (deleteError) throw new Error(deleteError.message);

  const tempToDbIdMap: Record<number, number> = {};

  for (let level = 1; level <= 5; level++) {
    const levelItems = items.filter((item: any) => item.level === level);
    for (const item of levelItems) {
      const dbParentId = item.tempParentId ? tempToDbIdMap[item.tempParentId] : null;
      const { data, error } = await supabase
        .from('sip_items')
        .insert({
          level,
          parent_id: dbParentId || null,
          code: item.code || '',
          description: item.description,
          satuan: item.satuan || null,
          target_univ: item.target_univ || null,
          target_unit: item.target_unit || null,
          amount: item.amount || 0,
          type: 'renstra',
          created_at: new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
        })
        .select();

      if (error) throw new Error(error.message);
      if (data) tempToDbIdMap[item.tempId] = data[0].id;
    }
  }
}

function validateDriveLink(url: string | null | undefined): boolean {
  if (!url) return false;
  const str = String(url).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          const link = obj[key];
          if (link && link.trim() !== '') {
            if (!link.startsWith('http://') && !link.startsWith('https://')) {
              return false;
            }
          }
        }
        return true;
      }
    } catch {
      return false;
    }
  }
  return str.startsWith('http://') || str.startsWith('https://');
}

function buildInsertObj(b: Partial<SipItem>) {
  return {
    parent_id: b.parent_id || null,
    level: b.level || 1,
    code: b.code || '',
    description: b.description || '',
    volume: b.volume || null,
    unit: b.unit || null,
    price: b.price || null,
    amount: b.amount || 0,
    source_of_fund: b.source_of_fund || null,
    performance_incentive: b.performance_incentive || null,
    receipt_link: b.receipt_link || null,
    supporting_data_link: b.supporting_data_link || null,
    type: b.type || 'keuangan_rka',
    satuan: b.satuan || null,
    target_univ: b.target_univ || null,
    target_unit: b.target_unit || null,
    capaian: b.capaian || null,
    capaian_pct: b.capaian_pct || null,
    progress: b.progress || null,
    issues: b.issues || null,
    strategy: b.strategy || null,
    prodi_code: b.prodi_code || null,
    jan: b.jan || 0, feb: b.feb || 0, mar: b.mar || 0,
    apr: b.apr || 0, mei: b.mei || 0, jun: b.jun || 0,
    jul: b.jul || 0, aug: b.aug || 0, sep: b.sep || 0,
    oct: b.oct || 0, nov: b.nov || 0, dec: b.dec || 0,
    created_at: (b as any).created_at || undefined,
  };
}
