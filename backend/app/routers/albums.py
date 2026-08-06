"""Albums router — public read, owner-only write."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_owner

router = APIRouter()


class AlbumCreate(BaseModel):
    home_name: str = Field(..., min_length=1, max_length=200)
    visit_date: str  # ISO date string YYYY-MM-DD
    description: str | None = None
    cover_photo_url: str | None = None


class AlbumUpdate(BaseModel):
    home_name: str | None = None
    visit_date: str | None = None
    description: str | None = None
    cover_photo_url: str | None = None


class PhotoAdd(BaseModel):
    photo_url: str
    caption: str | None = None


@router.get("")
async def list_albums():
    """Public: list all albums ordered by visit_date desc."""
    db = get_supabase()
    resp = db.table("albums").select("*").order("visit_date", desc=True).execute()
    return resp.data or []


@router.get("/{album_id}")
async def get_album(album_id: str):
    """Public: get a single album with its photos."""
    db = get_supabase()
    album_resp = db.table("albums").select("*").eq("id", album_id).single().execute()
    if not album_resp.data:
        raise HTTPException(status_code=404, detail="Album not found")
    photos_resp = db.table("album_photos").select("*").eq("album_id", album_id).execute()
    album = album_resp.data
    album["photos"] = photos_resp.data or []
    return album


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_album(
    payload: AlbumCreate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: create a new album."""
    db = get_supabase()
    resp = db.table("albums").insert(payload.model_dump()).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create album")
    return resp.data[0]


@router.put("/{album_id}")
async def update_album(
    album_id: str,
    payload: AlbumUpdate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: update an album."""
    db = get_supabase()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = db.table("albums").update(update_data).eq("id", album_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Album not found")
    return resp.data[0]


@router.delete("/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_album(
    album_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: delete an album (cascades to photos)."""
    db = get_supabase()
    db.table("albums").delete().eq("id", album_id).execute()


@router.post("/{album_id}/photos", status_code=status.HTTP_201_CREATED)
async def add_photo(
    album_id: str,
    payload: PhotoAdd,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: add a photo to an album."""
    db = get_supabase()
    resp = db.table("album_photos").insert({
        "album_id": album_id,
        "photo_url": payload.photo_url,
        "caption": payload.caption,
    }).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to add photo")
    return resp.data[0]


@router.delete("/{album_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    album_id: str,
    photo_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: remove a photo from an album."""
    db = get_supabase()
    db.table("album_photos").delete().eq("id", photo_id).eq("album_id", album_id).execute()


@router.post("/upload-url")
async def get_photo_upload_url(
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: get a signed upload URL for album photos."""
    import uuid
    db = get_supabase()
    path = f"{uuid.uuid4()}.jpg"
    signed = db.storage.from_("album-photos").create_signed_upload_url(path)
    return {"signed_url": signed.get("signedUrl"), "path": path}
