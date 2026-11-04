"""统一的错误响应：{detail, code, field?}。"""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        field: str | None = None,
    ) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.field = field


def _body(detail: str, code: str, field: str | None = None) -> dict[str, str]:
    body = {"detail": detail, "code": code}
    if field:
        body["field"] = field
    return body


async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code, content=_body(exc.detail, exc.code, exc.field)
    )


async def validation_error_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else {}
    location = [str(part) for part in first.get("loc", []) if part != "body"]
    field = ".".join(location) or None
    message = first.get("msg", "请求参数不合法。")
    return JSONResponse(
        status_code=422,
        content=_body(f"请求参数不合法：{message}", "VALIDATION_ERROR", field),
    )


async def http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    if isinstance(exc.detail, str):
        detail = exc.detail
    else:
        detail = "请求失败。"
    return JSONResponse(
        status_code=exc.status_code, content=_body(detail, f"HTTP_{exc.status_code}")
    )
