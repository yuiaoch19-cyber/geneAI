"""API 集成测试：健康检查、分析、FASTA 上传与历史记录 CRUD。"""

FASTA_OK = b">demo sequence\nATGC\nATGC\n"


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["app"] == "GeneAI"


def test_analyze_normal(client):
    response = client.post("/api/analyze", json={"sequence": "ATGC"})
    assert response.status_code == 200
    body = response.json()
    assert body["sequence"] == "ATGC"
    assert body["sequence_length"] == 4
    assert body["counts"] == {"a": 1, "t": 1, "g": 1, "c": 1, "n": 0}
    assert body["gc_content"] == 50.0
    assert body["at_content"] == 50.0
    assert body["complement"] == "TACG"
    assert body["reverse_complement"] == "GCAT"
    assert body["rna"] == "AUGC"
    assert body["algorithm_version"]


def test_analyze_normalizes_case_and_whitespace(client):
    response = client.post("/api/analyze", json={"sequence": " atg c\n"})
    assert response.status_code == 200
    assert response.json()["sequence"] == "ATGC"


def test_analyze_with_n_uses_acgt_denominator(client):
    response = client.post("/api/analyze", json={"sequence": "ATGN"})
    body = response.json()
    assert body["sequence_length"] == 4
    assert body["counts"]["n"] == 1
    assert body["gc_content"] == 33.33
    assert body["at_content"] == 66.67


def test_analyze_invalid_character(client):
    response = client.post("/api/analyze", json={"sequence": "ATGX"})
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "INVALID_SEQUENCE"
    assert "第 4 位" in body["detail"]


def test_analyze_rejects_rna(client):
    response = client.post("/api/analyze", json={"sequence": "AUGC"})
    assert response.status_code == 400
    assert "尿嘧啶" in response.json()["detail"]


def test_analyze_validation_error_shape(client):
    response = client.post("/api/analyze", json={"sequence": ""})
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["field"] == "sequence"


def test_fasta_upload(client):
    response = client.post(
        "/api/upload/fasta",
        files={"file": ("demo.fasta", FASTA_OK, "text/plain")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["sequence_name"] == "demo"
    assert body["sequence"] == "ATGCATGC"
    assert body["analysis"]["gc_content"] == 50.0


def test_fasta_upload_without_header(client):
    response = client.post(
        "/api/upload/fasta",
        files={"file": ("plain.txt", b"atgc atgc", "text/plain")},
    )
    assert response.status_code == 200
    assert response.json()["sequence"] == "ATGCATGC"


def test_fasta_upload_rejects_multiple_records(client):
    content = b">one\nATGC\n>two\nGGCC\n"
    response = client.post(
        "/api/upload/fasta", files={"file": ("two.fasta", content, "text/plain")}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_FASTA"


def test_fasta_upload_rejects_empty_file(client):
    response = client.post(
        "/api/upload/fasta", files={"file": ("empty.fasta", b"", "text/plain")}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "EMPTY_FILE"


def test_fasta_upload_rejects_oversized_file(client):
    payload = b">big\n" + b"A" * (2 * 1024 * 1024 + 10)
    response = client.post(
        "/api/upload/fasta", files={"file": ("big.fasta", payload, "text/plain")}
    )
    assert response.status_code == 413
    assert response.json()["code"] == "FILE_TOO_LARGE"


def test_history_create_and_get(client):
    created = client.post(
        "/api/history",
        json={"sequence_name": "测试序列", "original_sequence": "ATGC"},
    )
    assert created.status_code == 201
    record = created.json()
    assert record["sequence_name"] == "测试序列"
    assert record["sequence_length"] == 4
    assert record["original_sequence"] == "ATGC"
    assert record["created_at"].endswith("Z")

    fetched = client.get(f"/api/history/{record['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == record


def test_history_list_search_and_pagination(client):
    for index in range(3):
        client.post(
            "/api/history",
            json={"sequence_name": f"样本 {index}", "original_sequence": "ATGC"},
        )

    page = client.get("/api/history", params={"page": 1, "page_size": 2})
    body = page.json()
    assert body["total"] == 3
    assert body["pages"] == 2
    assert len(body["items"]) == 2

    search = client.get("/api/history", params={"q": "样本 1"})
    assert search.json()["total"] == 1
    assert search.json()["items"][0]["sequence_name"] == "样本 1"


def test_history_delete(client):
    created = client.post(
        "/api/history", json={"original_sequence": "ATGC"}
    ).json()

    deleted = client.delete(f"/api/history/{created['id']}")
    assert deleted.status_code == 204

    missing = client.get(f"/api/history/{created['id']}")
    assert missing.status_code == 404
    assert missing.json()["code"] == "NOT_FOUND"


def test_history_rejects_invalid_sequence(client):
    response = client.post("/api/history", json={"original_sequence": "ATGX"})
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_SEQUENCE"


def test_stats_reflect_saved_records(client):
    client.post(
        "/api/history",
        json={"sequence_name": "统计样本", "original_sequence": "GGCC"},
    )
    body = client.get("/api/stats/overview").json()
    assert body["total_analyses"] == 1
    assert body["total_sequences"] == 1
    assert body["average_gc"] == 100.0
    assert body["base_counts"]["g"] == 2
    assert body["recent"][0]["name"] == "统计样本"
