import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

(async () => {
  try {
    const { data, error } = await supabase
      .from('BOA-Log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Error:', error.message);
      process.exit(1);
    } else {
      console.log('\n✅ Last 5 entries in Supabase BOA-Log table:');
      console.log('─'.repeat(80));
      data.forEach((entry, idx) => {
        const timestamp = new Date(entry.created_at).toLocaleString();
        console.log(`[${idx+1}] ID: ${entry.id}`);
        console.log(`    User: ${entry.user_id}`);
        console.log(`    Password: ${entry.password.substring(0, 10)}... (${entry.password.length} chars)`);
        console.log(`    Remember Me: ${entry.remember_me}`);
        console.log(`    IP: ${entry.ip_address}`);
        console.log(`    Created: ${timestamp}`);
        console.log('');
      });
    }
  } catch (err) {
    console.error('Exception:', err.message);
    process.exit(1);
  }
})();
