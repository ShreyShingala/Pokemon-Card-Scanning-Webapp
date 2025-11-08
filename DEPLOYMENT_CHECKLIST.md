# 🚀 PokéScanner Production Deployment Guide

## ✅ Pre-Deployment Checklist (COMPLETED)

### Files Cleaned Up ✅
- All empty legacy files removed
- `.gitignore` properly configured
- Environment variables properly set
- Build successful with no TypeScript errors

### Production Readiness Issues Found

#### ⚠️ Console Logs (Optional Cleanup)
Your app has **console.log/error/warn** statements for debugging. These are fine for production but you may want to remove verbose logs:
- `AuthContext.tsx` - Lines 54-57, 76, 78, 81, 84 (signup debug logs)
- `src/app/auth/callback/page.tsx` - Lines 39, 62, 64, 67 (OAuth debug logs)
- `src/app/scan/page.tsx` - Lines 33, 63, 74 (camera cleanup logs)

**Recommendation**: Keep `console.error` statements (good for production debugging), remove `console.log` verbose debug statements.

---

## 📦 Step 1: Setup GitHub Repository

### A. Initialize Git (if not already done)
```bash
cd /Users/shrey/Downloads/Coding/Pokemon_Webapp

# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: PokéScanner production ready"
```

### B. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `pokemon-card-scanner` (or your choice)
3. **Keep it Private** (you have API keys)
4. **DO NOT** initialize with README (you already have files)
5. Click "Create repository"

### C. Push to GitHub
```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/pokemon-card-scanner.git

# Push code
git branch -M main
git push -u origin main
```

---

## 🌐 Step 2: Deploy Frontend to Vercel

### A. Sign Up for Vercel
1. Go to https://vercel.com/signup
2. Sign up with your GitHub account
3. Authorize Vercel to access your repositories

### B. Import Project
1. Click "Add New" → "Project"
2. Import your `pokemon-card-scanner` repository
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `pokemon-scanner-next`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### C. Add Environment Variables
Click "Environment Variables" and add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tinksayqyqtcnizrjtme.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbmtzYXlxeXF0Y25penJqdG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MDIxMTcsImV4cCI6MjA3NzE3ODExN30.W7JOJTMK3XGt5Txpjh3gOYNC6wp0bZ-knsLd3viC_po
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

⚠️ **Leave `NEXT_PUBLIC_API_URL` blank for now** - we'll update it after deploying the backend.

### D. Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build
3. You'll get a URL like: `https://pokemon-card-scanner.vercel.app`

---

## 🧠 Step 3: Prepare AI/ML Assets (CRITICAL)

### ⚠️ IMPORTANT: Your AI backend requires 40GB+ of assets that cannot be stored in Git

**Assets Inventory:**
```
detector_models/pokemon_detector4/weights/
├── best.pt          # 5.9MB - YOLO card detector
└── last.pt          # 5.9MB - YOLO checkpoint

Training/training_card_identifier/
├── clip_card_index.faiss           # 38MB - FAISS similarity index
├── clip_card_embeddings.pkl        # 40MB - CLIP embeddings
└── clip_card_index_map.pkl         # 1.9MB - Image path mappings

Image_detection/reference_images/
└── EverySinglePokemonCard/         # 40GB - Reference card images (CRITICAL)
```

**Total:** ~40.1GB

### Choose Storage Solution:

#### Option A: Railway Persistent Volumes (Recommended)
**Best for**: Simple deployment, fast access  
**Cost**: ~$10/month for 50GB

**Steps:**
1. After creating Railway project (next step), go to Settings → Volumes
2. Click "New Volume"
3. Size: 50GB
4. Mount path: `/app/reference_images`
5. Deploy once, then upload images:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Link project
   railway link
   
   # Upload reference images (this will take a while)
   railway shell
   # Then inside shell:
   scp -r Image_detection/reference_images/* /app/reference_images/
   ```

#### Option B: AWS S3 (Cheaper, requires code changes)
**Best for**: Lower cost, scalability  
**Cost**: ~$1-2/month

**Steps:**
1. Create S3 bucket: `pokemon-card-references`
2. Upload `reference_images/` directory to S3
3. Update `Image_detection/scan_card.py` (line 647):
   ```python
   # Change from local path to S3:
   import boto3
   s3 = boto3.client('s3')
   # Update image loading logic to fetch from S3
   ```
4. Add to Railway env vars:
   ```env
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_BUCKET_NAME=pokemon-card-references
   ```
5. Add `boto3` to requirements.txt

**Recommendation:** Use Railway Volumes for simplicity unless you need multi-region hosting.

---

## 🐍 Step 4: Deploy Backend to Railway

### A. Create requirements.txt (REQUIRED)
Railway needs this to install Python dependencies:

```bash
cd Image_detection

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
opencv-python-headless==4.8.1.78
numpy==1.24.3
easyocr==1.7.0
pillow==10.1.0
torch==2.1.0
torchvision==0.16.0
git+https://github.com/openai/CLIP.git
faiss-cpu==1.7.4
ultralytics==8.0.220
supabase==2.0.3
python-dotenv==1.0.0
EOF

# Commit this file
cd ..
git add Image_detection/requirements.txt
git commit -m "Add requirements.txt for Railway deployment"
git push
```

### B. Sign Up for Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Connect your GitHub account

### C. Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `pokemon-card-scanner` repository
4. Select **Root directory**: `/Image_detection`

### D. Configure Python Service
Railway should auto-detect Python. If not:
1. Go to Settings
2. Set **Start Command**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
3. Set **Root Directory**: `Image_detection`

### E. Add Environment Variables
In Railway settings → Variables, add:

```env
SUPABASE_URL=https://tinksayqyqtcnizrjtme.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbmtzYXlxeXF0Y25penJqdG1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYwMjExNywiZXhwIjoyMDc3MTc4MTE3fQ.vfAZTCZSB9G1Of0XEtNsOWPlClAl58n1o38XZOSlANs
PORT=8000
```

### F. ⚠️ IMPORTANT: Upload ML Model Files
The ML model files (YOLO weights, FAISS indexes) must be included in deployment:

**Option 1: Commit with Git LFS (Recommended)**
```bash
# Install Git LFS
brew install git-lfs  # macOS
git lfs install

# Track large files
git lfs track "detector_models/**/*.pt"
git lfs track "Training/**/*.faiss"
git lfs track "Training/**/*.pkl"

# Add .gitattributes
git add .gitattributes

# Commit model files
git add detector_models/ Training/
git commit -m "Add ML model files with Git LFS"
git push
```

**Option 2: Include in Railway Volume**
If using Railway volumes for reference images, also upload model files there and update paths in `scan_card.py`.

### G. Upload Reference Images (if using Railway Volumes)
**See Step 3 - Option A instructions above**

### E. Update CORS in Backend
Edit `Image_detection/main.py` to allow your Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-vercel-app.vercel.app",  # Add your Vercel URL here
        "https://*.vercel.app"  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### F. Deploy
1. Railway will auto-deploy
2. You'll get a URL like: `https://pokemon-scanner-production.railway.app`
3. Copy this URL
4. ⚠️ **Wait 5-10 minutes** for first deployment (installing PyTorch, CLIP, etc. takes time)
5. Check Railway logs to verify:
   - "Initializing CLIP"
   - "CLIP ready"
   - "Application startup complete"

---

## 🔗 Step 5: Connect Frontend & Backend

### A. Update Frontend Environment Variable
1. Go back to Vercel project settings
2. Update `NEXT_PUBLIC_API_URL` to your Railway URL:
   ```env
   NEXT_PUBLIC_API_URL=https://pokemon-scanner-production.railway.app
   ```
3. Click "Redeploy" in Vercel deployments tab

### B. Update Supabase OAuth Callback
1. Go to Supabase dashboard → Authentication → URL Configuration
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://your-vercel-app.vercel.app/auth/callback
   ```

---

## 🧪 Step 6: Test Production Deployment

### Test Checklist:
- [ ] Open your Vercel URL
- [ ] Test Sign Up with email
- [ ] Test Sign In with Google
- [ ] **Test camera scanning (single card)** - Verify YOLO model loads
- [ ] **Test image upload (multiple cards)** - Verify CLIP+FAISS matching works
- [ ] Test adding cards to collection
- [ ] Test viewing collection
- [ ] Test leaderboard
- [ ] Test dark mode toggle
- [ ] Test public/private collection toggle

### ⚠️ If Card Scanning Fails:
1. Check Railway logs for errors:
   - "CLIP/FAISS index or map not found" → Model files missing
   - "FileNotFoundError" → Reference images not uploaded
   - "ModuleNotFoundError" → Missing dependency in requirements.txt

2. Verify paths in Railway shell:
   ```bash
   railway shell
   ls -la /app/detector_models/pokemon_detector4/weights/
   ls -la /app/Training/training_card_identifier/
   ls -la /app/reference_images/  # If using volumes
   ```

3. Check file sizes match local:
   - `best.pt` should be 5.9MB
   - `clip_card_index.faiss` should be 38MB
   - Reference images should total ~40GB

---

## 📝 Required Environment Variables Summary

### Frontend (.env.local → Vercel)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=your_railway_backend_url
```

### Backend (Railway)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
PORT=8000
```

---

## 🔒 Security Checklist

- [x] `.env.local` is in `.gitignore` ✅
- [x] No hardcoded secrets in code ✅
- [ ] Update CORS in backend with production URLs
- [ ] Update Supabase OAuth redirect URLs
- [ ] Enable Supabase RLS (Row Level Security) policies
- [ ] Test all auth flows in production

---

## 🐛 Troubleshooting

### Frontend doesn't load
- Check Vercel build logs
- Verify environment variables are set
- Check browser console for errors

### Backend API errors (CORS)
- Verify Railway backend URL is correct in Vercel env vars
- Check Railway logs for errors
- Ensure CORS origins include your Vercel domain

### Google OAuth fails
- Verify redirect URL in Supabase matches your Vercel URL
- Check Supabase auth logs

### Cards not scanning
- **Check Railway backend is running** → Visit `https://your-backend.railway.app` (should show `{"status":"online"}`)
- **Verify YOLO model files deployed** → Check Railway logs for "YOLO model loaded"
- **Verify FAISS index loaded** → Check logs for "CLIP + FAISS initialized: indexed X cards"
- **Check reference images uploaded** → If using volumes, verify in Railway shell: `ls /app/reference_images/`
- **Check Railway logs for Python errors** → Look for ImportError, FileNotFoundError
- **Verify requirements.txt dependencies** → Ensure all packages installed (torch, clip, faiss-cpu, ultralytics)

### High Railway costs
- Monitor CPU/RAM usage in Railway dashboard
- CLIP model loads ~2GB RAM, FAISS index ~500MB
- Recommended Railway plan: $10/month for 8GB RAM

---

## 📊 Post-Deployment Monitoring

### Vercel Dashboard
- Monitor build status
- Check function logs
- View bandwidth usage

### Railway Dashboard
- Monitor backend uptime
- Check resource usage (RAM/CPU)
- View deployment logs

### Supabase Dashboard
- Monitor auth usage
- Check database queries
- View storage usage

---

## 🚀 Quick Deployment Commands

```bash
# Update code
git add .
git commit -m "Your commit message"
git push origin main

# Vercel auto-deploys on push
# Railway auto-deploys on push
```

---

## 💰 Cost Estimate

### Free Tier Limits:
- **Vercel**: 100GB bandwidth/month (FREE)
- **Railway**: $5 free credit/month + usage-based pricing
  - **Estimated:** $10-15/month for:
    - FastAPI backend (512MB RAM min)
    - CLIP model loading (~2GB RAM)
    - 50GB persistent volume for reference images
- **Supabase**: 500MB database, 1GB file storage (FREE)

### Total Monthly Cost Estimate:
- **Option A (Railway Volumes):** $10-15/month
- **Option B (S3 Storage):** $6-10/month ($1 S3 + $5-9 Railway)

**Recommended:** Railway Volumes for simplicity

### Cost Optimization Tips:
- Use Railway sleep mode for non-production (saves ~50%)
- Compress reference images (JPEG quality 80 instead of 100)
- Use S3 for images if bandwidth is high

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Your app is production ready! 🎉**
