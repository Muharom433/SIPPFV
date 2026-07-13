const { createClient } = require('@supabase/supabase-js');

const supabase = createClient("https://kfxrgahqojzukvsqatos.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmeHJnYWhxb2p6dWt2c3FhdG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Nzg3OTksImV4cCI6MjA5NzI1NDc5OX0.AqpzQZbhNnwnSfcFYkb4bL01pZOZ2C05siYCnwIy448");

async function run() {
  const { data, error } = await supabase.from('renstra_progress').select('*').eq('prodi_code', 'D4-TE');
  if (error) {
    console.error(error);
  } else {
    console.log(`D4-TE progress records:`, data);
  }
}

run();
