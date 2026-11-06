"""Sequence map features: GC windows, ORFs, restriction sites, motifs, mutation."""

from __future__ import annotations

import re
from typing import Any

from Bio.Restriction import (
    AgeI,
    BamHI,
    BglII,
    EcoRI,
    HindIII,
    KpnI,
    NcoI,
    NotI,
    PstI,
    SacI,
    SalI,
    SmaI,
    SpeI,
    XbaI,
    XhoI,
)
from Bio.Seq import Seq
from Bio.SeqUtils import nt_search

from app.services import dna
from app.services.mutation import apply_mutation, classify_mutation
from app.services.orf import find_orfs
from app.services.sequence_utils import clean_dna

ENZYMES = {
    cls.__name__: cls
    for cls in (
        EcoRI,
        BamHI,
        HindIII,
        XhoI,
        NotI,
        PstI,
        SalI,
        KpnI,
        SmaI,
        XbaI,
        BglII,
        NcoI,
        SacI,
        SpeI,
        AgeI,
    )
}
DEFAULT_ENZYMES = ["EcoRI", "BamHI", "HindIII", "NotI"]

MAX_ORFS = 400
MAX_MOTIFS = 500
MAX_MOTIF_PATTERN = 24
IUPAC_RE = re.compile(r"^[ACGTNRYSWKMBDHV]+$")


def restriction_sites(sequence: str, enzymes: list[str] | None) -> tuple[list[dict], list[str]]:
    """Return 1-based cut positions for each selected enzyme on the plus strand."""
    names = enzymes or DEFAULT_ENZYMES
    warnings: list[str] = []
    sites: list[dict] = []
    seq = Seq(sequence)
    for name in names:
        enzyme = ENZYMES.get(name)
        if enzyme is None:
            warnings.append(f"忽略不支持的酶：{name}")
            continue
        try:
            cuts = enzyme.search(seq)
        except Exception as exc:  # pragma: no cover - defensive
            warnings.append(f"{name} 识别失败：{exc}")
            continue
        for cut in cuts:
            sites.append(
                {
                    "enzyme": name,
                    "recognition_site": str(enzyme.site),
                    "cut_position": int(cut),
                    "strand": "+",
                }
            )
    sites.sort(key=lambda item: (item["cut_position"], item["enzyme"]))
    return sites, warnings


def motif_sites(sequence: str, patterns: list[str]) -> tuple[list[dict], list[str]]:
    """Search IUPAC motifs on both strands, returning 1-based inclusive ranges."""
    warnings: list[str] = []
    motifs: list[dict] = []
    length = len(sequence)
    rc = dna.reverse_complement(sequence)
    for raw in patterns:
        pattern = raw.strip().upper()
        if not pattern:
            continue
        if len(pattern) < 2 or len(pattern) > MAX_MOTIF_PATTERN:
            warnings.append(f"忽略长度不合法的 motif：{raw}")
            continue
        if not IUPAC_RE.fullmatch(pattern):
            warnings.append(f"忽略含非法字符的 motif：{raw}")
            continue
        for pos in nt_search(sequence, pattern)[1:]:
            motifs.append(
                {
                    "pattern": pattern,
                    "start": int(pos) + 1,
                    "end": int(pos) + len(pattern),
                    "strand": "+",
                }
            )
        for pos in nt_search(rc, pattern)[1:]:
            start = length - (int(pos) + len(pattern)) + 1
            motifs.append(
                {
                    "pattern": pattern,
                    "start": start,
                    "end": length - int(pos),
                    "strand": "-",
                }
            )
        if len(motifs) > MAX_MOTIFS:
            warnings.append(f"motif 命中过多，已截断到 {MAX_MOTIFS} 条。")
            motifs = motifs[:MAX_MOTIFS]
            break
    motifs.sort(key=lambda item: (item["start"], item["strand"]))
    return motifs, warnings


def build_map(
    sequence: str,
    window: int = 50,
    step: int = 10,
    min_orf_aa: int = 0,
    enzymes: list[str] | None = None,
    motifs: list[str] | None = None,
    mutation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build all map layers from one cleaned sequence."""
    clean = clean_dna(sequence)
    if window <= 0 or step <= 0:
        raise ValueError("窗口大小与步长必须为正整数。")
    if window > len(clean):
        raise ValueError("窗口大小不能超过序列长度。")

    warnings: list[str] = []
    gc_points = dna.gc_windows(clean, window, step)
    if len(gc_points) > 2000:
        warnings.append("GC 窗口较多，前端会自动降采样显示。")

    orf_result = find_orfs(clean, min_length_aa=min_orf_aa)
    orfs = orf_result["orfs"]
    if len(orfs) > MAX_ORFS:
        warnings.append(f"潜在 ORF 超过 {MAX_ORFS} 个，仅返回前 {MAX_ORFS} 个。")
    orfs = orfs[:MAX_ORFS]
    warnings.extend(orf_result.get("warnings", []))

    sites, site_warnings = restriction_sites(clean, enzymes)
    warnings.extend(site_warnings)
    motif_hits, motif_warnings = motif_sites(clean, motifs or [])
    warnings.extend(motif_warnings)

    mutation_out = None
    if mutation:
        applied = apply_mutation(
            clean,
            mutation["mutation_type"],
            mutation["position"],
            alt=mutation.get("alt", ""),
            ref=mutation.get("ref", ""),
            length=mutation.get("length"),
        )
        analysis = classify_mutation(
            clean,
            applied["mutated_sequence"],
            frame=mutation.get("frame", 1),
            position=applied["position"],
        )
        mutation_out = {
            "position": applied["position"],
            "type": applied["type"],
            "ref": applied["ref"],
            "alt": applied["alt"],
            "length_delta": applied["length_delta"],
            "original_sequence": applied["original_sequence"],
            "mutated_sequence": applied["mutated_sequence"],
            "consequence": analysis["consequence"],
            "label": analysis["label"],
            "affected_codon": analysis["affected_codon"],
            "original_protein": analysis["original_protein"],
            "mutated_protein": analysis["mutated_protein"],
            "is_premature_stop": analysis["is_premature_stop"],
            "protein_changes": analysis["protein_changes"],
            "note": analysis["note"],
        }

    return {
        "sequence": clean,
        "sequence_length": len(clean),
        "gc": {
            "window": window,
            "step": step,
            "points": gc_points,
            "strategy": "仅统计完整窗口；末尾不足一个窗口的碱基不参与曲线。坐标为 1-based 窗口起点与终点。",
        },
        "orfs": orfs,
        "orf_total": orf_result.get("count", len(orfs)),
        "restriction_sites": sites,
        "motifs": motif_hits,
        "mutation": mutation_out,
        "warnings": warnings,
        "coordinate_rule": "所有区间均为 1-based 闭区间；正链为输入序列 5′→3′，负链坐标已换算到正链。ORF 为潜在开放阅读框，不等同于已验证基因。",
    }
