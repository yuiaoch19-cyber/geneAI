"""基因突变模拟 API。"""

from fastapi import APIRouter

from ..errors import ApiError
from ..schemas import MutateOut, MutateRequest
from ..services import mutation as mutation_service
from ..services.transcription import transcribe

router = APIRouter(tags=["mutation"])


@router.post("/mutate", response_model=MutateOut)
def mutate(payload: MutateRequest) -> MutateOut:
    try:
        applied = mutation_service.apply_mutation(
            payload.sequence,
            payload.mutation_type,
            payload.position,
            alt=payload.alt,
            ref=payload.ref,
            length=payload.length,
        )
        before = transcribe(
            payload.sequence, strand=payload.strand, input_direction=payload.input_direction
        )
        after = transcribe(
            applied["mutated_sequence"],
            strand=payload.strand,
            input_direction=payload.input_direction,
        )
        codon_position = (
            payload.position
            if payload.mutation_type != "insertion" or payload.position > 0
            else None
        )
        result = mutation_service.classify_mutation(
            payload.sequence,
            applied["mutated_sequence"],
            frame=payload.frame,
            position=codon_position,
            strand=payload.strand,
            input_direction=payload.input_direction,
        )
    except ValueError as exc:
        raise ApiError(400, "INVALID_MUTATION", str(exc), "sequence") from exc

    result.pop("frame", None)
    result.pop("strand", None)
    result.pop("input_direction", None)
    return MutateOut(
        original_sequence=applied["original_sequence"],
        mutated_sequence=applied["mutated_sequence"],
        mutation=applied,
        original_rna=before["rna"],
        mutated_rna=after["rna"],
        frame=payload.frame,
        strand=payload.strand,
        input_direction=payload.input_direction,
        **result,
    )
