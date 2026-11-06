"""六阅读框 ORF（开放阅读框）搜索。

策略：
- 正链 3 个阅读框 + 反链（反向互补）3 个阅读框，共 6 个；
- 默认只报告“ATG 起始且找到同框终止密码子”的完整 ORF；
- `include_nested=True` 时，同一阅读框内嵌套的 ATG 也会各自生成 ORF（各自到下一个终止）；
- 所有坐标统一为原始正链的 1-based 闭区间；反链 ORF 另用 `strand="-"` 标明方向；
- 结果一律标注 `is_potential=True`，表示“潜在 ORF”，不是已验证基因；
- 蛋白质不含终止密码子；`length_aa` 不含终止密码子。
"""

from __future__ import annotations

from .sequence_utils import clean_dna
from .transcription import reverse_complement

STOP_CODONS_DNA = frozenset({"TAA", "TAG", "TGA"})
START_CODON_DNA = "ATG"
MAX_ORFS = 1000


def _translate_segment(segment: str) -> str:
    from .translation import translate_rna

    rna = segment.replace("T", "U")
    return translate_rna(rna)["protein"].rstrip("*")


def find_orfs(
    dna: str,
    min_length_aa: int = 0,
    include_nested: bool = True,
    require_stop: bool = True,
) -> dict:
    """扫描六个阅读框，返回潜在 ORF 列表与策略说明。"""
    if min_length_aa < 0:
        raise ValueError("min_length_aa 不能为负数")
    sequence = clean_dna(dna)
    length = len(sequence)
    orfs: list[dict] = []

    for strand, strand_sequence in (
        ("+", sequence),
        ("-", reverse_complement(sequence)),
    ):
        for frame_index in range(3):
            frame = frame_index + 1
            for start in range(frame_index, length - 2, 3):
                if strand_sequence[start : start + 3] != START_CODON_DNA:
                    continue

                end: int | None = None
                stop_codon: str | None = None
                for cursor in range(start + 3, length - 2, 3):
                    triplet = strand_sequence[cursor : cursor + 3]
                    if triplet in STOP_CODONS_DNA:
                        end = cursor + 3
                        stop_codon = triplet
                        break

                if end is None:
                    if require_stop:
                        continue
                    complete_codons = (length - start) // 3
                    end = start + complete_codons * 3

                if end - start < 3:
                    continue
                aa_length = (end - start) // 3 - (1 if stop_codon else 0)
                if aa_length < min_length_aa:
                    continue

                if not include_nested and any(
                    item["strand"] == strand
                    and item["frame"] == frame
                    and item["_strand_start"] <= start < item["_strand_end"]
                    for item in orfs
                ):
                    continue

                if strand == "+":
                    start_1based = start + 1
                    end_1based = end
                else:
                    start_1based = length - end + 1
                    end_1based = length - start

                segment = strand_sequence[start:end]
                orfs.append(
                    {
                        "strand": strand,
                        "frame": frame,
                        "start": start_1based,
                        "end": end_1based,
                        "length_nt": end - start,
                        "length_aa": aa_length,
                        "start_codon": START_CODON_DNA,
                        "stop_codon": stop_codon,
                        "protein": _translate_segment(segment),
                        "is_complete": stop_codon is not None,
                        "is_potential": True,
                        "_strand_start": start,
                        "_strand_end": end,
                    }
                )
                if len(orfs) >= MAX_ORFS:
                    break
            if len(orfs) >= MAX_ORFS:
                break
        if len(orfs) >= MAX_ORFS:
            break

    for item in orfs:
        item.pop("_strand_start", None)
        item.pop("_strand_end", None)

    orfs.sort(key=lambda item: (item["strand"], item["start"], item["frame"]))

    warnings: list[str] = []
    if not orfs:
        warnings.append(
            "未找到完整的 ATG…终止密码子 ORF。可尝试降低长度阈值，或确认序列方向。"
        )
    if len(orfs) >= MAX_ORFS:
        warnings.append(f"ORF 数量达到上限 {MAX_ORFS}，结果已截断。")

    return {
        "orfs": orfs,
        "count": len(orfs),
        "frames_scanned": 6,
        "min_length_aa": min_length_aa,
        "include_nested": include_nested,
        "strategy": (
            "六个阅读框；ATG 起始；报告到同框首个终止密码子；"
            "坐标为正链 1-based 闭区间；潜在 ORF 不等于已验证基因。"
        ),
        "warnings": warnings,
    }
