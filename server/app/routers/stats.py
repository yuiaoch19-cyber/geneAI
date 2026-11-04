"""Dashboard 聚合统计。"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Analysis, Comparison
from ..schemas import BaseCounts, GcPoint, RecentItem, StatsOverview

router = APIRouter(prefix="/stats", tags=["stats"])


def iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


@router.get("/overview", response_model=StatsOverview)
def overview(db: Session = Depends(get_db)) -> StatsOverview:
    analysis_count = db.scalar(select(func.count(Analysis.id))) or 0
    comparison_count = db.scalar(select(func.count(Comparison.id))) or 0

    average_gc = db.scalar(select(func.avg(Analysis.gc_content)))
    last_created = db.scalar(select(func.max(Analysis.created_at)))

    sums = db.execute(
        select(
            func.coalesce(func.sum(Analysis.a_count), 0),
            func.coalesce(func.sum(Analysis.t_count), 0),
            func.coalesce(func.sum(Analysis.g_count), 0),
            func.coalesce(func.sum(Analysis.c_count), 0),
            func.coalesce(func.sum(Analysis.n_count), 0),
        )
    ).one()

    trend_rows = db.execute(
        select(Analysis.id, Analysis.name, Analysis.gc_content, Analysis.created_at)
        .order_by(Analysis.created_at.desc(), Analysis.id.desc())
        .limit(20)
    ).all()
    trend = [
        GcPoint(id=row.id, name=row.name, gc_content=row.gc_content, created_at=iso(row.created_at) or "")
        for row in reversed(trend_rows)
    ]

    recent_rows = db.execute(
        select(Analysis.id, Analysis.name, Analysis.length, Analysis.gc_content, Analysis.created_at)
        .order_by(Analysis.created_at.desc(), Analysis.id.desc())
        .limit(5)
    ).all()
    recent = [
        RecentItem(
            id=row.id,
            name=row.name,
            length=row.length,
            gc_content=row.gc_content,
            created_at=iso(row.created_at) or "",
        )
        for row in recent_rows
    ]

    return StatsOverview(
        total_analyses=analysis_count + comparison_count,
        total_sequences=analysis_count + comparison_count * 2,
        average_gc=round(float(average_gc), 2) if average_gc is not None else None,
        last_analyzed_at=iso(last_created),
        base_counts=BaseCounts(
            a=sums[0], t=sums[1], g=sums[2], c=sums[3], n=sums[4]
        ),
        gc_trend=trend,
        recent=recent,
    )
