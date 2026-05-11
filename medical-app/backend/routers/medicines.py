from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from models.database import get_db
from models.models import Medicine
from services import medicine_service

router = APIRouter()


@router.get("")
def search_medicines(
    q: str = Query(default="", description="Search brand or generic name"),
    dosage_form: str = Query(default="", description="Filter by dosage form"),
    manufacturer: str = Query(default="", description="Filter by manufacturer"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Medicine)

    if q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Medicine.brand_name.ilike(term),
                Medicine.generic_name.ilike(term),
            )
        )

    if dosage_form.strip():
        query = query.filter(Medicine.dosage_form.ilike(f"%{dosage_form.strip()}%"))

    if manufacturer.strip():
        query = query.filter(Medicine.manufacturer.ilike(f"%{manufacturer.strip()}%"))

    total = query.count()
    items = (
        query.order_by(Medicine.brand_name)
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id": m.id,
                "brand_name": m.brand_name,
                "strength": m.strength,
                "generic_name": m.generic_name,
                "manufacturer": m.manufacturer,
                "dosage_form": m.dosage_form,
                "url": m.url,
            }
            for m in items
        ],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
        "limit": limit,
    }


@router.get("/dosage-forms")
def get_dosage_forms(db: Session = Depends(get_db)):
    rows = (
        db.query(Medicine.dosage_form, func.count(Medicine.id).label("count"))
        .filter(Medicine.dosage_form != None, Medicine.dosage_form != "")
        .group_by(Medicine.dosage_form)
        .order_by(func.count(Medicine.id).desc())
        .limit(20)
        .all()
    )
    return [{"form": r.dosage_form, "count": r.count} for r in rows]


@router.get("/lookup")
def lookup_medicine(q: str = Query(..., description="Medicine brand or generic name to look up")):
    """
    Look up a medicine in medicines.csv (the single source of truth).
    Returns verified name, strength, purpose, diseases, and dosage form.
    """
    results = medicine_service.search(q, limit=5)
    if not results:
        return {
            "found": False,
            "query": q,
            "results": [],
            "disclaimer": "Medicine not found in our verified database. Always consult a pharmacist or physician.",
        }
    return {
        "found": True,
        "query": q,
        "results": results,
        "source": "medicines.csv",
        "disclaimer": "Information sourced from our verified medicines database.",
    }


@router.get("/info/{brand_name}")
def medicine_info(brand_name: str):
    """
    Get detailed verified information for a specific medicine brand name.
    Source of truth: medicines.csv
    """
    row = medicine_service.lookup(brand_name)
    if not row:
        return {
            "found": False,
            "brand_name": brand_name,
            "disclaimer": "Medicine not found in our verified database. Consult a pharmacist.",
        }
    return {
        "found": True,
        "brand_name": row.get("brand_name"),
        "generic_name": row.get("generic_name"),
        "strength": row.get("strength"),
        "dosage_form": row.get("dosage_form"),
        "manufacturer": row.get("manufacturer"),
        "purpose": row.get("purpose"),
        "diseases": row.get("diseases", []),
        "url": row.get("url"),
        "source": "medicines.csv",
        "disclaimer": "Information sourced from our verified medicines database.",
    }
