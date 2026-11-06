from fastapi import APIRouter

from ..errors import ApiError
from ..schemas import OrfRequest, OrfResultOut
from ..services.orf import find_orfs
from ..services.sequence_utils import clean_dna

router = APIRouter(tags=["orf"])


@router.post("/orfs", response_model=OrfResultOut)
def predict_orfs(payload: OrfRequest) -> OrfResultOut:
    try:
        result = find_orfs(
            payload.sequence,
            min_length_aa=payload.min_length_aa,
            include_nested=payload.include_nested,
            require_stop=payload.require_stop,
        )
    except ValueError as exc:
        raise ApiError(400, "INVALID_SEQUENCE", str(exc), "sequence") from exc

    return OrfResultOut(
        sequence_length=len(clean_dna(payload.sequence)),
        orfs=result["orfs"],
        count=result["count"],
        frames_scanned=result["frames_scanned"],
        strategy=result["strategy"],
        warnings=result["warnings"],
    )
