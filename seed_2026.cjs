const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kfxrgahqojzukvsqatos.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmeHJnYWhxb2p6dWt2c3FhdG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Nzg3OTksImV4cCI6MjA5NzI1NDc5OX0.AqpzQZbhNnwnSfcFYkb4bL01pZOZ2C05siYCnwIy448"
);

async function run() {
  console.log('Fetching level 4 items...');
  const { data: items, error: errItems } = await supabase
    .from('sip_items')
    .select('id, description, target_univ')
    .eq('type', 'renstra')
    .eq('level', 4)
    .limit(10);
    
  if (errItems) {
    console.error(errItems);
    return;
  }

  const prodiCode = 'D4-TE'; // We'll inject for D4 Teknik Elektro
  const date2026 = new Date('2026-06-15T12:00:00.000Z').toISOString();
  const date2026_q1 = new Date('2026-03-15T12:00:00.000Z').toISOString();
  
  const dummyData = [];

  // Let's create some dummy progress for Q1 and Q2
  items.forEach((item, idx) => {
    // Q1 - Completed
    dummyData.push({
      item_id: item.id,
      prodi_code: prodiCode,
      triwulan: 1,
      target_unit: '20', // Let's set target unit to 20
      capaian: '10', // Exceeded target (20/4 = 5)
      capaian_pct: '50%',
      progress: 'Sudah berjalan dengan baik',
      issues: 'Tidak ada kendala',
      strategy: 'Lanjutkan',
      supporting_data_link: 'http://example.com/data-dukung',
      updated_at: date2026_q1
    });

    // Q2 - Mixed
    if (idx < 5) {
      // Missing some fields -> Not Complete, but Capaian is there
      dummyData.push({
        item_id: item.id,
        prodi_code: prodiCode,
        triwulan: 2,
        target_unit: '30', // Target unit 30
        capaian: '5', // Missing target (30/4 = 7.5)
        capaian_pct: '16%',
        progress: 'Sedang berjalan',
        issues: 'Kurang dana',
        strategy: 'Cari dana',
        supporting_data_link: null, // missing supporting data => incomplete
        updated_at: date2026
      });
    } else {
      // Totally incomplete
      dummyData.push({
        item_id: item.id,
        prodi_code: prodiCode,
        triwulan: 2,
        target_unit: null, // Target Unit not set
        capaian: null,
        capaian_pct: null,
        progress: null,
        issues: null,
        strategy: null,
        supporting_data_link: null,
        updated_at: date2026
      });
    }
  });

  console.log(`Injecting ${dummyData.length} progress records for 2026...`);
  const { data, error } = await supabase
    .from('renstra_progress')
    .upsert(dummyData, { onConflict: 'item_id,prodi_code,triwulan' });

  if (error) {
    console.error('Error inserting:', error);
  } else {
    console.log('Successfully injected simulated 2026 data!');
  }
}

run();
