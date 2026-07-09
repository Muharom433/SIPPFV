import { supabase } from '../lib/supabase';
import type { RenstraProgress } from '../types';

export async function getRenstraProgress(prodiCode: string, triwulan?: number, year?: number): Promise<RenstraProgress[]> {
  let query = supabase
    .from('renstra_progress')
    .select('*')
    .eq('prodi_code', prodiCode);

  if (triwulan) {
    query = query.eq('triwulan', triwulan);
  }

  if (year) {
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate   = `${year}-12-31T23:59:59.999Z`;
    query = query.gte('updated_at', startDate).lte('updated_at', endDate);
  }

  const { data, error } = await query.order('item_id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as RenstraProgress[];
}

export async function upsertRenstraProgress(body: Partial<RenstraProgress>): Promise<RenstraProgress | null> {
  if (!body.item_id || !body.prodi_code || !body.triwulan)
    throw new Error('item_id, prodi_code, dan triwulan wajib diisi.');

  const upsertObj = {
    item_id: body.item_id,
    prodi_code: body.prodi_code,
    triwulan: body.triwulan,
    target_unit: body.target_unit ?? null,
    capaian: body.capaian ?? null,
    capaian_pct: body.capaian_pct ?? null,
    progress: body.progress ?? null,
    issues: body.issues ?? null,
    strategy: body.strategy ?? null,
    supporting_data_link: body.supporting_data_link ?? null,
    amount: body.amount ?? 0,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('renstra_progress')
    .upsert(upsertObj, { onConflict: 'item_id,prodi_code,triwulan' })
    .select();

  if (error) throw new Error(error.message);
  return data ? data[0] as RenstraProgress : null;
}
