"""ClinVar 查询服务（NCBI E-utilities）。

仅做已知变异的数据库注释查询，不把序列差异推断为疾病结论。
E-utilities 文档：https://www.ncbi.nlm.nih.gov/books/NBK25499/
"""

from __future__ import annotations

import os
import re
import threading
import time
from datetime import datetime, timezone

import httpx

EUTILS_BASE = os.getenv(
    "CLINVAR_EUTILS_BASE", "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
).rstrip("/")
NCBI_TOOL = "GeneAI"
NCBI_EMAIL = os.getenv("NCBI_EMAIL", "dev@geneai.local")
NCBI_API_KEY = os.getenv("NCBI_API_KEY", "").strip()
CACHE_TTL = int(os.getenv("CLINVAR_CACHE_TTL", "600"))
MIN_INTERVAL = 0.11 if NCBI_API_KEY else 0.35
MAX_LIMIT = 20
REQUEST_TIMEOUT = 8.0

_CLINVAR_URL = "https://www.ncbi.nlm.nih.gov/clinvar/variation/{uid}/"
_DNA_RE = re.compile(r"^[ACGTNacgtn\s]+$")
_RS_RE = re.compile(r"^rs\d+$", re.IGNORECASE)
_VCV_RE = re.compile(r"^VCV\d+$", re.IGNORECASE)
_ACCESSION_RE = re.compile(r"^([A-Z]{2}_\d+(?:\.\d+)?)")

_cache: dict[str, tuple[float, dict]] = {}
_cache_lock = threading.Lock()
_throttle_lock = threading.Lock()
_last_request = 0.0


class ClinVarError(RuntimeError):
    """外部服务不可用或返回异常。"""

    def __init__(self, message: str, code: str = "EXTERNAL_API_ERROR"):
        super().__init__(message)
        self.code = code


class UnsupportedQuery(ValueError):
    """查询内容不足以定位 ClinVar 记录。"""


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _throttle() -> None:
    global _last_request
    with _throttle_lock:
        wait = MIN_INTERVAL - (time.monotonic() - _last_request)
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()


def _request_json(endpoint: str, params: dict) -> dict:
    merged = {
        "db": "clinvar",
        "retmode": "json",
        "tool": NCBI_TOOL,
        "email": NCBI_EMAIL,
        **params,
    }
    if NCBI_API_KEY:
        merged["api_key"] = NCBI_API_KEY
    _throttle()
    try:
        response = httpx.get(
            f"{EUTILS_BASE}/{endpoint}",
            params=merged,
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": "GeneAI/0.9 (educational project)"},
        )
    except httpx.TimeoutException as exc:
        raise ClinVarError("ClinVar 请求超时，请稍后重试。", "DATABASE_TIMEOUT") from exc
    except httpx.HTTPError as exc:
        raise ClinVarError("无法连接 ClinVar，请检查网络后重试。", "DATABASE_UNAVAILABLE") from exc

    if response.status_code == 429:
        raise ClinVarError("ClinVar 访问频率超限，请稍后重试。", "RATE_LIMITED")
    if response.status_code >= 500:
        raise ClinVarError("ClinVar 服务暂时不可用，请稍后重试。", "DATABASE_UNAVAILABLE")
    if response.status_code != 200:
        raise ClinVarError(f"ClinVar 返回异常状态：{response.status_code}")
    try:
        return response.json()
    except ValueError as exc:
        raise ClinVarError("ClinVar 返回了无法解析的数据。", "INVALID_RESPONSE") from exc


def classify_query(query: str, query_type: str = "auto") -> tuple[str, str]:
    """把用户输入归一化为 esearch 检索词，返回 (类型, term)。"""
    text = query.strip()
    if not text:
        raise UnsupportedQuery("请输入基因名、变异标识或 ClinVar Variation ID。")
    if _DNA_RE.match(text) and len(re.sub(r"\s", "", text)) >= 20:
        raise UnsupportedQuery(
            "这是一段 DNA 序列，缺少参考基因组、染色体位置和转录本信息，"
            "无法可靠匹配 ClinVar。请改用基因名（如 BRCA1）、rs 编号或 ClinVar ID。"
        )

    kind = query_type if query_type != "auto" else _guess_type(text)
    if kind == "id":
        if not text.isdigit():
            raise UnsupportedQuery("ClinVar Variation ID 应为数字。")
        return kind, f"{text}[uid]"
    if kind == "gene":
        if not re.match(r"^[A-Za-z0-9][A-Za-z0-9_.-]{1,24}$", text):
            raise UnsupportedQuery("基因名格式不正确。")
        return kind, f"{text}[gene]"
    if kind == "variant":
        return kind, text
    raise UnsupportedQuery("不支持的查询类型。")


def _guess_type(text: str) -> str:
    if text.isdigit():
        return "id"
    if _RS_RE.match(text) or _VCV_RE.match(text):
        return "variant"
    if any(token in text for token in ("c.", "p.", "del", "dup", "ins", ">", ":")):
        return "variant"
    return "gene"


def _parse_location(record: dict) -> tuple[list[dict], str | None]:
    variation = (record.get("variation_set") or [{}])[0]
    spdi = variation.get("canonical_spdi") or ""
    spdi_parts = spdi.split(":")
    spdi_ref = spdi_parts[2] if len(spdi_parts) == 4 else ""
    spdi_alt = spdi_parts[3] if len(spdi_parts) == 4 else ""
    locations = []
    for loc in variation.get("variation_loc") or []:
        start = loc.get("start") or ""
        stop = loc.get("stop") or ""
        if not start:
            continue
        locations.append(
            {
                "assembly": loc.get("assembly_name") or "",
                "chromosome": loc.get("chr") or "",
                "start": int(start),
                "stop": int(stop) if stop.isdigit() else int(start),
                "ref": loc.get("ref") or spdi_ref,
                "alt": loc.get("alt") or spdi_alt,
                "band": loc.get("band") or "",
            }
        )
    preferred = next((item for item in locations if item["assembly"] == "GRCh38"), None)
    if preferred is None and locations:
        preferred = locations[0]
    return locations, (preferred["assembly"] if preferred else None)


def _significance(record: dict) -> tuple[str, str]:
    for key in ("germline_classification", "clinical_impact_classification", "oncogenicity_classification"):
        section = record.get(key) or {}
        description = (section.get("description") or "").strip()
        if description:
            return description, _significance_class(description)
    return "", "unknown"


def _significance_class(description: str) -> str:
    text = description.lower()
    if "conflicting" in text:
        return "conflicting"
    if "uncertain" in text or "vus" in text:
        return "vus"
    if "likely pathogenic" in text:
        return "likely_pathogenic"
    if "pathogenic" in text:
        return "pathogenic"
    if "likely benign" in text:
        return "likely_benign"
    if "benign" in text:
        return "benign"
    if "drug response" in text:
        return "drug_response"
    if "risk factor" in text:
        return "risk_factor"
    return "other"


def _review_label(status: str) -> str:
    mapping = {
        "practice guideline": "临床实践指南",
        "reviewed by expert panel": "专家小组审核",
        "criteria provided, multiple submitters, no conflicts": "多提交者一致",
        "criteria provided, conflicting classifications": "提交分类存在冲突",
        "criteria provided, single submitter": "单提交者提供标准",
        "no assertion criteria provided": "未提供审核标准",
        "no classification provided": "未提供分类",
        "no assertion provided": "未提供断言",
        "flagged submission": "被标记的提交",
        "classified by multiple submitters": "多提交者分类",
    }
    return mapping.get(status.strip().lower(), status or "未提供")


def _format_date(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    for fmt in ("%Y/%m/%d %H:%M", "%Y/%m/%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return text


def parse_record(uid: str, record: dict, retrieved_at: str) -> dict:
    variation = (record.get("variation_set") or [{}])[0]
    locations, build = _parse_location(record)
    significance, significance_class = _significance(record)
    classification = record.get("germline_classification") or {}
    genes = [gene.get("symbol") for gene in record.get("genes") or [] if gene.get("symbol")]
    title = record.get("title") or ""
    accession_match = _ACCESSION_RE.match(title)
    phenotypes = [
        trait.get("trait_name")
        for trait in classification.get("trait_set") or []
        if trait.get("trait_name")
    ]
    spdi = variation.get("canonical_spdi") or ""
    spdi_parts = spdi.split(":")
    ref_allele = spdi_parts[2] if len(spdi_parts) == 4 else ""
    alt_allele = spdi_parts[3] if len(spdi_parts) == 4 else ""
    for loc in locations:
        if loc["ref"]:
            ref_allele = ref_allele or loc["ref"]
        if loc["alt"]:
            alt_allele = alt_allele or loc["alt"]

    missing = []
    if not genes:
        missing.append("基因")
    if not significance:
        missing.append("临床意义")
    if not locations:
        missing.append("基因组位置")
    if not ref_allele or not alt_allele:
        missing.append("等位基因")
    if not phenotypes:
        missing.append("相关表型")

    return {
        "id": str(uid),
        "accession": record.get("accession_version") or record.get("accession") or "",
        "title": title,
        "gene": genes[0] if genes else "",
        "genes": genes,
        "variant_type": record.get("obj_type") or variation.get("variant_type") or "",
        "ref_allele": ref_allele,
        "alt_allele": alt_allele,
        "spdi": spdi,
        "location": locations[0] if locations else None,
        "locations": locations,
        "genome_build": build or "",
        "transcript": accession_match.group(1) if accession_match else "",
        "reference_sequence": spdi_parts[0] if len(spdi_parts) == 4 else "",
        "clinical_significance": significance or "未提供",
        "significance_class": significance_class,
        "review_status": classification.get("review_status") or "",
        "review_status_label": _review_label(classification.get("review_status") or ""),
        "last_evaluated": _format_date(classification.get("last_evaluated") or ""),
        "phenotypes": phenotypes,
        "source": "ClinVar",
        "url": _CLINVAR_URL.format(uid=uid),
        "retrieved_at": retrieved_at,
        "missing_fields": missing,
    }


def _cached(key: str) -> dict | None:
    with _cache_lock:
        entry = _cache.get(key)
    if not entry:
        return None
    created, value = entry
    if time.monotonic() - created > CACHE_TTL:
        with _cache_lock:
            _cache.pop(key, None)
        return None
    return value


def _store(key: str, value: dict) -> None:
    with _cache_lock:
        if len(_cache) > 200:
            oldest = min(_cache.items(), key=lambda item: item[1][0])[0]
            _cache.pop(oldest, None)
        _cache[key] = (time.monotonic(), value)


def search_variants(query: str, query_type: str = "auto", limit: int = 10) -> dict:
    kind, term = classify_query(query, query_type)
    limit = max(1, min(int(limit), MAX_LIMIT))
    key = f"search:{kind}:{query.strip().lower()}:{limit}"
    cached = _cached(key)
    if cached is not None:
        return {**cached, "cached": True}

    search = _request_json(
        "esearch.fcgi", {"term": term, "retmax": limit, "retmode": "json"}
    )
    result = search.get("esearchresult") or {}
    if result.get("ERROR"):
        raise ClinVarError(f"ClinVar 检索失败：{result['ERROR']}", "QUERY_FAILED")
    ids = [str(item) for item in result.get("idlist") or []]
    total = int(result.get("count") or 0)
    retrieved_at = _now_iso()

    items: list[dict] = []
    if ids:
        summary = _request_json(
            "esummary.fcgi", {"id": ",".join(ids), "retmode": "json"}
        )
        result_map = summary.get("result") or {}
        for uid in ids:
            record = result_map.get(uid)
            if isinstance(record, dict):
                items.append(parse_record(uid, record, retrieved_at))

    warnings = []
    if total == 0:
        warnings.append("没有找到匹配的 ClinVar 记录。")
    incomplete = sum(1 for item in items if item["missing_fields"])
    if incomplete:
        warnings.append(f"{incomplete} 条记录存在缺失字段，已用「未提供」或空值标注。")
    if total > len(items):
        warnings.append(f"仅返回前 {len(items)} 条，共 {total} 条匹配。")

    payload = {
        "query": query.strip(),
        "query_type": kind,
        "source": "ClinVar",
        "total": total,
        "returned": len(items),
        "retrieved_at": retrieved_at,
        "cached": False,
        "items": items,
        "warnings": warnings,
    }
    _store(key, payload)
    return payload


def get_variation(uid: str) -> dict:
    if not uid.isdigit():
        raise UnsupportedQuery("ClinVar Variation ID 应为数字。")
    key = f"variation:{uid}"
    cached = _cached(key)
    if cached is not None:
        return {**cached, "cached": True}
    summary = _request_json("esummary.fcgi", {"id": uid, "retmode": "json"})
    record = (summary.get("result") or {}).get(uid)
    if not isinstance(record, dict):
        raise ClinVarError("没有找到该 ClinVar 记录。", "NOT_FOUND")
    retrieved_at = _now_iso()
    payload = {
        "source": "ClinVar",
        "retrieved_at": retrieved_at,
        "cached": False,
        "item": parse_record(uid, record, retrieved_at),
    }
    _store(key, payload)
    return payload
