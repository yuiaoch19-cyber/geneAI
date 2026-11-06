from types import SimpleNamespace

import httpx
import pytest

from app.services import clinvar

SAMPLE = {
    "uid": "12345",
    "obj_type": "single nucleotide variant",
    "accession_version": "VCV000012345.1",
    "title": "NM_001065.4(TNFRSF1A):c.295T>A (p.Cys99Ser)",
    "variation_set": [
        {
            "canonical_spdi": "NC_000012.12:6333763:A:T",
            "variation_loc": [
                {
                    "status": "current",
                    "assembly_name": "GRCh38",
                    "chr": "12",
                    "band": "12p13.31",
                    "start": "6333764",
                    "stop": "6333764",
                    "ref": "",
                    "alt": "",
                }
            ],
        }
    ],
    "genes": [{"symbol": "TNFRSF1A", "geneid": "7132"}],
    "germline_classification": {
        "description": "Pathogenic",
        "review_status": "no assertion criteria provided",
        "last_evaluated": "2024/01/01 00:00",
        "trait_set": [{"trait_name": "TNF receptor-associated periodic fever syndrome"}],
    },
}


@pytest.fixture(autouse=True)
def clear_cache():
    clinvar._cache.clear()
    yield
    clinvar._cache.clear()


def test_classify_query_types():
    assert clinvar.classify_query("BRCA1") == ("gene", "BRCA1[gene]")
    assert clinvar.classify_query("rs80357906")[0] == "variant"
    assert clinvar.classify_query("VCV000012345")[0] == "variant"
    assert clinvar.classify_query("12345") == ("id", "12345[uid]")
    assert clinvar.classify_query("NM_007294.4(BRCA1):c.68_69del")[0] == "variant"


def test_raw_dna_is_rejected():
    with pytest.raises(clinvar.UnsupportedQuery, match="缺少参考基因组"):
        clinvar.classify_query("ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCC")


def test_parse_record_fields():
    item = clinvar.parse_record("12345", SAMPLE, "2026-01-01T00:00:00Z")
    assert item["gene"] == "TNFRSF1A"
    assert item["accession"] == "VCV000012345.1"
    assert item["transcript"] == "NM_001065.4"
    assert item["reference_sequence"] == "NC_000012.12"
    assert item["ref_allele"] == "A"
    assert item["alt_allele"] == "T"
    assert item["location"]["start"] == 6333764
    assert item["genome_build"] == "GRCh38"
    assert item["clinical_significance"] == "Pathogenic"
    assert item["significance_class"] == "pathogenic"
    assert item["review_status_label"] == "未提供审核标准"
    assert item["last_evaluated"] == "2024-01-01"
    assert item["phenotypes"] == ["TNF receptor-associated periodic fever syndrome"]
    assert item["url"].endswith("/variation/12345/")
    assert item["missing_fields"] == []


def test_vus_is_not_pathogenic():
    record = {
        **SAMPLE,
        "germline_classification": {
            **SAMPLE["germline_classification"],
            "description": "Uncertain significance",
        },
    }
    item = clinvar.parse_record("12345", record, "2026-01-01T00:00:00Z")
    assert item["significance_class"] == "vus"
    assert item["clinical_significance"] == "Uncertain significance"


def test_missing_fields_are_reported():
    item = clinvar.parse_record("1", {"uid": "1", "title": "unknown"}, "now")
    assert item["clinical_significance"] == "未提供"
    assert {"基因", "临床意义", "基因组位置", "等位基因"} <= set(item["missing_fields"])


def test_search_uses_cache(monkeypatch):
    calls = {"count": 0}

    def fake_request(endpoint, params):
        calls["count"] += 1
        if endpoint == "esearch.fcgi":
            return {"esearchresult": {"count": "1", "idlist": ["12345"]}}
        return {"result": {"12345": SAMPLE}}

    monkeypatch.setattr(clinvar, "_request_json", fake_request)
    first = clinvar.search_variants("TNFRSF1A", "gene", 5)
    second = clinvar.search_variants("TNFRSF1A", "gene", 5)

    assert first["total"] == 1 and first["returned"] == 1
    assert first["cached"] is False
    assert second["cached"] is True
    assert calls["count"] == 2  # 第二次完全命中缓存


def test_empty_result_warning(monkeypatch):
    monkeypatch.setattr(
        clinvar,
        "_request_json",
        lambda endpoint, params: {"esearchresult": {"count": "0", "idlist": []}},
    )
    payload = clinvar.search_variants("NONEXISTENTGENE")
    assert payload["total"] == 0
    assert payload["items"] == []
    assert any("没有找到" in warning for warning in payload["warnings"])


def test_rate_limit_error(monkeypatch):
    def fake_get(*args, **kwargs):
        return SimpleNamespace(status_code=429, json=lambda: {})

    monkeypatch.setattr(clinvar.httpx, "get", fake_get)
    with pytest.raises(clinvar.ClinVarError) as exc:
        clinvar._request_json("esummary.fcgi", {"id": "1"})
    assert exc.value.code == "RATE_LIMITED"


def test_timeout_error(monkeypatch):
    def fake_get(*args, **kwargs):
        raise httpx.TimeoutException("timeout")

    monkeypatch.setattr(clinvar.httpx, "get", fake_get)
    with pytest.raises(clinvar.ClinVarError) as exc:
        clinvar._request_json("esummary.fcgi", {"id": "1"})
    assert exc.value.code == "DATABASE_TIMEOUT"


def test_get_variation_not_found(monkeypatch):
    monkeypatch.setattr(
        clinvar,
        "_request_json",
        lambda endpoint, params: {"result": {"error": "cannot get document summary"}},
    )
    with pytest.raises(clinvar.ClinVarError) as exc:
        clinvar.get_variation("999999999")
    assert exc.value.code == "NOT_FOUND"


def test_api_search(monkeypatch, client):
    monkeypatch.setattr(
        clinvar,
        "search_variants",
        lambda q, query_type, limit: {
            "query": q,
            "query_type": "gene",
            "source": "ClinVar",
            "total": 1,
            "returned": 1,
            "retrieved_at": "2026-01-01T00:00:00Z",
            "cached": False,
            "items": [clinvar.parse_record("12345", SAMPLE, "2026-01-01T00:00:00Z")],
            "warnings": [],
        },
    )
    response = client.get("/api/variants/search", params={"q": "TNFRSF1A"})
    assert response.status_code == 200
    body = response.json()
    assert body["items"][0]["gene"] == "TNFRSF1A"
    assert body["source"] == "ClinVar"


def test_api_raw_dna_returns_400(client):
    response = client.get(
        "/api/variants/search", params={"q": "ATGGTGCATCTGACTCCTGAGGAGAAG"}
    )
    assert response.status_code == 400
    assert response.json()["code"] == "UNSUPPORTED_QUERY"


def test_api_external_error_returns_503(monkeypatch, client):
    def boom(*args, **kwargs):
        raise clinvar.ClinVarError("ClinVar 服务暂时不可用", "DATABASE_UNAVAILABLE")

    monkeypatch.setattr(clinvar, "search_variants", boom)
    response = client.get("/api/variants/search", params={"q": "BRCA1"})
    assert response.status_code == 503
    assert response.json()["code"] == "DATABASE_UNAVAILABLE"
