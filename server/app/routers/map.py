from fastapi import APIRouter

from app.errors import ApiError
from app.schemas import MapOut, MapRequest
from app.services.map_features import build_map

router = APIRouter(tags=["map"])


@router.post("/map", response_model=MapOut)
def create_map(payload: MapRequest) -> MapOut:
    mutation = payload.mutation.model_dump() if payload.mutation else None
    try:
        data = build_map(
            payload.sequence,
            window=payload.window,
            step=payload.step,
            min_orf_aa=payload.min_orf_aa,
            enzymes=payload.enzymes,
            motifs=payload.motifs,
            mutation=mutation,
        )
    except ValueError as exc:
        raise ApiError(400, "INVALID_MAP", str(exc), "sequence") from exc
    return MapOut.model_validate(data)
