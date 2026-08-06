"""Audit documents router."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_audit_or_owner, require_owner

router = APIRouter()


class AuditDocCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: str | None = None
    file_url: str = Field(..., min_length=1)


@router.get("")
async def list_audit_docs():
    """Public: list all audit documents."""
    db = get_supabase()
    resp = db.table("audit_docs").select("*").order("uploaded_at", desc=True).execute()
    return resp.data or []


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_audit_doc(
    payload: AuditDocCreate,
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Audit or owner: create a new audit document record."""
    db = get_supabase()
    resp = db.table("audit_docs").insert({
        "title": payload.title,
        "description": payload.description,
        "file_url": payload.file_url,
        "uploaded_by": admin.email,
    }).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create audit document")
    return resp.data[0]


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_audit_doc(
    doc_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: delete an audit document."""
    db = get_supabase()
    db.table("audit_docs").delete().eq("id", doc_id).execute()


@router.post("/upload-url")
async def get_audit_upload_url(
    admin: Annotated[AdminUser, Depends(require_audit_or_owner)],
):
    """Audit or owner: get a signed upload URL for audit documents."""
    import uuid
    db = get_supabase()
    path = f"{uuid.uuid4()}.pdf"
    signed = db.storage.from_("audit-docs").create_signed_upload_url(path)
    return {"signed_url": signed.get("signedUrl"), "path": path}
