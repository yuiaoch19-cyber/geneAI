import pytest

from app.services.orf import find_orfs


def test_plus_strand_orf_coordinates_and_protein():
    result = find_orfs("CCCATGAAATAACCC")
    assert result["count"] == 1
    orf = result["orfs"][0]
    assert orf["strand"] == "+"
    assert orf["frame"] == 1
    assert (orf["start"], orf["end"]) == (4, 12)
    assert orf["length_nt"] == 9
    assert orf["length_aa"] == 2
    assert orf["protein"] == "MK"
    assert orf["stop_codon"] == "TAA"
    assert orf["is_complete"] is True
    assert orf["is_potential"] is True


def test_minus_strand_orf_maps_back_to_plus_coordinates():
    plus = "GGGTTATTTCATCCC"
    result = find_orfs(plus)
    minus = [item for item in result["orfs"] if item["strand"] == "-"]
    assert len(minus) == 1
    orf = minus[0]
    assert (orf["start"], orf["end"]) == (4, 12)
    assert orf["frame"] == 1
    assert orf["protein"] == "MK"
    assert plus[orf["start"] - 1 : orf["end"]] == "TTATTTCAT"


def test_nested_orfs_can_be_included_or_collapsed():
    sequence = "ATGAAAATGTAA"
    nested = find_orfs(sequence, include_nested=True)
    assert nested["count"] == 2
    assert {item["start"] for item in nested["orfs"]} == {1, 7}

    collapsed = find_orfs(sequence, include_nested=False)
    assert collapsed["count"] == 1
    assert collapsed["orfs"][0]["start"] == 1


def test_missing_stop_can_be_returned_as_incomplete():
    strict = find_orfs("ATGAAA")
    assert strict["count"] == 0
    assert strict["warnings"]

    relaxed = find_orfs("ATGAAA", require_stop=False)
    assert relaxed["count"] == 1
    orf = relaxed["orfs"][0]
    assert orf["is_complete"] is False
    assert orf["stop_codon"] is None
    assert orf["protein"] == "MK"


def test_min_length_filter():
    sequence = "ATGAAAATGTAA"
    result = find_orfs(sequence, min_length_aa=2)
    assert result["count"] == 1
    assert result["orfs"][0]["length_aa"] == 3


def test_sequence_without_orf_reports_warning():
    result = find_orfs("CCCCCC")
    assert result["count"] == 0
    assert result["frames_scanned"] == 6
    assert result["warnings"]


def test_invalid_min_length_and_sequence():
    with pytest.raises(ValueError):
        find_orfs("ATGAAA", min_length_aa=-1)
    with pytest.raises(ValueError):
        find_orfs("ATGX")
    with pytest.raises(ValueError):
        find_orfs("")
