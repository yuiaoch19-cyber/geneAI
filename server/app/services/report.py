"""PDF 报告生成：基于已保存的分析记录，使用 ReportLab 输出中文报告。"""

from __future__ import annotations

import io
import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from ..models import AnalysisRecord

# 与前端设计令牌保持一致的报告配色。
PRIMARY = colors.HexColor("#1F4A7D")
TEAL = colors.HexColor("#12998C")
BLUE = colors.HexColor("#315F9C")
AMBER = colors.HexColor("#D39A3C")
VIOLET = colors.HexColor("#8760C4")
GRAY = colors.HexColor("#64748B")
TEXT = colors.HexColor("#1E293B")
LIGHT = colors.HexColor("#F6F8FA")
BORDER = colors.HexColor("#E2E8F0")

BASE_COLORS = [
    ("A", TEAL),
    ("T", BLUE),
    ("G", AMBER),
    ("C", VIOLET),
]

# PDF 中单条链最多展示的碱基数；统计仍按完整序列计算。
MAX_REPORT_SEQUENCE = 5000
SEQUENCE_LINE_WIDTH = 95

SOURCE_LABELS = {"manual": "手动输入", "fasta": "FASTA 上传", "demo": "演示数据"}
FONT_REGULAR = "GeneAI"
FONT_BOLD = "GeneAIBold"


@lru_cache(maxsize=1)
def _register_fonts() -> tuple[str, str]:
    """优先嵌入 Windows 中文字体，失败时退回 ReportLab 的 CJK 字体。"""
    global FONT_REGULAR, FONT_BOLD

    windows = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    candidates = [
        ("regular", FONT_REGULAR, windows / "msyh.ttc", 0),
        ("bold", FONT_BOLD, windows / "msyhbd.ttc", 0),
        ("regular", FONT_REGULAR, windows / "simhei.ttf", 0),
        ("regular", FONT_REGULAR, windows / "simsun.ttc", 0),
    ]

    loaded: dict[str, str] = {}
    for kind, name, path, index in candidates:
        if kind in loaded or not path.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont(name, str(path), subfontIndex=index))
            loaded[kind] = name
        except Exception:  # noqa: BLE001 - 字体不可用时继续尝试后备方案
            continue

    if "regular" not in loaded:
        pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
        loaded["regular"] = "STSong-Light"

    FONT_REGULAR = loaded["regular"]
    FONT_BOLD = loaded.get("bold", loaded["regular"])
    return FONT_REGULAR, FONT_BOLD


def _styles() -> dict[str, ParagraphStyle]:
    regular, bold = _register_fonts()
    return {
        "title": ParagraphStyle(
            "title",
            fontName=bold,
            fontSize=17,
            leading=22,
            textColor=colors.white,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontName=regular,
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#DCE7F2"),
        ),
        "section": ParagraphStyle(
            "section",
            fontName=bold,
            fontSize=10.5,
            leading=14,
            textColor=PRIMARY,
            spaceBefore=12,
            spaceAfter=5,
        ),
        "label": ParagraphStyle(
            "label", fontName=regular, fontSize=8, leading=11, textColor=GRAY
        ),
        "body": ParagraphStyle(
            "body", fontName=regular, fontSize=9, leading=13, textColor=TEXT
        ),
        "metaValue": ParagraphStyle(
            "metaValue", fontName=bold, fontSize=9, leading=12, textColor=TEXT
        ),
        "metricValue": ParagraphStyle(
            "metricValue",
            fontName=bold,
            fontSize=15,
            leading=18,
            textColor=PRIMARY,
            alignment=1,
        ),
        "metricLabel": ParagraphStyle(
            "metricLabel",
            fontName=regular,
            fontSize=7.5,
            leading=10,
            textColor=GRAY,
            alignment=1,
        ),
        "seqLabel": ParagraphStyle(
            "seqLabel",
            fontName=bold,
            fontSize=8,
            leading=11,
            textColor=PRIMARY,
            spaceBefore=6,
            spaceAfter=3,
        ),
        "mono": ParagraphStyle(
            "mono",
            fontName="Courier",
            fontSize=6.8,
            leading=9.2,
            textColor=TEXT,
            wordWrap="CJK",
        ),
        "note": ParagraphStyle(
            "note",
            fontName=regular,
            fontSize=7.5,
            leading=11,
            textColor=GRAY,
        ),
    }


def _format_time(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone().strftime("%Y-%m-%d %H:%M")


def _wrap_sequence(sequence: str) -> str:
    clipped = sequence[:MAX_REPORT_SEQUENCE]
    lines = [
        clipped[i : i + SEQUENCE_LINE_WIDTH]
        for i in range(0, len(clipped), SEQUENCE_LINE_WIDTH)
    ]
    return "<br/>".join(escape(line) for line in lines)


def _box(flowable, padding: float = 5) -> Table:
    table = Table([[flowable]], colWidths=[178 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), padding + 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), padding + 2),
                ("TOPPADDING", (0, 0), (-1, -1), padding),
                ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
            ]
        )
    )
    return table


def _pie_chart(record: AnalysisRecord) -> Drawing | None:
    counts = [record.a_count, record.t_count, record.g_count, record.c_count]
    total = sum(counts)
    if total <= 0:
        return None

    _, bold = _register_fonts()
    drawing = Drawing(178 * mm, 52 * mm)
    pie = Pie()
    pie.x = 22 * mm
    pie.y = 3 * mm
    pie.width = 46 * mm
    pie.height = 46 * mm
    pie.data = counts
    pie.labels = None
    pie.slices.strokeColor = colors.white
    pie.slices.strokeWidth = 1
    for index, (_, color) in enumerate(BASE_COLORS):
        pie.slices[index].fillColor = color
    drawing.add(pie)

    for index, (base, color) in enumerate(BASE_COLORS):
        column = index % 2
        row = index // 2
        x = 104 * mm + column * 38 * mm
        y = 40 * mm - row * 12 * mm
        drawing.add(
            Rect(
                x,
                y,
                3.6 * mm,
                3.6 * mm,
                fillColor=color,
                strokeColor=None,
            )
        )
        drawing.add(
            String(
                x + 5.5 * mm,
                y + 0.7 * mm,
                f"{base}   {counts[index]} bp   "
                f"{counts[index] / total * 100:.1f}%",
                fontName=bold,
                fontSize=8.5,
                fillColor=TEXT,
            )
        )
    return drawing


def build_analysis_report(record: AnalysisRecord) -> bytes:
    """生成单条分析记录的 PDF，返回字节流。"""

    regular, _bold = _register_fonts()
    styles = _styles()
    buffer = io.BytesIO()

    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=16 * mm,
        title=f"GeneAI 分析报告 · {record.sequence_name}",
        author="GeneAI",
        subject="DNA 序列分析报告",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="body",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )

    def draw_page(canvas, template):
        canvas.saveState()
        canvas.setStrokeColor(BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(16 * mm, 12 * mm, A4[0] - 16 * mm, 12 * mm)
        canvas.setFont(regular, 7.5)
        canvas.setFillColor(GRAY)
        canvas.drawString(16 * mm, 8 * mm, "GeneAI · DNA 序列分析平台")
        canvas.drawRightString(
            A4[0] - 16 * mm, 8 * mm, f"第 {canvas.getPageNumber()} 页"
        )
        canvas.restoreState()

    doc.addPageTemplates(
        [PageTemplate(id="main", frames=[frame], onPage=draw_page)]
    )

    story: list = []

    header = Table(
        [
            [
                [
                    Paragraph("GeneAI", styles["title"]),
                    Paragraph("DNA 序列分析报告", styles["subtitle"]),
                ],
                Paragraph(
                    f"记录编号 #{record.id}",
                    ParagraphStyle(
                        "headerRight",
                        fontName=regular,
                        fontSize=8,
                        leading=12,
                        textColor=colors.HexColor("#DCE7F2"),
                        alignment=2,
                    ),
                ),
            ]
        ],
        colWidths=[110 * mm, 68 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
            ]
        )
    )
    story.append(header)
    story.append(Spacer(1, 6))

    source = SOURCE_LABELS.get(record.source, record.source)
    meta = Table(
        [
            [
                Paragraph("序列名称", styles["label"]),
                Paragraph(escape(record.sequence_name), styles["metaValue"]),
                Paragraph("分析时间", styles["label"]),
                Paragraph(_format_time(record.created_at), styles["metaValue"]),
            ],
            [
                Paragraph("数据来源", styles["label"]),
                Paragraph(source, styles["metaValue"]),
                Paragraph("算法版本", styles["label"]),
                Paragraph(escape(record.algorithm_version), styles["metaValue"]),
            ],
        ],
        colWidths=[24 * mm, 65 * mm, 24 * mm, 65 * mm],
    )
    meta.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(meta)

    story.append(Paragraph("一、序列概览", styles["section"]))
    total = record.sequence_length
    metrics = [
        (f"{total:,}", "序列长度 (bp)"),
        (f"{record.gc_content:.1f}%", "GC 含量"),
        (f"{record.at_content:.1f}%", "AT 含量"),
        (f"{record.n_count:,}", "N 碱基 (个)"),
    ]
    metric_cells = []
    for value, label in metrics:
        metric_cells.append(
            [
                Paragraph(value, styles["metricValue"]),
                Paragraph(label, styles["metricLabel"]),
            ]
        )
    metric_table = Table(
        [metric_cells],
        colWidths=[44.5 * mm] * 4,
    )
    metric_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.white),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(metric_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("二、碱基组成", styles["section"]))
    counts_row = [record.a_count, record.t_count, record.g_count, record.c_count, record.n_count]
    bases = ["A", "T", "G", "C", "N"]
    count_table = Table(
        [
            [Paragraph("碱基", styles["label"])]
            + [Paragraph(base, styles["metaValue"]) for base in bases],
            [Paragraph("数量 (bp)", styles["label"])]
            + [
                Paragraph(f"{count:,}", styles["body"]) for count in counts_row
            ],
            [Paragraph("占比", styles["label"])]
            + [
                Paragraph(
                    f"{count / total * 100:.1f}%" if total else "—",
                    styles["body"],
                )
                for count in counts_row
            ],
        ],
        colWidths=[32 * mm] + [29.2 * mm] * 5,
    )
    count_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), LIGHT),
                ("BACKGROUND", (1, 0), (-1, 0), colors.HexColor("#EDF2F7")),
                ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(count_table)
    story.append(Spacer(1, 6))

    chart = _pie_chart(record)
    if chart is not None:
        story.append(Paragraph("A / T / G / C 分布", styles["label"]))
        story.append(chart)
    else:
        story.append(
            Paragraph("该序列不含 A / T / G / C，无法绘制碱基分布图。", styles["note"])
        )

    story.append(Paragraph("三、序列与转换链", styles["section"]))
    blocks = [
        ("原始序列（5′ → 3′）", record.original_sequence),
        ("互补链（3′ → 5′）", record.complement),
        ("反向互补链（5′ → 3′）", record.reverse_complement),
        ("RNA 转录（5′ → 3′，T → U）", record.rna),
    ]
    for label, sequence in blocks:
        story.append(Paragraph(label, styles["seqLabel"]))
        story.append(_box(Paragraph(_wrap_sequence(sequence), styles["mono"])))
        if len(sequence) > MAX_REPORT_SEQUENCE:
            story.append(
                Paragraph(
                    f"该链共 {len(sequence):,} bp，受报告长度限制，此处仅展示前 "
                    f"{MAX_REPORT_SEQUENCE:,} bp；完整序列可在 GeneAI 历史记录详情中查看。",
                    styles["note"],
                )
            )

    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            f"报告生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}　·　"
            f"GC = (G + C) / (A + T + G + C)，N 单独计数但不计入分母。",
            styles["note"],
        )
    )
    story.append(
        Paragraph(
            "本报告由 GeneAI 根据本地数据库中保存的分析记录自动生成，"
            "仅用于课程展示与序列统计，不构成任何生物学或医学结论。",
            styles["note"],
        )
    )
    story.append(
        Paragraph(
            "GeneAI · DNA 智能序列分析与可视化平台　|　本机生成",
            ParagraphStyle(
                "footnote",
                fontName=regular,
                fontSize=7,
                leading=10,
                textColor=colors.HexColor("#94A3B8"),
                spaceBefore=6,
            ),
        )
    )

    doc.build(story)
    return buffer.getvalue()
