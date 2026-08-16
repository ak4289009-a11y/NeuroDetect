from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import require_role
from app.models.models import Diet, User
from app.schemas.schemas import DietCreate, DietOut

router = APIRouter(prefix="/diet", tags=["Diet Recommendations"])

@router.get("/", response_model=List[DietOut])
def get_all_diets(db: Session = Depends(get_db)):
    """Retrieves diet guidelines for all tumor categories."""
    return db.query(Diet).all()

@router.get("/{tumor_type}", response_model=DietOut)
def get_diet_by_tumor_type(tumor_type: str, db: Session = Depends(get_db)):
    """Retrieves specific diet recommendations for a tumor classification."""
    diet = db.query(Diet).filter(Diet.tumor_type.ilike(f"%{tumor_type}%")).first()
    if not diet:
        # Default fallback recommendation for general wellness
        diet = db.query(Diet).filter(Diet.tumor_type == "No Tumor").first()
    if not diet:
        raise HTTPException(status_code=404, detail="Diet plan not found for specified tumor type.")
    return diet

@router.post("/", response_model=DietOut)
def create_or_update_diet(
    diet_in: DietCreate,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to add or update tumor diet recommendations."""
    existing = db.query(Diet).filter(Diet.tumor_type == diet_in.tumor_type).first()
    if existing:
        existing.foods_to_eat = diet_in.foods_to_eat
        existing.foods_to_avoid = diet_in.foods_to_avoid
        existing.water_intake = diet_in.water_intake
        existing.lifestyle_tips = diet_in.lifestyle_tips
        diet_obj = existing
    else:
        diet_obj = Diet(**diet_in.model_dump())
        db.add(diet_obj)
    db.commit()
    db.refresh(diet_obj)
    return diet_obj
