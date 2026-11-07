# -*- coding: utf-8 -*-
"""生成 GeneAI 2.0 课程论文 DOCX。"""
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
FIG = ROOT / ".tmp" / "paper"
OUT = ROOT / "docs" / "GeneAI-2.0-课程论文.docx"

NAVY = RGBColor(0x1E, 0x3A, 0x5F)
BLUE = RGBColor(0x1D, 0x4E, 0xD8)
GRAY = RGBColor(0x5B, 0x67, 0x78)
LIGHT = "EEF3FA"


def set_run_font(run, size=10.5, bold=False, color=None, east="宋体", latin="Times New Roman"):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.name = latin
    if color is not None:
        run.font.color.rgb = color
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    rfonts.set(qn("w:eastAsia"), east)
    rfonts.set(qn("w:ascii"), latin)
    rfonts.set(qn("w:hAnsi"), latin)


def para(text="", size=10.5, bold=False, color=None, align=WD_ALIGN_PARAGRAPH.JUSTIFY,
         first_indent=True, spacing=1.5, before=0, after=0, east="宋体", latin="Times New Roman"):
    p = doc.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    pf.line_spacing = spacing
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    if first_indent:
        pf.first_line_indent = Cm(0.74)
    run = p.add_run(text)
    set_run_font(run, size, bold, color, east, latin)
    return p


def heading(text, level=1):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(14 if level == 1 else 10)
    pf.space_after = Pt(6)
    pf.keep_with_next = True
    run = p.add_run(text)
    size = {1: 15, 2: 12.5, 3: 11}[level]
    set_run_font(run, size, True, NAVY if level == 1 else BLUE, east="黑体")
    if level == 1:
        pPr = p._p.get_or_add_pPr()
        pbdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "6")
        bottom.set(qn("w:space"), "4")
        bottom.set(qn("w:color"), "1D4ED8")
        pbdr.append(bottom)
        pPr.append(pbdr)
    return p


def caption(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(10)
    run = p.add_run(text)
    set_run_font(run, 9, False, GRAY, east="宋体")


def figure(name, text, width=15.5):
    path = FIG / name
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    p.add_run().add_picture(str(path), width=Cm(width))
    caption(text)


def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), color)
    tcPr.append(shd)


def table(headers, rows, widths, caption_text, font=9):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run(caption_text)
    set_run_font(run, 9, True, GRAY, east="宋体")

    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    hdr = t.rows[0].cells
    for i, h in enumerate(headers):
        hdr[i].width = Cm(widths[i])
        shade(hdr[i], "1E3A5F")
        cp = hdr[i].paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = cp.add_run(h)
        set_run_font(r, font, True, RGBColor(0xFF, 0xFF, 0xFF), east="黑体")
    for row in rows:
        cells = t.add_row().cells
        for i, value in enumerate(row):
            cells[i].width = Cm(widths[i])
            cp = cells[i].paragraphs[0]
            cp.alignment = WD_ALIGN_PARAGRAPH.LEFT
            cp.paragraph_format.space_after = Pt(0)
            cp.paragraph_format.line_spacing = 1.15
            r = cp.add_run(str(value))
            set_run_font(r, font, False, None, east="宋体")
    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(4)


def bullet(text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.line_spacing = 1.4
    p.paragraph_format.space_after = Pt(2)
    for run in p.runs:
        run.font.size = Pt(10.5)
    r = p.add_run(text)
    set_run_font(r, 10.5)


doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.top_margin = Cm(2.54)
sec.bottom_margin = Cm(2.54)
sec.left_margin = Cm(2.8)
sec.right_margin = Cm(2.8)

style = doc.styles["Normal"]
style.font.name = "Times New Roman"
style.font.size = Pt(10.5)
style.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")

# ---------------- 封面 ----------------
for _ in range(3):
    doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("GeneAI 2.0")
set_run_font(r, 30, True, BLUE, east="Arial")

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(6)
r = p.add_run("面向中心法则教学的 DNA 序列分析与突变可视化平台")
set_run_font(r, 17, True, NAVY, east="黑体")

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(10)
r = p.add_run("设计与实现")
set_run_font(r, 17, True, NAVY, east="黑体")

doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("—— 计算机学院课程论文 ——")
set_run_font(r, 12, False, GRAY, east="宋体")

for _ in range(5):
    doc.add_paragraph()

for label, value in [("学    院", "计算机学院"), ("专    业", "计算机科学与技术"),
                     ("姓    名", "____________"), ("学    号", "____________"),
                     ("指导教师", "____________")]:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 2.0
    r1 = p.add_run(f"{label}：")
    set_run_font(r1, 12, False, NAVY, east="宋体")
    r2 = p.add_run(value)
    set_run_font(r2, 12, False, None, east="宋体")

for _ in range(4):
    doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("2026 年 11 月")
set_run_font(r, 11, False, GRAY, east="宋体")

doc.add_page_break()

# ---------------- 摘要 ----------------
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("摘    要")
set_run_font(r, 16, True, NAVY, east="黑体")

para("DNA 序列分析是生物信息学的基础内容，也是高中与大学低年级生物课程中较难建立直觉的环节。"
     "传统教学以静态示意图为主，学生难以把 DNA 碱基、mRNA 密码子、氨基酸与最终蛋白质对应起来；"
     "现有在线工具多以表格和参数为主，动画与算法彼此脱节，且常把序列层面的计算结果直接表述为临床结论。"
     "针对上述问题，本文设计并实现了一个面向课程教学的 Web 平台 GeneAI 2.0。平台以“中心法则”为主线，"
     "把 DNA 分析、转录翻译、六阅读框 ORF、突变模拟、序列比对、序列地图、变异数据库查询、历史记录与 PDF/CSV 报告"
     "组织为 10 个可交互页面。系统采用 React 19 + TypeScript + Vite 构建前端，FastAPI + SQLAlchemy + SQLite 构建后端，"
     "生物计算基于 Biopython 与标准遗传密码表完成；动画不使用预制视频，而由后端返回的碱基、密码子和氨基酸序列驱动状态机逐步播放。"
     "本文重点讨论了链方向与坐标约定、六阅读框 ORF 的反向坐标换算、突变后果分类顺序、ClinVar 证据搬运与缓存限流、"
     "以及 PDF/CSV 报告的一致性生成。测试结果表明：后端 164 个 pytest 用例、前端 29 个 Vitest 用例全部通过；"
     "23 个 REST 接口在真实数据下完成 42 项断言；10 个页面在 1440/834/390 三种宽度下共 30 次加载均无横向溢出、"
     "无控制台错误、无 HTTP 5xx；24 项关键交互全部通过。平台在不引入 AI 问答、不虚构数据的前提下，"
     "为课堂演示与课后探索提供了一个可复现、可验证、可离线运行的实验环境。",
     size=10.5, spacing=1.4)
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(6)
r = p.add_run("关键词：")
set_run_font(r, 10.5, True, NAVY, east="黑体")
r = p.add_run("生物信息学教育；DNA 序列分析；中心法则；序列比对；突变可视化；Web 应用")
set_run_font(r, 10.5)

doc.add_page_break()

# ---------------- 1 引言 ----------------
heading("1  引言", 1)
heading("1.1  研究背景与动机", 2)
para("中心法则描述了遗传信息从 DNA 到 RNA 再到蛋白质的流动过程，是分子生物学课程的核心内容。"
     "然而，这一过程涉及多个层次：DNA 双链的方向性、转录时模板链与编码链的区分、mRNA 上三联体密码子的切分、"
     "tRNA 反密码子的配对、起始与终止密码子的识别，以及插入缺失引起的阅读框改变。"
     "在教学中，教师通常使用课本静态图或短视频说明这些概念，学生看到的是一条“已经完成”的路径，"
     "很难亲自验证“第 4 位碱基改变后，蛋白质为什么从第 2 个氨基酸开始不同”。")
para("另一方面，生物信息学工具虽然功能强大，但界面往往面向研究人员：参数多、术语密集、结果以文本或表格呈现。"
     "对于仅有初高中生物基础的学生，直接使用这类工具容易产生两类误解。其一是把算法预测等同于实验结论，"
     "例如看到“错义突变”就认为一定致病；其二是把不同链、不同阅读框的坐标混为一谈，导致无法复现结果。"
     "因此，课程项目需要的不是一个“更小的 BLAST”，而是一个能把算法中间结果透明展示出来、允许逐步检查的教学环境。")

heading("1.2  研究问题", 2)
para("本文围绕三个研究问题展开。第一，如何把中心法则中的链方向、密码子边界与阅读框变化，"
     "转化为可计算、可测试、可解释的数据结构？第二，如何让前端动画的每一帧都严格对应后端算法结果，"
     "避免“动画演示”和“计算结果”两张皮？第三，如何在引入 ClinVar 等外部证据时，既保留真实来源与原始链接，"
     "又明确区分数据库注释、算法模拟与临床诊断，避免对学习者造成误导？")

heading("1.3  主要工作与贡献", 2)
para("针对上述问题，本文完成了以下工作：")
bullet("设计并实现 GeneAI 2.0 平台，包含 10 个真实页面与 23 个 REST 接口，覆盖 DNA 分析、转录翻译、ORF、突变、比对、地图、变异查询与报告导出。")
bullet("提出“算法结果 → 动画帧”的状态机映射：总帧数等于 RNA 长度与密码子数之和，每一帧只读取后端返回的碱基或密码子，不生成随机碱基。")
bullet("实现六阅读框 ORF 扫描与统一的正链 1-based 坐标换算，并用单元测试覆盖负链起点、终点与嵌套 ORF 策略。")
bullet("实现突变模拟与后果分类，明确同义、错义、无义、移码、整码插入缺失、终止丢失的判定顺序，并在提前终止时截断蛋白序列。")
bullet("接入 NCBI ClinVar E-utilities，提供基因、rs 编号、VCV 编号查询，配合 10 分钟缓存、0.35 s 限流、VUS 明确标注与缺失字段提示。")
bullet("建立可复现的测试与验收流程：pytest 164 项、Vitest 29 项、API 42 项断言、13 步业务流程、30 次三档页面审计与 24 项交互验收。")

heading("1.4  论文组织结构", 2)
para("第 2 节回顾相关研究与现有工具；第 3 节给出需求分析与总体设计；第 4 节讨论关键算法与实现；"
     "第 5 节展示系统界面与工程实现；第 6 节报告测试结果并讨论；第 7 节总结局限与未来工作；第 8 节给出结论。")

# ---------------- 2 相关工作 ----------------
heading("2  相关工作", 1)
heading("2.1  生物信息学教学工具", 2)
para("早期的生物信息学教学多依赖命令行工具，如 EMBOSS、BLAST 与 Biopython 脚本。"
     "这类工具算法权威，但学习曲线陡峭，学生需要同时理解文件格式、参数和操作系统。"
     "近年来出现了一批可视化教学平台，例如 Phylo 游戏化比对工具、DNA 学习网站与交互式遗传学课件。"
     "它们降低了操作门槛，但往往只覆盖单一知识点：有的只做转录，有的只做比对，"
     "缺少从序列到蛋白质、再到变异解释的连续链路。")
para("GeneAI 2.0 与上述工作的区别在于：它不追求覆盖全部生物信息学任务，而是围绕“中心法则 + 序列变异”"
     "组织一条完整的教学路径，并强调每一步的中间结果都可以被检查。")

heading("2.2  序列比对与注释工具", 2)
para("序列比对方面，Needleman–Wunsch 全局比对与 Smith–Waterman 局部比对是经典算法。"
     "Biopython 的 PairwiseAligner 提供了成熟的实现，支持匹配、错配、gap open 与 gap extend 评分。"
     "序列注释方面，NCBI ClinVar 提供了变异与临床意义的人工注释，并通过 E-utilities 提供程序化访问。"
     "本文不重新实现这些成熟的底层算法，而是在其之上构建面向教学的结果组织、坐标统一与可视化表达。")

heading("2.3  突变后果预测", 2)
para("突变后果预测通常涉及密码子层面的翻译、阅读框判断与蛋白质长度变化。"
     "现有工具如 Mutalyzer、VEP 等更关注 HGVS 命名与转录本映射，输出专业但不易被初学者理解。"
     "本文将判定结果归纳为同义、错义、无义、移码、整码插入/缺失、终止丢失六类，"
     "并明确声明“序列层面预测不等同于疾病结论”，以降低误读风险。")

heading("2.4  现有平台的不足", 2)
para("综合来看，现有平台在三个方面仍有改进空间。第一，算法与动画脱节：动画常由前端定时器随机生成，"
     "暂停后无法与结果对应。第二，坐标体系不统一：正链、负链、转录本坐标混用，学生难以复核。"
     "第三，证据边界不清：数据库注释、算法预测与临床诊断被放在同一视觉层级。"
     "本文的设计正是针对这三点展开。")

# ---------------- 3 需求与设计 ----------------
heading("3  需求分析与总体设计", 1)
heading("3.1  用户与使用场景", 2)
para("目标用户包括三类：一是正在学习中心法则的本科生；二是需要课堂演示的教师；三是课程评审或答辩场景中的评委。"
     "典型场景是教师在 5 分钟内依次演示“序列分析 → 转录翻译 → 突变 → 地图 → 证据查询 → 报告导出”，"
     "学生在课后用同一平台复现并修改参数。")

heading("3.2  功能需求", 2)
para("平台最终落地为 10 个页面：分析总览、DNA 序列分析、转录与翻译、突变模拟、DNA 序列地图、"
     "变异数据库、序列比对、数据可视化、历史记录、系统设置。"
     "其中前六个是 2.0 阶段新增或重做的核心模块，后四个复用并整合了 1.0 阶段的能力。"
     "功能需求强调三点：所有统计来自真实序列；所有按钮有实际行为；所有异步操作具备加载、空态与错误反馈。")

heading("3.3  非功能需求", 2)
para("非功能需求包括：①可复现性，同一输入在前后端得到一致的碱基计数、GC 含量与蛋白质序列；"
     "②边界清晰，N 等模糊碱基单独计数、不进入 GC/AT 分母，ORF 统一标注为“潜在”；"
     "③隐私，序列与历史仅保存在本机 SQLite，不上传第三方；④响应式，桌面优先并适配 834 与 390 宽度；"
     "⑤可测试性，算法以纯函数或服务层组织，便于 pytest 与 Vitest 覆盖。")

heading("3.4  总体架构", 2)
para("系统采用前后端分离架构，如图 1 所示。展示层由 React 19、TypeScript 6 与 Vite 8 构成，"
     "使用 TanStack Router 管理 10 个页面路由，ECharts 负责统计图表，原生 SVG 负责 DNA 双螺旋与序列地图。"
     "接口层由 FastAPI 提供 23 个 REST 接口，使用 Pydantic 做请求校验，统一返回 {detail, code} 结构。"
     "算法层以 Biopython 与自研服务实现 DNA 清理、转录、翻译、ORF、突变、比对、限制酶与 GC 滑窗。"
     "数据层使用 SQLite，包含 analysis_records、comparisons 与 meta 三张表；外部证据通过 ClinVar E-utilities 按需查询。")
figure("fig-architecture.png", "图 1  GeneAI 2.0 四层架构与外部证据源", 15.0)

para("选择前后端分离而非纯前端计算，主要出于三点考虑：第一，Biopython 的比对与酶切实现更成熟，"
     "可以避免在浏览器中重复实现一套算法；第二，数据库需要统一保存原始序列、统计结果与报告参数；"
     "第三，后端服务层可以独立测试，保证同一套算法同时服务于页面、API 与 pytest。")

heading("3.5  数据模型", 2)
para("数据库包含三张表。analysis_records 保存单序列分析结果，包括名称、原始序列、长度、A/T/G/C/N 计数、"
     "GC/AT 含量、互补链、反向互补链、RNA、来源、算法版本与创建时间；comparisons 保存双序列比对结果，"
     "包括评分、一致性、替换/插入/缺失数量、比对文本与差异 JSON；meta 保存 schema_version 等元信息。"
     "表 1 给出了主要字段与约束。")
table(
    ["表", "关键字段", "约束/说明"],
    [
        ["analysis_records", "sequence_name, original_sequence, sequence_length, a_count, t_count, g_count, c_count, n_count, gc_content, at_content, complement, reverse_complement, rna, algorithm_version, created_at", "五类计数之和等于 sequence_length；source 限定 manual/fasta/demo"],
        ["comparisons", "reference_sequence, query_sequence, score, identity, substitutions, insertions, deletions, alignment_json, differences_json", "差异坐标以参考序列 1-based 记录"],
        ["meta", "key, value", "schema_version=1，用于迁移"],
    ],
    [2.8, 8.4, 4.0],
    "表 1  数据库主要表结构",
    font=8.5,
)

heading("3.6  接口设计", 2)
para("23 个接口按资源划分为六组：健康检查、序列分析、历史记录、双序列比对、中心法则与突变、地图与变异查询。"
     "所有接口以 /api 为前缀，错误统一为 {detail, code, field?}；序列长度上限 100000 bp，比对上限 5000 bp，"
     "FASTA 上传上限 2 MB，变异查询 limit 不超过 20。表 2 列出代表性接口。")
table(
    ["方法", "路径", "用途"],
    [
        ["POST", "/api/analyze", "单序列分析（不落库）"],
        ["POST", "/api/history", "保存分析记录"],
        ["GET", "/api/history/{id}/report", "生成 PDF 报告"],
        ["GET", "/api/history/{id}/csv", "导出 CSV"],
        ["POST", "/api/transcribe", "DNA→RNA（编码链/模板链）"],
        ["POST", "/api/translate", "按阅读框翻译"],
        ["POST", "/api/orfs", "六阅读框 ORF 扫描"],
        ["POST", "/api/mutate", "突变应用与后果分类"],
        ["POST", "/api/map", "序列地图图层"],
        ["GET", "/api/variants/search", "ClinVar 查询"],
    ],
    [1.8, 6.2, 7.2],
    "表 2  代表性 REST 接口",
    font=9,
)

heading("3.7  关键设计决策", 2)
bullet("统一坐标：所有对外坐标均为正链 1-based 闭区间；负链在服务层完成换算，前端只负责显示。")
bullet("真实优先：演示数据单独标记为“演示”，不计入历史统计；统计卡与图表只读取数据库或真实 API 返回。")
bullet("算法可检查：每个页面都提供“口径说明”或“免责声明”，把公式、窗口策略、同分策略写在界面上。")
bullet("渐进增强：桌面提供完整交互；移动端地图允许横向滑动，转录页使用固定控制条，避免把复杂图表压扁。")

# ---------------- 4 方法 ----------------
heading("4  关键方法与实现", 1)
heading("4.1  序列清理与基础统计", 2)
para("输入序列首先经过 clean_dna：去除空白与换行、统一大写、拒绝 U（提示使用转录接口）、"
     "仅允许 A/T/G/C/N，并在错误信息中给出 1-based 的非法字符位置。"
     "长度、A/T/G/C/N 计数与 GC/AT 含量在服务层一次性计算。GC 含量定义为 (G+C)/(A+T+G+C)，"
     "N 单独计数但不进入分母；当有效碱基为 0 时返回 0，而不是抛出除零错误。"
     "互补链使用 A↔T、C↔G、N↔N 的映射，反向互补链在此基础上反转顺序。")

heading("4.2  转录与翻译", 2)
para("转录接口显式区分编码链与模板链，以及输入方向。若输入为编码链 5′→3′，RNA 由 T→U 直接得到；"
     "若输入为模板链 5′→3′，先取反向互补得到编码链，再 T→U；若输入为模板链 3′→5′，先取互补再 T→U。"
     "无论输入哪种链，输出 RNA 统一为 5′→3′，并在响应中记录 input_strand、input_direction、"
     "coding_direction、template_direction 与 rna_direction，避免前端自行猜测。")
para("翻译以标准遗传密码表为基础，按 frame=1/2/3 将 RNA 切分为三联体。每个密码子返回单字母、三字母、"
     "起止坐标、是否起始、是否终止、是否含 N。末尾不足 3 个碱基不翻译，计入 ignored_bases；"
     "含 N 的密码子翻译为 X/Xaa，并给出警告；若第一个密码子不是 AUG、或没有终止密码子，也会写入 warnings。"
     "这些警告不会阻止结果返回，但会显示在页面与报告中。")

heading("4.3  六阅读框 ORF 扫描", 2)
para("ORF 扫描同时处理正链与反向互补链的三个阅读框。实现上以 ATG 为起点，沿同一阅读框扫描 TAA/TAG/TGA，"
     "遇到终止密码子即形成一个 ORF；若 require_stop=False，则允许无终止的开放区间。"
     "对于负链 ORF，服务层记录其在负链 5′→3′ 下的 frame 与起止，再换算为正链坐标："
     "start = L - end + 1，end = L - start。这样前端拿到的所有 ORF 都可以直接画在同一条正链坐标轴上。")
para("嵌套 ORF 采用显式策略：include_nested=True 时，内部 ATG 也各自形成 ORF；为 False 时，"
     "跳过落在已有 ORF 区间内的起点。结果中每个 ORF 都带有 is_potential=True，页面与文档统一称其为“潜在 ORF”，"
     "不表述为“已验证基因”。表 3 汇总了坐标与嵌套策略。")
table(
    ["项目", "规则 / 策略"],
    [
        ["正链 ORF", "直接记录正链 1-based 闭区间 start 与 end。"],
        ["负链 ORF", "在反向互补链上扫描，再换算为正链坐标后输出；前端始终显示正链坐标与链方向。"],
        ["嵌套 ORF", "include_nested=True 时内部 ATG 各自形成 ORF；False 时跳过落在已有 ORF 区间内的起点。"],
        ["长度与命名", "length_aa 不含终止符；所有结果 is_potential=True，统一称“潜在 ORF”。"],
    ],
    [3.2, 12.0],
    "表 3  ORF 坐标与嵌套策略",
    font=8.5,
)

heading("4.4  突变应用与后果分类", 2)
para("突变接口支持替换、插入、缺失三类操作。替换使用 1-based 位置，ref 可省略，alt 必须为合法碱基；"
     "插入位置表示“第 N 位之后”，0 表示序列开头；缺失可用 ref 或 length 指定长度。"
     "服务层先校验位置、越界、ref 是否匹配，再返回突变前后序列、删除/插入片段与 length_delta。")
para("后果分类不是简单看 DNA 变化，而是先转录、再翻译，按固定顺序判定："
     "无可翻译蛋白 → 移码（长度变化不是 3 的倍数）→ 同义 → 终止丢失 → 整码插入/缺失 → 无义 → 错义。"
     "这一顺序避免了“整码缺失被误判为无义”的问题。若突变产生提前终止，则把突变蛋白截断到第一个终止符，"
     "并按截断后的序列计算长度与逐位差异；前端据此把终止符标红，并在报告中说明“序列层面预测”。")

heading("4.5  动画状态机与算法一致性", 2)
para("转录翻译页面的动画由 use-player 状态机驱动，其核心思想是把“时间”映射为“算法结果的下标”。"
     "设 RNA 长度为 R，密码子数为 C，则总帧数 N=R+C；第 i 帧（1≤i≤N）在 i≤R 时显示前 i 个 RNA 碱基，"
     "在 i>R 时显示前 i-R 个密码子。每一帧只是对后端返回数组的切片，不产生新的碱基。"
     "暂停、上一步、下一步、重播与 0.5–2× 速度都只改变下标或定时器，不改变数据，因此暂停后画面与结果始终一致。")
figure("fig-pipeline.png", "图 2  DNA→RNA→蛋白质流水线与播放器状态机", 15.0)

heading("4.6  DNA 序列地图", 2)
para("序列地图使用原生 SVG 绘制，以避免引入重型图表库。地图在一个固定 viewBox 中分层：刻度尺、正链 ORF、"
     "负链 ORF、GC 曲线、限制酶、motif 与突变位点。视图用 0-based 的 [start,end) 表示，缩放与平移只改变视图，"
     "不改变数据；ORF 与标记在渲染时按视图裁剪。GC 曲线以窗口中心为 x、GC 含量为 y，面积从首窗口 start 延伸到末窗口 end。"
     "限制酶位点来自 Biopython 的 enzyme.search，坐标转换为 1-based；motif 同时搜索正链与反向互补链，负链坐标换算为正链。")
para("交互上支持滚轮缩放、拖动平移、Shift 框选、上一段/下一段与重置；悬停显示位置，点击 ORF 或突变标记打开详情。"
     "移动端因屏幕宽度有限，地图保持 720 px 最小宽度并允许横向滑动，同时给出“可左右滑动”的提示，而不是把标记压缩到不可读。")

heading("4.7  ClinVar 查询与证据边界", 2)
para("变异数据库模块通过 NCBI E-utilities 查询 ClinVar：先用 esearch 获取 Variation ID 列表，再用 esummary 批量取详情。"
     "查询类型自动识别基因名、rs 编号、VCV 编号与纯数字 ID；若输入为一段没有参考基因组、染色体位置与转录本信息的 DNA，"
     "则明确返回 UNSUPPORTED_QUERY，而不是猜测匹配。")
para("为控制访问频率，服务层使用进程内缓存（TTL 600 s）与最小请求间隔（无 API key 时 0.35 s，有 key 时 0.11 s），"
     "并对 429、5xx 与超时分别返回可读错误。结果中保留 ClinVar 原始链接、查询时间、审查状态与缺失字段；"
     "临床意义被映射为 pathogenic、likely_pathogenic、vus、likely_benign、benign、conflicting 等类别，"
     "VUS 在界面上明确显示为“意义未明（VUS）”，不会渲染为致病。")

heading("4.8  PDF 与 CSV 报告", 2)
para("报告由后端按数据库记录重新生成，而不是前端拼装。PDF 使用 ReportLab 绘制 A4 版面，"
     "优先注册 Windows 的微软雅黑字体，失败时回退黑体/宋体，最后回退 CID 字体；内容包含标题、样本信息、"
     "四项指标、碱基计数表、A/T/G/C 饼图、四条序列链与页脚。CSV 使用 UTF-8 BOM 与“字段/值”两列，"
     "确保 Excel 直接打开不乱码。PDF 与 CSV 都带记录编号与生成时间，便于与页面结果核对。")

# ---------------- 5 系统实现 ----------------
heading("5  系统实现与界面", 1)
heading("5.1  技术栈与工程结构", 2)
para("前端基于 shadcn-admin 模板二次开发，保留其 TanStack Router、shadcn/ui、Tailwind CSS 4 与主题体系，"
     "新增 features/analysis、transcription、mutation、map、variants 等模块；后端位于 server/，"
     "按 routers、services、schemas、models 分层。前后端通过 Vite 代理 /api 连接，开发端口为 5208 与 8000。")

heading("5.2  设计系统", 2)
para("全站采用深海军蓝侧栏、浅灰蓝背景与白色卡片，主色为蓝色，青色用于成功与序列高亮，紫色用于辅助分类。"
     "圆角统一为 1 rem，卡片使用柔和阴影；碱基颜色固定为 A 蓝、T 紫、G 琥珀、C 绿、N 灰，并在图表、图例、"
     "PDF 与地图中保持一致。标题、正文、说明文字使用三级字阶，页面标题统一由 PageHeader 组件渲染。")
figure("fig-dashboard.png", "图 3  分析总览：真实统计、GC/AT 趋势、碱基分布与最近记录", 14.6)

heading("5.3  核心页面", 2)
para("分析总览（图 3）以真实统计卡开始，展示总分析次数、序列数、平均 GC 与最近分析时间；"
     "趋势图同时绘制 GC 与 AT 两条曲线，环形图展示 A/T/G/C 占比，最近记录可直接打开详情。"
     "空库时提供“查看示例”，示例数据在页面顶部明确标注“演示数据”，且不写入历史统计。")
figure("fig-analysis.png", "图 4  DNA 序列分析：碱基统计、GC/AT、互补链、反向互补链与 RNA", 14.6)
para("DNA 分析页（图 4）把输入与结果并排：左侧支持手动输入、FASTA 上传、示例与清空；右侧展示长度、GC/AT、"
     "五碱基计数、三条转换链与复制按钮。所有结果由本地算法或后端返回，非法字符会在输入框下方给出精确位置。")

figure("fig-transcription.png", "图 5  转录与翻译：双螺旋、RNA 聚合酶、密码子与多肽链", 14.0)
para("转录翻译页（图 5）以动画区域为视觉中心：上方是 DNA 双螺旋与当前碱基高亮，中部是 RNA 聚合酶沿模板链移动、"
     "逐个生成 RNA 碱基，下方是核糖体读取密码子、tRNA 携带氨基酸并延伸多肽链。右侧固定显示进度、最终蛋白与碱基图例；"
     "移动端则使用底部固定控制条，保证滚动时仍可暂停与步进。")

figure("fig-mutation.png", "图 6  突变模拟：DNA 差异、RNA 对比与蛋白质逐位对比", 14.0)
para("突变页（图 6）采用左右对照：左侧设置突变类型、位置、替换碱基与预设，右侧依次展示后果徽标、DNA 差异、"
     "转录对比和蛋白质逐位对比。DNA 差异用红色表示参考序列中被替换/删除的碱基，绿色表示突变后新增/替换的碱基；"
     "蛋白质对比把替换、新增、缺失与终止符分别着色，并在报告中给出“不等于疾病结论”的免责声明。")

figure("fig-map.png", "图 7  DNA 序列地图：正/负链 ORF、GC 曲线、酶切位点与 motif", 14.4)
para("序列地图（图 7）把不同图层放在同一坐标轴上：正链与负链 ORF 分轨显示，起点与终点用绿色/红色圆点标记；"
     "GC 曲线以面积图呈现；限制酶与 motif 各自分轨。用户可缩放、平移、框选区间，点击 ORF 或突变标记查看详情。")

figure("fig-variants.png", "图 8  变异数据库：ClinVar 证据列表与临床意义标注", 14.4)
para("变异数据库（图 8）以证据搬运为边界：卡片展示基因、变异标识、GRCh38 位置、转录本、临床意义与审查状态，"
     "详情弹窗保留原始链接、查询时间与缺失字段；页面顶部固定提示“数据库注释不等于诊断结论”。")

heading("5.4  响应式与可访问性", 2)
para("布局以桌面为优先，在 1280 px 以下把双栏改为单栏，在 834 px 与 390 px 下重新排列工具栏与统计卡。"
     "侧栏在移动端折叠为抽屉，表格隐藏次要列，地图与转录碱基行允许横向滑动。"
     "交互元素提供 aria-label 与键盘焦点环，动画遵循 prefers-reduced-motion 时可关闭自动播放。"
     "全站跳过导航链接默认隐藏，仅在键盘聚焦时出现，避免遮挡内容。")

heading("5.5  数据真实性与状态反馈", 2)
para("平台不使用随机数生成统计图。所有图表读取后端聚合结果或本地真实分析结果；演示数据单独标记且不落库。"
     "每个异步页面都具备加载骨架、空态与错误态：例如变异查询在纯 DNA 输入时显示“缺少参考基因组与转录本信息”，"
     "地图在无 ORF 时显示“未发现数据缺失或截断”，转录页在密码子不足时给出警告而不是空白。")

# ---------------- 6 测试 ----------------
heading("6  测试与结果", 1)
heading("6.1  测试方法", 2)
para("测试分为四层：①算法单元测试，覆盖 DNA 清理、转录、翻译、ORF、突变、比对与地图特征；"
     "②接口测试，使用 FastAPI TestClient 与内存 SQLite，覆盖正常、非法、边界与 404；"
     "③前端单元测试，覆盖序列工具与 GC 滑窗；④端到端与界面审计，使用 Playwright 驱动真实浏览器，"
     "对 10 个页面在 1440/834/390 三种宽度下加载并采集控制台错误、HTTP 5xx 与横向溢出。")

heading("6.2  算法验证", 2)
para("表 4 使用三个 15 bp 教学样本验证中心法则链路。样本 A 为正常序列，样本 B 在第 2 个密码子引入终止，"
     "样本 C 在第 3 位插入 A 造成移码。三组结果与标准遗传密码表一致，说明转录、翻译、突变与蛋白截断逻辑正确。")
table(
    ["样本", "DNA（5′→3′）", "RNA", "蛋白", "说明"],
    [
        ["A", "ATGGAACCTTGGTAA", "AUGGAACCUUGGUAA", "MEPW*", "正常"],
        ["B", "ATGTAACCTTGGTAA", "AUGUAACCUUGGUAA", "M*", "第 2 个密码子提前终止"],
        ["C", "ATGAGAACCTTGGTAA", "AUGAGAACCUUGGUAA", "MRTLV", "第 3 位插入 A，移码"],
    ],
    [1.2, 4.3, 4.3, 2.0, 3.2],
    "表 4  教学样本的转录、翻译与突变结果",
    font=8.5,
)
para("其他验证包括：A 样本按 5 bp 窗口、5 bp 步长计算，各完整窗口 GC 均为 40%；限制酶序列 GAATTCAAAAGGATCCAAAGCTT 得到 EcoRI 2、"
     "BamHI 12、HindIII 19；A 与 B 的全局比对得到 1 个替换、0 插入、0 缺失、score 27；"
     "负链 ORF 的起止坐标经换算后与正链视图一致。上述结果均由真实 API 返回，而不是手工填写。")

heading("6.3  自动化测试与构建", 2)
para("后端 pytest 共 164 项全部通过（含 DNA、转录、翻译、ORF、突变、比对、地图、ClinVar 与报告），"
     "前端 Vitest 29 项全部通过；TypeScript 编译通过，Vite 生产构建耗时 2.03 s；"
     "ESLint 0 error，仅保留模板自带的 useReactTable 警告。表 5 汇总了质量指标。")
table(
    ["指标", "结果", "说明"],
    [
        ["pytest", "164 passed", "1 条 Starlette/httpx 弃用警告"],
        ["Vitest", "29 passed", "序列工具、GC 滑窗"],
        ["REST 接口", "23 个", "42 项断言全部通过"],
        ["生产构建", "2.03 s", "ECharts 独立 chunk 约 575 kB"],
        ["ESLint", "0 error / 1 warning", "模板既有警告"],
        ["界面审计", "30 次加载", "0 溢出 / 0 控制台错误 / 0 HTTP≥500"],
        ["交互验收", "24 / 24", "播放、步进、突变、CSV、路由"],
    ],
    [3.2, 5.0, 6.8],
    "表 5  质量指标汇总",
    font=9,
)

heading("6.4  界面与交互结果", 2)
para("三档宽度下，10 个页面均未出现横向溢出；移动端侧栏正确折叠，统计卡保持两列，地图与转录碱基行按设计横向滑动。"
     "24 项关键交互全部通过：示例载入、播放/暂停/上一步/下一步/重播、速度切换、突变预设、ClinVar 查询与详情、"
     "地图缩放与 ORF 弹窗、历史 CSV/PDF 导出、路由跳转。控制台未出现 error 级日志，接口未出现 5xx。")

heading("6.5  讨论", 2)
para("从教学角度看，平台的价值不在于替代实验，而在于把“不可见的中间步骤”变成可检查的对象。"
     "学生可以暂停在任意一帧，看到当前读取的模板碱基、对应的 RNA 碱基与密码子；也可以把同一序列的 ORF、"
     "GC 曲线与酶切位点放在同一坐标轴上比较。这种“同一坐标系下的多视图”比单独看一张静态图更有利于建立空间直觉。")
para("从工程角度看，前后端分离与算法服务化带来了可测试性，但也增加了状态同步成本。"
     "本文通过“后端返回完整结果、前端只做切片”的方式降低同步复杂度；代价是首屏需要等待一次网络请求。"
     "对于课堂演示，这一延迟可以通过预生成示例与缓存抵消。")

# ---------------- 7 局限 ----------------
heading("7  局限与未来工作", 1)
para("本文仍存在以下局限。第一，ORF 仅识别 ATG 起始与 TAA/TAG/TGA 终止，未覆盖 GTG/TTG 等替代起始；"
     "第二，ClinVar 查询依赖外网，离线时只能使用本地历史与演示数据；第三，地图一次只支持一个突变位点，"
     "限制酶与 motif 目前只有悬停提示，没有点击详情；第四，移动端地图需要横向滑动，尚未实现手势缩放；"
     "第五，突变后果分类是序列层面的规则判断，不涉及转录本异构体、剪接与人群频率。")
para("后续工作可以从三个方向推进：一是增加 ORF 独立分析页与批量序列处理；二是把地图升级为多突变叠加与多转录本视图；"
     "三是引入离线缓存与本地变异注释包，使课堂环境不依赖网络。")

# ---------------- 8 结论 ----------------
heading("8  结论", 1)
para("本文围绕“如何让中心法则与序列变异变得可检查”这一问题，设计并实现了 GeneAI 2.0。"
     "平台以真实算法为底座，以统一坐标为约束，以状态机动画与多层地图为表达手段，"
     "把 DNA 分析、转录翻译、ORF、突变、比对、变异证据与报告导出组织为一条连续的教学路径。"
     "测试结果表明，系统在算法正确性、接口稳定性、界面一致性与响应式布局方面达到了课程项目的验收要求。"
     "更重要的是，平台明确区分了算法模拟、数据库注释与临床诊断，为初学者建立正确的证据边界提供了可操作的范例。")

# ---------------- 参考文献 ----------------
heading("参考文献", 1)
refs = [
    "Altschul S F, Gish W, Miller W, et al. Basic local alignment search tool[J]. Journal of Molecular Biology, 1990, 215(3): 403-410.",
    "Needleman S B, Wunsch C D. A general method applicable to the search for similarities in the amino acid sequence of two proteins[J]. Journal of Molecular Biology, 1970, 48(3): 443-453.",
    "Cock P J A, Antao T, Chang J T, et al. Biopython: freely available Python tools for computational molecular biology and bioinformatics[J]. Bioinformatics, 2009, 25(11): 1422-1423.",
    "Landrum M J, Lee J M, Benson M, et al. ClinVar: public archive of interpretations of clinically relevant variants[J]. Nucleic Acids Research, 2016, 44(D1): D862-D868.",
    "Sherry S T, Ward M H, Kholodov M, et al. dbSNP: the NCBI database of genetic variation[J]. Nucleic Acids Research, 2001, 29(1): 308-311.",
    "den Dunnen J T, Antonarakis S E. Mutation nomenclature extensions and suggestions to describe complex mutations: a discussion[J]. Human Mutation, 2000, 15(1): 7-12.",
    "Richards S, Aziz N, Bale S, et al. Standards and guidelines for the interpretation of sequence variants[J]. Genetics in Medicine, 2015, 17(5): 405-424.",
    "Kumar S, Stecher G, Li M, et al. MEGA X: molecular evolutionary genetics analysis across computing platforms[J]. Molecular Biology and Evolution, 2018, 35(6): 1547-1549.",
    "Sievers F, Wilm A, Dineen D, et al. Fast, scalable generation of high-quality protein multiple sequence alignments using Clustal Omega[J]. Molecular Systems Biology, 2011, 7: 539.",
    "Rehm H L, Berg J S, Brooks L D, et al. ClinGen—the clinical genome resource[J]. New England Journal of Medicine, 2015, 372(23): 2235-2242.",
    "React Team. React 19 documentation[EB/OL]. https://react.dev, 2025.",
    "NCBI. E-utilities API documentation[EB/OL]. https://www.ncbi.nlm.nih.gov/books/NBK25501/, 2025.",
]
for i, ref in enumerate(refs, 1):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.74)
    p.paragraph_format.first_line_indent = Cm(-0.74)
    p.paragraph_format.line_spacing = 1.3
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(f"[{i}]  {ref}")
    set_run_font(r, 9, False, None, east="宋体")

# ---------------- 页眉页脚 ----------------
for section in doc.sections:
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    hr = hp.add_run("GeneAI 2.0  课程论文")
    set_run_font(hr, 8.5, False, GRAY, east="宋体")

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = fp.add_run("第 ")
    set_run_font(r1, 9, False, GRAY)
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    fr = OxmlElement("w:r")
    ft = OxmlElement("w:t")
    ft.text = "1"
    fr.append(ft)
    fld.append(fr)
    fp._p.append(fld)
    r2 = fp.add_run(" 页")
    set_run_font(r2, 9, False, GRAY)

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUT)
print("saved", OUT, OUT.stat().st_size)
