import * as supabase from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const client = supabase.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function cleanup() {
  try {
    console.log('🧹 Database Cleanup\n');

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

    console.log(`📊 Total entries: ${total}`);
    console.log(`📌 Keeping IDs: ${keepIds.join(', ')}`);
    console.log(`🗑️  Deleting all entries with ID < ${minKeepId}\n`);

    // Delete all entries < minKeepId in batches
    let deletedTotal = 0;
    let offset = 0;
    const batchSize = 100;

    while (true) {
      const { data: batch, error: fetchErr } = await client
        .from('BOA-Log')
        .select('id')
        .lt('id', minKeepId)
        .order('id')
        .range(offset, offset + batchSize - 1);

      if (fetchErr || !batch || batch.length === 0) break;

      const batchIds = batch.map(e => e.id);
      const { error: delErr } = await client
        .from('BOA-Log')
        .delete()
        .in('id', batchIds);

      if (!delErr) {
        deletedTotal += batchIds.length;
        console.log(`  ✓ Deleted batch: ${batchIds.length} entries (total: ${deletedTotal})`);
      }

      if (batch.length < batchSize) break;
      offset += batchSize;
    }

    // Final verification
    const { count: final } = await client
      .from('BOA-Log')
      .select('*', { count: 'exact', head: true });

    console.log(`\n✅ Cleanup complete!`);
    console.log(`📊 Final database size: ${final} entries\n`);

    // Show the kept entries
    const { data: kept } = await client
      .from('BOA-Log')
      .select('id, user_id, password, created_at')
      .order('id', { ascending: true });

    if (kept) {
      console.log('📋 Remaining entries:');
      kept.forEach((e, i) => {
        const date = new Date(e.created_at).toLocaleString();
        console.log(`   [${i + 1}] ID: ${e.id} | User: ${e.user_id || 'N/A'} | Pass: ${(e.password || 'N/A').substring(0, 10)}... | ${date}`);
      });
    }
    console.log();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanup();
