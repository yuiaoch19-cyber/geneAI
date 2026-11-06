from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt, Emu

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"
TMP = ROOT / ".tmp"
OUT = ROOT / "docs" / "GeneAI-2.0-答辩演示.pptx"

NAVY = RGBColor(0x0F, 0x1B, 0x2D)
NAVY_2 = RGBColor(0x16, 0x2A, 0x45)
BLUE = RGBColor(0x25, 0x63, 0xEB)
CYAN = RGBColor(0x08, 0x91, 0xB2)
VIOLET = RGBColor(0x7C, 0x3A, 0xED)
GREEN = RGBColor(0x10, 0xB9, 0x81)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)
BG = RGBColor(0xF6, 0xF8, 0xFC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
TEXT = RGBColor(0x11, 0x18, 0x27)
MUTED = RGBColor(0x5B, 0x6B, 0x84)
LINE = RGBColor(0xE2, 0xE8, 0xF0)

FONT = "Microsoft YaHei"


def crop(name: str, ratio: float, out: str) -> Path:
    src = Image.open(SHOTS / name).convert("RGB")
    width, height = src.size
    target_h = int(width / ratio)
    if target_h < height:
        top = 0
        if "mutation" in name:
            top = min(120, height - target_h)
        src = src.crop((0, top, width, top + target_h))
    path = TMP / out
    src.save(path, quality=92)
    return path


def crop_box(name: str, box: tuple[int, int, int, int], out: str) -> Path:
    src = Image.open(SHOTS / name).convert("RGB")
    left, top, right, bottom = box
    right = min(right, src.width)
    bottom = min(bottom, src.height)
    src = src.crop((left, top, right, bottom))
    path = TMP / out
    src.save(path, quality=92)
    return path


def bg(slide, color=BG):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def text(slide, x, y, w, h, content, size=18, color=TEXT, bold=False, align=PP_ALIGN.LEFT, spacing=1.15):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.word_wrap = True
    frame.vertical_anchor = MSO_ANCHOR.TOP
    for index, line in enumerate(content if isinstance(content, list) else [content]):
        p = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        p.alignment = align
        p.space_after = Pt(6)
        p.line_spacing = spacing
        run = p.add_run()
        run.text = line
        run.font.name = FONT
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = color
    return box


def bullets(slide, x, y, w, h, items, size=16, color=TEXT, gap=10):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.word_wrap = True
    for index, item in enumerate(items):
        p = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        p.space_after = Pt(gap)
        p.line_spacing = 1.2
        run = p.add_run()
        run.text = "•  " + item
        run.font.name = FONT
        run.font.size = Pt(size)
        run.font.color.rgb = color
    return box


def title(slide, eyebrow, heading, sub=None, dark=False):
    color = WHITE if dark else TEXT
    accent = CYAN if dark else BLUE
    text(slide, 0.75, 0.5, 11.8, 0.35, eyebrow.upper(), 12, accent, True)
    text(slide, 0.75, 0.86, 11.8, 0.6, heading, 28, color, True)
    if sub:
        text(slide, 0.75, 1.5, 11.4, 0.55, sub, 14, RGBColor(0x9F, 0xB0, 0xC8) if dark else MUTED)


def card(slide, x, y, w, h, fill=WHITE, line=LINE, radius=True):
    shape = slide.shapes.add_shape(
        5 if radius else 1, Inches(x), Inches(y), Inches(w), Inches(h)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line
    shape.line.width = Pt(0.75)
    shape.shadow.inherit = False
    return shape


def chip(slide, x, y, w, label, color):
    shape = slide.shapes.add_shape(5, Inches(x), Inches(y), Inches(w), Inches(0.34))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    shape.shadow.inherit = False
    frame = shape.text_frame
    frame.margin_left = 0
    frame.margin_right = 0
    frame.margin_top = 0
    frame.margin_bottom = 0
    frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = frame.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = label
    run.font.name = FONT
    run.font.size = Pt(11)
    run.font.bold = True
    run.font.color.rgb = WHITE


def footer(slide, number):
    text(slide, 0.75, 7.05, 8, 0.3, "GeneAI 2.0 · DNA 转录翻译与突变分析平台", 10, MUTED)
    text(slide, 12.0, 7.05, 0.6, 0.3, f"{number:02d}", 10, MUTED, align=PP_ALIGN.RIGHT)


def table(slide, x, y, w, h, rows, widths=None, header=True, font_size=13):
    shape = slide.shapes.add_table(len(rows), len(rows[0]), Inches(x), Inches(y), Inches(w), Inches(h))
    tbl = shape.table
    if widths:
        for i, width in enumerate(widths):
            tbl.columns[i].width = Inches(width)
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            cell = tbl.cell(r, c)
            cell.text = ""
            cell.margin_left = Inches(0.08)
            cell.margin_right = Inches(0.06)
            cell.margin_top = Inches(0.03)
            cell.margin_bottom = Inches(0.03)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            cell.fill.fore_color.rgb = NAVY_2 if (header and r == 0) else WHITE
            p = cell.text_frame.paragraphs[0]
            run = p.add_run()
            run.text = str(value)
            run.font.name = FONT
            run.font.size = Pt(font_size)
            run.font.bold = header and r == 0
            run.font.color.rgb = WHITE if (header and r == 0) else TEXT
    return tbl


def notes(slide, value):
    slide.notes_slide.notes_text_frame.text = value


prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]

# ---------------------------------------------------------------- 1 cover
slide = prs.slides.add_slide(blank)
bg(slide, NAVY)
for i, (x, y, d, color) in enumerate(
    [(10.6, -0.6, 3.6, BLUE), (11.7, 4.9, 2.4, CYAN)]
):
    circle = slide.shapes.add_shape(9, Inches(x), Inches(y), Inches(d), Inches(d))
    circle.fill.solid()
    circle.fill.fore_color.rgb = color
    circle.fill.transparency = 82
    circle.line.fill.background()
text(slide, 0.9, 2.0, 8.6, 0.4, "BIOINFORMATICS PLATFORM", 13, CYAN, True)
text(slide, 0.9, 2.45, 9, 1.0, "GeneAI 2.0", 54, WHITE, True)
text(slide, 0.9, 3.45, 9.6, 0.6, "DNA 转录翻译与突变分析平台", 25, RGBColor(0xCB, 0xDA, 0xF2))
text(
    slide,
    0.9,
    4.35,
    8.8,
    0.9,
    "把中心法则做成可以逐步播放、每一步都能回到算法结果的交互演示。",
    15,
    RGBColor(0x94, 0xA7, 0xC4),
)
text(slide, 0.9, 6.5, 8, 0.4, "课程项目答辩 · React + FastAPI + Biopython + SQLite", 12, RGBColor(0x7C, 0x8D, 0xA8))
notes(slide, "开场：一句话说明项目不是 DNA 查看器，而是可验证的中心法则演示。")

# ---------------------------------------------------------------- 2 problem
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "01 · 问题", "静态图讲不清“一个碱基变化会怎样”", "我们把问题拆成三个可验证的问题：序列是什么、翻译成什么、改一个碱基会发生什么。")
bullets(
    slide,
    0.75,
    2.25,
    6.1,
    4.2,
    [
        "课本里的转录、翻译、移码、无义突变是静态图，学生难把 DNA 与蛋白对应起来。",
        "在线工具常直接给临床结论，容易形成“一个突变 = 一定致病”的误解。",
        "现有平台的动画与算法脱节，暂停后画面和结果对不上。",
    ],
    15,
)
card(slide, 7.15, 2.2, 5.4, 3.05, WHITE)
text(slide, 7.5, 2.5, 4.7, 0.4, "我们的边界", 17, TEXT, True)
bullets(
    slide,
    7.5,
    3.0,
    4.7,
    2.5,
    [
        "只做序列层面的计算与可视化。",
        "不做 AI 问答、不做疾病风险预测。",
        "数据库注释只搬运，不二次判读。",
        "所有坐标、算法、限制写在页面上。",
    ],
    13,
    MUTED,
)
for i, (label, color) in enumerate(
    [("10 个真实页面", BLUE), ("164 后端测试", GREEN), ("0 虚构数据", VIOLET)]
):
    chip(slide, 0.8 + i * 2.1, 5.05, 1.9, label, color)
footer(slide, 2)
notes(slide, "强调“不做临床诊断”和“不做 AI 聊天”，这是产品边界。")

# ---------------------------------------------------------------- 3 architecture
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "02 · 架构", "前端负责播放，后端负责算", "前后端通过 REST 通信；动画每一步都来自后端返回值。")
layers = [
    ("React SPA", "Vite · TanStack Router · Query · ECharts · 原生 SVG", "10 条页面路由，统一设计系统", BLUE),
    ("FastAPI", "23 个接口 · 统一错误结构 · Pydantic 校验", "routers / services 分层，算法可独立测试", CYAN),
    ("Biopython", "转录 · 翻译 · ORF · 比对 · 限制酶", "SQLite：analysis_records / comparisons / meta", VIOLET),
]
for i, (name, sub, desc, color) in enumerate(layers):
    y = 1.95 + i * 1.55
    card(slide, 0.9, y, 7.0, 1.25, WHITE)
    bar = slide.shapes.add_shape(1, Inches(0.9), Inches(y), Inches(0.09), Inches(1.25))
    bar.fill.solid()
    bar.fill.fore_color.rgb = color
    bar.line.fill.background()
    text(slide, 1.2, y + 0.14, 2.0, 0.4, name, 17, TEXT, True)
    text(slide, 3.15, y + 0.18, 4.5, 0.4, sub, 12, MUTED)
    text(slide, 1.2, y + 0.72, 6.3, 0.35, desc, 12, color, True)
    if i < 2:
        arrow = slide.shapes.add_shape(4, Inches(4.3), Inches(y + 1.27), Inches(0.3), Inches(0.26))
        arrow.rotation = 90
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = LINE
        arrow.line.fill.background()
card(slide, 8.35, 2.0, 4.2, 3.7, NAVY)
text(slide, 8.65, 2.3, 3.6, 0.4, "外部数据", 16, CYAN, True)
text(slide, 8.65, 2.85, 3.6, 0.5, "NCBI ClinVar", 20, WHITE, True)
text(slide, 8.65, 3.4, 3.6, 1.7, "E-utilities 官方接口\n缓存 10 分钟\n0.35s 频率限制\n超时 / 429 / 5xx 明确报错", 12, RGBColor(0xB8, 0xC7, 0xDC))
footer(slide, 3)
notes(slide, "强调算法在后端，前端动画只是渲染后端数据。")

# ---------------------------------------------------------------- 4 modules
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "03 · 功能地图", "10 个页面，覆盖“分析 → 演示 → 探索 → 报告”", "所有模块使用真实数据；没有用假按钮充数。")
modules = [
    ("分析总览", "真实统计与趋势"),
    ("DNA 序列分析", "碱基 / GC / 链转换"),
    ("转录与翻译", "逐步动画"),
    ("突变模拟", "DNA/RNA/蛋白对比"),
    ("DNA 序列地图", "ORF / GC / 酶 / motif"),
    ("变异数据库", "ClinVar 证据链"),
    ("序列比对", "全局比对"),
    ("数据可视化", "滑窗 GC / 分布"),
    ("历史记录", "PDF / CSV"),
    ("系统设置", "主题与本地信息"),
]
for i, (name, desc) in enumerate(modules):
    col = i % 5
    row = i // 5
    x = 0.75 + col * 2.43
    y = 2.2 + row * 2.25
    card(slide, x, y, 2.25, 1.95, WHITE)
    dot = slide.shapes.add_shape(9, Inches(x + 0.18), Inches(y + 0.18), Inches(0.34), Inches(0.34))
    dot.fill.solid()
    dot.fill.fore_color.rgb = [BLUE, CYAN, VIOLET, GREEN, AMBER][i % 5]
    dot.line.fill.background()
    text(slide, x + 0.18, y + 0.72, 1.9, 0.4, name, 13, TEXT, True)
    text(slide, x + 0.18, y + 1.18, 1.9, 0.6, desc, 10.5, MUTED)
text(slide, 0.75, 6.75, 11.8, 0.3, "统一：深蓝侧栏 · 浅灰背景 · 白色卡片 · 蓝/青主色 · 紫色分类", 11, MUTED)
footer(slide, 4)
notes(slide, "按四条主线介绍页面，避免逐个念菜单。")

# ---------------------------------------------------------------- 5 animation
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "04 · 重点", "把动画做成“可检查的算法演示”", "示例 A：ATGGAACCTTGGTAA → AUGGAACCUUGGUAA → MEPW*")
img = crop_box("ui-transcription-result.png", (250, 240, 1440, 1500), "ppt-transcription.png")
slide.shapes.add_picture(str(img), Inches(7.6), Inches(1.8), height=Inches(5.0))
bullets(
    slide,
    0.75,
    2.25,
    5.5,
    3.4,
    [
        "SVG 双螺旋：两条链、碱基对、5′/3′、当前碱基高亮。",
        "RNA 聚合酶沿模板链 3′→5′ 移动，RNA 按 5′→3′ 生成。",
        "核糖体读取密码子，tRNA 带氨基酸，多肽链逐步增长。",
        "开始 / 暂停 / 上一步 / 下一步 / 重播 / 0.5–2×。",
        "移动端固定控制条，滚动时仍可操作。",
    ],
    13.5,
)
for i, (label, color) in enumerate([("真实算法", BLUE), ("逐步回放", CYAN), ("移动端可用", VIOLET)]):
    chip(slide, 0.85 + i * 1.7, 5.62, 1.5, label, color)
footer(slide, 5)
notes(slide, "现场演示：选示例 B，暂停在第 2 步，说明当前模板碱基与 RNA 碱基。")

# ---------------------------------------------------------------- 6 algorithms
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "05 · 算法", "同一套样本，页面、API 与 pytest 共用", "所有数字来自真实调用，不是截图写死。")
table(
    slide,
    0.75,
    2.05,
    8.1,
    2.0,
    [
        ["样本", "DNA", "蛋白", "说明"],
        ["A", "ATGGAACCTTGGTAA", "MEPW*", "正常"],
        ["B", "ATGTAACCTTGGTAA", "M*", "第 2 个密码子提前终止"],
        ["C", "ATGAGAACCTTGGTAA", "MRTLV", "第 3 位插入 A，移码"],
    ],
    [0.8, 3.1, 1.6, 2.6],
    12,
)
bullets(
    slide,
    0.75,
    4.5,
    8.2,
    1.9,
    [
        "ORF：A 命中 1 个（1–15，MEPW），标记「潜在 ORF」。",
        "限制酶：GAATTC…GGATCC…AAGCTT → EcoRI 2 / BamHI 12 / HindIII 19。",
        "GC 滑窗：A 的 5/5 窗口 → 40 / 40 / 40。",
    ],
    12.5,
)
for i, (label, value, color) in enumerate(
    [("后端 pytest", "164", GREEN), ("前端 Vitest", "29", BLUE), ("构建", "2.03s", VIOLET)]
):
    y = 2.15 + i * 1.45
    card(slide, 9.35, y, 3.2, 1.15, WHITE)
    text(slide, 9.55, y + 0.14, 2.8, 0.35, label, 10.5, MUTED)
    text(slide, 9.55, y + 0.42, 2.8, 0.55, value, 24, color, True)
footer(slide, 6)
notes(slide, "说明 B 的 M* 来自 TAA 提前终止；C 的 MRTLV 来自插入导致移码。")

# ---------------------------------------------------------------- 7 mutation
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "06 · 突变", "不只说“变了”，还要说“变成什么”", "替换 / 插入 / 缺失 → 同义、错义、无义、移码、整码。")
img = crop_box("ui-mutation-result.png", (740, 240, 1440, 1080), "ppt-mutation.png")
slide.shapes.add_picture(str(img), Inches(7.85), Inches(1.95), height=Inches(4.9))
bullets(
    slide,
    0.75,
    2.1,
    5.5,
    3.0,
    [
        "统一 1-based 坐标，替换 / 插入 / 缺失都有边界校验。",
        "DNA 差异、RNA 对比、蛋白逐位对比三栏联动。",
        "提前终止会截断蛋白，并在蛋白行标红。",
        "结果附免责声明：序列层面预测，不等同疾病结论。",
    ],
    13,
)
for i, (label, color) in enumerate(
    [("同义", GREEN), ("错义", AMBER), ("无义", RGBColor(0xDC, 0x26, 0x26)), ("移码", VIOLET)]
):
    chip(slide, 0.9 + i * 1.25, 5.35, 1.08, label, color)
text(slide, 0.75, 6.1, 5.6, 0.6, "预设：无义突变 → MEPW* 变 MEP*，提前终止为 true。", 11, MUTED)
footer(slide, 7)
notes(slide, "演示：点无义突变预设，展示蛋白行由 MEPW* 变成 MEP*。")

# ---------------------------------------------------------------- 8 map
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "07 · 地图", "把 ORF、GC、酶切位点放回同一条坐标轴", "可缩放、平移、框选；ORF 与突变可点击查看详情。")
img = crop_box("ui-map-desktop.png", (0, 0, 1400, 1230), "ppt-map.png")
slide.shapes.add_picture(str(img), Inches(0.85), Inches(1.85), height=Inches(5.05))
bullets(
    slide,
    7.35,
    2.0,
    5.1,
    4.2,
    [
        "正 / 反向 ORF 分层展示。",
        "起始绿色、终止红色圆点。",
        "GC 曲线与窗口参数明示。",
        "限制酶 / motif 分轨。",
        "反向坐标已换算为正链。",
        "缩放 / 平移 / 框选 / 分段。",
    ],
    13,
)
footer(slide, 8)
notes(slide, "演示：放大到 21–180，点一个 ORF 打开详情。")

# ---------------------------------------------------------------- 9 variants
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "08 · 证据", "ClinVar 只做“证据搬运”，不做诊断", "真实来源、真实链接、查询时间；VUS 不标成致病。")
img = crop_box("ui-variants-list.png", (0, 0, 1400, 1180), "ppt-variants.png")
slide.shapes.add_picture(str(img), Inches(6.9), Inches(1.8), height=Inches(5.2))
bullets(
    slide,
    0.75,
    2.05,
    5.6,
    3.2,
    [
        "支持基因名、rs 编号、VCV 编号查询。",
        "展示 GRCh38 位置、转录本、临床意义、审查状态、表型。",
        "VUS 明确显示「意义未明（VUS）」。",
        "缓存 10 分钟 + 0.35s 限流。",
        "超时 / 429 / 5xx / 无结果都有明确提示。",
    ],
    13,
)
card(slide, 0.9, 5.55, 5.4, 0.9, RGBColor(0xFF, 0xF8, 0xE6), RGBColor(0xF5, 0xD0, 0x8A))
text(slide, 1.1, 5.72, 5.0, 0.55, "数据库注释 ≠ 诊断结论；单条提交 ≠ 权威结论。", 11.5, RGBColor(0x92, 0x40, 0x0E), True)
footer(slide, 9)
notes(slide, "强调来源和免责声明，避免把 VUS 说成致病。")

# ---------------------------------------------------------------- 10 data
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "09 · 数据与报告", "一条记录，三种出口：页面、PDF、CSV", "报告由后端按数据库记录重新生成。")
cards = [
    ("SQLite", "3 张表", "analysis_records\ncomparisons\nmeta", BLUE),
    ("PDF", "A4 · 中文", "标题 / 指标 / 饼图\n四条链 / 页脚", VIOLET),
    ("CSV", "UTF-8 BOM", "字段完整\n可直接进 Excel", GREEN),
]
for i, (name, sub, desc, color) in enumerate(cards):
    x = 0.8 + i * 3.0
    card(slide, x, 2.1, 2.75, 2.6, WHITE)
    text(slide, x + 0.22, 2.3, 2.3, 0.35, name, 18, color, True)
    text(slide, x + 0.22, 2.75, 2.3, 0.3, sub, 11, MUTED)
    text(slide, x + 0.22, 3.15, 2.3, 1.2, desc, 11, TEXT)
report = SHOTS / "phase10-report-preview.png"
slide.shapes.add_picture(str(report), Inches(9.6), Inches(1.7), height=Inches(4.8))
text(slide, 0.8, 5.15, 8.6, 1.4,
     "历史页支持搜索、本地日期筛选、分页、详情与删除确认；PDF / CSV 均来自同一条记录。\n"
     "PDF 使用 Windows 中文字体回退链；CSV 带 BOM，Excel 不乱码。",
     12, MUTED)
footer(slide, 10)
notes(slide, "打开历史页，导出一份 PDF 和 CSV，指出两者字段一致。")

# ---------------------------------------------------------------- 11 quality
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "10 · 质量", "把“能演示”变成“可验证”", "自动化测试 + 三档 UI 审计 + 交互验收。")
metrics = [("164", "后端 pytest", GREEN), ("29", "前端 Vitest", BLUE), ("30", "页面加载审计", VIOLET), ("0", "控制台错误", CYAN)]
for i, (value, label, color) in enumerate(metrics):
    x = 0.8 + i * 3.05
    card(slide, x, 2.1, 2.8, 1.85, WHITE)
    text(slide, x + 0.25, 2.25, 2.3, 0.7, value, 32, color, True)
    text(slide, x + 0.25, 3.15, 2.3, 0.35, label, 11, MUTED)
bullets(
    slide,
    0.8,
    4.3,
    7.2,
    2.2,
    [
        "10 页 × 3 档 = 30 次加载：0 溢出 / 0 控制台错误 / 0 HTTP≥500。",
        "24 项交互验收：播放/暂停、步进、突变预设、CSV、10 条路由。",
        "构建 2.03s；ESLint 0 error / 1 条模板既有 warning。",
    ],
    12.5,
)
card(slide, 8.35, 4.3, 4.2, 1.85, NAVY)
text(slide, 8.6, 4.5, 3.7, 0.35, "测试覆盖", 11, CYAN, True)
text(slide, 8.6, 4.9, 3.7, 1.0, "DNA / 转录 / 翻译 / ORF\n突变 / 比对 / ClinVar / 地图", 12, WHITE)
footer(slide, 11)
notes(slide, "说明测试不是只测 happy path，还包括非法字符、坐标越界、限流与 404。")

# ---------------------------------------------------------------- 12 demo
slide = prs.slides.add_slide(blank)
bg(slide)
title(slide, "11 · 演示与展望", "5 分钟演示路线", "先讲中心法则，再讲突变与证据，最后看报告。")
steps = [
    ("01", "总览", "查看真实统计与演示数据"),
    ("02", "转录翻译", "选示例 B，播放 / 暂停 / 下一步"),
    ("03", "突变模拟", "无义预设，看蛋白对比"),
    ("04", "序列地图", "放大并点击 ORF"),
    ("05", "变异数据库", "BRCA1 → 详情 → 原始链接"),
    ("06", "历史记录", "导出 PDF / CSV"),
]
for i, (num, name, desc) in enumerate(steps):
    col = i % 3
    row = i // 3
    x = 0.8 + col * 4.0
    y = 2.05 + row * 1.85
    text(slide, x, y, 0.6, 0.4, num, 14, BLUE, True)
    text(slide, x + 0.55, y - 0.02, 3.0, 0.4, name, 15, TEXT, True)
    text(slide, x + 0.55, y + 0.42, 3.0, 0.6, desc, 11, MUTED)
card(slide, 0.8, 4.85, 11.6, 0.85, WHITE)
text(
    slide,
    1.05,
    5.02,
    11.1,
    0.5,
    "答辩提示：每一步都能回到算法结果；未实现的功能直接说明，不把规划说成已完成。",
    12,
    MUTED,
)
text(slide, 0.8, 6.0, 11.6, 0.8, "下一步：ORF 独立页 · 地图多突变叠加 · 更多转录本与离线缓存。", 12, VIOLET, True)
footer(slide, 12)
notes(slide, "收尾：明确哪些是已实现，哪些是规划；不把规划说成完成。")

prs.save(OUT)
print("saved", OUT, "slides", len(prs.slides))
