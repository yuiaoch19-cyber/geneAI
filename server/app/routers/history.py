"""历史记录接口：保存、查询、详情、删除、PDF 报告。"""

from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from ..db import get_db
from ..errors import ApiError
from ..models import AnalysisRecord
from ..schemas import (
    GcWindowsOut,
    HistoryCreate,
    HistoryPage,
    HistoryRecord,
)
from ..services import dna
from ..services.csv_export import build_analysis_csv
from ..services.dates import local_day_start_utc
from ..services.report import build_analysis_report

router = APIRouter(prefix="/history", tags=["history"])


def iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def to_record(row: AnalysisRecord) -> HistoryRecord:
    return HistoryRecord(
        id=row.id,
        sequence_name=row.sequence_name,
        sequence_length=row.sequence_length,
        original_sequence=row.original_sequence,
        a_count=row.a_count,
        t_count=row.t_count,
        g_count=row.g_count,
        c_count=row.c_count,
        n_count=row.n_count,
        gc_content=row.gc_content,
        at_content=row.at_content,
        complement=row.complement,
        reverse_complement=row.reverse_complement,
        rna=row.rna,
        source=row.source,
        note=row.note,
        algorithm_version=row.algorithm_version,
        created_at=iso(row.created_at),
    )


@router.post("", response_model=HistoryRecord, status_code=201)
def create_history(payload: HistoryCreate, db: Session = Depends(get_db)) -> HistoryRecord:
    sequence = dna.normalize_sequence(payload.original_sequence)
    dna.validate_sequence(sequence)
    result = dna.analyze(sequence)

    default_name = f"DNA 分析 · {datetime.now().strftime('%m-%d %H:%M')}"
    record = AnalysisRecord(
        sequence_name=(payload.sequence_name or "").strip() or default_name,
        sequence_length=result["length"],
        original_sequence=sequence,
        sequence_hash=dna.sequence_hash(sequence),
        a_count=result["a_count"],
        t_count=result["t_count"],
        g_count=result["g_count"],
        c_count=result["c_count"],
        n_count=result["n_count"],
        gc_content=result["gc_content"],
        at_content=result["at_content"],
        complement=result["complement"],
        reverse_complement=result["reverse_complement"],
        rna=result["rna"],
        source=payload.source,
        note=payload.note,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return to_record(record)


@router.get("", response_model=HistoryPage)
def list_history(
    q: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    include_sequence: bool = Query(default=True),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> HistoryPage:
    statement = select(AnalysisRecord)
    if q:
        pattern = f"%{q.strip()}%"
        statement = statement.where(
            or_(
                AnalysisRecord.sequence_name.like(pattern),
                AnalysisRecord.note.like(pattern),
            )
        )
    if date_from:
        statement = statement.where(
            AnalysisRecord.created_at >= local_day_start_utc(date_from)
        )
    if date_to:
        statement = statement.where(
            AnalysisRecord.created_at
            < local_day_start_utc(date_to + timedelta(days=1))
        )

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    rows = db.scalars(
        statement.order_by(
            AnalysisRecord.created_at.desc(), AnalysisRecord.id.desc()
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    pages = (total + page_size - 1) // page_size if total else 0
    items = [to_record(row) for row in rows]
    if not include_sequence:
        # 列表用于统计/选择时不必传回完整序列，避免动辄数百 KB 的响应。
        items = [
            item.model_copy(update={"original_sequence": ""}) for item in items
        ]
    return HistoryPage(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def _get_or_404(record_id: int, db: Session) -> AnalysisRecord:
    record = db.get(AnalysisRecord, record_id)
    if record is None:
        raise ApiError(404, "NOT_FOUND", "找不到这条分析记录。")
    return record


@router.get("/{record_id}", response_model=HistoryRecord)
def get_history(record_id: int, db: Session = Depends(get_db)) -> HistoryRecord:
    return to_record(_get_or_404(record_id, db))


@router.get("/{record_id}/report")
def download_report(record_id: int, db: Session = Depends(get_db)) -> Response:
    record = _get_or_404(record_id, db)
    pdf = build_analysis_report(record)
    if not pdf.startswith(b"%PDF") or len(pdf) < 2000:
        raise ApiError(500, "REPORT_FAILED", "报告生成失败，请稍后重试。")

    ascii_name = f"GeneAI-report-{record.id}.pdf"
    utf8_name = quote(f"GeneAI-分析报告-{record.id}.pdf")
    headers = {
        "Content-Disposition": (
            f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{utf8_name}'
        ),
        "Cache-Control": "no-store",
    }
    return Response(content=pdf, media_type="application/pdf", headers=headers)


@router.get("/{record_id}/csv")
def download_csv(record_id: int, db: Session = Depends(get_db)) -> Response:
    record = _get_or_404(record_id, db)
    content = build_analysis_csv(record)

    ascii_name = f"GeneAI-analysis-{record.id}.csv"
    utf8_name = quote(f"GeneAI-分析结果-{record.id}.csv")
    headers = {
        "Content-Disposition": (
            f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{utf8_name}'
        ),
        "Cache-Control": "no-store",
    }
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers=headers,
    )


@router.delete("/{record_id}", status_code=204)
def delete_history(record_id: int, db: Session = Depends(get_db)) -> Response:
    record = _get_or_404(record_id, db)
    db.delete(record)
    db.commit()
    return Response(status_code=204)


@router.get("/{record_id}/gc-windows", response_model=GcWindowsOut)
def get_gc_windows(
    record_id: int,
    window: int = Query(default=50, ge=1),
    step: int = Query(default=10, ge=1),
    db: Session = Depends(get_db),
) -> GcWindowsOut:
    record = _get_or_404(record_id, db)
    points = dna.gc_windows(record.original_sequence, window, step)
    return GcWindowsOut(window=window, step=step, points=points)
