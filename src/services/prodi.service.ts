import { supabase } from '../lib/supabase';
import type { ProdiDriveLink } from '../types';

const VOKASI_CODES = ['ADP', 'AKT', 'MP', 'PUR', 'PTI', 'PROMKES', 'BOGA', 'BUSANA', 'RIAS', 'ELKO', 'ELKA', 'MESIN', 'OTO', 'SIPIL'];

const DEFAULT_14_PRODIS: { code: string; name: string }[] = [
  { code: 'ADP', name: 'Administrasi Perkantoran' },
  { code: 'AKT', name: 'Akuntansi' },
  { code: 'MP', name: 'Manajemen Pemasaran' },
  { code: 'PUR', name: 'Pengelolaan Usaha Rekreasi' },
  { code: 'PTI', name: 'Pengobatan Tradisional Indonesia' },
  { code: 'PROMKES', name: 'Promosi Kesehatan' },
  { code: 'BOGA', name: 'Tata Boga' },
  { code: 'BUSANA', name: 'Tata Busana' },
  { code: 'RIAS', name: 'Tata Rias dan Kecantikan' },
  { code: 'ELKO', name: 'Teknik Elektro' },
  { code: 'ELKA', name: 'Teknik Elektronika' },
  { code: 'MESIN', name: 'Teknik Mesin' },
  { code: 'OTO', name: 'Teknik Otomotif' },
  { code: 'SIPIL', name: 'Teknik Sipil' }
];

export async function getProdiLinks(role: string, prodiCode?: string | null): Promise<ProdiDriveLink[]> {
  try {
    // Priority 1: Query directly from master table study_programs (SIMPEL)
    const { data: simpelProdis, error: spError } = await supabase
      .from('study_programs')
      .select('*')
      .in('code', VOKASI_CODES)
      .order('name', { ascending: true });

    if (!spError && simpelProdis && simpelProdis.length > 0) {
      // Map to ProdiDriveLink interface
      const list: ProdiDriveLink[] = simpelProdis.map((sp, idx) => ({
        id: idx + 1,
        prodi_name: sp.name,
        prodi_code: sp.code, // Kode resmi SIMPEL (ADP, AKT, ELKO, dll)
        departemen_id: null,
        link_perjanjian_kinerja: '',
        link_template_kinerja: '',
        link_tw1: '',
        link_tw2: '',
        link_bukti_dukung_tw1: '',
        link_bukti_lama: '',
        link_contoh_target: '',
        keterangan: '',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }));

      if (role !== 'admin' && prodiCode) {
        return list.filter(p => p.prodi_code.toLowerCase() === prodiCode.toLowerCase());
      }
      return list;
    }
  } catch {
    // Continue to fallback if study_programs fetch fails
  }

  // Fallback: Default 14 Vokasi prodis with official SIMPEL codes
  const list: ProdiDriveLink[] = DEFAULT_14_PRODIS.map((p, idx) => ({
    id: idx + 1,
    prodi_name: p.name,
    prodi_code: p.code,
    departemen_id: null,
    link_perjanjian_kinerja: '',
    link_template_kinerja: '',
    link_tw1: '',
    link_tw2: '',
    link_bukti_dukung_tw1: '',
    link_bukti_lama: '',
    link_contoh_target: '',
    keterangan: '',
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }));

  if (role !== 'admin' && prodiCode) {
    return list.filter(p => p.prodi_code.toLowerCase() === prodiCode.toLowerCase());
  }

  return list;
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
  const { error } = await supabase.from('prodi_drive_links').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
