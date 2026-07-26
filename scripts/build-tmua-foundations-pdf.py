#!/usr/bin/env python3
"""Build the public TMUA Foundations Notes PDF from the canonical JSON asset."""

from __future__ import annotations

import html
import hashlib
import json
import shutil
from functools import partial
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/notes/tmua/foundations-v2.json"
OUTPUT = ROOT / "output/pdf/tmua-foundations-v2.pdf"
PUBLIC_OUTPUT = ROOT / "public/notes/tmua/tmua-foundations-v2.pdf"
FONT_PATH = ROOT / "scripts/assets/fonts/NotoSansCJKsc-VF.ttf"
FONT_SHA256 = "990c807e79c25662a5a9ecf7f971baeb2bf2eab9a559e5ecf15cdfdb8561d21f"

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_X = 17 * mm
MARGIN_TOP = 17 * mm
MARGIN_BOTTOM = 18 * mm
CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_X

PURPLE = colors.HexColor("#63528C")
PURPLE_DEEP = colors.HexColor("#4B3B72")
INK = colors.HexColor("#282332")
SLATE = colors.HexColor("#6F7074")
PAPER = colors.HexColor("#F7F1E7")
PAPER_RAISED = colors.HexColor("#FFFDF8")
LAVENDER = colors.HexColor("#EAE4F2")
GREEN = colors.HexColor("#3F725A")
AMBER = colors.HexColor("#A66A36")
LINE = colors.HexColor("#D4CEC5")

if not FONT_PATH.is_file() or hashlib.sha256(FONT_PATH.read_bytes()).hexdigest() != FONT_SHA256:
    raise ValueError("Embedded CJK font is missing or has changed")
pdfmetrics.registerFont(TTFont("MantouCJK", str(FONT_PATH)))


PDF_GLYPH_REPLACEMENTS = str.maketrans({
    "−": "-",
    "–": "-",
    "²": "^2",
    "³": "^3",
    "⁴": "^4",
    "≥": ">=",
    "≤": "<=",
    "≠": "!=",
    "→": "=>",
    "⇔": "<=>",
    "¬": "not ",
    "∀": "for all ",
    "∃": "there exists ",
    "∈": " in ",
    "•": "-",
    "·": "/",
})


def safe(value: object) -> str:
    compatible = str(value).translate(PDF_GLYPH_REPLACEMENTS)
    return html.escape(compatible).replace("\n", "<br/>")


BASE = getSampleStyleSheet()
STYLES = {
    "body": ParagraphStyle("BodyEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=9.3, leading=14.3, textColor=INK, spaceAfter=4),
    "support": ParagraphStyle("SupportZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=7.3, leading=11.3, textColor=SLATE, spaceAfter=6),
    "body_small": ParagraphStyle("BodySmallEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=7.6, leading=11.5, textColor=SLATE),
    "support_small": ParagraphStyle("SupportSmallZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=6.8, leading=10.3, textColor=SLATE),
    "kicker": ParagraphStyle("Kicker", parent=BASE["BodyText"], fontName="Helvetica-Bold", fontSize=7.2, leading=10, textColor=PURPLE, tracking=1.3, spaceAfter=8),
    "cover_kicker": ParagraphStyle("CoverKicker", parent=BASE["BodyText"], fontName="Helvetica-Bold", fontSize=7.5, leading=10, textColor=colors.white, tracking=1.4, spaceAfter=16),
    "cover_title": ParagraphStyle("CoverTitleEN", parent=BASE["Title"], fontName="Helvetica-Bold", fontSize=31, leading=37, textColor=colors.white, alignment=TA_LEFT, spaceAfter=7),
    "cover_zh": ParagraphStyle("CoverTitleZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=10, leading=15, textColor=colors.HexColor("#EAE4F2"), spaceAfter=20),
    "cover_subtitle": ParagraphStyle("CoverSubtitleEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=11, leading=16, textColor=colors.white, spaceAfter=5),
    "cover_support": ParagraphStyle("CoverSubtitleZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=6.8, leading=10.5, textColor=colors.HexColor("#EAE4F2")),
    "h1": ParagraphStyle("H1EN", parent=BASE["Heading1"], fontName="Helvetica-Bold", fontSize=22, leading=27, textColor=INK, spaceBefore=6, spaceAfter=3),
    "h1_zh": ParagraphStyle("H1ZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=8.3, leading=12.5, textColor=SLATE, spaceAfter=13),
    "h2": ParagraphStyle("H2EN", parent=BASE["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=INK, spaceBefore=10, spaceAfter=3),
    "h2_zh": ParagraphStyle("H2ZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=7.4, leading=11.2, textColor=SLATE, spaceAfter=8),
    "h3": ParagraphStyle("H3EN", parent=BASE["Heading3"], fontName="Helvetica-Bold", fontSize=10.2, leading=13.5, textColor=INK, spaceAfter=3),
    "h3_zh": ParagraphStyle("H3ZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=7.1, leading=10.7, textColor=SLATE, spaceAfter=3),
    "label": ParagraphStyle("LabelBilingual", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=7.2, leading=10.5, textColor=PURPLE, spaceAfter=2),
    "formula": ParagraphStyle("Formula", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=10.3, leading=16, textColor=PURPLE_DEEP, alignment=TA_CENTER, spaceBefore=3, spaceAfter=3),
    "white_small": ParagraphStyle("WhiteSmallEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=7.8, leading=11.8, textColor=colors.white),
    "white_support": ParagraphStyle("WhiteSupportZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=6.8, leading=10.5, textColor=colors.HexColor("#EAE4F2")),
    "white_h3": ParagraphStyle("WhiteH3EN", parent=BASE["Heading3"], fontName="Helvetica-Bold", fontSize=11.5, leading=16, textColor=colors.white, spaceAfter=4),
}


def paragraph(value: object, style: str = "body") -> Paragraph:
    return Paragraph(safe(value), STYLES[style])


class SectionRule(Flowable):
    def __init__(self, color: colors.Color = PURPLE):
        super().__init__()
        self.width = CONTENT_WIDTH
        self.height = 1
        self.color = color

    def draw(self) -> None:
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(0.7)
        self.canv.line(0, 0, self.width, 0)


def page_background(canvas, doc, edition: str) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_X, PAGE_HEIGHT - 11 * mm, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 11 * mm)
    canvas.setFont("Helvetica", 6.8)
    canvas.setFillColor(SLATE)
    canvas.drawString(MARGIN_X, 9 * mm, f"MANTUO ORIGINAL · TMUA FOUNDATIONS · {edition}")
    canvas.drawRightString(PAGE_WIDTH - MARGIN_X, 9 * mm, f"{doc.page}")
    canvas.restoreState()


def cover_background(canvas, _doc) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
    canvas.setFillColor(PURPLE_DEEP)
    canvas.rect(0, 73 * mm, PAGE_WIDTH, PAGE_HEIGHT - 73 * mm, stroke=0, fill=1)
    canvas.setFillColor(PURPLE)
    canvas.rect(MARGIN_X, 20 * mm, 35 * mm, 35 * mm, stroke=0, fill=1)
    canvas.setFont("Helvetica-Bold", 27)
    canvas.setFillColor(colors.white)
    canvas.drawCentredString(MARGIN_X + 17.5 * mm, 32 * mm, "MT")
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.drawString(MARGIN_X + 44 * mm, 47 * mm, "MANTUO ADMISSION TEST LIBRARY")
    canvas.setFont("MantouCJK", 8.5)
    canvas.drawString(MARGIN_X + 44 * mm, 39 * mm, "不再为升学考试而焦虑")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(SLATE)
    canvas.drawString(MARGIN_X + 44 * mm, 31 * mm, "Original teaching notes · Not an official UAT-UK publication")
    canvas.restoreState()


def bullet_rows(items: list[str], color: colors.Color = SLATE) -> list[Paragraph]:
    style = ParagraphStyle(
        "BulletDynamic",
        parent=STYLES["body_small"],
        textColor=color,
        leftIndent=9,
        firstLineIndent=-7,
        bulletIndent=0,
        spaceAfter=3,
    )
    return [Paragraph(f"- {safe(item)}", style) for item in items]


def bilingual(value_en: object, value_zh: object, primary: str = "body") -> list[Paragraph]:
    support = "support" if primary == "body" else "support_small"
    return [paragraph(value_en, primary), paragraph(value_zh, support)]


def bilingual_bullets(items_en: list[str], items_zh: list[str]) -> list[Paragraph]:
    if len(items_en) != len(items_zh):
        raise ValueError("English and Chinese lists must align")
    rows: list[Paragraph] = []
    for item_en, item_zh in zip(items_en, items_zh, strict=True):
        rows.extend(bullet_rows([item_en], INK))
        rows.append(paragraph(item_zh, "support_small"))
    return rows


def source_link(title: str, url: str) -> Paragraph:
    escaped_url = html.escape(url, quote=True)
    return Paragraph(
        f'<link href="{escaped_url}" color="#282332">{safe(title)}</link>',
        STYLES["h3"],
    )


def add_bilingual_heading(story: list[Flowable], zh: str, en: str, kicker: str | None = None) -> None:
    if kicker:
        story.append(paragraph(kicker.upper(), "kicker"))
    story.append(paragraph(en, "h1"))
    story.append(paragraph(zh, "h1_zh"))


def add_rules(story: list[Flowable], rules: list[dict]) -> None:
    rows = []
    for rule in rules:
        right = bilingual(rule["statementEn"], rule["statementZh"], "body_small")
        if rule.get("formula"):
            right.append(paragraph(rule["formula"]["text"], "formula"))
        rows.append([paragraph(rule["term"], "label"), right])
    table = Table(rows, colWidths=[0.34 * CONTENT_WIDTH, 0.66 * CONTENT_WIDTH])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([Spacer(1, 4), table, Spacer(1, 8)])


def add_worked_example(story: list[Flowable], example: dict) -> None:
    title = Table(
        [[paragraph("ORIGINAL WORKED EXAMPLE", "white_small"), [paragraph(example["titleEn"], "white_h3"), paragraph(example["titleZh"], "white_support")]]],
        colWidths=[0.31 * CONTENT_WIDTH, 0.69 * CONTENT_WIDTH],
    )
    title.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PURPLE_DEEP),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.extend([Spacer(1, 8), title])

    problem = Table([[paragraph("PROBLEM", "label"), bilingual(example["problemEn"], example["problemZh"])]], colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH])
    problem.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LAVENDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(problem)

    step_rows = []
    for step in example["steps"]:
        body = bilingual(step["bodyEn"], step["bodyZh"], "body_small")
        if step.get("math"):
            body.append(paragraph(step["math"]["text"], "formula"))
        step_rows.append([[paragraph(step["labelEn"], "label"), paragraph(step["labelZh"], "support_small")], body])
    steps = Table(step_rows, colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH])
    steps.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(steps)

    result = Table([
        [paragraph("CONCLUSION", "label"), bilingual(example["answerEn"], example["answerZh"], "body_small")],
        [paragraph("COMMON TRAP", "label"), bilingual(example["trapEn"], example["trapZh"], "body_small")],
    ], colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH])
    result.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EDF4EF")),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#F7EEE4")),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([result, Spacer(1, 7)])


def add_recall(story: list[Flowable], recall: dict) -> None:
    recall_box = Table([
        [paragraph("ACTIVE RECALL · 合上笔记回答", "label")],
        [[paragraph(recall["promptEn"]), paragraph(recall["promptZh"], "support")]],
        [[paragraph("ANSWER · " + recall["answerEn"], "body_small"), paragraph("答案 · " + recall["answerZh"], "support_small")]],
    ], colWidths=[CONTENT_WIDTH])
    recall_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 1), LAVENDER),
        ("BACKGROUND", (0, 2), (-1, 2), PAPER_RAISED),
        ("BOX", (0, 0), (-1, -1), 0.6, PURPLE),
        ("LINEABOVE", (0, 2), (-1, 2), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    # Keep the label, prompt and answer together. Without this wrapper ReportLab
    # can leave an orphaned ACTIVE RECALL heading at the foot of a page.
    story.append(KeepTogether([Spacer(1, 5), recall_box, Spacer(1, 7)]))


def build_story(notes: dict) -> list[Flowable]:
    story: list[Flowable] = []

    story.extend([
        Spacer(1, 30 * mm),
        paragraph("MANTUO ORIGINAL TEACHING NOTES · " + notes["edition"], "cover_kicker"),
        paragraph(notes["titleEn"], "cover_title"),
        paragraph(notes["titleZh"], "cover_zh"),
        paragraph(notes["subtitleEn"], "cover_subtitle"),
        paragraph(notes["subtitleZh"], "cover_support"),
        Spacer(1, 6 * mm),
        PageBreak(),
    ])

    add_bilingual_heading(story, "如何使用这份笔记", "How to Use This Pack", "Reader guide")
    story.extend(bilingual(notes["scope"]["includedEn"], notes["scope"]["includedZh"]))
    story.extend([
        Spacer(1, 6),
        Table([
            [paragraph("EDITION", "label"), bilingual("Foundation Edition: structured for first-pass review, curriculum mapping and active recall.", "基础版：用于第一轮复习、课程映射与主动回忆。", "body_small")],
            [paragraph("AUTHORSHIP BOUNDARY", "label"), bilingual(notes["rightsNoticeEn"], notes["rightsNotice"], "body_small")],
            [paragraph("GO DEEPER", "label"), bilingual(notes["scope"]["remainingEn"], notes["scope"]["remainingZh"], "body_small")],
        ], colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH], style=TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.45, LINE),
            ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ])),
        Spacer(1, 14),
    ])

    add_bilingual_heading(story, "官方考试地图", "Official Exam Map", "Facts first")
    fact_rows = []
    facts = notes["examMap"]["officialFacts"]
    for i in range(0, len(facts), 2):
        cells = []
        for fact in facts[i:i + 2]:
            cells.append([
                paragraph(fact["labelEn"].upper(), "label"),
                paragraph(fact["labelZh"], "support_small"),
                paragraph(fact["valueEn"], "body_small"),
                paragraph(fact["valueZh"], "support_small"),
            ])
        while len(cells) < 2:
            cells.append("")
        fact_rows.append(cells)
    fact_table = Table(fact_rows, colWidths=[CONTENT_WIDTH / 2, CONTENT_WIDTH / 2])
    fact_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.extend([fact_table, Spacer(1, 12), paragraph("MANTUO THREE-PASS METHOD", "kicker"), paragraph("满托三轮训练建议", "support_small")])
    strategy_cells = []
    for item in notes["examMap"]["mantouStrategy"]:
        strategy_cells.append([
            paragraph(item["nameEn"], "white_h3"),
            paragraph(item["nameZh"], "white_support"),
            paragraph(item["guidanceEn"], "white_small"),
            paragraph(item["guidanceZh"], "white_support"),
        ])
    strategy = Table([strategy_cells], colWidths=[CONTENT_WIDTH / 3] * 3)
    strategy.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PURPLE_DEEP),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.7, PURPLE_DEEP),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#8070A7")),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.extend([strategy, Spacer(1, 16)])

    add_bilingual_heading(story, "课程衔接：具体缺什么", "Curriculum Bridge", "A-Level · IB · AP")
    story.extend(bilingual("Curriculum mapping estimates syllabus exposure; it does not replace an individual diagnosis. Completed units, examination board and timed evidence can change the conclusion.", "课程映射只判断 syllabus exposure，不代替个人能力诊断。完成单元、考试局和真实做题证据会改变结论。", "body_small"))
    for bridge in notes["curriculumBridges"]:
        color = GREEN if bridge["status"] == "strong-start" else AMBER
        card = Table([
            [paragraph(bridge["curriculum"], "h3"), [paragraph(bridge["status"].replace("-", " ").upper(), "label"), paragraph(bridge["statusZh"], "support_small")]],
            [paragraph("LIKELY COVERED", "label"), bilingual_bullets(bridge["likelyCoveredEn"], bridge["likelyCoveredZh"])],
            [paragraph("CHECK GAPS", "label"), bilingual_bullets(bridge["confirmEn"], bridge["confirmZh"])],
            [paragraph("FIRST ACTION", "label"), bilingual(bridge["firstActionEn"], bridge["firstActionZh"], "body_small")],
        ], colWidths=[0.29 * CONTENT_WIDTH, 0.71 * CONTENT_WIDTH])
        card.setStyle(TableStyle([
            ("SPAN", (0, 0), (0, 0)),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, 0), LAVENDER),
            ("BACKGROUND", (0, 1), (-1, -1), PAPER_RAISED),
            ("GRID", (0, 0), (-1, -1), 0.45, LINE),
            ("BOX", (0, 0), (-1, -1), 0.8, color),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.extend([Spacer(1, 8), card])

    for chapter in notes["chapters"]:
        story.append(CondPageBreak(125 * mm))
        add_bilingual_heading(story, chapter["titleZh"], chapter["titleEn"], f"Chapter {chapter['number']} · TMUA Foundations")
        story.extend(bilingual(chapter["summaryEn"], chapter["summaryZh"]))
        outcomes = Table([[paragraph("LEARNING OUTCOMES", "label"), bilingual_bullets(chapter["learningOutcomesEn"], chapter["learningOutcomes"])]] , colWidths=[0.24 * CONTENT_WIDTH, 0.76 * CONTENT_WIDTH])
        outcomes.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LAVENDER),
            ("BOX", (0, 0), (-1, -1), 0.5, PURPLE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]))
        story.extend([Spacer(1, 8), outcomes, Spacer(1, 12)])

        for section_index, section in enumerate(chapter["sections"], start=1):
            story.extend([
                SectionRule(),
                paragraph(f"{chapter['number']}.{section_index}", "kicker"),
                paragraph(section["titleEn"], "h2"),
                paragraph(section["titleZh"], "h2_zh"),
            ])
            for body_en, body_zh in zip(section["paragraphsEn"], section["paragraphsZh"], strict=True):
                story.extend(bilingual(body_en, body_zh))
            add_rules(story, section["rules"])
            for example in section.get("workedExamples", []):
                add_worked_example(story, example)
            for recall in section["activeRecall"]:
                add_recall(story, recall)

    story.append(CondPageBreak(125 * mm))
    checkpoint = notes["checkpoint"]
    add_bilingual_heading(story, checkpoint["titleZh"], checkpoint["titleEn"], "Active recall")
    story.extend(bilingual(checkpoint["instructionsEn"], checkpoint["instructionsZh"], "body_small"))
    for index, question in enumerate(checkpoint["questions"], start=1):
        options = [f"{chr(65 + i)}. {option}" for i, option in enumerate(question["options"])]
        answer_letter = chr(65 + question["correctOption"])
        question_box = Table([
            [paragraph(f"{index:02d}", "label"), [paragraph(question["promptEn"], "h3"), paragraph(question["promptZh"], "h3_zh")]],
            ["", bullet_rows(options, INK)],
            [paragraph("ANSWER", "label"), [paragraph(f"{answer_letter}. {question['explanationEn']}", "body_small"), paragraph(question["explanationZh"], "support_small")]],
        ], colWidths=[0.11 * CONTENT_WIDTH, 0.89 * CONTENT_WIDTH])
        question_box.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, 1), PAPER_RAISED),
            ("BACKGROUND", (0, 2), (-1, 2), LAVENDER),
            ("GRID", (0, 0), (-1, -1), 0.4, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.extend([Spacer(1, 8), question_box])

    story.append(CondPageBreak(145 * mm))
    add_bilingual_heading(story, "把每道题变成下一次会做", "Turn Every Attempt into Evidence", "Review loop")
    workflow_rows = []
    for index, item in enumerate(notes["reviewWorkflow"], start=1):
        workflow_rows.append([
            paragraph(f"{index:02d}", "label"),
            [paragraph(item["stepEn"], "h3"), paragraph(item["stepZh"], "h3_zh")],
            bilingual(item["actionEn"], item["actionZh"], "body_small"),
        ])
    workflow = Table(workflow_rows, colWidths=[0.08 * CONTENT_WIDTH, 0.25 * CONTENT_WIDTH, 0.67 * CONTENT_WIDTH])
    workflow.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.extend([workflow, Spacer(1, 20)])

    add_bilingual_heading(story, "版本边界与官方依据", "Version Boundary and Official Anchors", "Sources")
    story.extend(bilingual(notes["rightsNoticeEn"], notes["rightsNotice"]))
    story.extend(bilingual(notes["scope"]["remainingEn"], notes["scope"]["remainingZh"], "body_small"))
    source_cells = []
    for source in notes["officialAnchors"]:
        source_cells.append([
            source_link(source["title"], source["sourceUrl"]),
            paragraph(source["usedForEn"], "body_small"),
            paragraph(source["usedForZh"], "support_small"),
            paragraph("Click the title to open the official source.", "body_small"),
            paragraph("点击标题打开官方原文", "support_small"),
        ])
    source_rows = [source_cells[index:index + 2] for index in range(0, len(source_cells), 2)]
    sources = Table(source_rows, colWidths=[0.5 * CONTENT_WIDTH, 0.5 * CONTENT_WIDTH])
    sources.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    closing = Table([
        [
            [paragraph("NEXT TRAINING STEP", "cover_kicker"), paragraph("下一步训练", "white_support")],
            [paragraph("Complete active recall · practise by topic online · establish a baseline on an unseen paper", "white_h3"), paragraph("完成主动回忆检查 · 进入在线分主题练习 · 使用未见卷建立基线", "white_support")],
        ]
    ], colWidths=[0.31 * CONTENT_WIDTH, 0.69 * CONTENT_WIDTH])
    closing.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PURPLE_DEEP),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 15),
        ("RIGHTPADDING", (0, 0), (-1, -1), 15),
        ("TOPPADDING", (0, 0), (-1, -1), 22),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 22),
    ]))
    story.extend([Spacer(1, 8), sources, Spacer(1, 18), closing])
    return story


def build_pdf(output: Path, notes: dict) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title=notes["titleEn"],
        author="Mantou Education",
        subject="Original bilingual TMUA review notes",
        creator="Admission Test Breaker",
        invariant=1,
    )
    cover_frame = Frame(MARGIN_X, 78 * mm, CONTENT_WIDTH, PAGE_HEIGHT - 105 * mm, id="cover-frame", showBoundary=0)
    body_frame = Frame(MARGIN_X, MARGIN_BOTTOM, CONTENT_WIDTH, PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM, id="body-frame", showBoundary=0)
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=cover_background, autoNextPageTemplate="body"),
        PageTemplate(id="body", frames=[body_frame], onPage=partial(page_background, edition=notes["edition"])),
    ])
    doc.build(build_story(notes))


def main() -> None:
    notes = json.loads(SOURCE.read_text(encoding="utf-8"))
    build_pdf(OUTPUT, notes)
    PUBLIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUTPUT, PUBLIC_OUTPUT)
    print(f"Built {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")
    print(f"Copied {PUBLIC_OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
