"""Albums router — public read, owner-only write."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
import time

from app.db import get_supabase
from app.services.auth_service import AdminUser, require_owner

logger = logging.getLogger(__name__)
router = APIRouter()

# Server-side cache for album list
_albums_cache = {"data": None, "timestamp": 0}
ALBUMS_CACHE_TTL = 120  # 2 minutes in seconds

def invalidate_albums_cache():
    _albums_cache["data"] = None
    _albums_cache["timestamp"] = 0


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
    media_type: str = "image"
    display_order: int | None = None


class PhotoOrderItem(BaseModel):
    photo_id: str
    display_order: int


class ReorderPhotosPayload(BaseModel):
    photos: list[PhotoOrderItem]


@router.get("")
@router.get("/")
async def list_albums(response: Response):
    """Public: list all albums ordered by visit_date desc.
    Optimized: only fetch id, home_name, visit_date, description, cover_photo_url with 2 min caching.
    """
    response.headers["Cache-Control"] = "public, max-age=120"
    now = time.time()
    if _albums_cache["data"] is not None and (now - _albums_cache["timestamp"]) < ALBUMS_CACHE_TTL:
        return _albums_cache["data"]

    try:
        db = get_supabase()
        resp = (
            db.table("albums")
            .select("id, home_name, visit_date, description, cover_photo_url")
            .order("visit_date", desc=True)
            .execute()
        )
        data = resp.data or []
        _albums_cache["data"] = data
        _albums_cache["timestamp"] = now
        return data
    except Exception as e:
        logger.error("Failed to list albums: %s", e, exc_info=True)
        return _albums_cache["data"] or []


@router.get("/{album_id}")
async def get_album(album_id: str):
    """Public: get a single album with its photos sorted by display_order."""
    try:
        db = get_supabase()
        album_resp = db.table("albums").select("*").eq("id", album_id).single().execute()
        if not album_resp.data:
            raise HTTPException(status_code=404, detail="Album not found")
        try:
            photos_resp = (
                db.table("album_photos")
                .select("*")
                .eq("album_id", album_id)
                .order("display_order", desc=False)
                .order("created_at", desc=False)
                .execute()
            )
        except Exception as query_err:
            logger.warning("Ordering by display_order failed (column may not exist yet): %s", query_err)
            photos_resp = db.table("album_photos").select("*").eq("album_id", album_id).execute()
        album = album_resp.data
        photos = photos_resp.data or []
        photos.sort(key=lambda p: (p.get("display_order") if p.get("display_order") is not None else 0, p.get("created_at") or ""))
        album["photos"] = photos
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
        invalidate_albums_cache()
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
        invalidate_albums_cache()
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
        invalidate_albums_cache()
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

        display_order = payload.display_order
        if display_order is None:
            try:
                cnt_resp = db.table("album_photos").select("id", count="exact").eq("album_id", album_id).execute()
                display_order = cnt_resp.count or 0
            except Exception:
                display_order = 0

        insert_data = {
            "album_id": album_id,
            "photo_url": payload.photo_url,
            "caption": payload.caption,
            "media_type": payload.media_type or "image",
            "display_order": display_order,
        }
        try:
            resp = db.table("album_photos").insert(insert_data).execute()
        except Exception as insert_err:
            err_str = str(insert_err)
            if "media_type" in err_str or "display_order" in err_str:
                logger.warning("media_type or display_order column may not exist yet in album_photos. Falling back: %s", insert_err)
                fallback_data = {k: v for k, v in insert_data.items() if k not in ("media_type", "display_order")}
                if "media_type" not in err_str:
                    fallback_data["media_type"] = insert_data["media_type"]
                if "display_order" not in err_str:
                    fallback_data["display_order"] = insert_data["display_order"]
                resp = db.table("album_photos").insert(fallback_data).execute()
            else:
                raise

        if not resp.data:
            raise HTTPException(status_code=500, detail="Database returned no record on photo add.")

        # If album has no cover photo and this is an image, set this photo as cover
        if (payload.media_type or "image") == "image":
            try:
                album = db.table("albums").select("cover_photo_url").eq("id", album_id).single().execute()
                if album.data and not album.data.get("cover_photo_url"):
                    db.table("albums").update({"cover_photo_url": payload.photo_url}).eq("id", album_id).execute()
            except Exception as e:
                logger.warning("Could not auto-set cover photo for album %s: %s", album_id, e)

        invalidate_albums_cache()
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
    """Owner only: remove a photo from an album and update cover if needed."""
    try:
        db = get_supabase()
        logger.info("Admin %s removing photo %s from album %s", admin.email, photo_id, album_id)

        # 1. Fetch photo details to check if its URL matches album cover
        photo_url_to_delete = None
        try:
            p_resp = db.table("album_photos").select("photo_url").eq("id", photo_id).eq("album_id", album_id).single().execute()
            if p_resp.data:
                photo_url_to_delete = p_resp.data.get("photo_url")
        except Exception as p_err:
            logger.warning("Could not fetch photo %s before deletion: %s", photo_id, p_err)

        # 2. Fetch current album cover photo URL
        album_cover = None
        try:
            a_resp = db.table("albums").select("cover_photo_url").eq("id", album_id).single().execute()
            if a_resp.data:
                album_cover = a_resp.data.get("cover_photo_url")
        except Exception as a_err:
            logger.warning("Could not fetch album %s cover before photo deletion: %s", album_id, a_err)

        # 3. Delete the photo from album_photos
        db.table("album_photos").delete().eq("id", photo_id).eq("album_id", album_id).execute()

        # 4. If deleted photo was the cover, pick the next photo or set to None
        if photo_url_to_delete and album_cover and photo_url_to_delete == album_cover:
            try:
                rem_resp = (
                    db.table("album_photos")
                    .select("photo_url, media_type")
                    .eq("album_id", album_id)
                    .order("created_at", desc=False)
                    .execute()
                )
                remaining = rem_resp.data or []
                # Prefer an image for cover photo if available, otherwise take first media item
                next_cover = None
                for item in remaining:
                    if item.get("media_type") != "video":
                        next_cover = item.get("photo_url")
                        break
                if not next_cover and remaining:
                    next_cover = remaining[0].get("photo_url")

                db.table("albums").update({"cover_photo_url": next_cover}).eq("id", album_id).execute()
                logger.info(
                    "Photo %s was cover for album %s. Auto-updated cover to: %s",
                    photo_id,
                    album_id,
                    next_cover,
                )
            except Exception as update_err:
                logger.warning("Failed to auto-update album cover after photo deletion: %s", update_err)

        invalidate_albums_cache()
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


@router.put("/{album_id}/photos/reorder")
@router.patch("/{album_id}/photos/reorder")
async def reorder_photos(
    album_id: str,
    payload: ReorderPhotosPayload,
    admin: Annotated[AdminUser, Depends(require_owner)],
):
    """Owner only: update display_order for photos inside an album."""
    try:
        db = get_supabase()
        logger.info("Admin %s reordering %d photos in album %s", admin.email, len(payload.photos), album_id)
        updated = 0
        for item in payload.photos:
            try:
                up_resp = (
                    db.table("album_photos")
                    .update({"display_order": item.display_order})
                    .eq("id", item.photo_id)
                    .eq("album_id", album_id)
                    .execute()
                )
                if up_resp.data:
                    updated += len(up_resp.data)
            except Exception as item_err:
                logger.warning("Failed to update display_order for photo %s: %s", item.photo_id, item_err)

        invalidate_albums_cache()
        return {"status": "ok", "updated_count": updated}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error reordering photos in album %s: %s", album_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to reorder photos: {str(e)}")

