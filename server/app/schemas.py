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


class TranscribeRequest(BaseModel):
    sequence: str = Field(min_length=1, description="DNA 序列（编码链或模板链）")
    strand: Literal["coding", "template"] = Field(
        default="coding", description="输入序列是哪条链"
    )
    input_direction: Literal["5to3", "3to5"] = Field(
        default="5to3", description="输入序列的方向"
    )


class TranscribeOut(BaseModel):
    sequence: str
    coding_sequence: str
    template_sequence: str
    rna: str
    input_strand: str
    input_direction: str
    coding_direction: str
    template_direction: str
    rna_direction: str
    length: int
    note: str


class TranslateRequest(BaseModel):
    sequence: str = Field(min_length=1, description="DNA 序列（编码链或模板链）")
    strand: Literal["coding", "template"] = Field(default="coding")
    input_direction: Literal["5to3", "3to5"] = Field(default="5to3")
    frame: int = Field(default=1, ge=1, le=3, description="阅读框 1、2 或 3")
    stop_at_stop: bool = Field(default=True, description="遇到终止密码子是否停止")


class CodonOut(BaseModel):
    index: int
    rna: str
    amino_acid: str
    three_letter: str
    start: int
    end: int
    is_stop: bool
    is_start: bool
    ambiguous: bool


class TranslateOut(BaseModel):
    coding_sequence: str
    template_sequence: str
    template_direction: str
    rna: str
    frame: int
    protein: str
    three_letters: list[str]
    codons: list[CodonOut]
    start_codon: str | None
    stop_codon: str | None
    stopped_at: int | None
    ignored_bases: int
    ambiguous_codons: int
    warnings: list[str]
class MutateRequest(BaseModel):
    sequence: str = Field(min_length=1, description="原始 DNA 序列")
    mutation_type: Literal["substitution", "insertion", "deletion"]
    position: int = Field(ge=0, description="1-based 坐标；插入表示第 N 位之后")
    alt: str = Field(default="", description="替换/插入的碱基")
    ref: str = Field(default="", description="替换/缺失的参考碱基")
    length: int | None = Field(default=None, ge=1, description="缺失长度，默认 1")
    frame: int = Field(default=1, ge=1, le=3)
    strand: Literal["coding", "template"] = "coding"
    input_direction: Literal["5to3", "3to5"] = "5to3"


class MutationAppliedOut(BaseModel):
    type: str
    position: int
    ref: str
    alt: str
    deleted_sequence: str
    inserted_sequence: str
    length_delta: int
    coordinate_rule: str


class ProteinChangeOut(BaseModel):
    type: Literal["equal", "substitution", "insertion", "deletion"]
    original_start: int
    original_end: int
    mutated_start: int
    mutated_end: int
    original: str
    mutated: str


class AminoAcidChangeOut(BaseModel):
    index: int
    original: str
    mutated: str


class MutateOut(BaseModel):
    original_sequence: str
    mutated_sequence: str
    mutation: MutationAppliedOut
    original_rna: str
    mutated_rna: str
    frame: int
    strand: str
    input_direction: str
    original_protein: str
    mutated_protein: str
    protein_changes: list[ProteinChangeOut]
    consequence: str
    label: str
    is_premature_stop: bool
    original_protein_length: int
    mutated_protein_length: int
    protein_length_delta: int
    length_delta: int
    affected_codon: int | None
    changed_amino_acids: list[AminoAcidChangeOut]
    note: str
