from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os

from models.database import get_db
from models.models import ChatSession, ChatMessage, User
from services.rag_service import rag_service

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production-xyz")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

oauth2_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_optional_user(token: Optional[str] = Depends(oauth2_optional), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            return None
        return db.query(User).filter(User.id == int(sub)).first()
    except JWTError:
        return None


def get_current_user_required(token: Optional[str] = Depends(oauth2_optional), db: Session = Depends(get_db)) -> User:
    user = get_optional_user(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


class MessageRequest(BaseModel):
    content: str
    session_id: Optional[int] = None


class SessionCreate(BaseModel):
    title: Optional[str] = "New conversation"


# ── Public chat (no auth, no history) ─────────────────────────────────────────

@router.post("/public")
async def public_message(req: MessageRequest):
    result = await rag_service.answer(req.content)
    return {
        "session_id": None,
        "answer": result["answer"],
        "confidence": result.get("confidence", "Medium"),
        "sources_found": result.get("sources_found", 0),
        "disclaimer": result.get("disclaimer", ""),
    }


# ── Authenticated chat (with history) ─────────────────────────────────────────

@router.get("/sessions")
def get_sessions(current_user: User = Depends(get_current_user_required), db: Session = Depends(get_db)):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .limit(20)
        .all()
    )
    return [{"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()} for s in sessions]


@router.post("/sessions")
def create_session(req: SessionCreate, current_user: User = Depends(get_current_user_required), db: Session = Depends(get_db)):
    session = ChatSession(user_id=current_user.id, title=req.title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "title": session.title, "created_at": session.created_at.isoformat()}


@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: int, current_user: User = Depends(get_current_user_required), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in session.messages]


@router.post("/message")
async def send_message(req: MessageRequest, current_user: User = Depends(get_current_user_required), db: Session = Depends(get_db)):
    if req.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == req.session_id, ChatSession.user_id == current_user.id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        title = req.content[:50] + ("..." if len(req.content) > 50 else "")
        session = ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        db.commit()
        db.refresh(session)

    user_msg = ChatMessage(session_id=session.id, role="user", content=req.content)
    db.add(user_msg)
    db.commit()

    history = [{"role": m.role, "content": m.content} for m in session.messages[:-1]]
    result = await rag_service.answer(req.content, history)
    answer_text = result["answer"]

    ai_msg = ChatMessage(session_id=session.id, role="assistant", content=answer_text)
    db.add(ai_msg)
    db.commit()

    return {
        "session_id": session.id,
        "answer": answer_text,
        "confidence": result.get("confidence", "Medium"),
        "sources_found": result.get("sources_found", 0),
        "disclaimer": result.get("disclaimer", ""),
    }


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, current_user: User = Depends(get_current_user_required), db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"ok": True}
