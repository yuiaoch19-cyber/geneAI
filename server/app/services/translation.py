"""RNA / DNA 翻译。

约定：
- 输入 RNA 必须是 5′→3′，允许 A/U/G/C/N；
- `frame` 为 1、2、3，表示从第 1、2、3 个碱基开始按三联体分组；
- 蛋白质字符串包含终止密码子的 `*`（便于比较），`stop_at_stop=True` 时到此停止，
  否则继续翻译后续密码子；
- 含 N 的密码子翻译为 X（三字母 Xaa），不会被静默当作某个具体氨基酸；
- 末尾不足 3 个碱基不会补碱基，计入 `ignored_bases` 并给出警告。
"""

from __future__ import annotations

from .genetic_code import CODON_TABLE, START_CODON, STOP_CODONS, codon_to_amino_acid
from .sequence_utils import clean_rna
from .transcription import transcribe


def _validate_frame(frame: int) -> None:
    if not isinstance(frame, int) or isinstance(frame, bool) or frame not in (1, 2, 3):
        raise ValueError("frame 必须是 1、2 或 3")


def translate_rna(
    rna: str,
    frame: int = 1,
    stop_at_stop: bool = True,
) -> dict:
    """把 RNA 翻译为蛋白质，并保留逐密码子明细。"""
    _validate_frame(frame)
    sequence = clean_rna(rna)
    offset = frame - 1

    codons: list[dict] = []
    protein_chars: list[str] = []
    three_letters: list[str] = []
    warnings: list[str] = []
    ambiguous_count = 0
    stopped_at: int | None = None
    stop_codon: str | None = None

    for index, start in enumerate(range(offset, len(sequence) - 2, 3)):
        triplet = sequence[start : start + 3]
        amino_acid, three_letter = codon_to_amino_acid(triplet)
        is_stop = triplet in STOP_CODONS
        is_ambiguous = "N" in triplet
        if is_ambiguous:
            ambiguous_count += 1
        codons.append(
            {
                "index": index,
                "rna": triplet,
                "amino_acid": amino_acid,
                "three_letter": three_letter,
                "start": start + 1,
                "end": start + 3,
                "is_stop": is_stop,
                "is_start": triplet == START_CODON,
                "ambiguous": is_ambiguous,
            }
        )
        protein_chars.append(amino_acid)
        three_letters.append(three_letter)

        if is_stop:
            stop_codon = triplet
            stopped_at = index
            if stop_at_stop:
                break

    usable = len(sequence) - offset
    ignored_bases = usable % 3 if usable > 0 else 0

    if ignored_bases:
        warnings.append(
            f"序列长度按第 {frame} 个碱基起始分组后，末尾 {ignored_bases} 个碱基不足一个密码子，未翻译。"
        )
    if ambiguous_count:
        warnings.append(
            f"检测到 {ambiguous_count} 个含 N 的密码子，按 X（Xaa）处理，未当作具体氨基酸。"
        )
    if codons and codons[0]["rna"] != START_CODON:
        warnings.append("首个密码子不是 AUG，本次翻译未从标准起始密码子开始。")
    if stop_codon is None:
        warnings.append("未检测到 UAA / UAG / UGA 终止密码子，蛋白质可能不完整。")

    return {
        "rna": sequence,
        "frame": frame,
        "protein": "".join(protein_chars),
        "three_letters": three_letters,
        "codons": codons,
        "start_codon": START_CODON if codons and codons[0]["is_start"] else None,
        "stop_codon": stop_codon,
        "stopped_at": stopped_at,
        "ignored_bases": ignored_bases,
        "ambiguous_codons": ambiguous_count,
        "warnings": warnings,
    }


def translate_dna(
    dna: str,
    strand: str = "coding",
    frame: int = 1,
    input_direction: str = "5to3",
    stop_at_stop: bool = True,
) -> dict:
    """先转录再翻译；链与方向语义见 `transcription.transcribe`。"""
    transcription = transcribe(dna, strand=strand, input_direction=input_direction)
    result = translate_rna(
        transcription["rna"], frame=frame, stop_at_stop=stop_at_stop
    )
    return {
        **result,
        "coding_sequence": transcription["coding_sequence"],
        "template_sequence": transcription["template_sequence"],
        "template_direction": transcription["template_direction"],
    }


__all__ = [
    "CODON_TABLE",
    "translate_dna",
    "translate_rna",
]
