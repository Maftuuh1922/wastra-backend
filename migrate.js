const { Client } = require('pg');

const connectionString = 'postgresql://postgres:9hzL4yr5Blidrj7v@db.lkxwgumsbajzoppzmxvi.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

const sql = `
-- 1. Buat tabel history
CREATE TABLE IF NOT EXISTS public.history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Nyalakan keamanan baris (Row Level Security / RLS)
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan (Policy) agar User hanya bisa melihat riwayatnya sendiri
DROP POLICY IF EXISTS "Users can view their own history" ON public.history;
CREATE POLICY "Users can view their own history" 
ON public.history FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Kebijakan (Policy) agar User hanya bisa menambahkan riwayatnya sendiri
DROP POLICY IF EXISTS "Users can insert their own history" ON public.history;
CREATE POLICY "Users can insert their own history" 
ON public.history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. Kebijakan (Policy) agar User bisa menghapus riwayatnya sendiri (opsional)
DROP POLICY IF EXISTS "Users can delete their own history" ON public.history;
CREATE POLICY "Users can delete their own history" 
ON public.history FOR DELETE 
USING (auth.uid() = user_id);
`;

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL!');
    await client.query(sql);
    console.log('Migration successful: history table and RLS policies created.');
  } catch (err) {
    console.error('Error executing migration', err);
  } finally {
    await client.end();
  }
}

run();
