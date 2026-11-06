import csv
import io

from ..models import AnalysisRecord


def build_analysis_csv(record: AnalysisRecord) -> bytes:
    """Build a UTF-8 (with BOM) CSV for one analysis record."""
    buffer = io.StringIO()
    buffer.write("\ufeff")
    writer = csv.writer(buffer)

    writer.writerow(["字段", "值"])
    writer.writerow(["序列名称", record.sequence_name])
    writer.writerow(["记录编号", record.id])
    writer.writerow(["分析时间", record.created_at.isoformat()])
    writer.writerow(["序列长度 (bp)", record.sequence_length])
    writer.writerow(["A 数量", record.a_count])
    writer.writerow(["T 数量", record.t_count])
    writer.writerow(["G 数量", record.g_count])
    writer.writerow(["C 数量", record.c_count])
    writer.writerow(["N 数量", record.n_count])
    writer.writerow(["GC 含量 (%)", record.gc_content])
    writer.writerow(["AT 含量 (%)", record.at_content])
    writer.writerow(["数据来源", record.source])
    writer.writerow(["算法版本", record.algorithm_version])
    writer.writerow(["原始序列 (5'->3')", record.original_sequence])
    writer.writerow(["互补链 (3'->5')", record.complement])
    writer.writerow(["反向互补链 (5'->3')", record.reverse_complement])
    writer.writerow(["RNA 转录 (5'->3')", record.rna])
    return buffer.getvalue().encode("utf-8")
