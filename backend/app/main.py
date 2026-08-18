"""
FastAPI application factory.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings as cfg
from app.routers import (
    albums,
    contact,
    donations,
    members,
    settings_router,
    admin,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Narkadhai API starting up (env=%s)", cfg.ENVIRONMENT)
    if not cfg.SUPABASE_URL or not cfg.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment!")
    else:
        logger.info("Supabase configuration detected (URL=%s)", cfg.SUPABASE_URL[:20] + "..." if len(cfg.SUPABASE_URL) > 20 else cfg.SUPABASE_URL)
    yield
    logger.info("Narkadhai API shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Narkadhai API",
        version="1.0.0",
        description="Backend API for the Narkadhai donation transparency website",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # Global unhandled exception handler — ensures full traceback in Render logs + helpful JSON response
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception on %s %s: %s",
            request.method,
            request.url.path,
            exc,
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Server Error on {request.method} {request.url.path}: {str(exc)}",
                "type": type(exc).__name__,
            },
        )

    # CORS — allow deployed frontend origins, Vercel app domains, custom domains, and localhost
    frontend_origins = [url.strip().rstrip('/') for url in cfg.FRONTEND_URL.split(',') if url.strip()]
    default_origins = [
        "https://narkadhai.vercel.app",
        "https://narkadhai.org",
        "https://www.narkadhai.org",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    origins = list(set(frontend_origins + default_origins))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
        allow_headers=["*"],
        expose_headers=["*"],
    )


    # Mount routers
    app.include_router(donations.router, prefix="/api/donations", tags=["donations"])
    app.include_router(contact.router, prefix="/api/contact", tags=["contact"])
    app.include_router(members.router, prefix="/api/members", tags=["members"])
    app.include_router(albums.router, prefix="/api/albums", tags=["albums"])
    app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

    @app.get("/")
    @app.get("/health")
    @app.get("/api/health")
    @app.head("/")
    @app.head("/health")
    @app.head("/api/health")
    async def health():
        return {"status": "ok", "service": "narkadhai-api"}

    return app


app = create_app()
