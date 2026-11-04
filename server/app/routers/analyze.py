"""无状态分析接口：直接分析序列、解析 FASTA 上传。"""

from fastapi import APIRouter, File, UploadFile

from ..config import ALGORITHM_VERSION, MAX_UPLOAD_BYTES
from ..errors import ApiError
from ..schemas import AnalyzeOut, AnalyzeRequest, AnalyzeResult, BaseCounts, FastaOut
from ..services import dna, fasta

router = APIRouter(tags=["analysis"])


def build_result(sequence: str) -> AnalyzeResult:
    result = dna.analyze(sequence)
    return AnalyzeResult(
        sequence=sequence,
        sequence_length=result["length"],
        counts=BaseCounts(
            a=result["a_count"],
            t=result["t_count"],
            g=result["g_count"],
            c=result["c_count"],
            n=result["n_count"],
        ),
        gc_content=result["gc_content"],
        at_content=result["at_content"],
        complement=result["complement"],
        reverse_complement=result["reverse_complement"],
        rna=result["rna"],
    )


@router.post("/analyze", response_model=AnalyzeOut)
def analyze(payload: AnalyzeRequest) -> AnalyzeOut:
    sequence = dna.normalize_sequence(payload.sequence)
    dna.validate_sequence(sequence)
    return AnalyzeOut(
        **build_result(sequence).model_dump(),
        sequence_name=payload.sequence_name,
        algorithm_version=ALGORITHM_VERSION,
    )


@router.post("/upload/fasta", response_model=FastaOut)
async def upload_fasta(file: UploadFile = File(...)) -> FastaOut:
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ApiError(
            413,
            "FILE_TOO_LARGE",
            f"文件超过 {MAX_UPLOAD_BYTES // (1024 * 1024)} MB 上限。",
            "file",
        )
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ApiError(
            400, "INVALID_ENCODING", "文件不是 UTF-8 文本，请另存后重试。", "file"
        ) from exc

    name, sequence = fasta.parse_fasta(text, file.filename or "upload.fasta")
    result = build_result(sequence)
    return FastaOut(
        filename=file.filename or "upload.fasta",
        sequence_name=name,
        sequence=sequence,
        analysis=AnalyzeOut(
            **result.model_dump(),
            sequence_name=name,
            algorithm_version=ALGORITHM_VERSION,
        ),
    )
