"""突变模拟 API 行为测试。"""

import pytest

SEQ = "ATGGAACCTTGGTAA"


def mutate(client, **overrides):
    payload = {
        "sequence": SEQ,
        "mutation_type": "substitution",
        "position": 6,
        "alt": "G",
    }
    payload.update(overrides)
    return client.post("/api/mutate", json=payload)


def test_synonymous_substitution(client):
    response = mutate(client)
    assert response.status_code == 200
    body = response.json()
    assert body["consequence"] == "synonymous"
    assert body["label"] == "同义突变"
    assert body["original_protein"] == body["mutated_protein"] == "MEPW*"
    assert body["protein_length_delta"] == 0
    assert body["is_premature_stop"] is False
    assert body["original_rna"] == "AUGGAACCUUGGUAA"
    assert body["mutated_rna"] == "AUGGAGCCUUGGUAA"


def test_missense_substitution(client):
    response = mutate(client, position=7, alt="T")
    body = response.json()
    assert response.status_code == 200
    assert body["consequence"] == "missense"
    assert body["label"] == "错义突变"
    assert body["original_protein"] == "MEPW*"
    assert body["mutated_protein"] == "MESW*"
    assert body["changed_amino_acids"] == [{"index": 2, "original": "P", "mutated": "S"}]
    assert body["affected_codon"] == 3
    assert any(change["type"] == "substitution" for change in body["protein_changes"])


def test_nonsense_premature_stop(client):
    response = mutate(client, position=11, alt="A")
    body = response.json()
    assert response.status_code == 200
    assert body["consequence"] == "nonsense"
    assert body["is_premature_stop"] is True
    assert body["mutated_protein"] == "MEP*"
    assert body["mutated_protein_length"] == 3


def test_single_base_insertion_is_frameshift(client):
    response = mutate(client, mutation_type="insertion", position=4, alt="A")
    body = response.json()
    assert response.status_code == 200
    assert body["mutation"]["length_delta"] == 1
    assert body["consequence"] == "frameshift"


def test_single_base_deletion_is_frameshift(client):
    response = mutate(
        client, mutation_type="deletion", position=5, alt="", length=1
    )
    body = response.json()
    assert response.status_code == 200
    assert body["mutation"]["length_delta"] == -1
    assert body["consequence"] == "frameshift"


def test_three_base_insertion_is_in_frame(client):
    response = mutate(
        client, mutation_type="insertion", position=3, alt="GGG"
    )
    body = response.json()
    assert response.status_code == 200
    assert body["mutation"]["length_delta"] == 3
    assert body["consequence"] == "in-frame indel"
    assert body["mutated_protein"] == "MGEPW*"


def test_three_base_deletion_is_in_frame(client):
    response = mutate(
        client, mutation_type="deletion", position=4, alt="", length=3
    )
    body = response.json()
    assert response.status_code == 200
    assert body["mutation"]["length_delta"] == -3
    assert body["consequence"] == "in-frame indel"
    assert body["mutated_protein"] == "MPW*"
    assert body["protein_length_delta"] == -1


def test_multi_base_substitution(client):
    response = mutate(client, position=4, ref="GAA", alt="TTT")
    body = response.json()
    assert response.status_code == 200
    assert body["mutated_sequence"] == "ATGTTTCCTTGGTAA"
    assert body["consequence"] == "missense"
    assert body["mutated_protein"] == "MFPW*"


def test_template_strand_mutation(client):
    response = mutate(
        client,
        sequence="TACCTTGGAACCATT",
        position=6,
        alt="C",
        strand="template",
        input_direction="3to5",
    )
    body = response.json()
    assert response.status_code == 200
    assert body["original_rna"] == "AUGGAACCUUGGUAA"
    assert body["mutated_rna"] == "AUGGAGCCUUGGUAA"
    assert body["consequence"] == "synonymous"


def test_insertion_at_sequence_start(client):
    response = mutate(
        client, mutation_type="insertion", position=0, alt="GGG"
    )
    body = response.json()
    assert response.status_code == 200
    assert body["mutated_sequence"].startswith("GGGATG")
    assert body["mutation"]["position"] == 0


def test_invalid_position(client):
    response = mutate(client, position=0)
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_MUTATION"


@pytest.mark.parametrize("bad_alt", ["X", "U", "AT-"])
def test_invalid_alt_base(client, bad_alt):
    response = mutate(client, position=6, alt=bad_alt)
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_MUTATION"


def test_ref_mismatch(client):
    response = mutate(client, position=4, ref="CCC", alt="TTT")
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_MUTATION"


def test_invalid_frame_is_validation_error(client):
    response = mutate(client, frame=4)
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
