// One-time migration: Create departemen table + add departemen_id to prodi_drive_links
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function migrate() {
  console.log('Running migration check...');

  // Test if departemen table exists
  const { data: testDept, error: testErr } = await supabase.from('departemen').select('id').limit(1);
  
  if (testErr && testErr.message.includes('does not exist')) {
    console.log('ERROR: Tabel "departemen" belum ada di Supabase.');
    console.log('Jalankan SQL di Supabase Dashboard > SQL Editor (lihat output).');
    console.log(`
-- 1. Buat tabel departemen
CREATE TABLE IF NOT EXISTS departemen (
    id               SERIAL PRIMARY KEY,
    kode_departemen  TEXT UNIQUE NOT NULL,
    nama_departemen  TEXT NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tambahkan kolom departemen_id ke prodi_drive_links
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='prodi_drive_links' AND column_name='departemen_id') THEN
        ALTER TABLE prodi_drive_links ADD COLUMN departemen_id INTEGER REFERENCES departemen(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. RLS policies for departemen
ALTER TABLE departemen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read" ON departemen FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert" ON departemen FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update" ON departemen FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete" ON departemen FOR DELETE TO anon USING (true);
    `);
  } else {
    console.log('OK: Tabel "departemen" sudah ada.');
  }

  // Test if departemen_id column exists in prodi_drive_links
  const { data: testProdi, error: testProdiErr } = await supabase.from('prodi_drive_links').select('departemen_id').limit(1);
  
  if (testProdiErr && testProdiErr.message.includes('departemen_id')) {
    console.log('ERROR: Kolom "departemen_id" belum ada di tabel prodi_drive_links.');
  } else {
    console.log('OK: Kolom "departemen_id" sudah ada di prodi_drive_links.');
  }

  // Test if renstra_progress table exists
  const { data: testRP, error: testRPErr } = await supabase.from('renstra_progress').select('id').limit(1);

  if (testRPErr && testRPErr.message.includes('does not exist')) {
    console.log('\nERROR: Tabel "renstra_progress" belum ada di Supabase.');
    console.log('Jalankan SQL berikut di Supabase Dashboard > SQL Editor:\n');
    console.log(`
-- Buat tabel renstra_progress (per Prodi per Triwulan)
CREATE TABLE IF NOT EXISTS renstra_progress (
    id                    SERIAL PRIMARY KEY,
    item_id               INTEGER NOT NULL REFERENCES sip_items(id) ON DELETE CASCADE,
    prodi_code            TEXT NOT NULL,
    triwulan              INTEGER NOT NULL CHECK(triwulan IN (1, 2, 3, 4)),
    target_unit           TEXT,
    capaian               TEXT,
    capaian_pct           TEXT,
    progress              TEXT,
    issues                TEXT,
    strategy              TEXT,
    supporting_data_link  TEXT,
    amount                REAL DEFAULT 0,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, prodi_code, triwulan)
);

-- RLS policies for renstra_progress
ALTER TABLE renstra_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read" ON renstra_progress FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert" ON renstra_progress FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update" ON renstra_progress FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete" ON renstra_progress FOR DELETE TO anon USING (true);
    `);
  } else {
    console.log('OK: Tabel "renstra_progress" sudah ada.');
  }

  console.log('Migration check selesai.');
}

migrate().catch(console.error);
