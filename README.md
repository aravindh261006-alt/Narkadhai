# Narkadhai

A full-stack donation and transparency website for the Narkadhai initiative — an informal organization that visits children's homes and old-age homes, collecting voluntary donations.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4
- **Backend**: FastAPI (Python) + Mangum (Vercel serverless)
- **Database & Auth**: Supabase (Postgres + Supabase Auth + Storage)
- **Email**: Resend (abstracted behind a swappable email service module)
- **Deployment**: Vercel

## Project Structure

```
narkadhai/
├── frontend/          # React + Vite + TypeScript
├── backend/           # FastAPI Python
│   ├── app/           # App modules (routers, services, config)
│   └── api/           # Vercel serverless entry point (Mangum)
├── supabase/          # Database schema SQL
├── vercel.json        # Vercel routing config
├── DEPLOYMENT.md      # Full deployment guide
└── .gitignore
```

## Quick Start (Local Development)

### 1. Database Setup
Run `supabase/schema.sql` in your Supabase project's SQL Editor.

### 2. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # Fill in your values
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env     # Fill in your values
npm run dev
```

Visit `http://localhost:5173`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

## Security Notes

- The Supabase **service role key** is used **only** server-side in FastAPI. It is never in the frontend.
- The frontend uses only the Supabase **anon key** (safe to expose).
- Admin access is double-gated: Supabase Auth + `authorized_admins` table check in the backend.
- Supabase RLS policies block public access to PII (donations, contact messages, admin list).
- Rate limiting on public forms backed by Supabase (survives serverless cold starts).

## Important Disclaimer

Narkadhai is **not** a certified or registered nonprofit organization. Donations are voluntary contributions and are not eligible for tax exemption under any law. This is emphasized throughout the website.
