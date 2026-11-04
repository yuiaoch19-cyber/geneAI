"""DNA 序列规范化、校验与基础计算。

口径必须与前端 src/lib/dna.ts 保持一致：
- GC 含量分母为 A + T + G + C，纯 N 序列视为 0%；
- 只接受 A/T/G/C/N，U 单独给出提示；
- 空白、数字、连字符与 FASTA 头会被忽略。
"""

import hashlib

from Bio.Seq import Seq

from ..config import MAX_SEQUENCE_LENGTH
from ..errors import ApiError

ALLOWED = set("ATGC")


def normalize_sequence(raw: str) -> str:
    lines = [line for line in raw.splitlines() if not line.lstrip().startswith(">")]
    cleaned = "".join(lines)
    cleaned = "".join(ch for ch in cleaned if not ch.isspace() and not ch.isdigit() and ch != "-")
    return cleaned.upper()


def validate_sequence(sequence: str) -> None:
    if not sequence:
        raise ApiError(400, "INVALID_SEQUENCE", "序列为空，请输入至少一个碱基。", "sequence")
    if "U" in sequence:
        raise ApiError(
            400,
            "INVALID_SEQUENCE",
            "检测到 U（尿嘧啶），这里需要 DNA 序列，请将 U 替换为 T。",
            "sequence",
        )
    if len(sequence) > MAX_SEQUENCE_LENGTH:
        raise ApiError(
            413,
            "SEQUENCE_TOO_LONG",
            f"序列长度为 {len(sequence):,} bp，超过 {MAX_SEQUENCE_LENGTH:,} bp 限制。",
            "sequence",
        )
    for index, base in enumerate(sequence):
        if base not in "ATGCN":
            raise ApiError(
                400,
                "INVALID_SEQUENCE",
                f"第 {index + 1} 位出现非法字符 “{base}”，仅支持 A / T / G / C / N。",
                "sequence",
            )


def count_bases(sequence: str) -> dict[str, int]:
    return {
        "a": sequence.count("A"),
        "t": sequence.count("T"),
        "g": sequence.count("G"),
        "c": sequence.count("C"),
        "n": sequence.count("N"),
    }


def gc_content(sequence: str) -> float:
    counts = count_bases(sequence)
    denominator = counts["a"] + counts["t"] + counts["g"] + counts["c"]
    if denominator == 0:
        return 0.0
    return round((counts["g"] + counts["c"]) / denominator * 100, 2)


def at_content(sequence: str) -> float:
    counts = count_bases(sequence)
    denominator = counts["a"] + counts["t"] + counts["g"] + counts["c"]
    if denominator == 0:
        return 0.0
    return round((counts["a"] + counts["t"]) / denominator * 100, 2)


def complement(sequence: str) -> str:
    return str(Seq(sequence).complement())


def reverse_complement(sequence: str) -> str:
    return str(Seq(sequence).reverse_complement())


def transcribe(sequence: str) -> str:
    return str(Seq(sequence).transcribe())


def sequence_hash(sequence: str) -> str:
    return hashlib.sha256(sequence.encode("utf-8")).hexdigest()


def analyze(sequence: str) -> dict:
    counts = count_bases(sequence)
    return {
        "length": len(sequence),
        **{f"{key}_count": value for key, value in counts.items()},
        "gc_content": gc_content(sequence),
        "at_content": at_content(sequence),
        "complement": complement(sequence),
        "reverse_complement": reverse_complement(sequence),
        "rna": transcribe(sequence),
    }


def gc_windows(sequence: str, window: int, step: int) -> list[dict]:
    if window <= 0 or step <= 0:
        raise ApiError(400, "INVALID_WINDOW", "窗口大小与步长必须为正整数。", "window")
    if window > len(sequence):
        raise ApiError(
            400,
            "INVALID_WINDOW",
            f"窗口大小 {window} bp 超过序列长度 {len(sequence)} bp。",
            "window",
        )

    points: list[dict] = []
    for start in range(0, len(sequence) - window + 1, step):
        chunk = sequence[start : start + window]
        points.append(
            {
                "start": start,
                "end": start + window,
                "gc": gc_content(chunk),
            }
        )
    return points
