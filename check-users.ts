// Quick diagnostic script to check users table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnherrwzjtemrvzahppg.supabase.co';
const supabaseKey = 'YOUR_ANON_KEY_HERE'; // Replace with actual anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('=== Checking Users Table ===');

    // Try to fetch users
    const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' });

    console.log('Query result:');
    console.log('- Error:', error);
    console.log('- Count:', count);
    console.log('- Data length:', data?.length);
    console.log('- First 3 users:', data?.slice(0, 3));

    // Check if table exists by trying to get table info
    const { data: tableInfo, error: tableError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

    console.log('\nTable existence check:');
    console.log('- Table error:', tableError);
    console.log('- Table accessible:', !tableError);
}

checkUsers();
