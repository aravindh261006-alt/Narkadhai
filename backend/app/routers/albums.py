"""Albums router — public read, owner-only write."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_owner

logger = logging.getLogger(__name__)
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
@router.get("/")
async def list_albums():
    """Public: list all albums ordered by visit_date desc."""
    try:
        db = get_supabase()
        resp = db.table("albums").select("*").order("visit_date", desc=True).execute()
        return resp.data or []
    except Exception as e:
        logger.error("Failed to list albums: %s", e, exc_info=True)
        return []


@router.get("/{album_id}")
async def get_album(album_id: str):
    """Public: get a single album with its photos."""
    try:
        db = get_supabase()
        album_resp = db.table("albums").select("*").eq("id", album_id).single().execute()
        if not album_resp.data:
            raise HTTPException(status_code=404, detail="Album not found")
        photos_resp = db.table("album_photos").select("*").eq("album_id", album_id).execute()
        album = album_resp.data
        album["photos"] = photos_resp.data or []
        return album
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving album %s: %s", album_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch album: {str(e)}")


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_album(
    payload: AlbumCreate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: create a new album."""
    try:
        db = get_supabase()
        logger.info("Admin %s creating album for home: %s", admin.email, payload.home_name)
        resp = db.table("albums").insert(payload.model_dump()).execute()
        if not resp.data:
            logger.error("Album insert returned no data")
            raise HTTPException(status_code=500, detail="Database returned no record on album create.")
        logger.info("Album created successfully with ID: %s", resp.data[0].get("id"))
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating album: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create album: {str(e)}")


@router.put("/{album_id}")
@router.patch("/{album_id}")
async def update_album(
    album_id: str,
    payload: AlbumUpdate,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: update an album."""
    try:
        db = get_supabase()
        update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        logger.info("Admin %s updating album %s with fields: %s", admin.email, album_id, list(update_data.keys()))
        resp = db.table("albums").update(update_data).eq("id", album_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Album not found or could not be updated")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating album %s: %s", album_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update album: {str(e)}")


@router.delete("/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_album(
    album_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: delete an album (cascades to photos)."""
    try:
        db = get_supabase()
        logger.info("Admin %s deleting album %s", admin.email, album_id)
        db.table("albums").delete().eq("id", album_id).execute()
    except Exception as e:
        logger.error("Error deleting album %s: %s", album_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete album: {str(e)}")


@router.post("/{album_id}/photos", status_code=status.HTTP_201_CREATED)
@router.post("/{album_id}/photos/", status_code=status.HTTP_201_CREATED)
async def add_photo(
    album_id: str,
    payload: PhotoAdd,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: add a photo to an album."""
    try:
        db = get_supabase()
        logger.info("Admin %s adding photo to album %s", admin.email, album_id)
        resp = db.table("album_photos").insert({
            "album_id": album_id,
            "photo_url": payload.photo_url,
            "caption": payload.caption,
        }).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Database returned no record on photo add.")

        # If album has no cover photo, set this photo as cover
        try:
            album = db.table("albums").select("cover_photo_url").eq("id", album_id).single().execute()
            if album.data and not album.data.get("cover_photo_url"):
                db.table("albums").update({"cover_photo_url": payload.photo_url}).eq("id", album_id).execute()
        except Exception as e:
            logger.warning("Could not auto-set cover photo for album %s: %s", album_id, e)

        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error adding photo to album %s: %s", album_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add photo: {str(e)}")


@router.delete("/{album_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    album_id: str,
    photo_id: str,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: remove a photo from an album."""
    try:
        db = get_supabase()
        logger.info("Admin %s removing photo %s from album %s", admin.email, photo_id, album_id)
        db.table("album_photos").delete().eq("id", photo_id).eq("album_id", album_id).execute()
    except Exception as e:
        logger.error("Error deleting photo %s: %s", photo_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete photo: {str(e)}")


@router.post("/upload-url")
async def get_photo_upload_url(
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: get a signed upload URL for album photos."""
    try:
        import uuid
        db = get_supabase()
        path = f"{uuid.uuid4()}.jpg"
        signed = db.storage.from_("album-photos").create_signed_upload_url(path)
        return {"signed_url": signed.get("signedUrl"), "path": path}
    except Exception as e:
        logger.error("Error getting signed upload URL for album photo: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate upload URL: {str(e)}")
