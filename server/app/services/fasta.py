"""FASTA 文件解析（Biopython）。"""

from io import StringIO
from pathlib import Path

from Bio import SeqIO

from ..errors import ApiError
from . import dna


def parse_fasta(text: str, filename: str = "upload.fasta") -> tuple[str, str]:
    """解析单条 FASTA 记录，返回 (名称, 规范化序列)。

    也接受不带 ">" 头的纯序列文本，便于粘贴 txt 文件。
    """
    content = text.lstrip("\ufeff").strip()
    if not content:
        raise ApiError(
            400, "EMPTY_FILE", "上传的文件为空，请选择包含 DNA 序列的文件。", "file"
        )

    normalized_text = content.replace("\r\n", "\n").replace("\r", "\n")
    if ">" not in normalized_text:
        sequence = dna.normalize_sequence(normalized_text)
        dna.validate_sequence(sequence)
        return Path(filename).stem or "未命名序列", sequence

    try:
        records = list(SeqIO.parse(StringIO(normalized_text), "fasta"))
    except ValueError as exc:
        raise ApiError(
            400, "INVALID_FASTA", f"FASTA 解析失败：{exc}", "file"
        ) from exc

    if not records:
        raise ApiError(
            400,
            "INVALID_FASTA",
            "没有解析到 FASTA 记录，请确认文件包含 “>” 标题行与序列行。",
            "file",
        )
    if len(records) > 1:
        raise ApiError(
            400,
            "INVALID_FASTA",
            f"仅支持单条 FASTA 记录，当前文件包含 {len(records)} 条。",
            "file",
        )

    record = records[0]
    sequence = dna.normalize_sequence(str(record.seq))
    dna.validate_sequence(sequence)
    name = (record.id or record.description or "").strip() or Path(filename).stem
    return name[:120], sequence
