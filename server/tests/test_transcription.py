import pytest

from app.services.transcription import complement, reverse_complement, transcribe

CODING = "ATGGAACCTTGGTAA"
TEMPLATE_3TO5 = "TACCTTGGAACCATT"
TEMPLATE_5TO3 = "TTACCAAGGTTCCAT"


def test_complement_and_reverse_complement():
    assert complement(CODING) == TEMPLATE_3TO5
    assert reverse_complement(CODING) == TEMPLATE_5TO3


def test_coding_strand_transcription():
    result = transcribe(CODING, strand="coding")
    assert result["rna"] == "AUGGAACCUUGGUAA"
    assert result["coding_sequence"] == CODING
    assert result["template_sequence"] == TEMPLATE_3TO5
    assert result["template_direction"] == "3'->5'"
    assert result["rna_direction"] == "5'->3'"
    assert result["length"] == 15


def test_template_strand_5to3():
    result = transcribe(TEMPLATE_5TO3, strand="template", input_direction="5to3")
    assert result["rna"] == "AUGGAACCUUGGUAA"
    assert result["coding_sequence"] == CODING
    assert result["template_direction"] == "5'->3'"


def test_template_strand_3to5():
    result = transcribe(TEMPLATE_3TO5, strand="template", input_direction="3to5")
    assert result["rna"] == "AUGGAACCUUGGUAA"
    assert result["coding_sequence"] == CODING


def test_lowercase_and_whitespace_are_normalized():
    result = transcribe(" atg gaa\n cct tgg taa ")
    assert result["coding_sequence"] == CODING
    assert result["rna"] == "AUGGAACCUUGGUAA"


def test_n_is_preserved_not_silently_converted():
    result = transcribe("ATGNNN")
    assert result["rna"] == "AUGNNN"


@pytest.mark.parametrize("strand", ["", "mRNA", "both"])
def test_invalid_strand(strand):
    with pytest.raises(ValueError):
        transcribe(CODING, strand=strand)


def test_coding_strand_must_be_5to3():
    with pytest.raises(ValueError):
        transcribe(CODING, strand="coding", input_direction="3to5")


def test_invalid_direction():
    with pytest.raises(ValueError):
        transcribe(CODING, strand="template", input_direction="5-3")


@pytest.mark.parametrize("bad", ["", "   ", "ATGU", "ATGX", "ATG-"])
def test_invalid_dna_input(bad):
    with pytest.raises(ValueError):
        transcribe(bad)
