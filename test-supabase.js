import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);

    // Test connection by querying the table
    const { data, error, count } = await supabase
      .from('BOA-Log')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('❌ Connection error:', error.message);
      process.exit(1);
    }

    console.log('✓ Supabase connection successful!');
    console.log('Table BOA-Log exists');
    console.log('Current entries in table:', count);

    // Insert a test entry
    console.log('\nInserting test entry...');
    const { data: insertData, error: insertError } = await supabase
      .from('BOA-Log')
      .insert([
        {
          user_id: `test_${Date.now()}`,
          password: 'test_password',
          remember_me: false,
          ip_address: '127.0.0.1',
          user_agent: 'Test Script',
          status: 'Test'
        }
      ])
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
      process.exit(1);
    }

    console.log('✓ Test entry inserted successfully!');
    console.log('Entry:', insertData[0]);
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

testSupabase();

