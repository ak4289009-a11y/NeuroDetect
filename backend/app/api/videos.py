from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import require_role
from app.models.models import Video, User
from app.schemas.schemas import VideoCreate, VideoOut

router = APIRouter(prefix="/videos", tags=["Educational Videos"])

@router.get("/", response_model=List[VideoOut])
def get_videos(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves educational video resources, optionally filtered by category."""
    query = db.query(Video)
    if category:
        query = query.filter(Video.category == category)
    return query.order_by(Video.id.desc()).all()

@router.post("/", response_model=VideoOut)
def create_video(
    video_in: VideoCreate,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to publish educational video content."""
    video = Video(**video_in.model_dump())
    db.add(video)
    db.commit()
    db.refresh(video)
    return video

@router.delete("/{video_id}")
def delete_video(
    video_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to remove an educational video."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video resource not found.")
    db.delete(video)
    db.commit()
    return {"message": "Video resource deleted."}
