"""比对 API 测试：预览、保存、列表、详情、删除、错误与统计。"""

from fastapi.testclient import TestClient

REFERENCE = "ATGCATGCATGC"
QUERY = "ATGCATGTATGC"  # 1 处替换


def test_compare_preview(client: TestClient) -> None:
    response = client.post(
        "/api/compare",
        json={"reference": REFERENCE, "query": QUERY},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reference_sequence"] == REFERENCE
    assert body["query_sequence"] == QUERY
    assert body["substitutions"] == 1
    assert body["insertions"] == body["deletions"] == 0
    assert body["difference_count"] == 1
    assert body["aligned_reference"] == REFERENCE
    assert body["aligned_query"] == QUERY
    assert len(body["aligned_reference"]) == len(body["aligned_query"])
    assert body["algorithm"].startswith("Biopython PairwiseAligner")
    assert body["scoring"]["match_score"] == 2.0
    assert body["reference_name"] == "参考序列"


def test_compare_preview_does_not_save(client: TestClient) -> None:
    client.post("/api/compare", json={"reference": "ATGC", "query": "ATGC"})
    listed = client.get("/api/comparisons")
    assert listed.json()["total"] == 0


def test_invalid_reference_and_query_fields(client: TestClient) -> None:
    bad_ref = client.post(
        "/api/compare", json={"reference": "ATGX", "query": "ATGC"}
    )
    assert bad_ref.status_code == 400
    assert bad_ref.json()["code"] == "INVALID_SEQUENCE"
    assert bad_ref.json()["field"] == "reference"
    assert "第 4 位" in bad_ref.json()["detail"]

    bad_query = client.post(
        "/api/compare", json={"reference": "ATGC", "query": "ATGU"}
    )
    assert bad_query.status_code == 400
    assert bad_query.json()["field"] == "query"


def test_compare_limits_each_sequence(client: TestClient) -> None:
    response = client.post(
        "/api/compare",
        json={"reference": "A" * 5001, "query": "A" * 10},
    )
    assert response.status_code == 413
    assert response.json()["code"] == "ALIGNMENT_TOO_LONG"
    assert response.json()["field"] == "reference"


def test_save_list_get_delete_comparison(client: TestClient) -> None:
    created = client.post(
        "/api/comparisons",
        json={
            "reference": "ATGGCCTAA",
            "query": "ATGGACCTAA",
            "reference_name": "参考 A",
            "query_name": "样本 B",
        },
    )
    assert created.status_code == 201
    body = created.json()
    record_id = body["id"]
    assert body["name"] == "参考 A vs 样本 B"
    assert body["insertions"] == 1
    assert body["differences"][0]["type"] == "insertion"
    assert body["created_at"].endswith("Z")

    listed = client.get("/api/comparisons")
    assert listed.status_code == 200
    page = listed.json()
    assert page["total"] == 1
    assert page["items"][0]["id"] == record_id
    assert page["pages"] == 1

    searched = client.get("/api/comparisons", params={"q": "样本"})
    assert searched.json()["total"] == 1
    missed = client.get("/api/comparisons", params={"q": "不存在"})
    assert missed.json()["total"] == 0

    detail = client.get(f"/api/comparisons/{record_id}")
    assert detail.status_code == 200
    assert detail.json()["query_sequence"] == "ATGGACCTAA"

    deleted = client.delete(f"/api/comparisons/{record_id}")
    assert deleted.status_code == 204
    assert client.get(f"/api/comparisons/{record_id}").status_code == 404
    assert client.delete(f"/api/comparisons/{record_id}").status_code == 404


def test_comparisons_count_towards_stats(client: TestClient) -> None:
    client.post(
        "/api/comparisons",
        json={"reference": "ATGC", "query": "ATGT"},
    )
    stats = client.get("/api/stats/overview").json()
    assert stats["total_analyses"] == 1
    assert stats["total_sequences"] == 2
    assert stats["recent"] == []
