from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import require_role
from app.models.models import FAQ, User
from app.schemas.schemas import FAQCreate, FAQOut

router = APIRouter(prefix="/faqs", tags=["FAQ"])

@router.get("/", response_model=List[FAQOut])
def get_faqs(category: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieves published FAQ items with search and category filtering."""
    query = db.query(FAQ).filter(FAQ.is_published == True)
    if category:
        query = query.filter(FAQ.category == category)
    if search:
        query = query.filter(
            (FAQ.question.ilike(f"%{search}%")) | (FAQ.answer.ilike(f"%{search}%"))
        )
    return query.order_by(FAQ.id.asc()).all()

@router.post("/", response_model=FAQOut)
def create_faq(
    faq_in: FAQCreate,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to create an FAQ item."""
    faq = FAQ(**faq_in.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@router.put("/{faq_id}", response_model=FAQOut)
def update_faq(
    faq_id: int,
    faq_in: FAQCreate,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to edit an existing FAQ item."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found.")
    for key, value in faq_in.model_dump().items():
        setattr(faq, key, value)
    db.commit()
    db.refresh(faq)
    return faq

@router.delete("/{faq_id}")
def delete_faq(
    faq_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Admin endpoint to delete an FAQ item."""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found.")
    db.delete(faq)
    db.commit()
    return {"message": "FAQ deleted successfully."}
