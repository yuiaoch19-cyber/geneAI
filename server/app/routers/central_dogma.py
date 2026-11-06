"""转录与翻译接口：为动画页面提供与算法层完全一致的数据。"""

from fastapi import APIRouter

from ..errors import ApiError
from ..schemas import (
    CodonOut,
    TranscribeOut,
    TranscribeRequest,
    TranslateOut,
    TranslateRequest,
)
from ..services.transcription import transcribe
from ..services.translation import translate_dna

router = APIRouter(tags=["central-dogma"])


def _invalid(exc: ValueError) -> ApiError:
    return ApiError(400, "INVALID_SEQUENCE", str(exc), "sequence")


@router.post("/transcribe", response_model=TranscribeOut)
def transcribe_sequence(payload: TranscribeRequest) -> TranscribeOut:
    try:
        result = transcribe(
            payload.sequence,
            strand=payload.strand,
            input_direction=payload.input_direction,
        )
    except ValueError as exc:
        raise _invalid(exc) from exc

    return TranscribeOut(
        sequence=result["coding_sequence"],
        coding_sequence=result["coding_sequence"],
        template_sequence=result["template_sequence"],
        rna=result["rna"],
        input_strand=result["input_strand"],
        input_direction=result["input_direction"],
        coding_direction=result["coding_direction"],
        template_direction=result["template_direction"],
        rna_direction=result["rna_direction"],
        length=result["length"],
        note=result["note"],
    )


@router.post("/translate", response_model=TranslateOut)
def translate_sequence(payload: TranslateRequest) -> TranslateOut:
    try:
        result = translate_dna(
            payload.sequence,
            strand=payload.strand,
            frame=payload.frame,
            input_direction=payload.input_direction,
            stop_at_stop=payload.stop_at_stop,
        )
    except ValueError as exc:
        raise _invalid(exc) from exc

    return TranslateOut(
        coding_sequence=result["coding_sequence"],
        template_sequence=result["template_sequence"],
        template_direction=result["template_direction"],
        rna=result["rna"],
        frame=result["frame"],
        protein=result["protein"],
        three_letters=result["three_letters"],
        codons=[CodonOut(**codon) for codon in result["codons"]],
        start_codon=result["start_codon"],
        stop_codon=result["stop_codon"],
        stopped_at=result["stopped_at"],
        ignored_bases=result["ignored_bases"],
        ambiguous_codons=result["ambiguous_codons"],
        warnings=result["warnings"],
    )
