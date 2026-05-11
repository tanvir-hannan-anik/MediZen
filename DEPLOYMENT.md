# MediZen — Render Deployment Guide

End-to-end guide to deploying this project on [Render](https://render.com).

---

## Architecture on Render

You'll create **3 services** on Render:

| # | Service | Type | Purpose |
|---|---------|------|---------|
| 1 | `medizen-db` | PostgreSQL | App database |
| 2 | `medizen-api` | Web Service (Python) | FastAPI backend |
| 3 | `medizen-web` | Static Site | React/Vite frontend |

The frontend talks to the backend over HTTPS using `VITE_API_URL`.
CORS on the backend whitelists the frontend's domain via `CORS_ORIGINS`.

---

## ⚠️ Free-tier reality check

The backend uses `sentence-transformers` + `faiss-cpu` + a 16 MB PDF for RAG.
Cold start downloads ~80 MB of model weights and builds a FAISS index in memory.

| Plan | Will it work? |
|------|---------------|
| Free (512 MB RAM) | **Likely OOM** during model load. Try, but expect crashes. |
| Starter ($7/mo, 512 MB) | Same RAM as free; OOM risk. |
| Standard ($25/mo, 2 GB) | **Recommended.** Comfortable headroom. |

If you hit OOM, options are: (a) upgrade plan, (b) disable RAG in `lifespan`,
(c) deploy backend on Railway/Fly.io with more RAM.

---

## 0. Prerequisites

- GitHub repo pushed: ✅ already at https://github.com/tanvir-hannan-anik/MediZen
- Render account: sign up at https://render.com (free, GitHub login works)
- A Groq API key (you already have one in your local `.env`)

---

## 1. Create the PostgreSQL database

1. Render dashboard → **New +** → **PostgreSQL**
2. Settings:
   - **Name:** `medizen-db`
   - **Database:** `medizen`
   - **User:** `medizen` (auto-filled is fine)
   - **Region:** Pick the one closest to your users (e.g. Singapore for BD)
   - **Plan:** Free is fine (90-day expiry, then $7/mo)
3. Click **Create Database**. Wait ~1 min until status is **Available**.
4. Open the database page, scroll to **Connections**, copy the
   **Internal Database URL**. It looks like:
   ```
   postgresql://medizen:xxxxx@dpg-yyy-internal.singapore-postgres.render.com/medizen
   ```
   Save this — you'll paste it into the backend's env vars in step 2.

> **Note:** Render gives you both an *external* and an *internal* URL.
> Always use the **internal** URL in services that live in the same Render
> region — it's faster and free of egress charges.

---

## 2. Deploy the backend (FastAPI)

1. Render dashboard → **New +** → **Web Service**
2. Connect your GitHub repo `tanvir-hannan-anik/MediZen`
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `medizen-api` |
   | **Region** | Same as the database |
   | **Branch** | `main` |
   | **Root Directory** | `medical-app/backend` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
   | **Plan** | Standard (recommended — see free-tier note above) |

4. Scroll to **Environment Variables**, add these (use the internal DB URL
   from step 1):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | *paste internal Postgres URL from step 1* |
   | `GROQ_API_KEY` | *your real key from local `.env`* |
   | `SECRET_KEY` | *new random 32+ char string for JWT signing* |
   | `ALGORITHM` | `HS256` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` |
   | `VECTOR_STORE_DIR` | `./vector_store` |
   | `PDF_PATH` | `../../gale-encyclopedia-of-medicine.-vol.-1.-2nd-ed.pdf` |
   | `PYTHON_VERSION` | `3.11.9` *(see note below)* |
   | `CORS_ORIGINS` | *leave blank for now — fill after step 3* |

   Generate `SECRET_KEY` with:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

5. Click **Create Web Service**. Render will:
   - Run `pip install` (~3-5 min, big deps)
   - Run uvicorn → first request triggers `lifespan` which creates tables,
     seeds 25k medicines from `medicines.csv`, downloads the embeddings
     model, and builds the FAISS vector store from the PDF.
   - **First cold start: 5-10 minutes.** Subsequent starts: ~30 sec.

6. Once status is **Live**, copy the service URL — something like
   `https://medizen-api.onrender.com`. You'll need it in step 3.

7. Verify it's up: visit `https://medizen-api.onrender.com/api/health`
   → should return `{"status":"ok","service":"MediZen"}`.

> **Python version:** Render defaults to 3.13. Some scientific packages
> (faiss-cpu, sentence-transformers) lag behind. The `PYTHON_VERSION=3.11.9`
> env var pins to a known-good version.

> **Tesseract OCR (optional):** Prescription OCR uses pytesseract which
> needs the system `tesseract` binary. Render's Python runtime doesn't
> ship it. If you need OCR, change the build command to:
> ```
> apt-get update && apt-get install -y tesseract-ocr && pip install -r requirements.txt
> ```
> Or skip — image/PDF analysis still works through Groq vision.

---

## 3. Deploy the frontend (Vite static site)

1. Render dashboard → **New +** → **Static Site**
2. Same GitHub repo
3. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `medizen-web` |
   | **Branch** | `main` |
   | **Root Directory** | `medical-app/frontend` |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |

4. Add environment variable:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://medizen-api.onrender.com` *(from step 2.6)* |

5. Click **Create Static Site**. Build takes ~2 min.
6. Once **Live**, you'll get a URL like `https://medizen-web.onrender.com`.

> **SPA routing:** [public/_redirects](medical-app/frontend/public/_redirects)
> is already in the repo — Render auto-applies it so deep links like
> `/blood-donor` don't 404 on refresh.

---

## 4. Wire up CORS

Now that the frontend is live, lock CORS down to it:

1. Go to your **`medizen-api`** service → **Environment** tab
2. Edit `CORS_ORIGINS` and set it to your frontend URL (no trailing slash):
   ```
   https://medizen-web.onrender.com
   ```
   (Comma-separate multiple, e.g. `https://medizen-web.onrender.com,https://medizen.com`)
3. Save → backend auto-restarts (~1 min).

---

## 5. Smoke test

Visit `https://medizen-web.onrender.com` and verify:

- [ ] Login / Register works (creates a row in `users` table)
- [ ] Disease Insight search returns AI response
- [ ] Medicine Store loads and search works
- [ ] Blood Donor page loads, you can register/search donors
- [ ] Nearby services renders the map
- [ ] Lab Report / Prescription / Image upload returns analysis
- [ ] Recent History shows the upload after refresh

If a request fails, the **Logs** tab on `medizen-api` shows the traceback.

---

## 6. Custom domain (optional)

1. On **`medizen-web`** → **Settings** → **Custom Domains** → **Add**
2. Enter `medizen.example.com`
3. Render shows a CNAME target — add it at your DNS provider
4. SSL is auto-provisioned (Let's Encrypt) within ~5 min
5. **Don't forget:** add the new domain to `CORS_ORIGINS` on `medizen-api`

---

## 7. Auto-deploy

Render auto-deploys on every push to `main` for both services. To pause:

- Service → **Settings** → **Build & Deploy** → **Auto-Deploy: No**

To trigger a manual deploy: service → **Manual Deploy** → **Deploy latest commit**.

---

## 8. Cost summary

| Service | Free | Recommended |
|---------|------|-------------|
| Postgres | Free (90 days) | $7/mo (after expiry) |
| Backend Web Service | Free (cold-starts after 15 min idle, OOM risk) | Standard $25/mo |
| Frontend Static Site | Free (unlimited) | Free (unlimited) |
| **Total** | **$0** (first 90 days, with caveats) | **~$32/mo** |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `psycopg2` install fails | Wrong Python version | Set `PYTHON_VERSION=3.11.9` |
| Backend OOMs at startup | Free/Starter RAM too small | Upgrade to Standard, or comment out RAG init in `main.py` `lifespan` |
| Frontend shows blank page | `VITE_API_URL` not set at build time | Add env var, click **Manual Deploy** |
| `CORS error` in browser console | `CORS_ORIGINS` doesn't include frontend URL | Add it, save, wait for restart |
| 404 on page refresh | `_redirects` file missing | Verify `medical-app/frontend/public/_redirects` exists in commit |
| `medicines: 0 rows` after deploy | `medicines.csv` not in `data/` | Confirm `medical-app/backend/data/medicines.csv` is in the repo (it is) |
| Slow first request | Cold start (free tier sleeps after 15 min) | Upgrade plan, or use a cron pinger |
| Maps tiles missing | None — Leaflet uses public OpenStreetMap | N/A |

---

## What changed in your code for deployment

These three production-readiness fixes were applied in the same commit
that added this guide:

1. **[main.py](medical-app/backend/main.py)** — `CORS_ORIGINS` now read
   from env var (was hardcoded localhost).
2. **[main.py](medical-app/backend/main.py) `seed_medicines()`** — now
   reads `medicines.csv` if `medicines.json` is missing (the JSON file is
   gitignored; the CSV is committed).
3. **[client.js](medical-app/frontend/src/api/client.js)** — axios
   `baseURL` now uses `VITE_API_URL` env var in production, falls back to
   `/api` in dev (Vite proxy).
4. **[public/_redirects](medical-app/frontend/public/_redirects)** —
   created so Render serves `index.html` for SPA routes.

After committing and pushing these changes, Render auto-deploys the
update on both services.
