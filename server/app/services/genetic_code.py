"""标准遗传密码表（RNA 形式）。

只收录 NCBI 标准遗传密码（table 1）；本项目不做线粒体或非标准密码表。
`CODON_TABLE` 的键为 RNA 密码子（U 代替 T），值为 (单字母, 三字母)。
"""

from __future__ import annotations

CODON_TABLE: dict[str, tuple[str, str]] = {
    "UUU": ("F", "Phe"),
    "UUC": ("F", "Phe"),
    "UUA": ("L", "Leu"),
    "UUG": ("L", "Leu"),
    "UCU": ("S", "Ser"),
    "UCC": ("S", "Ser"),
    "UCA": ("S", "Ser"),
    "UCG": ("S", "Ser"),
    "UAU": ("Y", "Tyr"),
    "UAC": ("Y", "Tyr"),
    "UAA": ("*", "Stop"),
    "UAG": ("*", "Stop"),
    "UGU": ("C", "Cys"),
    "UGC": ("C", "Cys"),
    "UGA": ("*", "Stop"),
    "UGG": ("W", "Trp"),
    "CUU": ("L", "Leu"),
    "CUC": ("L", "Leu"),
    "CUA": ("L", "Leu"),
    "CUG": ("L", "Leu"),
    "CCU": ("P", "Pro"),
    "CCC": ("P", "Pro"),
    "CCA": ("P", "Pro"),
    "CCG": ("P", "Pro"),
    "CAU": ("H", "His"),
    "CAC": ("H", "His"),
    "CAA": ("Q", "Gln"),
    "CAG": ("Q", "Gln"),
    "CGU": ("R", "Arg"),
    "CGC": ("R", "Arg"),
    "CGA": ("R", "Arg"),
    "CGG": ("R", "Arg"),
    "AUU": ("I", "Ile"),
    "AUC": ("I", "Ile"),
    "AUA": ("I", "Ile"),
    "AUG": ("M", "Met"),
    "ACU": ("T", "Thr"),
    "ACC": ("T", "Thr"),
    "ACA": ("T", "Thr"),
    "ACG": ("T", "Thr"),
    "AAU": ("N", "Asn"),
    "AAC": ("N", "Asn"),
    "AAA": ("K", "Lys"),
    "AAG": ("K", "Lys"),
    "AGU": ("S", "Ser"),
    "AGC": ("S", "Ser"),
    "AGA": ("R", "Arg"),
    "AGG": ("R", "Arg"),
    "GUU": ("V", "Val"),
    "GUC": ("V", "Val"),
    "GUA": ("V", "Val"),
    "GUG": ("V", "Val"),
    "GCU": ("A", "Ala"),
    "GCC": ("A", "Ala"),
    "GCA": ("A", "Ala"),
    "GCG": ("A", "Ala"),
    "GAU": ("D", "Asp"),
    "GAC": ("D", "Asp"),
    "GAA": ("E", "Glu"),
    "GAG": ("E", "Glu"),
    "GGU": ("G", "Gly"),
    "GGC": ("G", "Gly"),
    "GGA": ("G", "Gly"),
    "GGG": ("G", "Gly"),
}

START_CODON = "AUG"
STOP_CODONS = frozenset({"UAA", "UAG", "UGA"})
AMBIGUOUS_AMINO_ACID = ("X", "Xaa")


def codon_to_amino_acid(codon: str) -> tuple[str, str]:
    """把 RNA 密码子翻译为 (单字母, 三字母)。

    含 N 的密码子返回 X / Xaa；其它未知三联体也按模糊处理，但调用方应优先校验。
    """
    if len(codon) != 3:
        raise ValueError(f"密码子长度必须为 3，收到 {len(codon)}")
    normalized = codon.upper().replace("T", "U")
    if normalized in CODON_TABLE:
        return CODON_TABLE[normalized]
    if "N" in normalized:
        return AMBIGUOUS_AMINO_ACID
    return AMBIGUOUS_AMINO_ACID
