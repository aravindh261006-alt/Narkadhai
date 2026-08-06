# DEPLOYMENT.md — Narkadhai

---

## 1. Manual Steps I Must Do Myself

Complete these steps **in order** before the site is live.

### 1.1 — Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com) → "New Project"
2. Choose a region close to India (e.g., Singapore `ap-southeast-1`)
3. Set a strong database password and save it securely
4. Wait ~2 minutes for the project to provision

### 1.2 — Run the Database Schema
1. In your Supabase dashboard → **SQL Editor**
2. Paste the entire contents of `supabase/schema.sql` and click **Run**
3. Confirm all tables appear in **Table Editor**: `members`, `audit_docs`, `albums`, `album_photos`, `donations`, `settings`, `authorized_admins`, `contact_messages`, `rate_limit_log`

### 1.3 — Create Storage Buckets
The schema.sql attempts to create buckets via SQL, but if they don't appear, create them manually:
1. Go to **Storage** in Supabase dashboard → **New Bucket**
2. Create these buckets:
   | Bucket Name | Public? | Max Size |
   |---|---|---|
   | `album-photos` | ✅ Public | 10 MB |
   | `audit-docs` | ✅ Public | 20 MB |
   | `member-photos` | ✅ Public | 5 MB |
   | `qr-codes` | ✅ Public | 2 MB |
   | `donation-screenshots` | ❌ Private | 10 MB |

### 1.4 — Add Yourself as the First Authorized Admin
Run this SQL in the **Supabase SQL Editor** (replace with your real email and name):
```sql
INSERT INTO public.authorized_admins (email, name, role)
VALUES ('your-email@example.com', 'Your Name', 'owner');
```
> ⚠️ **This is critical.** Without this row, nobody can log in to the admin area.

### 1.5 — Create Your Supabase Auth User
1. Go to **Authentication** → **Users** → **Add User**
2. Add the same email you inserted in step 1.4
3. Set a strong password (you can change it later)
4. Alternatively, use magic link login — no password needed

### 1.6 — Create a Resend Account (for email sending)
1. Go to [https://resend.com](https://resend.com) → Sign up (free tier: 100 emails/day)
2. Go to **Domains** → Add your domain (e.g. `narkadhai.org`) and verify DNS records
3. Go to **API Keys** → Create a new key → Copy it as `RESEND_API_KEY`
4. Set `EMAIL_FROM` to a verified address like `Narkadhai <noreply@narkadhai.org>`

> 💡 If you don't have a custom domain yet, you can use `onboarding@resend.dev` for testing only (sends only to the Resend account owner's email). Switch to a real domain before going live.

### 1.7 — Generate Your UPI Payment QR Code
1. Open your UPI app (GPay, PhonePe, Paytm, etc.) → Find "Receive Money" / "QR Code"
2. Save the QR code image to your computer
3. After deploying the site, log in to `/admin` → **Settings** → Upload the QR code

### 1.8 — Set Real Content
After logging into the admin panel, go to **Settings** and update:
- **Mission Text** — your real mission statement
- **About Text** — your real about/origin story
- **Donation Target Amount** — your current fundraising goal in ₹
- **Contact Email** — your real contact email
- **Instagram URL and Handle** — your real Instagram profile
- **Owner Name, Bio, Photo** — your real details

### 1.9 — Add Real Members, Albums, and Audit Documents
Use the admin panel at:
- `/admin/members` — add each team member with photo
- `/admin/albums` — create albums for past visits and upload photos
- `/admin/audit` — upload any financial records you want to publish

### 1.10 — Add Audit-Role Admins (Optional)
For each audit-role team member, run:
```sql
INSERT INTO public.authorized_admins (email, name, role)
VALUES ('auditor@example.com', 'Auditor Name', 'audit');
```
Then they must also be added as Supabase Auth users (Authentication → Users).

---

## 2. Environment Variables

### Frontend — set in Vercel Dashboard (safe to expose)
| Variable | Description | Public/Secret |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://abc123.supabase.co`) | ✅ Public — safe in frontend |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key — used only for auth and storage from the browser | ✅ Public — safe in frontend |
| `VITE_API_BASE_URL` | Base URL for API calls (set to `/api` for same-origin Vercel deployment) | ✅ Public |

### Backend — set in Vercel Dashboard (secret, never expose to frontend)
| Variable | Description | Public/Secret |
|---|---|---|
| `SUPABASE_URL` | Same Supabase project URL | 🔒 Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — full DB access, backend-only! | 🔒 Secret — NEVER expose to frontend |
| `SUPABASE_JWT_SECRET` | Found in Supabase → Settings → API → JWT Secret. Used to verify auth tokens. | 🔒 Secret |
| `RESEND_API_KEY` | Your Resend API key. Set to `log` for local dev (prints emails instead of sending). | 🔒 Secret |
| `EMAIL_FROM` | The "From" address for outgoing emails e.g. `Narkadhai <noreply@narkadhai.org>` | 🔒 Secret |
| `OWNER_EMAIL` | Owner's email for fallback notification (also covered by authorized_admins table) | 🔒 Secret |
| `FRONTEND_URL` | Your deployed frontend URL for CORS e.g. `https://narkadhai.vercel.app` | 🔒 Secret |
| `ENVIRONMENT` | `production` for live, `development` for local | 🔒 Secret |

> **Security check**: Run `grep -r "SERVICE_ROLE_KEY" frontend/` — this should return nothing. The service role key must never appear in any frontend file.

---

## 3. Vercel Deployment Instructions

### 3.1 — Push to GitHub
1. Create a new GitHub repository (public or private)
2. Push the entire `narkadhai/` folder:
   ```bash
   cd narkadhai
   git init
   git add .
   git commit -m "Initial Narkadhai website"
   git remote add origin https://github.com/YOUR_USERNAME/narkadhai.git
   git push -u origin main
   ```

### 3.2 — Import to Vercel
1. Go to [https://vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Vercel will auto-detect the project

### 3.3 — Configure Build Settings
In the Vercel project settings, set:
- **Framework Preset**: Other (not Next.js)
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: (leave blank or `cd frontend && npm install`)

> ✅ The `vercel.json` in the project root already handles routing `/api/*` → FastAPI and serving the frontend static files.

### 3.4 — Add Environment Variables
1. In Vercel → Your Project → **Settings** → **Environment Variables**
2. Add ALL variables from Section 2 above
3. For **Frontend variables** (`VITE_*`): set scope to **Production**, **Preview**, and **Development**
4. For **Backend/secret variables**: set scope to **Production** (and optionally Preview)

### 3.5 — Add Python Runtime Configuration
Vercel needs to know about Python dependencies. The `vercel.json` already specifies `python3.11` for the function. Make sure `backend/requirements.txt` exists (it does).

Vercel will automatically install Python dependencies from `backend/requirements.txt` when deploying the `backend/api/index.py` function.

### 3.6 — Deploy
1. Click **Deploy** in Vercel
2. Wait for the build to complete (~2–3 minutes)
3. Vercel will provide a URL like `https://narkadhai.vercel.app`

### 3.7 — Set FRONTEND_URL in Backend Env
After you have your Vercel URL:
1. Go to Vercel → Settings → Environment Variables
2. Update `FRONTEND_URL` to your real Vercel URL (e.g. `https://narkadhai.vercel.app`)
3. Redeploy (Deployments → Redeploy) to pick up the change

### 3.8 — Verify End-to-End
After deployment, manually test each of these:

| Check | How to verify |
|---|---|
| Home page loads | Visit `https://your-site.vercel.app` |
| API is working | Visit `https://your-site.vercel.app/api/health` → should return `{"status":"ok"}` |
| Settings load | Visit `/` — mission text and Instagram handle should appear |
| Login works | Go to `/login`, log in with your admin email → should land on `/admin` |
| Login rejects unauthorized | Try logging in with a non-admin email → should get "not authorized" message |
| Donate form works | Fill out and submit the donate form → check Supabase donations table for the new row |
| Email sends | Check your inbox (or Resend dashboard) for thank-you and notification emails |
| Contact form works | Submit contact form → check `contact_messages` table + owner email notification |
| Admin verify works | In `/admin/donations`, mark a donation as Verified → check public tracker updates |
| QR code shows | Upload QR in admin settings → check it appears on `/donate` |
| Albums show | Create an album, upload photos → check `/albums` and `/albums/:id` |
| Audit docs show | Upload a doc in admin → check `/audit` page lists it |
| Members show | Add a member in admin → check `/members` page |

### 3.9 — Custom Domain (Optional)
1. Vercel → Project → Settings → **Domains** → Add your custom domain (e.g. `narkadhai.org`)
2. Follow DNS configuration instructions
3. Update `FRONTEND_URL` env var to your custom domain and redeploy

### 3.10 — Known Vercel Limitations
| Limitation | Impact | Status |
|---|---|---|
| 4.5 MB request body limit | Screenshots could exceed limit | ✅ **Mitigated**: Files upload directly from browser to Supabase Storage, never through Vercel |
| 30 s function timeout (set in vercel.json) | Email sending is < 1 s | ✅ Not a problem |
| Python cold starts (1–3 s) | First API call after inactivity is slow | ⚠️ Cosmetic only — acceptable |
| In-memory rate limiting resets on cold start | Rate limiter uses Supabase DB | ✅ **Mitigated**: Supabase-backed rate limiting survives cold starts |
