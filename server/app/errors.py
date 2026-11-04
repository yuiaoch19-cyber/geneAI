"""统一的业务异常，序列化为 {detail, code, field}。"""

from fastapi import Request
from fastapi.responses import JSONResponse


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


async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    body: dict[str, str] = {"detail": exc.detail, "code": exc.code}
    if exc.field:
        body["field"] = exc.field
    return JSONResponse(status_code=exc.status_code, content=body)
