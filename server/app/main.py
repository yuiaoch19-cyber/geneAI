"""GeneAI 后端入口。

启动：cd server && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import APP_NAME, APP_VERSION, CORS_ORIGIN_REGEX
from .db import get_db, init_db
from .errors import (
    ApiError,
    api_error_handler,
    http_error_handler,
    validation_error_handler,
)
from .routers import (
    analyze,
    central_dogma,
    comparisons,
    history,
    map as map_router,
    mutation,
    orfs,
    stats,
    variants,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title=f"{APP_NAME} API", version=APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(ApiError, api_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)

app.include_router(analyze.router, prefix="/api")
app.include_router(central_dogma.router, prefix="/api")
app.include_router(map_router.router, prefix="/api")
app.include_router(mutation.router, prefix="/api")
app.include_router(orfs.router, prefix="/api")
app.include_router(variants.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(comparisons.router, prefix="/api")
app.include_router(comparisons.preview_router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/api/health", tags=["meta"])
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    database = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 - 健康检查需要报告而不是抛出
        database = "error"
    return {
        "status": "ok" if database == "ok" else "degraded",
        "app": APP_NAME,
        "version": APP_VERSION,
        "database": database,
    }
