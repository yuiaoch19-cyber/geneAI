"""请求 / 响应模型。"""

from typing import Literal

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    sequence: str = Field(min_length=1, description="DNA 序列，支持 FASTA 文本")
    sequence_name: str | None = Field(default=None, max_length=120)


class BaseCounts(BaseModel):
    a: int
    t: int
    g: int
    c: int
    n: int


class AnalyzeResult(BaseModel):
    """一次分析的算法结果（不包含数据库字段）。"""

    sequence: str
    sequence_length: int
    counts: BaseCounts
    gc_content: float
    at_content: float
    complement: str
    reverse_complement: str
    rna: str


class AnalyzeOut(AnalyzeResult):
    sequence_name: str | None = None
    algorithm_version: str


class FastaOut(BaseModel):
    filename: str
    sequence_name: str
    sequence: str
    analysis: AnalyzeOut


class HistoryCreate(BaseModel):
    sequence_name: str | None = Field(default=None, max_length=120)
    original_sequence: str = Field(min_length=1)
    source: Literal["manual", "fasta", "demo"] = "manual"
    note: str | None = Field(default=None, max_length=500)


class HistoryRecord(BaseModel):
    id: int
    sequence_name: str
    sequence_length: int
    original_sequence: str
    a_count: int
    t_count: int
    g_count: int
    c_count: int
    n_count: int
    gc_content: float
    at_content: float
    complement: str
    reverse_complement: str
    rna: str
    source: str
    note: str | None
    algorithm_version: str
    created_at: str


class HistoryPage(BaseModel):
    items: list[HistoryRecord]
    total: int
    page: int
    page_size: int
    pages: int


class GcPoint(BaseModel):
    id: int
    name: str
    gc_content: float
    at_content: float
    created_at: str


class RecentItem(BaseModel):
    id: int
    name: str
    length: int
    gc_content: float
    created_at: str


class StatsOverview(BaseModel):
    total_analyses: int
    total_sequences: int
    average_gc: float | None
    last_analyzed_at: str | None
    base_counts: BaseCounts
    gc_trend: list[GcPoint]
    recent: list[RecentItem]


class GcWindowPoint(BaseModel):
    start: int
    end: int
    gc: float


class GcWindowsOut(BaseModel):
    window: int
    step: int
    points: list[GcWindowPoint]


class CompareRequest(BaseModel):
    reference: str = Field(min_length=1, description="参考序列")
    query: str = Field(min_length=1, description="待比较序列")
    reference_name: str | None = Field(default=None, max_length=120)
    query_name: str | None = Field(default=None, max_length=120)


class DifferenceOut(BaseModel):
    type: Literal["substitution", "insertion", "deletion"]
    ref_position: int
    query_position: int
    ref_base: str | None
    query_base: str | None


class ComparisonResult(BaseModel):
    reference_name: str
    query_name: str
    reference_sequence: str
    query_sequence: str
    reference_length: int
    query_length: int
    alignment_length: int
    aligned_reference: str
    aligned_query: str
    score: float
    identity: float
    substitutions: int
    insertions: int
    deletions: int
    difference_count: int
    difference_ratio: float
    differences: list[DifferenceOut]
    algorithm: str
    scoring: dict[str, float | str]
    tie_break: str
    coordinate_rule: str


class ComparisonRecord(ComparisonResult):
    id: int
    name: str
    created_at: str


class ComparisonPage(BaseModel):
    items: list[ComparisonRecord]
    total: int
    page: int
    page_size: int
    pages: int
