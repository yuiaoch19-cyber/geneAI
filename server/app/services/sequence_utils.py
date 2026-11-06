"""算法层的纯序列清洗工具。

与 `dna.py` 的 API 层校验区分开：
- 这里只处理已经提交给算法的裸序列，不解析 FASTA、不抛 HTTP 异常；
- 非法输入统一抛 `ValueError`，由后续 API 层映射为 ApiError；
- DNA 允许 A/T/G/C/N，RNA 允许 A/U/G/C/N；N 不会被静默当成任何具体碱基。
"""

from __future__ import annotations

DNA_ALPHABET = frozenset("ATGCN")
RNA_ALPHABET = frozenset("AUGCN")


def clean_dna(sequence: str, field: str = "sequence") -> str:
    if not isinstance(sequence, str):
        raise ValueError(f"{field} 必须是字符串")
    cleaned = "".join(sequence.split()).upper()
    if not cleaned:
        raise ValueError("DNA 序列为空")
    for index, base in enumerate(cleaned):
        if base == "U":
            raise ValueError(
                f"{field} 第 {index + 1} 位是 U；DNA 序列请使用 T，RNA 请使用转录接口。"
            )
        if base not in DNA_ALPHABET:
            raise ValueError(
                f"{field} 第 {index + 1} 位是非法字符 “{base}”，仅支持 A / T / G / C / N。"
            )
    return cleaned


def clean_rna(sequence: str, field: str = "rna") -> str:
    if not isinstance(sequence, str):
        raise ValueError(f"{field} 必须是字符串")
    cleaned = "".join(sequence.split()).upper()
    if not cleaned:
        raise ValueError("RNA 序列为空")
    for index, base in enumerate(cleaned):
        if base == "T":
            raise ValueError(
                f"{field} 第 {index + 1} 位是 T；RNA 序列请使用 U，DNA 请使用转录接口。"
            )
        if base not in RNA_ALPHABET:
            raise ValueError(
                f"{field} 第 {index + 1} 位是非法字符 “{base}”，仅支持 A / U / G / C / N。"
            )
    return cleaned
