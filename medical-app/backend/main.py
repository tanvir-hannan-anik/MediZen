import os
import traceback
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()  # must run before service imports read os.getenv at module level

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from models.database import engine, Base, SessionLocal
from routers import auth, chat, upload, donors, nearby, medicines

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def seed_medicines():
    import csv, json
    from models.models import Medicine

    json_file = os.path.join(DATA_DIR, "medicines.json")
    csv_file  = os.path.join(DATA_DIR, "medicines.csv")

    db = SessionLocal()
    try:
        if db.query(Medicine).count() > 0:
            print(f"[seed] Medicines already seeded ({db.query(Medicine).count()} rows), skipping")
            return

        if os.path.isfile(json_file):
            print("[seed] Loading medicines from medicines.json …")
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)
        elif os.path.isfile(csv_file):
            print("[seed] Loading medicines from medicines.csv …")
            with open(csv_file, encoding="utf-8", newline="") as f:
                data = list(csv.DictReader(f))
        else:
            print("[seed] No medicines.json or medicines.csv found, skipping medicine import")
            return

        batch_size = 500
        for i in range(0, len(data), batch_size):
            batch = data[i : i + batch_size]
            db.bulk_insert_mappings(Medicine, [
                {
                    "brand_name": m.get("brand_name", ""),
                    "strength": m.get("strength", ""),
                    "generic_name": m.get("generic_name", ""),
                    "manufacturer": m.get("manufacturer", ""),
                    "dosage_form": m.get("dosage_form", ""),
                    "url": m.get("url", ""),
                }
                for m in batch
            ])
            db.commit()
            print(f"[seed]   {min(i + batch_size, len(data))}/{len(data)} medicines inserted")

        print(f"[seed] Done — {len(data)} medicines seeded.")
    except Exception as e:
        db.rollback()
        print(f"[seed] Medicine seeding failed: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_medicines()
    # Pre-warm the medicine CSV service (loads ~50K medicines into memory)
    from services import medicine_service
    medicine_service._load()
    from services.rag_service import rag_service
    await rag_service.initialize()
    yield


app = FastAPI(title="MediZen API", version="1.0.0", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"[ERROR] {request.url}\n{tb}")
    return JSONResponse(status_code=500, content={"detail": str(exc), "traceback": tb})


_default_origins = "http://localhost:5173,http://localhost:3000,http://localhost:8001"
_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(upload.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(donors.router, prefix="/api/donors", tags=["donors"])
app.include_router(nearby.router, prefix="/api/nearby", tags=["nearby"])
app.include_router(medicines.router, prefix="/api/medicines", tags=["medicines"])

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Serve built frontend if dist exists
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MediZen"}


# Catch-all: serve React index.html for any non-API route (SPA routing)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    index = os.path.join(FRONTEND_DIST, "index.html")
    static_file = os.path.join(FRONTEND_DIST, full_path)
    if full_path and os.path.isfile(static_file):
        return FileResponse(static_file)
    if os.path.isfile(index):
        return FileResponse(index)
    return JSONResponse(status_code=404, content={"detail": "Not found"})
