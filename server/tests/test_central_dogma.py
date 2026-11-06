import pytest

CODING = "ATGGAACCTTGGTAA"


def test_transcribe_coding(client):
    response = client.post("/api/transcribe", json={"sequence": CODING})
    assert response.status_code == 200
    data = response.json()
    assert data["rna"] == "AUGGAACCUUGGUAA"
    assert data["coding_sequence"] == CODING
    assert data["template_sequence"] == "TACCTTGGAACCATT"
    assert data["template_direction"] == "3'->5'"
    assert data["rna_direction"] == "5'->3'"
    assert data["length"] == 15


def test_transcribe_template_both_directions(client):
    forward = client.post(
        "/api/transcribe",
        json={"sequence": "TTACCAAGGTTCCAT", "strand": "template", "input_direction": "5to3"},
    )
    reverse = client.post(
        "/api/transcribe",
        json={"sequence": "TACCTTGGAACCATT", "strand": "template", "input_direction": "3to5"},
    )
    assert forward.status_code == reverse.status_code == 200
    assert forward.json()["rna"] == "AUGGAACCUUGGUAA"
    assert reverse.json()["rna"] == "AUGGAACCUUGGUAA"


def test_transcribe_rejects_invalid_sequence(client):
    response = client.post("/api/transcribe", json={"sequence": "ATGX"})
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "INVALID_SEQUENCE"
    assert body["field"] == "sequence"
    assert "第 4 位" in body["detail"]


def test_transcribe_rejects_rna_input(client):
    response = client.post("/api/transcribe", json={"sequence": "AUGC"})
    assert response.status_code == 400
    assert "DNA 序列请使用 T" in response.json()["detail"]


def test_translate_coding_strand(client):
    response = client.post("/api/translate", json={"sequence": CODING})
    assert response.status_code == 200
    data = response.json()
    assert data["rna"] == "AUGGAACCUUGGUAA"
    assert data["protein"] == "MEPW*"
    assert data["three_letters"] == ["Met", "Glu", "Pro", "Trp", "Stop"]
    assert data["start_codon"] == "AUG"
    assert data["stop_codon"] == "UAA"
    assert data["stopped_at"] == 4
    assert len(data["codons"]) == 5
    assert data["codons"][0] == {
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


def test_translate_frame_two(client):
    response = client.post("/api/translate", json={"sequence": "ATGGAA", "frame": 2})
    assert response.status_code == 200
    data = response.json()
    assert data["protein"] == "W"
    assert data["ignored_bases"] == 2


def test_translate_incomplete_codon(client):
    response = client.post("/api/translate", json={"sequence": "ATGGA"})
    data = response.json()
    assert data["protein"] == "M"
    assert data["ignored_bases"] == 2
    assert any("不足一个密码子" in warning for warning in data["warnings"])


def test_translate_stop_at_stop_false(client):
    response = client.post(
        "/api/translate",
        json={"sequence": "ATGTAAATG", "stop_at_stop": False},
    )
    data = response.json()
    assert data["protein"] == "M*M"
    assert data["stop_codon"] == "UAA"


def test_translate_template_strand(client):
    response = client.post(
        "/api/translate",
        json={"sequence": "TACCTTGGAACCATT", "strand": "template", "input_direction": "3to5"},
    )
    data = response.json()
    assert data["protein"] == "MEPW*"
    assert data["coding_sequence"] == CODING


@pytest.mark.parametrize("frame", [0, 4, -1])
def test_translate_invalid_frame(client, frame):
    response = client.post(
        "/api/translate", json={"sequence": "ATGAAA", "frame": frame}
    )
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_translate_invalid_base(client):
    response = client.post("/api/translate", json={"sequence": "ATGZ"})
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_SEQUENCE"
