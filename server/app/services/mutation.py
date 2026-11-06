"""突变应用与蛋白质层面的后果分类。

坐标约定：
- 替换：`position` 为 1-based 起始碱基；`ref` 可省略，默认取该位置 1 个碱基；
- 插入：`position` 表示“在第 N 位之后插入”，0 表示插到序列开头；
- 缺失：`position` 为 1-based 起始碱基，长度由 `ref` 或 `length` 指定；
- 多碱基替换通过 `ref` + `alt` 表达（等价于 delins）。

分类只描述序列层面的预测，不构成临床或生物学结论。
"""

from __future__ import annotations

from difflib import SequenceMatcher

from .sequence_utils import clean_dna
from .transcription import coding_sequence
from .translation import translate_rna

CONSEQUENCE_LABELS = {
    "synonymous": "同义突变",
    "missense": "错义突变",
    "nonsense": "无义突变",
    "frameshift": "移码突变",
    "in-frame indel": "整码插入/缺失",
    "stop_lost": "终止密码子丢失",
    "no_protein": "无可翻译区域",
}


def apply_mutation(
    sequence: str,
    mutation_type: str,
    position: int,
    alt: str = "",
    ref: str = "",
    length: int | None = None,
) -> dict:
    """在 DNA 序列上应用一个替换 / 插入 / 缺失，返回突变后序列与坐标信息。"""
    original = clean_dna(sequence)
    mutation_type = mutation_type.lower().strip()
    if mutation_type not in {"substitution", "insertion", "deletion"}:
        raise ValueError("mutation_type 只能是 substitution、insertion 或 deletion")
    if not isinstance(position, int) or isinstance(position, bool):
        raise ValueError("position 必须是整数")

    inserted = clean_dna(alt) if alt else ""
    reference = clean_dna(ref) if ref else ""

    if mutation_type == "substitution":
        if not (1 <= position <= len(original)):
            raise ValueError(f"替换位置必须在 1..{len(original)} 之间")
        if not inserted:
            raise ValueError("替换必须提供 alt")
        if not reference:
            reference = original[position - 1]
        if original[position - 1 : position - 1 + len(reference)] != reference:
            raise ValueError("ref 与原始序列在指定位置不匹配")
        mutated = (
            original[: position - 1]
            + inserted
            + original[position - 1 + len(reference) :]
        )
        deleted = reference
    elif mutation_type == "insertion":
        if not (0 <= position <= len(original)):
            raise ValueError(f"插入位置必须在 0..{len(original)} 之间")
        if not inserted:
            raise ValueError("插入必须提供 alt")
        mutated = original[:position] + inserted + original[position:]
        reference = ""
        deleted = ""
    else:
        if not (1 <= position <= len(original)):
            raise ValueError(f"缺失位置必须在 1..{len(original)} 之间")
        if reference:
            if original[position - 1 : position - 1 + len(reference)] != reference:
                raise ValueError("ref 与原始序列在指定位置不匹配")
            delete_length = len(reference)
        else:
            delete_length = 1 if length is None else length
            if not isinstance(delete_length, int) or delete_length < 1:
                raise ValueError("缺失长度必须是正整数")
            reference = original[position - 1 : position - 1 + delete_length]
        if position - 1 + delete_length > len(original):
            raise ValueError("缺失范围超出序列末尾")
        mutated = (
            original[: position - 1] + original[position - 1 + delete_length :]
        )
        inserted = ""
        deleted = reference

    return {
        "type": mutation_type,
        "position": position,
        "ref": reference,
        "alt": inserted,
        "deleted_sequence": deleted,
        "inserted_sequence": inserted,
        "original_sequence": original,
        "mutated_sequence": mutated,
        "length_delta": len(mutated) - len(original),
        "coordinate_rule": (
            "替换/缺失坐标为 1-based 起始位置；插入为“第 N 位之后”，0 表示序列开头。"
        ),
    }


def _translate_dna_sequence(sequence: str, frame: int) -> str:
    rna = sequence.replace("T", "U")
    return translate_rna(rna, frame=frame, stop_at_stop=False)["protein"]


def _protein_changes(original: str, mutated: str) -> list[dict]:
    """按字符差异切分蛋白，供前端做逐位对照与高亮。"""
    matcher = SequenceMatcher(None, original, mutated, autojunk=False)
    label = {
        "equal": "equal",
        "replace": "substitution",
        "insert": "insertion",
        "delete": "deletion",
    }
    return [
        {
            "type": label[tag],
            "original_start": i1,
            "original_end": i2,
            "mutated_start": j1,
            "mutated_end": j2,
            "original": original[i1:i2],
            "mutated": mutated[j1:j2],
        }
        for tag, i1, i2, j1, j2 in matcher.get_opcodes()
    ]


def _aa_length(protein: str) -> int:
    return len(protein.split("*", 1)[0])


def classify_mutation(
    original: str,
    mutated: str,
    frame: int = 1,
    position: int | None = None,
    strand: str = "coding",
    input_direction: str = "5to3",
) -> dict:
    """比较突变前后的蛋白质，给出序列层面的后果分类。"""
    if frame not in (1, 2, 3):
        raise ValueError("frame 必须是 1、2 或 3")
    original_sequence = coding_sequence(original, strand, input_direction)
    mutated_sequence = coding_sequence(mutated, strand, input_direction)

    original_protein = _translate_dna_sequence(original_sequence, frame)
    mutated_protein = _translate_dna_sequence(mutated_sequence, frame)
    original_stop = original_protein.find("*")
    mutated_stop = mutated_protein.find("*")
    length_delta = len(mutated_sequence) - len(original_sequence)
    premature_stop = mutated_stop != -1 and (
        original_stop == -1 or mutated_stop < original_stop
    )

    if not original_protein or not mutated_protein:
        consequence = "no_protein"
    elif length_delta % 3 != 0:
        consequence = "frameshift"
    elif original_protein == mutated_protein:
        consequence = "synonymous"
    elif original_stop != -1 and mutated_stop == -1:
        consequence = "stop_lost"
    elif length_delta != 0:
        consequence = "in-frame indel"
    elif premature_stop:
        consequence = "nonsense"
    else:
        consequence = "missense"

    changed = [
        {"index": index, "original": left, "mutated": right}
        for index, (left, right) in enumerate(zip(original_protein, mutated_protein))
        if left != right
    ]

    affected_codon = None
    if position is not None:
        if not isinstance(position, int) or position < 1:
            raise ValueError("position 必须是正整数")
        affected_codon = (position - 1) // 3 + 1

    original_aa_length = _aa_length(original_protein)
    mutated_aa_length = _aa_length(mutated_protein)

    return {
        "consequence": consequence,
        "label": CONSEQUENCE_LABELS[consequence],
        "original_protein": original_protein,
        "mutated_protein": mutated_protein,
        "protein_changes": _protein_changes(original_protein, mutated_protein),
        "is_premature_stop": premature_stop,
        "original_protein_length": original_aa_length,
        "mutated_protein_length": mutated_aa_length,
        "protein_length_delta": mutated_aa_length - original_aa_length,
        "length_delta": length_delta,
        "frame": frame,
        "strand": strand,
        "input_direction": input_direction,
        "original_stop_index": original_stop if original_stop != -1 else None,
        "mutated_stop_index": mutated_stop if mutated_stop != -1 else None,
        "changed_amino_acids": changed,
        "affected_codon": affected_codon,
        "note": "仅描述序列层面的预测，不构成临床或生物学结论。",
    }
