import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY harus diisi di file .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
