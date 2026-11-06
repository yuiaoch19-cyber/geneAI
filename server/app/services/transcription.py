"""DNA → RNA 转录。

链与方向约定（所有输出 RNA 均为 5′→3′）：
- `strand="coding"`：输入是编码链 5′→3′，RNA = T→U；
- `strand="template", input_direction="5to3"`：输入是模板链 5′→3′，
  先取反向互补得到编码链，再 T→U；
- `strand="template", input_direction="3to5"`：输入是模板链 3′→5′，
  直接取互补得到编码链，再 T→U。

不使用 Biopython 的 `Seq.transcribe()` 作为唯一实现，避免链方向语义被隐藏。
"""

from __future__ import annotations

from .sequence_utils import clean_dna

_COMPLEMENT = str.maketrans("ATGCN", "TACGN")


def coding_sequence(
    sequence: str, strand: str = "coding", input_direction: str = "5to3"
) -> str:
    """把输入序列转换为编码链 5′→3′ 方向，供翻译与突变分析使用。"""
    dna = clean_dna(sequence)
    if strand not in {"coding", "template"}:
        raise ValueError("strand 必须是 coding 或 template")
    if input_direction not in {"5to3", "3to5"}:
        raise ValueError("input_direction 必须是 5to3 或 3to5")
    if strand == "coding":
        if input_direction != "5to3":
            raise ValueError("编码链必须按 5′→3′ 方向输入")
        return dna
    if input_direction == "5to3":
        return reverse_complement(dna)
    return complement(dna)


def complement(sequence: str) -> str:
    return sequence.translate(_COMPLEMENT)


def reverse_complement(sequence: str) -> str:
    return complement(sequence)[::-1]


def transcribe(
    dna: str,
    strand: str = "coding",
    input_direction: str = "5to3",
) -> dict:
    """把 DNA 转录为 RNA，并显式记录链类型与方向。

    返回字段：
    - rna: RNA 5′→3′
    - coding_sequence / template_sequence: 归一化后的编码链与模板链
    - input_strand / input_direction: 用户输入的含义
    - template_direction: 返回的模板链字符串方向
    - length / note
    """
    if strand not in {"coding", "template"}:
        raise ValueError("strand 只能是 'coding' 或 'template'")
    if input_direction not in {"5to3", "3to5"}:
        raise ValueError("input_direction 只能是 '5to3' 或 '3to5'")

    sequence = clean_dna(dna)

    if strand == "coding":
        if input_direction != "5to3":
            raise ValueError("编码链输入必须是 5′→3′ 方向")
        coding = sequence
        template = complement(sequence)
        template_direction = "3'->5'"
        note = "编码链按 T→U 直接转录；返回的模板链为 3′→5′ 方向。"
    else:
        template = sequence
        if input_direction == "5to3":
            coding = reverse_complement(sequence)
            template_direction = "5'->3'"
            note = "模板链为 5′→3′，先反向互补得到编码链，再按 T→U 转录。"
        else:
            coding = complement(sequence)
            template_direction = "3'->5'"
            note = "模板链为 3′→5′，直接互补得到编码链，再按 T→U 转录。"

    rna = coding.replace("T", "U")

    return {
        "rna": rna,
        "coding_sequence": coding,
        "template_sequence": template,
        "input_strand": strand,
        "input_direction": input_direction
        if strand == "template"
        else "5to3",
        "coding_direction": "5'->3'",
        "template_direction": template_direction,
        "rna_direction": "5'->3'",
        "length": len(rna),
        "note": note,
    }
