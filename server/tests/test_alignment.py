"""全局比对服务测试。

覆盖：完全一致、单替换、单插入、单缺失、长度差异、连续差异、
同分确定性，以及坐标规则。
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.alignment import align_pair  # noqa: E402

REFERENCE = "ATGCATGC"


def test_identical_sequences() -> None:
    result = align_pair(REFERENCE, REFERENCE)
    assert result["difference_count"] == 0
    assert result["substitutions"] == result["insertions"] == result["deletions"] == 0
    assert result["identity"] == 100.0
    assert result["difference_ratio"] == 0.0
    assert result["aligned_reference"] == result["aligned_query"] == REFERENCE
    assert result["score"] == 16.0
    assert result["differences"] == []


def test_single_substitution() -> None:
    result = align_pair(REFERENCE, "ATGCATGT")
    assert result["substitutions"] == 1
    assert result["insertions"] == result["deletions"] == 0
    assert result["difference_count"] == 1
    assert result["identity"] == pytest.approx(87.5)
    assert result["differences"] == [
        {
            "type": "substitution",
            "ref_position": 8,
            "query_position": 8,
            "ref_base": "C",
            "query_base": "T",
        }
    ]


def test_single_insertion_uses_preceding_reference_position() -> None:
    result = align_pair("ATGGCCTAA", "ATGGACCTAA")
    assert result["insertions"] == 1
    assert result["substitutions"] == result["deletions"] == 0
    assert result["differences"] == [
        {
            "type": "insertion",
            "ref_position": 4,
            "query_position": 5,
            "ref_base": None,
            "query_base": "A",
        }
    ]
    assert result["aligned_reference"] == "ATGG-CCTAA"
    assert result["aligned_query"] == "ATGGACCTAA"


def test_single_deletion() -> None:
    result = align_pair("ATGTCCTAA", "ATGCCTAA")
    assert result["deletions"] == 1
    assert result["substitutions"] == result["insertions"] == 0
    assert result["differences"] == [
        {
            "type": "deletion",
            "ref_position": 4,
            "query_position": 3,
            "ref_base": "T",
            "query_base": None,
        }
    ]
    assert result["aligned_reference"] == "ATGTCCTAA"
    assert result["aligned_query"] == "ATG-CCTAA"


def test_sequences_with_different_lengths() -> None:
    result = align_pair("ATGC", "ATGCTTTTGC")
    assert result["reference_length"] == 4
    assert result["query_length"] == 10
    assert result["insertions"] == 6
    assert result["substitutions"] == result["deletions"] == 0
    assert result["difference_count"] == 6
    assert result["alignment_length"] == 10


def test_multiple_consecutive_differences() -> None:
    result = align_pair("ATGCATGCATGC", "ATGTTTGCATGC")
    assert result["substitutions"] == 2
    assert result["insertions"] == result["deletions"] == 0
    assert result["difference_count"] == 2
    assert [item["ref_position"] for item in result["differences"]] == [4, 5]


def test_tie_break_is_deterministic() -> None:
    # 重复单元会产生多条同分比对，同一输入必须返回同一结果。
    first = align_pair("ATGCATGC", "ATGCATGC")
    second = align_pair("ATGCATGC", "ATGCATGC")
    assert first == second
    assert "第一条最优比对" in first["tie_break"]


def test_algorithm_and_scoring_are_exposed() -> None:
    result = align_pair("ATGC", "ATGC")
    assert "PairwiseAligner" in result["algorithm"]
    assert result["scoring"] == {
        "mode": "global",
        "match_score": 2.0,
        "mismatch_score": -1.0,
        "open_gap_score": -10.0,
        "extend_gap_score": -0.5,
    }
    assert "1-based" in result["coordinate_rule"]


def test_scores_reflect_gaps_and_mismatches() -> None:
    identical = align_pair("ATGC", "ATGC")["score"]
    mismatch = align_pair("ATGC", "ATGT")["score"]
    insertion = align_pair("ATGC", "ATGGC")["score"]
    assert mismatch == identical - 3.0
    assert insertion < mismatch
