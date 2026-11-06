from typing import Literal

from fastapi import APIRouter, Query

from ..errors import ApiError
from ..schemas import VariantDetailOut, VariantSearchOut
from ..services import clinvar

router = APIRouter(prefix="/variants", tags=["variants"])


@router.get("/search", response_model=VariantSearchOut)
def search_variants(
    q: str = Query(min_length=1, max_length=160, description="基因名、变异标识或 ClinVar ID"),
    query_type: Literal["auto", "gene", "variant", "id"] = "auto",
    limit: int = Query(10, ge=1, le=20),
) -> VariantSearchOut:
    try:
        payload = clinvar.search_variants(q, query_type, limit)
    except clinvar.UnsupportedQuery as exc:
        raise ApiError(400, "UNSUPPORTED_QUERY", str(exc), "q") from exc
    except clinvar.ClinVarError as exc:
        code = "NOT_FOUND" if exc.code == "NOT_FOUND" else exc.code
        status = 404 if code == "NOT_FOUND" else 503
        raise ApiError(status, code, str(exc)) from exc
    return VariantSearchOut(**payload)


@router.get("/{variation_id}", response_model=VariantDetailOut)
def get_variant(variation_id: str) -> VariantDetailOut:
    try:
        payload = clinvar.get_variation(variation_id)
    except clinvar.UnsupportedQuery as exc:
        raise ApiError(400, "UNSUPPORTED_QUERY", str(exc), "variation_id") from exc
    except clinvar.ClinVarError as exc:
        code = "NOT_FOUND" if exc.code == "NOT_FOUND" else exc.code
        status = 404 if code == "NOT_FOUND" else 503
        raise ApiError(status, code, str(exc)) from exc
    return VariantDetailOut(**payload)
