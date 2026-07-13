const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kfxrgahqojzukvsqatos.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmeHJnYWhxb2p6dWt2c3FhdG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Nzg3OTksImV4cCI6MjA5NzI1NDc5OX0.AqpzQZbhNnwnSfcFYkb4bL01pZOZ2C05siYCnwIy448"
);

async function run() {
  console.log('Cleaning up simulated 2026 data for D4-TE...');
  
  // We used dates in 2026 for our mock data
  const { data, error } = await supabase
    .from('renstra_progress')
    .delete()
    .eq('prodi_code', 'D4-TE')
    .gte('updated_at', '2026-01-01T00:00:00.000Z')
    .lte('updated_at', '2026-12-31T23:59:59.999Z');

  if (error) {
    console.error('Error deleting:', error);
  } else {
    console.log('Successfully removed simulated 2026 data!');
  }
}

run();
