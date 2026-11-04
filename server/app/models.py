"""ORM 模型：分析记录、差异比较记录与元数据。"""

from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .config import ALGORITHM_VERSION
from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AnalysisRecord(Base):
    """一次 DNA 序列分析的完整记录。"""

    __tablename__ = "analysis_records"
    __table_args__ = (
        CheckConstraint(
            "a_count + t_count + g_count + c_count + n_count = sequence_length",
            name="ck_analysis_records_counts_sum",
        ),
        CheckConstraint(
            "source IN ('manual', 'fasta', 'demo')",
            name="ck_analysis_records_source",
        ),
        Index("ix_analysis_records_created_at", "created_at"),
        Index("ix_analysis_records_sequence_hash", "sequence_hash"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sequence_name: Mapped[str] = mapped_column(String(120), nullable=False)
    sequence_length: Mapped[int] = mapped_column(Integer, nullable=False)
    original_sequence: Mapped[str] = mapped_column(Text, nullable=False)
    sequence_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    a_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    t_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    g_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    c_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    n_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    gc_content: Mapped[float] = mapped_column(Float, nullable=False)
    at_content: Mapped[float] = mapped_column(Float, nullable=False)
    complement: Mapped[str] = mapped_column(Text, nullable=False)
    reverse_complement: Mapped[str] = mapped_column(Text, nullable=False)
    rna: Mapped[str] = mapped_column(Text, nullable=False)

    source: Mapped[str] = mapped_column(String(16), nullable=False, default="manual")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    algorithm_version: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ALGORITHM_VERSION
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class Comparison(Base):
    __tablename__ = "comparisons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    reference_sequence: Mapped[str] = mapped_column(Text, nullable=False)
    query_sequence: Mapped[str] = mapped_column(Text, nullable=False)
    reference_length: Mapped[int] = mapped_column(Integer, nullable=False)
    query_length: Mapped[int] = mapped_column(Integer, nullable=False)

    alignment_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    identity: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    substitutions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    insertions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deletions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    difference_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    difference_ratio: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    alignment_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    differences_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class Meta(Base):
    __tablename__ = "meta"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
