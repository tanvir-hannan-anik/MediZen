import os
import uuid
import json
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db
from models.models import UploadRecord, User
from routers.auth import get_current_user
from services.ocr_service import analyze_medical_image, analyze_prescription, analyze_lab_report

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
ALLOWED_IMAGE = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_DOCS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_SIZE = 20 * 1024 * 1024  # 20 MB


async def save_upload(file: UploadFile) -> tuple[str, str]:
    """Save uploaded file and return (file_path, filename)."""
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "upload")[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOADS_DIR, unique_name)
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")
    with open(path, "wb") as f:
        f.write(content)
    return path, unique_name


@router.post("/image")
async def analyze_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE:
        raise HTTPException(status_code=400, detail="Only image files allowed (JPG, PNG, GIF, WEBP)")

    file_path, filename = await save_upload(file)
    result = analyze_medical_image(file_path)

    record = UploadRecord(
        user_id=current_user.id,
        upload_type="image",
        filename=file.filename or filename,
        file_path=filename,
        analysis_result=json.dumps(result),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "upload_id": record.id,
        "filename": file.filename,
        "file_url": f"/uploads/{filename}",
        "analysis": result,
    }


@router.post("/prescription")
async def analyze_prescription_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_DOCS:
        raise HTTPException(status_code=400, detail="Only PDF or image files allowed")

    file_path, filename = await save_upload(file)
    is_pdf = ext == ".pdf"
    result = analyze_prescription(file_path, is_pdf=is_pdf)

    record = UploadRecord(
        user_id=current_user.id,
        upload_type="prescription",
        filename=file.filename or filename,
        file_path=filename,
        analysis_result=json.dumps(result),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "upload_id": record.id,
        "filename": file.filename,
        "file_url": f"/uploads/{filename}",
        "analysis": result,
    }


@router.post("/report")
async def analyze_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_DOCS:
        raise HTTPException(status_code=400, detail="Only PDF or image files allowed")

    file_path, filename = await save_upload(file)
    is_pdf = ext == ".pdf"
    result = analyze_lab_report(file_path, is_pdf=is_pdf)

    record = UploadRecord(
        user_id=current_user.id,
        upload_type="report",
        filename=file.filename or filename,
        file_path=filename,
        analysis_result=json.dumps(result),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "upload_id": record.id,
        "filename": file.filename,
        "file_url": f"/uploads/{filename}",
        "analysis": result,
    }


@router.get("/history")
def upload_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = (
        db.query(UploadRecord)
        .filter(UploadRecord.user_id == current_user.id)
        .order_by(UploadRecord.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "type": r.upload_type,
            "filename": r.filename,
            "file_url": f"/uploads/{r.file_path}",
            "created_at": r.created_at.isoformat(),
        }
        for r in records
    ]


@router.get("/history/{upload_id}")
def get_upload(upload_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(UploadRecord).filter(
        UploadRecord.id == upload_id, UploadRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Upload not found")
    return {
        "id": record.id,
        "type": record.upload_type,
        "filename": record.filename,
        "file_url": f"/uploads/{record.file_path}",
        "analysis": json.loads(record.analysis_result) if record.analysis_result else None,
        "created_at": record.created_at.isoformat(),
    }


@router.delete("/history/{upload_id}")
def delete_upload(upload_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(UploadRecord).filter(
        UploadRecord.id == upload_id, UploadRecord.user_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Upload not found")
    # Best-effort file removal; ignore if already gone
    try:
        path = os.path.join(UPLOADS_DIR, record.file_path)
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass
    db.delete(record)
    db.commit()
    return {"ok": True, "id": upload_id}


@router.delete("/history")
def clear_upload_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = db.query(UploadRecord).filter(UploadRecord.user_id == current_user.id).all()
    for r in records:
        try:
            path = os.path.join(UPLOADS_DIR, r.file_path)
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            pass
        db.delete(r)
    db.commit()
    return {"ok": True, "deleted": len(records)}
