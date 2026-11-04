"""请求 / 响应模型。"""

from typing import Literal

from pydantic import BaseModel, Field


class AnalysisCreate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    sequence: str = Field(min_length=1)
    source: Literal["manual", "fasta", "demo"] = "manual"
    note: str | None = Field(default=None, max_length=500)
    save: bool = True


class AnalysisOut(BaseModel):
    id: int
    name: str
    sequence: str
    length: int
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
    created_at: str


class AnalysisPage(BaseModel):
    items: list[AnalysisOut]
    total: int
    page: int
    page_size: int
    pages: int


class BaseCounts(BaseModel):
    a: int
    t: int
    g: int
    c: int
    n: int


class GcPoint(BaseModel):
    id: int
    name: str
    gc_content: float
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
