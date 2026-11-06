from app.services.map_features import (
    build_map,
    motif_sites,
    restriction_sites,
)

SEQ = "GAATTCAAAAGGATCCAAAGCTT"


def test_restriction_sites_are_one_based_cut_positions() -> None:
    sites, warnings = restriction_sites(SEQ, ["EcoRI", "BamHI", "HindIII"])
    assert warnings == []
    assert [(s["enzyme"], s["cut_position"]) for s in sites] == [
        ("EcoRI", 2),
        ("BamHI", 12),
        ("HindIII", 19),
    ]
    assert all(s["strand"] == "+" for s in sites)


def test_unknown_enzyme_is_reported() -> None:
    sites, warnings = restriction_sites(SEQ, ["NotAnEnzyme"])
    assert sites == []
    assert "不支持" in warnings[0]


def test_motif_positions_on_both_strands() -> None:
    plus, warnings = motif_sites("AAATATATGGG", ["TAT"])
    assert warnings == []
    plus_hits = [m for m in plus if m["strand"] == "+"]
    assert [(m["start"], m["end"]) for m in plus_hits] == [(4, 6), (6, 8)]
    assert any(m["strand"] == "-" for m in plus)

    reverse, _ = motif_sites("AAACCCTTT", ["GGG"])
    assert any(m["strand"] == "-" and (m["start"], m["end"]) == (4, 6) for m in reverse)


def test_invalid_motif_is_skipped() -> None:
    motifs, warnings = motif_sites("ATGC", ["AX", "T"])
    assert motifs == []
    assert len(warnings) == 2


def test_build_map_layers_and_gc_strategy() -> None:
    sequence = ("ATGC" * 30) + "TAA"
    data = build_map(
        sequence,
        window=20,
        step=10,
        min_orf_aa=1,
        enzymes=["EcoRI"],
        motifs=["ATGC"],
    )
    assert data["sequence_length"] == 123
    assert data["gc"]["window"] == 20
    assert data["gc"]["step"] == 10
    assert data["gc"]["points"][-1]["end"] == 120
    assert data["gc"]["points"][-1]["start"] == 100
    assert "完整窗口" in data["gc"]["strategy"]
    assert data["orf_total"] >= 1
    assert all(orf["is_potential"] is True for orf in data["orfs"])
    assert any(m["strand"] in {"+", "-"} for m in data["motifs"])
    assert "1-based" in data["coordinate_rule"]


def test_build_map_rejects_window_larger_than_sequence() -> None:
    try:
        build_map("ATGC", window=10, step=2)
    except ValueError as exc:
        assert "窗口" in str(exc)
    else:  # pragma: no cover
        raise AssertionError("expected ValueError")


def test_build_map_with_mutation_summary() -> None:
    data = build_map(
        "ATGGAACCTTGGTAA",
        window=5,
        step=5,
        mutation={
            "mutation_type": "substitution",
            "position": 7,
            "alt": "T",
        },
    )
    mutation = data["mutation"]
    assert mutation is not None
    assert mutation["position"] == 7
    assert mutation["label"] == "错义突变"
    assert mutation["original_protein"] != mutation["mutated_protein"]


def test_map_api_returns_layers(client) -> None:
    response = client.post(
        "/api/map",
        json={
            "sequence": SEQ,
            "window": 5,
            "step": 5,
            "enzymes": ["EcoRI"],
            "motifs": ["TAT"],
            "mutation": {
                "mutation_type": "substitution",
                "position": 4,
                "alt": "A",
            },
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["sequence_length"] == len(SEQ)
    assert body["restriction_sites"][0]["cut_position"] == 2
    assert body["mutation"]["position"] == 4
    assert body["gc"]["points"]


def test_map_api_rejects_invalid_window(client) -> None:
    response = client.post(
        "/api/map", json={"sequence": "ATGC", "window": 10, "step": 2}
    )
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "INVALID_MAP"
    assert body["field"] == "sequence"
