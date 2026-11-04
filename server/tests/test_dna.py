"""DNA 算法单元测试。

运行：cd server && .venv/Scripts/python.exe -m pytest -q
"""

import pytest

from app.errors import ApiError
from app.services import dna


def test_normalize_accepts_lowercase_and_whitespace():
    assert dna.normalize_sequence("atg c\nAT\tgc") == "ATGCATGC"


def test_normalize_drops_a_single_fasta_header():
    assert dna.normalize_sequence(">HBB fragment\nATG CAT\nGCA") == "ATGCATGCA"


def test_normalize_rejects_multiple_fasta_records():
    with pytest.raises(ApiError) as exc:
        dna.normalize_sequence(">one\nATGC\n>two\nATGC")
    assert exc.value.code == "INVALID_FASTA"


def test_validate_rejects_empty_sequence():
    with pytest.raises(ApiError) as exc:
        dna.validate_sequence("")
    assert exc.value.code == "INVALID_SEQUENCE"


def test_validate_reports_u_position():
    with pytest.raises(ApiError) as exc:
        dna.validate_sequence("AUGC")
    assert "第 2 位" in exc.value.detail
    assert "尿嘧啶" in exc.value.detail


def test_validate_rejects_digits():
    with pytest.raises(ApiError) as exc:
        dna.validate_sequence("ATG1C")
    assert "第 4 位" in exc.value.detail


def test_validate_rejects_over_limit():
    with pytest.raises(ApiError) as exc:
        dna.validate_sequence("A" * 100_001)
    assert exc.value.status_code == 413
    assert exc.value.code == "SEQUENCE_TOO_LONG"


def test_counts_and_gc_exclude_n():
    counts = dna.count_bases("ATGN")
    assert counts == {"a": 1, "t": 1, "g": 1, "c": 0, "n": 1}
    assert dna.gc_content("ATGN") == pytest.approx(33.33)
    assert dna.at_content("ATGN") == pytest.approx(66.67)


def test_all_n_has_zero_content():
    assert dna.gc_content("NNNN") == 0
    assert dna.at_content("NNNN") == 0


def test_strand_conversions():
    assert dna.complement("ATGC") == "TACG"
    assert dna.reverse_complement("ATGC") == "GCAT"
    assert dna.transcribe("ATGC") == "AUGC"
    assert dna.complement("ATNG") == "TANC"


def test_analyze_returns_complete_payload():
    result = dna.analyze("ATGC")
    assert result["length"] == 4
    assert result["a_count"] == 1
    assert result["gc_content"] == 50.0
    assert result["reverse_complement"] == "GCAT"
    assert result["rna"] == "AUGC"


def test_gc_windows_only_returns_full_windows():
    points = dna.gc_windows("ATGCATGC", window=4, step=2)
    assert [point["start"] for point in points] == [0, 2, 4]
    assert all(point["end"] - point["start"] == 4 for point in points)


def test_gc_windows_rejects_invalid_window():
    with pytest.raises(ApiError) as exc:
        dna.gc_windows("ATGC", window=10, step=1)
    assert exc.value.code == "INVALID_WINDOW"
