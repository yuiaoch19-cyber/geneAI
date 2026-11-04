"""双序列比对接口：预览、保存、历史列表、详情与删除。"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import (
    DEFAULT_PAGE_SIZE,
    MAX_ALIGNMENT_LENGTH,
    MAX_PAGE_SIZE,
)
from ..db import get_db
from ..errors import ApiError
from ..models import Comparison
from ..schemas import (
    CompareRequest,
    ComparisonPage,
    ComparisonRecord,
    ComparisonResult,
)
from ..services import dna
from ..services.alignment import align_pair

router = APIRouter(prefix="/comparisons", tags=["comparisons"])
preview_router = APIRouter(tags=["comparisons"])


def iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize(raw: str, field: str) -> str:
    try:
        sequence = dna.normalize_sequence(raw)
        dna.validate_sequence(sequence)
    except ApiError as exc:
        raise ApiError(exc.status_code, exc.code, exc.detail, field) from exc

    if len(sequence) > MAX_ALIGNMENT_LENGTH:
        raise ApiError(
            413,
            "ALIGNMENT_TOO_LONG",
            f"{'参考' if field == 'reference' else '待比较'}序列为 {len(sequence):,} bp，"
            f"比对上限为 {MAX_ALIGNMENT_LENGTH:,} bp。",
            field,
        )
    return sequence


def _compare(payload: CompareRequest) -> dict[str, Any]:
    reference_name = (payload.reference_name or "").strip() or "参考序列"
    query_name = (payload.query_name or "").strip() or "待比较序列"
    reference = _normalize(payload.reference, "reference")
    query = _normalize(payload.query, "query")

    result = align_pair(reference, query)
    return {
        "reference_name": reference_name,
        "query_name": query_name,
        "reference_sequence": reference,
        "query_sequence": query,
        **result,
    }


def to_record(row: Comparison) -> ComparisonRecord:
    payload: dict[str, Any] = {}
    if row.alignment_json:
        try:
            payload = json.loads(row.alignment_json)
        except json.JSONDecodeError:
            payload = {}

    differences = []
    if row.differences_json:
        try:
            differences = json.loads(row.differences_json)
        except json.JSONDecodeError:
            differences = []

    return ComparisonRecord(
        id=row.id,
        name=row.name,
        created_at=iso(row.created_at),
        reference_name=payload.get("reference_name", "参考序列"),
        query_name=payload.get("query_name", "待比较序列"),
        reference_sequence=row.reference_sequence,
        query_sequence=row.query_sequence,
        reference_length=row.reference_length,
        query_length=row.query_length,
        alignment_length=payload.get("alignment_length", 0),
        aligned_reference=payload.get("aligned_reference", ""),
        aligned_query=payload.get("aligned_query", ""),
        score=row.alignment_score,
        identity=row.identity,
        substitutions=row.substitutions,
        insertions=row.insertions,
        deletions=row.deletions,
        difference_count=row.difference_count,
        difference_ratio=row.difference_ratio,
        differences=differences,
        algorithm=payload.get("algorithm", ""),
        scoring=payload.get("scoring", {}),
        tie_break=payload.get("tie_break", ""),
        coordinate_rule=payload.get("coordinate_rule", ""),
    )


@preview_router.post("/compare", response_model=ComparisonResult)
def compare_preview(payload: CompareRequest) -> ComparisonResult:
    """只计算并返回比对结果，不写入数据库。"""

    return ComparisonResult(**_compare(payload))


@router.post("", response_model=ComparisonRecord, status_code=201)
def create_comparison(
    payload: CompareRequest, db: Session = Depends(get_db)
) -> ComparisonRecord:
    result = _compare(payload)

    stored = {
        key: result[key]
        for key in (
            "reference_name",
            "query_name",
            "alignment_length",
            "aligned_reference",
            "aligned_query",
            "algorithm",
            "scoring",
            "tie_break",
            "coordinate_rule",
        )
    }
    row = Comparison(
        name=f"{result['reference_name']} vs {result['query_name']}",
        reference_sequence=result["reference_sequence"],
        query_sequence=result["query_sequence"],
        reference_length=result["reference_length"],
        query_length=result["query_length"],
        alignment_score=result["score"],
        identity=result["identity"],
        substitutions=result["substitutions"],
        insertions=result["insertions"],
        deletions=result["deletions"],
        difference_count=result["difference_count"],
        difference_ratio=result["difference_ratio"],
        alignment_json=json.dumps(stored, ensure_ascii=False),
        differences_json=json.dumps(result["differences"], ensure_ascii=False),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_record(row)


@router.get("", response_model=ComparisonPage)
def list_comparisons(
    q: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
) -> ComparisonPage:
    statement = select(Comparison)
    count_statement = select(func.count(Comparison.id))
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        statement = statement.where(Comparison.name.like(pattern))
        count_statement = count_statement.where(Comparison.name.like(pattern))

    total = db.scalar(count_statement) or 0
    rows = db.scalars(
        statement.order_by(Comparison.created_at.desc(), Comparison.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return ComparisonPage(
        items=[to_record(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


def _get_or_404(record_id: int, db: Session) -> Comparison:
    row = db.get(Comparison, record_id)
    if row is None:
        raise ApiError(404, "NOT_FOUND", "找不到该比对记录。")
    return row


@router.get("/{record_id}", response_model=ComparisonRecord)
def get_comparison(record_id: int, db: Session = Depends(get_db)) -> ComparisonRecord:
    return to_record(_get_or_404(record_id, db))


@router.delete("/{record_id}", status_code=204)
def delete_comparison(record_id: int, db: Session = Depends(get_db)) -> Response:
    row = _get_or_404(record_id, db)
    db.delete(row)
    db.commit()
    return Response(status_code=204)
