import pytest

from app.services.translation import translate_dna, translate_rna


def test_standard_translation_includes_stop():
    result = translate_rna("AUGGAACCUUGGUAA")
    assert result["protein"] == "MEPW*"
    assert result["three_letters"] == ["Met", "Glu", "Pro", "Trp", "Stop"]
    assert result["start_codon"] == "AUG"
    assert result["stop_codon"] == "UAA"
    assert result["stopped_at"] == 4
    assert len(result["codons"]) == 5
    assert result["codons"][0] == {
        "index": 0,
        "rna": "AUG",
        "amino_acid": "M",
        "three_letter": "Met",
        "start": 1,
        "end": 3,
        "is_stop": False,
        "is_start": True,
        "ambiguous": False,
    }


def test_frame_two_offsets_by_one_base():
    result = translate_rna("AUGGAA", frame=2)
    assert result["protein"] == "W"
    assert result["ignored_bases"] == 2
    assert result["codons"][0]["rna"] == "UGG"


def test_incomplete_codon_is_ignored_with_warning():
    result = translate_rna("AUGG")
    assert result["protein"] == "M"
    assert result["ignored_bases"] == 1
    assert any("不足一个密码子" in warning for warning in result["warnings"])


def test_ambiguous_codon_becomes_x():
    result = translate_rna("AUGNAA")
    assert result["protein"] == "MX"
    assert result["ambiguous_codons"] == 1
    assert result["codons"][1]["three_letter"] == "Xaa"
    assert any("N" in warning for warning in result["warnings"])


def test_missing_stop_warns():
    result = translate_rna("AUGGAA")
    assert result["protein"] == "ME"
    assert result["stop_codon"] is None
    assert any("终止密码子" in warning for warning in result["warnings"])


def test_non_aug_start_warns():
    result = translate_rna("GAA")
    assert result["protein"] == "E"
    assert result["start_codon"] is None
    assert any("不是 AUG" in warning for warning in result["warnings"])


def test_stop_at_stop_false_continues_after_stop():
    result = translate_rna("AUGUAAAUG", stop_at_stop=False)
    assert result["protein"] == "M*M"
    assert result["stop_codon"] == "UAA"


def test_translate_dna_coding_and_template():
    coding = translate_dna("ATGAAATAA")
    assert coding["protein"] == "MK*"
    assert coding["coding_sequence"] == "ATGAAATAA"
    template = translate_dna("TTATTTCAT", strand="template", input_direction="5to3")
    assert template["protein"] == "MK*"
    assert template["coding_sequence"] == "ATGAAATAA"


@pytest.mark.parametrize("frame", [0, 4, -1, 1.5, True])
def test_invalid_frame(frame):
    with pytest.raises(ValueError):
        translate_rna("AUG", frame=frame)


@pytest.mark.parametrize("bad", ["", "AUGT", "AUGX", "AU G-"])
def test_invalid_rna(bad):
    with pytest.raises(ValueError):
        translate_rna(bad)


def test_short_rna_yields_empty_protein():
    result = translate_rna("AU")
    assert result["protein"] == ""
    assert result["ignored_bases"] == 2
