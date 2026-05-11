from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.database import get_db
from models.models import DonorProfile, User
from routers.auth import get_current_user

router = APIRouter()

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class DonorRegister(BaseModel):
    blood_group: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class DonorUpdate(BaseModel):
    available: Optional[bool] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    last_donation: Optional[str] = None


@router.get("")
def search_donors(
    blood_group: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    available_only: bool = Query(True),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(DonorProfile)
    if blood_group:
        q = q.filter(DonorProfile.blood_group == blood_group)
    if available_only:
        q = q.filter(DonorProfile.available == True)
    if location:
        q = q.filter(DonorProfile.location.ilike(f"%{location}%"))
    donors = q.limit(limit).all()

    return [_donor_dict(d) for d in donors]


@router.post("/register")
def register_donor(
    req: DonorRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.blood_group not in BLOOD_GROUPS:
        raise HTTPException(status_code=400, detail=f"Invalid blood group. Must be one of: {BLOOD_GROUPS}")

    existing = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if existing:
        # Update
        existing.blood_group = req.blood_group
        existing.location = req.location
        existing.latitude = req.latitude
        existing.longitude = req.longitude
        existing.phone = req.phone or current_user.phone
        existing.notes = req.notes
        existing.available = True
        current_user.is_donor = True
        db.commit()
        db.refresh(existing)
        return _donor_dict(existing)

    profile = DonorProfile(
        user_id=current_user.id,
        blood_group=req.blood_group,
        location=req.location,
        latitude=req.latitude,
        longitude=req.longitude,
        phone=req.phone or current_user.phone,
        notes=req.notes,
        available=True,
    )
    db.add(profile)
    current_user.is_donor = True
    current_user.blood_group = req.blood_group
    db.commit()
    db.refresh(profile)
    return _donor_dict(profile)


@router.get("/me")
def my_donor_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No donor profile found")
    return _donor_dict(profile)


@router.put("/me")
def update_donor(
    req: DonorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No donor profile found")
    if req.available is not None:
        profile.available = req.available
    if req.location:
        profile.location = req.location
    if req.phone:
        profile.phone = req.phone
    if req.notes is not None:
        profile.notes = req.notes
    if req.last_donation:
        try:
            profile.last_donation = datetime.fromisoformat(req.last_donation)
            profile.donations_count += 1
        except ValueError:
            pass
    db.commit()
    db.refresh(profile)
    return _donor_dict(profile)


@router.get("/{donor_id}")
def get_donor(donor_id: int, db: Session = Depends(get_db)):
    profile = db.query(DonorProfile).filter(DonorProfile.id == donor_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Donor not found")
    return _donor_dict(profile)


def _donor_dict(d: DonorProfile) -> dict:
    return {
        "id": d.id,
        "user_id": d.user_id,
        "name": d.user.name if d.user else "Anonymous",
        "blood_group": d.blood_group,
        "location": d.location,
        "latitude": d.latitude,
        "longitude": d.longitude,
        "phone": d.phone,
        "available": d.available,
        "donations_count": d.donations_count,
        "last_donation": d.last_donation.isoformat() if d.last_donation else None,
        "notes": d.notes,
    }
