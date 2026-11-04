"""分析记录接口。"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from ..db import get_db
from ..errors import ApiError
from ..models import Analysis
from ..schemas import (
    AnalysisCreate,
    AnalysisOut,
    AnalysisPage,
    GcWindowsOut,
)
from ..services import dna

router = APIRouter(prefix="/analyses", tags=["analyses"])


def iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def to_out(record: Analysis) -> AnalysisOut:
    return AnalysisOut(
        id=record.id,
        name=record.name,
        sequence=record.sequence,
        length=record.length,
        a_count=record.a_count,
        t_count=record.t_count,
        g_count=record.g_count,
        c_count=record.c_count,
        n_count=record.n_count,
        gc_content=record.gc_content,
        at_content=record.at_content,
        complement=record.complement,
        reverse_complement=record.reverse_complement,
        rna=record.rna,
        source=record.source,
        note=record.note,
        created_at=iso(record.created_at),
    )


@router.post("", response_model=AnalysisOut, status_code=201)
def create_analysis(payload: AnalysisCreate, db: Session = Depends(get_db)) -> AnalysisOut:
    sequence = dna.normalize_sequence(payload.sequence)
    dna.validate_sequence(sequence)
    result = dna.analyze(sequence)

    default_name = f"DNA 分析 · {datetime.now().strftime('%m-%d %H:%M')}"
    record = Analysis(
        name=(payload.name or "").strip() or default_name,
        sequence=sequence,
        sequence_hash=dna.sequence_hash(sequence),
        length=result["length"],
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
    return to_out(record)


@router.get("", response_model=AnalysisPage)
def list_analyses(
    q: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
) -> AnalysisPage:
    statement = select(Analysis)
    if q:
        pattern = f"%{q.strip()}%"
        statement = statement.where(
            or_(Analysis.name.like(pattern), Analysis.note.like(pattern))
        )

    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    rows = db.scalars(
        statement.order_by(Analysis.created_at.desc(), Analysis.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    pages = (total + page_size - 1) // page_size if total else 0
    return AnalysisPage(
        items=[to_out(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{analysis_id}", response_model=AnalysisOut)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)) -> AnalysisOut:
    record = db.get(Analysis, analysis_id)
    if record is None:
        raise ApiError(404, "NOT_FOUND", "找不到这条分析记录。")
    return to_out(record)


@router.delete("/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: int, db: Session = Depends(get_db)) -> Response:
    record = db.get(Analysis, analysis_id)
    if record is None:
        raise ApiError(404, "NOT_FOUND", "找不到这条分析记录。")
    db.delete(record)
    db.commit()
    return Response(status_code=204)


@router.get("/{analysis_id}/gc-windows", response_model=GcWindowsOut)
def get_gc_windows(
    analysis_id: int,
    window: int = Query(default=50, ge=1),
    step: int = Query(default=10, ge=1),
    db: Session = Depends(get_db),
) -> GcWindowsOut:
    record = db.get(Analysis, analysis_id)
    if record is None:
        raise ApiError(404, "NOT_FOUND", "找不到这条分析记录。")
    points = dna.gc_windows(record.sequence, window, step)
    return GcWindowsOut(window=window, step=step, points=points)
