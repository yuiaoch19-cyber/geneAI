def test_orfs_forward(client):
    response = client.post("/api/orfs", json={"sequence": "ATGGAACCTTGGTAA"})
    assert response.status_code == 200
    body = response.json()
    assert body["sequence_length"] == 15
    assert body["count"] == 1
    assert body["frames_scanned"] == 6
    orf = body["orfs"][0]
    assert (orf["strand"], orf["start"], orf["end"]) == ("+", 1, 15)
    assert orf["protein"] == "MEPW"
    assert orf["is_potential"] is True


def test_orfs_nested_strategy(client):
    response = client.post(
        "/api/orfs",
        json={"sequence": "ATGATGAAATAG", "include_nested": False},
    )
    assert response.status_code == 200
    assert response.json()["count"] == 1


def test_orfs_invalid_sequence(client):
    response = client.post("/api/orfs", json={"sequence": "ATGX"})
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_SEQUENCE"
