"""Generate the GeneAI 2.0 course paper (DOCX) and its figures."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"
OUT = ROOT / ".tmp" / "paper"
OUT.mkdir(parents=True, exist_ok=True)

CN = "C:/Windows/Fonts/msyh.ttc"
CN_BOLD = "C:/Windows/Fonts/msyhbd.ttc"


def font(size, bold=False):
    return ImageFont.truetype(CN_BOLD if bold else CN, size, index=0)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, content, size=20, bold=False, fill="#0f172a"):
    draw.text(xy, content, font=font(size, bold), fill=fill)


def arrow(draw, start, end, color="#64748b", width=3):
    draw.line([start, end], fill=color, width=width)
    x, y = end
    draw.polygon([(x, y), (x - 10, y - 6), (x - 10, y + 6)], fill=color)


def make_architecture():
    img = Image.new("RGB", (1800, 1000), "white")
    d = ImageDraw.Draw(img)
    layers = [
        (40, "展示层", "#2563eb", "React 19 · TypeScript 6 · Vite 8",
         ["TanStack Router · 10 个页面", "ECharts / 原生 SVG", "shadcn/ui · Tailwind CSS 4", "深色侧栏 · 统一设计令牌"]),
        (270, "接口层", "#0e7490", "FastAPI · 23 个 REST 接口",
         ["Pydantic 请求校验", "统一错误 {detail, code}", "CORS · 本地 5208 / 8000", "OpenAPI 文档"]),
        (500, "算法层", "#7c3aed", "Biopython + 自研服务",
         ["DNA / 转录 / 翻译", "ORF / 突变 / 比对", "限制酶 / Motif / GC 窗口", "ClinVar / PDF / CSV"]),
        (730, "数据层", "#334155", "SQLite · server/geneai.db",
         ["analysis_records", "comparisons", "meta", "本机文件 · 启动自动建表"]),
    ]
    for y, name, color, tech, chips in layers:
        rounded(d, (55, y, 1745, y + 195), 18, "#f8fafc", "#e2e8f0", 2)
        d.rounded_rectangle((55, y, 70, y + 195), radius=7, fill=color)
        text(d, (95, y + 22), name, 30, True, color)
        text(d, (95, y + 78), tech, 20, False, "#475569")
        cx = 600
        for i, chip in enumerate(chips):
            cy = y + 28 + (i // 2) * 78
            w = int(d.textlength(chip, font=font(18))) + 44
            rounded(d, (cx, cy, cx + w, cy + 58), 29, "white", "#dbe3ef", 1)
            text(d, (cx + 22, cy + 15), chip, 18, False, "#1e293b")
            cx += w + 18
            if i % 2 == 1:
                cx = 600
    for y in (235, 465, 695):
        arrow(d, (1580, y), (1580, y + 33), "#94a3b8", 3)
        arrow(d, (1610, y + 33), (1610, y), "#94a3b8", 3)
        text(d, (1450, y + 2), "HTTP / JSON", 14, False, "#64748b")
    rounded(d, (1190, 760, 1735, 900), 18, "#0b1e3d", None)
    text(d, (1215, 778), "NCBI ClinVar（E-utilities）", 21, True, "white")
    text(d, (1215, 818), "仅搬运数据库注释与证据，不做二次判读", 15, False, "#c7d7f5")
    text(d, (1215, 850), "10 分钟缓存 · 0.35 s 限流 · 超时/429 明确报错", 15, False, "#c7d7f5")
    arrow(d, (1050, 700), (1050, 758), "#94a3b8", 3)
    text(d, (1068, 712), "按需查询", 14, False, "#64748b")
    img.save(OUT / "fig-architecture.png")


def make_pipeline():
    img = Image.new("RGB", (1800, 620), "white")
    d = ImageDraw.Draw(img)
    boxes = [
        (40, "DNA 输入", "清理 / 校验 / N 策略", "#2563eb"),
        (390, "mRNA", "编码链 T→U 或模板链换算", "#0e7490"),
        (740, "密码子", "三联体切分 · 起始 / 终止", "#7c3aed"),
        (1090, "氨基酸", "标准遗传密码 · 三字母", "#b45309"),
        (1440, "蛋白质 / 报告", "序列 · 长度 · 后果说明", "#15803d"),
    ]
    for x, title, sub, color in boxes:
        rounded(d, (x, 150, x + 310, 300), 18, "white", color, 3)
        d.rounded_rectangle((x, 150, x + 310, 168), radius=9, fill=color)
        text(d, (x + 22, 190), title, 25, True, color)
        text(d, (x + 22, 238), sub, 16, False, "#475569")
    for x in (350, 700, 1050, 1400):
        arrow(d, (x, 225), (x + 35, 225), "#94a3b8", 4)
    rounded(d, (40, 360, 1760, 585), 18, "#f8fafc", "#e2e8f0", 2)
    text(d, (70, 382), "播放器状态机", 22, True, "#0f172a")
    states = ["待开始", "转录中", "翻译中", "演示完成"]
    colors = ["#64748b", "#0e7490", "#7c3aed", "#15803d"]
    for i, (s, c) in enumerate(zip(states, colors)):
        x = 70 + i * 180
        rounded(d, (x, 432, x + 150, 478), 23, c)
        text(d, (x + 38, 443), s, 17, True, "white")
        if i < 3:
            arrow(d, (x + 158, 455), (x + 172, 455), "#94a3b8", 2)
    text(d, (70, 505), "开始 / 暂停 / 继续 / 上一步 / 下一步 / 重播 / 0.5–2× 速度", 17, False, "#475569")
    text(d, (870, 400), "帧总数 N = RNA 长度 + 密码子数", 18, True, "#1e293b")
    text(d, (870, 438), "第 i 帧只读取 /api/transcribe 与 /api/translate 的返回值；", 16, False, "#475569")
    text(d, (870, 470), "不生成随机碱基，暂停后画面与结果始终一致。", 16, False, "#475569")
    img.save(OUT / "fig-pipeline.png")


def crop(src, box, name, quality=92):
    img = Image.open(SHOTS / src).convert("RGB").crop(box)
    img.save(OUT / name, quality=quality)


make_architecture()
make_pipeline()
crop("ui-dashboard-desktop.png", (0, 0, 1440, 1300), "fig-dashboard.png")
crop("phase10-analysis.png", (0, 0, 1440, 1240), "fig-analysis.png")
crop("ui-transcription-playing.png", (250, 340, 1440, 1450), "fig-transcription.png")
crop("ui-mutation-result.png", (250, 230, 1440, 1250), "fig-mutation.png")
crop("ui-map-desktop.png", (250, 235, 1440, 1010), "fig-map.png")
crop("ui-variants-list.png", (250, 230, 1420, 1000), "fig-variants.png")
print("figures ready", OUT)
