"""Members router — public read, owner-only write."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_owner

router = APIRouter()


class MemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    role: str = Field(..., min_length=1, max_length=100)
    bio: str | None = None
    photo_url: str | None = None
    display_order: int = Field(default=0)


class MemberUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    display_order: int | None = None


@router.get("")
@router.get("/")
async def list_members():
    """Public: list all members ordered by display_order."""
    db = get_supabase()
    resp = db.table("members").select("*").order("display_order").execute()
    return resp.data or []


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_member(
    payload: MemberCreate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: create a new member."""
    db = get_supabase()
    resp = db.table("members").insert(payload.model_dump()).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create member")
    return resp.data[0]


@router.put("/{member_id}")
@router.patch("/{member_id}")
async def update_member(
    member_id: str,
    payload: MemberUpdate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: update a member."""
    db = get_supabase()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = db.table("members").update(update_data).eq("id", member_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Member not found")
    return resp.data[0]


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: delete a member."""
    db = get_supabase()
    db.table("members").delete().eq("id", member_id).execute()


@router.post("/upload-url")
async def get_member_photo_upload_url(
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: get a signed upload URL for member photos."""
    import uuid
    db = get_supabase()
    path = f"{uuid.uuid4()}.jpg"
    signed = db.storage.from_("member-photos").create_signed_upload_url(path)
    return {"signed_url": signed.get("signedUrl"), "path": path}
