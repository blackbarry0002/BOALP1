import * as supabase from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const client = supabase.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function cleanup() {
  try {
    console.log('🧹 Database Cleanup - One by One Method\n');

    // Get last 10 IDs
    const { data: last10, count: total } = await client
      .from('BOA-Log')
      .select('id', { count: 'exact' })
      .order('id', { ascending: false })
      .limit(10);

    if (!last10 || last10.length === 0) {
      console.log('✅ Database is empty');
      process.exit(0);
    }

    const keepIds = last10.map(e => e.id).sort((a, b) => a - b);
    const minKeepId = Math.min(...keepIds);

    console.log(`📊 Total entries before cleanup: ${total}`);
    console.log(`📌 Will keep entries with IDs: ${keepIds.join(', ')}`);
    console.log(`🗑️  Will delete entries with ID < ${minKeepId}\n`);

    // Try to get all IDs that need to be deleted
    console.log('📋 Fetching entries to delete...');
    const { data: toDelete, count: deleteCount, error: fetchErr } = await client
      .from('BOA-Log')
      .select('id', { count: 'exact' })
      .lt('id', minKeepId)
      .order('id', { ascending: true });

    if (fetchErr) {
      console.error('❌ Fetch error:', fetchErr.message);
      process.exit(1);
    }

    console.log(`✓ Found ${deleteCount} entries to delete`);

    if (!toDelete || toDelete.length === 0) {
      console.log('✅ Nothing to delete - database already clean');
      process.exit(0);
    }

    // Delete one by one in small groups
    let deleted = 0;
    const ids = toDelete.map(e => e.id);
    
    // Try deleting in groups of 5
    const groupSize = 5;
    for (let i = 0; i < ids.length; i += groupSize) {
      const group = ids.slice(i, i + groupSize);
      console.log(`  🔄 Deleting group ${Math.floor(i / groupSize) + 1}: IDs ${group.join(', ')}`);
      
      const { error: delErr } = await client
        .from('BOA-Log')
        .delete()
        .in('id', group);

      if (delErr) {
        console.warn(`    ⚠️  Delete failed: ${delErr.message}`);
      } else {
        deleted += group.length;
        console.log(`    ✓ Deleted ${group.length} entries (total: ${deleted})`);
      }
    }

    // Verify cleanup
    const { count: final, error: verifyErr } = await client
      .from('BOA-Log')
      .select('*', { count: 'exact', head: true });

    if (verifyErr) throw verifyErr;

    console.log(`\n✅ Cleanup summary:`);
    console.log(`   Before: ${total} entries`);
    console.log(`   Deleted: ${deleted} entries`);
    console.log(`   After: ${final} entries`);
    console.log(`   Kept: ${keepIds.length} entries (IDs: ${keepIds.join(', ')})\n`);

    // Show remaining entries
    const { data: kept } = await client
      .from('BOA-Log')
      .select('id, user_id, password, created_at')
      .order('id', { ascending: true });

    if (kept && kept.length > 0) {
      console.log('📋 Remaining entries in database:');
      kept.forEach((e, i) => {
        const date = new Date(e.created_at).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const pass = (e.password || 'N/A').substring(0, 10);
        const user = (e.user_id || 'N/A').substring(0, 15);
        console.log(`   [${String(i+1).padStart(2)}] ID: ${String(e.id).padStart(4)} | User: ${user.padEnd(15)} | Pass: ${pass}... | ${date}`);
      });
    }

    console.log();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanup();
