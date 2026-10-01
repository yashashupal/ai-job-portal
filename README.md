# Hirelane – Job portal (Django + React)

Applicants browse and apply to jobs. Hirers publish jobs and manage applicants.
A second tab, **Live market**, pulls live openings from 30+ job boards through the
JobsPipe API, and each live job has a **See tech stack** button (JobsPipe stack scan).

## Run it

Backend (terminal 1):

```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # then paste JOBSPIPE_API_KEY inside .env
python manage.py migrate && python manage.py seed_demo && python manage.py runserver
```

Frontend (terminal 2):

```bash
cd frontend
npm install && npm run dev
```

Open http://localhost:5173

Demo hirer: `demo-hirer@example.com` / `DemoPass123` (created by `seed_demo`).
Register a new account from the UI to try the applicant side.

## Check the JobsPipe connection (uses 1 credit)

```bash
cd backend && python manage.py jobspipe_check --domain notion.so
```

It prints the response shape. If a field looks empty in the UI, adjust
`normalize_job` / `scan_stack` in `backend/jobs/jobspipe.py`.

## API key safety

- The key lives only in `backend/.env` (git-ignored) and is sent from Django to JobsPipe.
  The browser never sees it.
- JobsPipe bills 1 credit per job returned, so search results are cached for 10 minutes,
  pages are 10 jobs, and `/api/external/*` is rate-limited to 30 requests/minute.
- Without a key, Live market falls back to JobsPipe's free sandbox sample data.

## Endpoints

| Method | Path | Who |
| --- | --- | --- |
| POST | /api/auth/register/, /api/auth/login/ | anyone |
| GET | /api/jobs/?q=&location=&work_mode=&job_type=&page= | anyone |
| POST/PUT/PATCH/DELETE | /api/jobs/ , /api/jobs/:id/ | hirer (owner) |
| GET | /api/jobs/mine/ , /api/jobs/:id/applications/ | hirer |
| POST | /api/jobs/:id/apply/ (multipart: resume, cover_letter) | applicant |
| GET | /api/applications/mine/ | applicant |
| GET | /api/applications/:id/resume/ | that applicant or the job's hirer |
| PATCH | /api/applications/:id/ (status) | hirer |
| GET | /api/external/jobs/ , /api/external/stack/?domain= | anyone (throttled) |

Tests: `cd backend && python manage.py test`

## Deploy

1. **Backend on Render** – New > Blueprint > pick this repo (it reads `render.yaml`).
   Fill `JOBSPIPE_API_KEY` and `CORS_ALLOWED_ORIGINS` (temporarily `http://localhost:5173`).
2. **Frontend on Vercel** – Import the repo, set **Root Directory = `frontend`**, add env var
   `VITE_API_URL=https://<your-render-service>.onrender.com`, deploy.
3. Back on Render, set `CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app` (no trailing slash) and redeploy.

Resumes are stored in the database (private download endpoint), so nothing depends on the
server's disk. Render's free Postgres expires after 30 days; to keep data longer, use a free
Postgres from another provider (e.g. Neon) and paste its URL into `DATABASE_URL`.
