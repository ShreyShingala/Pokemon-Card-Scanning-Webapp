# 🚀 Pokemon Card Scanner - Production Deployment Guide

## 🔴 CRITICAL SECURITY ISSUES TO FIX BEFORE DEPLOYING

### 1. **CORS Configuration (HIGH PRIORITY)**
**File**: `/Image_detection/main.py` (line 32)

**Current (INSECURE)**:
```python
allow_origins=["*"],  # REMEMBER TO CHANGE TO DOMAIN NAME
```

**Change to (after deploying frontend)**:
```python
allow_origins=[
    "https://your-production-domain.com",
    "https://www.your-production-domain.com",
    # Add localhost for development testing
    "http://localhost:3000"  # Remove in production
],
```

---

### 2. **Environment Variables - Backend**
**File**: `/Image_detection/.env` (currently at root `.env`)

**MOVE** the `.env` file into `/Image_detection/` folder and rename variables to match `main.py`:

Create `/Image_detection/.env`:
```bash
# Supabase
supabaseurl=https://tinksayqyqtcnizrjtme.supabase.co
servicerolekey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbmtzYXlxeXF0Y25penJqdG1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYwMjExNywiZXhwIjoyMDc3MTc4MTE3fQ.vfAZTCZSB9G1Of0XEtNsOWPlClAl58n1o38XZOSlANs

# Pokemon TCG API (if needed)
pokeapikey=95249521-598f-42d3-b565-2925af5ecefc
```

**Add to `.gitignore`**:
```
.env
*.env
.env.local
```

---

### 3. **Frontend Environment Variables**
**File**: `/pokemon-scanner-next/.env.local`

**For Production**, create `.env.production`:
```bash
# Supabase (Public keys - safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://tinksayqyqtcnizrjtme.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbmtzYXlxeXF0Y25penJqdG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDIxMTcsImV4cCI6MjA3NzE3ODExN30.W7JOJTMK3XGt5Txpjh3gOYNC6wp0bZ-knsLd3viC_po

# Backend API URL (CHANGE TO YOUR PRODUCTION BACKEND URL)
NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# DO NOT INCLUDE SERVICE ROLE KEY IN PRODUCTION (frontend doesn't need it)
```

---

### 4. **Google OAuth Redirect URIs**
Update in Google Cloud Console > Credentials:

**Add Production URLs**:
```
https://tinksayqyqtcnizrjtme.supabase.co/auth/v1/callback
https://your-production-domain.com/auth/callback
```

**Update Supabase Dashboard**:
1. Go to Authentication > URL Configuration
2. Set Site URL: `https://your-production-domain.com`
3. Add Redirect URLs: `https://your-production-domain.com/**`

---

### 5. **Remove Console Logs (Optional but Recommended)**
Remove or comment out these debug logs in production:
- `/pokemon-scanner-next/src/app/auth/callback/page.tsx` (lines 39, 62, 64, 67)
- `/pokemon-scanner-next/src/contexts/AuthContext.tsx` (lines 54-57, 68, 74)
- `/pokemon-scanner-next/src/components/CardScanner.tsx` (lines 121, 166, 215)

Or wrap them in development checks:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data)
}
```

---

## 📦 DEPLOYMENT OPTIONS

### Option A: Vercel (Frontend) + Railway/Render (Backend) - RECOMMENDED

#### **Frontend - Deploy to Vercel**

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Navigate to Next.js folder**:
```bash
cd pokemon-scanner-next
```

3. **Deploy**:
```bash
vercel
```

4. **Add Environment Variables in Vercel Dashboard**:
   - Go to your project settings
   - Add all variables from `.env.production`
   - Redeploy after adding

5. **Update Production URL**:
   - After deploy, you'll get a URL like `pokemon-scanner.vercel.app`
   - Update `NEXT_PUBLIC_API_URL` to your backend URL
   - Update Google OAuth redirect URIs

---

#### **Backend - Deploy to Railway (Easiest)**

1. **Sign up at [Railway.app](https://railway.app)**

2. **Create New Project** > Deploy from GitHub

3. **Connect your repository** or upload code

4. **Set Root Directory**: `/Image_detection`

5. **Add Environment Variables** in Railway Dashboard:
   - `supabaseurl`
   - `servicerolekey`
   - `pokeapikey`

6. **Set Build Command**: 
```bash
pip install -r requirements.txt
```

7. **Set Start Command**:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

8. **Add Python Version** (create `runtime.txt`):
```
python-3.11
```

9. **Deploy** - Railway will auto-assign a URL like `your-app.railway.app`

10. **Update CORS** in `main.py`:
```python
allow_origins=[
    "https://pokemon-scanner.vercel.app",  # Your Vercel URL
]
```

---

#### **Backend Alternative - Deploy to Render**

1. Sign up at [Render.com](https://render.com)
2. New > Web Service
3. Connect GitHub repo
4. Root Directory: `Image_detection`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables
8. Deploy

---

### Option B: Full Stack on Single Platform

#### **Deploy to Railway (Both Frontend & Backend)**

Create two services:
1. **Service 1**: Next.js frontend
2. **Service 2**: FastAPI backend

Both in same project, different services.

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Security
- [ ] Update CORS to specific domain (not `"*"`)
- [ ] Move `.env` to `/Image_detection/` folder
- [ ] Verify `.env` files are in `.gitignore`
- [ ] Remove `SUPABASE_SERVICE_ROLE_KEY` from frontend `.env`
- [ ] Update Google OAuth redirect URIs for production
- [ ] Remove/wrap debug console.logs

### Configuration
- [ ] Update `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Verify Supabase URL configuration in dashboard
- [ ] Test Google Sign-In with production URLs
- [ ] Verify database RLS (Row Level Security) policies are enabled

### Testing
- [ ] Test all auth flows (signup, login, logout, Google OAuth)
- [ ] Test card scanning with multiple cards
- [ ] Test collection management (add, update, delete)
- [ ] Test leaderboard visibility toggling
- [ ] Test dark mode across all pages
- [ ] Test on mobile devices (responsive design)

### Performance
- [ ] Run `npm run build` locally to check for build errors
- [ ] Verify all images are optimized
- [ ] Check bundle size (should be reasonable)

### Database
- [ ] Verify all Supabase tables have proper indexes
- [ ] Enable RLS on all tables
- [ ] Test database queries with production data
- [ ] Backup database before going live

---

## 🔧 REQUIRED FILE CHANGES BEFORE DEPLOYMENT

### 1. Update `.gitignore` (Root level)
```gitignore
# Python
venv/
__pycache__/
*.py[cod]
*.so
.DS_Store
.vscode/

# Environment variables
.env
*.env
.env.local
.env.production
Image_detection/.env

# Models (optional - if you don't want to commit large files)
detector_models/
Training/
*.pt
```

### 2. Create `runtime.txt` in `/Image_detection/`
```
python-3.11
```

### 3. Update `main.py` CORS (after getting production URL)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-production-frontend.vercel.app",
        "https://your-custom-domain.com",  # If you have one
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🚀 DEPLOYMENT STEPS (RECOMMENDED PATH)

### Step 1: Prepare Backend
```bash
cd Image_detection

# Create .env file
cat > .env << EOF
supabaseurl=https://tinksayqyqtcnizrjtme.supabase.co
servicerolekey=YOUR_SERVICE_ROLE_KEY
pokeapikey=95249521-598f-42d3-b565-2925af5ecefc
EOF

# Test locally
source ../venv/bin/activate
python main.py
# Verify it runs on http://localhost:8000
```

### Step 2: Deploy Backend to Railway
1. Go to [Railway.app](https://railway.app)
2. New Project > Deploy from GitHub
3. Select your repo
4. Set root directory: `/Image_detection`
5. Add environment variables
6. Deploy
7. **Copy the Railway URL** (e.g., `https://pokemon-api-production.railway.app`)

### Step 3: Update Frontend Environment
```bash
cd pokemon-scanner-next

# Create .env.production
cat > .env.production << EOF
NEXT_PUBLIC_SUPABASE_URL=https://tinksayqyqtcnizrjtme.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_API_URL=https://pokemon-api-production.railway.app
EOF
```

### Step 4: Update CORS in Backend
Update `main.py` with your frontend URL (you'll get this after Vercel deploy)

### Step 5: Deploy Frontend to Vercel
```bash
cd pokemon-scanner-next
vercel
```

Follow prompts, add environment variables in Vercel dashboard

### Step 6: Update OAuth & CORS
1. Add Vercel URL to Google OAuth redirect URIs
2. Update CORS in `main.py` with Vercel URL
3. Redeploy backend on Railway
4. Update Supabase Site URL to Vercel URL

### Step 7: Test Everything
- [ ] Visit your Vercel URL
- [ ] Test sign up/login
- [ ] Test Google OAuth
- [ ] Test card scanning
- [ ] Test collection management
- [ ] Test leaderboard

---

## 🔍 MONITORING & MAINTENANCE

### Logs
- **Vercel**: Check deployment logs in dashboard
- **Railway**: Check application logs in dashboard
- **Supabase**: Monitor auth attempts and database queries

### Costs (Approximate)
- **Vercel**: Free tier (100GB bandwidth/month)
- **Railway**: $5-10/month (depends on usage)
- **Supabase**: Free tier (500MB database, 50K monthly active users)
- **Total**: ~$5-10/month for small-medium traffic

### Scaling
- Both Vercel and Railway auto-scale
- Monitor Supabase database size
- Consider upgrading Railway to Pro if traffic increases

---

## 🆘 TROUBLESHOOTING

### "CORS Error"
- Check `allow_origins` in `main.py`
- Verify frontend URL is correct
- Clear browser cache

### "Failed to fetch"
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify backend is running
- Check Railway logs for errors

### "OAuth Error"
- Verify redirect URIs in Google Console
- Check Supabase Site URL configuration
- Ensure callback URLs match exactly

### "500 Internal Server Error"
- Check Railway/Render logs
- Verify environment variables are set
- Check Supabase connection

---

## 📝 NOTES

- **Domain Name**: Consider buying a custom domain (Google Domains, Namecheap) and pointing it to Vercel
- **SSL**: Both Vercel and Railway provide free SSL certificates automatically
- **Database Backups**: Supabase has automatic backups on Pro plan, or export manually
- **Model Files**: Large files (`best.pt`, CLIP models) may need to be stored in cloud storage for Railway deployment

---

## ✨ OPTIONAL IMPROVEMENTS

- Add error tracking (Sentry)
- Add analytics (Vercel Analytics or Google Analytics)
- Add rate limiting to API
- Implement Redis caching for frequently accessed data
- Add image optimization/CDN
- Set up CI/CD pipeline
- Add automated tests

---

**Good luck with your deployment! 🎉**

Your app is well-built and ready to ship with these changes!
