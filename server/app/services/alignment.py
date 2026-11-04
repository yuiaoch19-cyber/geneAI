"""双序列全局比对。

使用 Biopython ``PairwiseAligner`` 做全局（Needleman–Wunsch）比对，并把
对齐列转换为「参考序列坐标」下的差异列表。

坐标约定
--------
- 参考序列坐标为 **1-based**，指参考序列中该碱基的位置。
- 替换 / 缺失：``ref_position`` 是被替换或被删除的参考碱基位置。
- 插入：``ref_position`` 是插入点前一个参考碱基的位置；插入发生在序列
  开头时为 ``0``（即「第 0 位之后、第 1 位之前」）。
- ``query_position`` 同理，供前端定位查询序列。
- 连续多个插入/缺失按**碱基列**计数，而不是合并为一个事件；页面上会说明。

同分策略
--------
Biopython 可能返回多个同分比对。这里固定取 ``alignments[0]``，即
PairwiseAligner 自身的第一条最优回溯结果；该顺序在同一版本与同一输入下
是确定性的。若未来需要「最左/最右」等策略，可在此处显式排序。

生物学解释
----------
比对差异只是算法对两条序列的最优对齐推断，不等价于真实突变事件；
页面必须避免使用「确诊突变」等表述。
"""

from __future__ import annotations

from typing import Any

from Bio.Align import PairwiseAligner

# 评分参数集中在这里，写入数据库并在 API 响应中回传。
SCORING: dict[str, float | str] = {
    "mode": "global",
    "match_score": 2.0,
    "mismatch_score": -1.0,
    "open_gap_score": -10.0,
    "extend_gap_score": -0.5,
}

ALGORITHM = "Biopython PairwiseAligner (global, Needleman-Wunsch)"
TIE_BREAK = "取 PairwiseAligner 返回的第一条最优比对（同分时由回溯顺序决定）"

Difference = dict[str, Any]


def _build_aligner() -> PairwiseAligner:
    aligner = PairwiseAligner()
    aligner.mode = "global"
    aligner.match_score = float(SCORING["match_score"])
    aligner.mismatch_score = float(SCORING["mismatch_score"])
    aligner.open_gap_score = float(SCORING["open_gap_score"])
    aligner.extend_gap_score = float(SCORING["extend_gap_score"])
    return aligner


def align_pair(reference: str, query: str) -> dict[str, Any]:
    """返回比对结果；入参必须是已规范化、已校验的 A/T/G/C/N 序列。"""

    aligner = _build_aligner()
    alignments = aligner.align(reference, query)
    if len(alignments) == 0:
        # 理论上不会发生；保留兜底，避免静默返回空结果。
        raise ValueError("无法生成比对结果")

    alignment = alignments[0]
    aligned_reference = str(alignment[0])
    aligned_query = str(alignment[1])
    alignment_length = len(aligned_reference)

    substitutions = 0
    insertions = 0
    deletions = 0
    matches = 0
    differences: list[Difference] = []

    ref_position = 0
    query_position = 0

    for ref_base, query_base in zip(aligned_reference, aligned_query):
        if ref_base == "-" and query_base == "-":
            # 不应出现；防御性跳过。
            continue

        if ref_base == "-":
            insertions += 1
            differences.append(
                {
                    "type": "insertion",
                    "ref_position": ref_position,
                    "query_position": query_position + 1,
                    "ref_base": None,
                    "query_base": query_base,
                }
            )
            query_position += 1
            continue

        if query_base == "-":
            ref_position += 1
            deletions += 1
            differences.append(
                {
                    "type": "deletion",
                    "ref_position": ref_position,
                    "query_position": query_position,
                    "ref_base": ref_base,
                    "query_base": None,
                }
            )
            continue

        ref_position += 1
        query_position += 1

        if ref_base == query_base:
            matches += 1
        else:
            substitutions += 1
            differences.append(
                {
                    "type": "substitution",
                    "ref_position": ref_position,
                    "query_position": query_position,
                    "ref_base": ref_base,
                    "query_base": query_base,
                }
            )

    difference_count = substitutions + insertions + deletions
    identity = (matches / alignment_length * 100) if alignment_length else 0.0
    difference_ratio = (
        (difference_count / alignment_length * 100) if alignment_length else 0.0
    )

    return {
        "reference_length": len(reference),
        "query_length": len(query),
        "alignment_length": alignment_length,
        "aligned_reference": aligned_reference,
        "aligned_query": aligned_query,
        "score": float(alignment.score),
        "identity": round(identity, 2),
        "substitutions": substitutions,
        "insertions": insertions,
        "deletions": deletions,
        "difference_count": difference_count,
        "difference_ratio": round(difference_ratio, 2),
        "differences": differences,
        "algorithm": ALGORITHM,
        "scoring": dict(SCORING),
        "tie_break": TIE_BREAK,
        "coordinate_rule": (
            "参考坐标 1-based；替换/缺失指向参考碱基位置，插入指向插入点前一个"
            "参考碱基（0 表示序列开头）。"
        ),
    }
