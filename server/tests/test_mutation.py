import pytest

from app.services.mutation import apply_mutation, classify_mutation

ORIGINAL = "ATGAAATAA"


def test_substitution_applies_and_classifies_missense():
    result = apply_mutation(ORIGINAL, "substitution", 4, alt="G")
    assert result["mutated_sequence"] == "ATGGAATAA"
    assert result["deleted_sequence"] == "A"
    assert result["inserted_sequence"] == "G"
    assert result["length_delta"] == 0

    effect = classify_mutation(ORIGINAL, result["mutated_sequence"], position=4)
    assert effect["consequence"] == "missense"
    assert effect["label"] == "错义突变"
    assert effect["original_protein"] == "MK*"
    assert effect["mutated_protein"] == "ME*"
    assert effect["affected_codon"] == 2
    assert effect["changed_amino_acids"] == [
        {"index": 1, "original": "K", "mutated": "E"}
    ]


def test_synonymous_substitution():
    result = apply_mutation(ORIGINAL, "substitution", 6, alt="G")
    assert result["mutated_sequence"] == "ATGAAGTAA"
    effect = classify_mutation(ORIGINAL, result["mutated_sequence"])
    assert effect["consequence"] == "synonymous"
    assert effect["label"] == "同义突变"
    assert effect["changed_amino_acids"] == []


def test_substitution_creating_early_stop_is_nonsense():
    result = apply_mutation(ORIGINAL, "substitution", 4, alt="T")
    effect = classify_mutation(ORIGINAL, result["mutated_sequence"])
    assert result["mutated_sequence"] == "ATGTAATAA"
    assert effect["consequence"] == "nonsense"
    assert effect["mutated_stop_index"] == 1


def test_single_base_insertion_is_frameshift():
    result = apply_mutation(ORIGINAL, "insertion", 4, alt="A")
    assert result["mutated_sequence"] == "ATGAAAATAA"
    assert result["length_delta"] == 1
    effect = classify_mutation(ORIGINAL, result["mutated_sequence"])
    assert effect["consequence"] == "frameshift"


def test_in_frame_insertion_preserves_reading_frame():
    result = apply_mutation(ORIGINAL, "insertion", 3, alt="GGG")
    assert result["mutated_sequence"] == "ATGGGGAAATAA"
    assert result["length_delta"] == 3
    effect = classify_mutation(ORIGINAL, result["mutated_sequence"])
    assert effect["consequence"] == "in-frame indel"


def test_deletion_of_codon_is_in_frame():
    result = apply_mutation(ORIGINAL, "deletion", 4, length=3)
    assert result["mutated_sequence"] == "ATGTAA"
    assert result["deleted_sequence"] == "AAA"
    assert result["length_delta"] == -3
    effect = classify_mutation(ORIGINAL, result["mutated_sequence"])
    assert effect["consequence"] == "in-frame indel"


def test_deletion_removing_stop_is_stop_lost():
    result = apply_mutation(ORIGINAL, "deletion", 7, ref="TAA")
    assert result["mutated_sequence"] == "ATGAAA"
    effect = classify_mutation(ORIGINAL, result["mutated_sequence"])
    assert effect["consequence"] == "stop_lost"
    assert effect["mutated_stop_index"] is None


def test_multi_base_substitution():
    result = apply_mutation(ORIGINAL, "substitution", 4, ref="AAA", alt="GGG")
    assert result["mutated_sequence"] == "ATGGGGTAA"
    effect = classify_mutation(ORIGINAL, result["mutated_sequence"])
    assert effect["consequence"] == "missense"


def test_insertion_at_sequence_start():
    result = apply_mutation(ORIGINAL, "insertion", 0, alt="GGG")
    assert result["mutated_sequence"] == "GGGATGAAATAA"
    assert result["position"] == 0


def test_short_sequence_has_no_protein():
    effect = classify_mutation("AT", "AT")
    assert effect["consequence"] == "no_protein"


@pytest.mark.parametrize(
    "mutation_type,position,kwargs",
    [
        ("inversion", 1, {"alt": "A"}),
        ("substitution", 0, {"alt": "A"}),
        ("substitution", 1, {"alt": ""}),
        ("substitution", 1, {"ref": "G", "alt": "A"}),
        ("insertion", 10, {"alt": "A"}),
        ("insertion", 1, {"alt": ""}),
        ("deletion", 1, {"length": 20}),
        ("deletion", 1, {"length": 0}),
    ],
)
def test_invalid_mutations_raise(mutation_type, position, kwargs):
    with pytest.raises(ValueError):
        apply_mutation(ORIGINAL, mutation_type, position, **kwargs)


def test_invalid_classification_arguments():
    with pytest.raises(ValueError):
        classify_mutation(ORIGINAL, ORIGINAL, frame=4)
    with pytest.raises(ValueError):
        classify_mutation(ORIGINAL, ORIGINAL, position=0)
    with pytest.raises(ValueError):
        classify_mutation("", ORIGINAL)
