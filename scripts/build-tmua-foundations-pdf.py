#!/usr/bin/env python3
"""Build the public TMUA Foundations Notes PDF from the canonical JSON asset."""

from __future__ import annotations

import html
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
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
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

pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))


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
    "body": ParagraphStyle(
        "BodyCN",
        parent=BASE["BodyText"],
        fontName="STSong-Light",
        fontSize=9.2,
        leading=16,
        textColor=INK,
        spaceAfter=6,
    ),
    "body_small": ParagraphStyle(
        "BodySmallCN",
        parent=BASE["BodyText"],
        fontName="STSong-Light",
        fontSize=7.6,
        leading=12.5,
        textColor=SLATE,
    ),
    "kicker": ParagraphStyle(
        "Kicker",
        parent=BASE["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=7.2,
        leading=10,
        textColor=PURPLE,
        tracking=1.3,
        spaceAfter=8,
    ),
    "cover_kicker": ParagraphStyle(
        "CoverKicker",
        parent=BASE["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.white,
        tracking=1.4,
        spaceAfter=16,
    ),
    "cover_title": ParagraphStyle(
        "CoverTitle",
        parent=BASE["Title"],
        fontName="STSong-Light",
        fontSize=36,
        leading=44,
        textColor=colors.white,
        alignment=TA_LEFT,
        spaceAfter=10,
    ),
    "cover_en": ParagraphStyle(
        "CoverEN",
        parent=BASE["BodyText"],
        fontName="Helvetica",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#EAE4F2"),
        spaceAfter=25,
    ),
    "cover_subtitle": ParagraphStyle(
        "CoverSubtitle",
        parent=BASE["BodyText"],
        fontName="STSong-Light",
        fontSize=12,
        leading=21,
        textColor=colors.white,
    ),
    "h1": ParagraphStyle(
        "H1CN",
        parent=BASE["Heading1"],
        fontName="STSong-Light",
        fontSize=25,
        leading=33,
        textColor=INK,
        spaceBefore=6,
        spaceAfter=5,
    ),
    "h1_en": ParagraphStyle(
        "H1EN",
        parent=BASE["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=PURPLE,
        tracking=0.7,
        spaceAfter=15,
    ),
    "h2": ParagraphStyle(
        "H2CN",
        parent=BASE["Heading2"],
        fontName="STSong-Light",
        fontSize=16,
        leading=22,
        textColor=INK,
        spaceBefore=12,
        spaceAfter=3,
    ),
    "h2_en": ParagraphStyle(
        "H2EN",
        parent=BASE["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=7.2,
        leading=10,
        textColor=PURPLE,
        tracking=0.5,
        spaceAfter=9,
    ),
    "h3": ParagraphStyle(
        "H3CN",
        parent=BASE["Heading3"],
        fontName="STSong-Light",
        fontSize=11,
        leading=16,
        textColor=INK,
        spaceAfter=4,
    ),
    "label": ParagraphStyle(
        "LabelCN",
        parent=BASE["BodyText"],
        fontName="STSong-Light",
        fontSize=7.4,
        leading=11,
        textColor=PURPLE,
        spaceAfter=3,
    ),
    "formula": ParagraphStyle(
        "Formula",
        parent=BASE["BodyText"],
        fontName="STSong-Light",
        fontSize=11,
        leading=17,
        textColor=PURPLE_DEEP,
        alignment=TA_CENTER,
        spaceBefore=4,
        spaceAfter=3,
    ),
    "white_small": ParagraphStyle(
        "WhiteSmall",
        parent=BASE["BodyText"],
        fontName="STSong-Light",
        fontSize=8,
        leading=13,
        textColor=colors.white,
    ),
    "white_h3": ParagraphStyle(
        "WhiteH3",
        parent=BASE["Heading3"],
        fontName="STSong-Light",
        fontSize=11.5,
        leading=16,
        textColor=colors.white,
        spaceAfter=4,
    ),
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
    canvas.setFont("STSong-Light", 8.5)
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


def source_link(title: str, url: str) -> Paragraph:
    escaped_url = html.escape(url, quote=True)
    return Paragraph(
        f'<link href="{escaped_url}" color="#282332">{safe(title)}</link>',
        STYLES["h3"],
    )


def add_bilingual_heading(story: list[Flowable], zh: str, en: str, kicker: str | None = None) -> None:
    if kicker:
        story.append(paragraph(kicker.upper(), "kicker"))
    story.append(paragraph(zh, "h1"))
    story.append(paragraph(en.upper(), "h1_en"))


def add_rules(story: list[Flowable], rules: list[dict]) -> None:
    rows = []
    for rule in rules:
        right = [paragraph(rule["statementZh"], "body_small")]
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
        [[paragraph("ORIGINAL WORKED EXAMPLE", "white_small"), paragraph(example["titleZh"], "white_h3")]],
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

    problem = Table([[paragraph("题目 / Problem", "label"), [paragraph(example["problemZh"]), paragraph(example["problemEn"], "body_small")]]], colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH])
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
        body = [paragraph(step["bodyZh"], "body_small")]
        if step.get("math"):
            body.append(paragraph(step["math"]["text"], "formula"))
        step_rows.append([paragraph(step["labelZh"], "label"), body])
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
        [paragraph("结论", "label"), paragraph(example["answerZh"], "body_small")],
        [paragraph("常见误区", "label"), paragraph(example["trapZh"], "body_small")],
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
        [paragraph("合上笔记回答 / ACTIVE RECALL", "label")],
        [[paragraph(recall["promptZh"]), paragraph(recall["promptEn"], "body_small")]],
        [[paragraph("答案：" + recall["answerZh"], "body_small"), paragraph(recall["answerEn"], "body_small")]],
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
    story.extend([Spacer(1, 5), recall_box, Spacer(1, 7)])


def build_story(notes: dict) -> list[Flowable]:
    story: list[Flowable] = []

    story.extend([
        Spacer(1, 30 * mm),
        paragraph("MANTUO ORIGINAL TEACHING NOTES · " + notes["edition"], "cover_kicker"),
        paragraph(notes["titleZh"], "cover_title"),
        paragraph(notes["titleEn"], "cover_en"),
        paragraph(notes["subtitleZh"], "cover_subtitle"),
        Spacer(1, 8 * mm),
        paragraph(notes["subtitleEn"], "white_small"),
        PageBreak(),
    ])

    add_bilingual_heading(story, "如何使用这份笔记", "How to Use This Pack", "Reader guide")
    story.extend([
        paragraph(notes["scope"]["includedZh"]),
        paragraph(notes["scope"]["includedEn"], "body_small"),
        Spacer(1, 6),
        Table([
            [paragraph("本版状态", "label"), paragraph("教研预览：可用于学习体验；尚未标记为独立学科教师终审版。", "body_small")],
            [paragraph("原创边界", "label"), paragraph(notes["rightsNotice"], "body_small")],
            [paragraph("后续章节", "label"), paragraph(notes["scope"]["remainingZh"], "body_small")],
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
                paragraph(fact["labelZh"], "h3"),
                paragraph(fact["valueZh"], "body_small"),
                paragraph(fact["valueEn"], "body_small"),
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
    story.extend([fact_table, Spacer(1, 12), paragraph("满托三轮训练建议 / MANTUO METHOD", "kicker")])
    strategy_cells = []
    for item in notes["examMap"]["mantouStrategy"]:
        strategy_cells.append([
            paragraph(item["nameZh"], "white_h3"),
            paragraph(item["nameEn"], "white_small"),
            paragraph(item["guidanceZh"], "white_small"),
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
    story.append(paragraph("课程映射只判断 syllabus exposure，不代替个人能力诊断。完成单元、考试局和真实做题证据会改变结论。", "body_small"))
    for bridge in notes["curriculumBridges"]:
        color = GREEN if bridge["status"] == "strong-start" else AMBER
        card = Table([
            [paragraph(bridge["curriculum"], "h3"), paragraph(bridge["statusZh"], "label")],
            [paragraph("通常已覆盖 / LIKELY COVERED", "label"), bullet_rows(bridge["likelyCoveredZh"])],
            [paragraph("逐项确认 / CHECK GAPS", "label"), bullet_rows(bridge["confirmZh"])],
            [paragraph("第一步 / FIRST ACTION", "label"), paragraph(bridge["firstActionZh"], "body_small")],
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
        story.append(paragraph(chapter["summaryZh"]))
        outcomes = Table([[paragraph("学完你应当能够", "label"), bullet_rows(chapter["learningOutcomes"])]] , colWidths=[0.24 * CONTENT_WIDTH, 0.76 * CONTENT_WIDTH])
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
                paragraph(section["titleZh"], "h2"),
                paragraph(section["titleEn"].upper(), "h2_en"),
            ])
            for body in section["paragraphsZh"]:
                story.append(paragraph(body))
            add_rules(story, section["rules"])
            for example in section.get("workedExamples", []):
                add_worked_example(story, example)
            for recall in section["activeRecall"]:
                add_recall(story, recall)

    story.append(CondPageBreak(125 * mm))
    checkpoint = notes["checkpoint"]
    add_bilingual_heading(story, checkpoint["titleZh"], checkpoint["titleEn"], "Active recall")
    story.append(paragraph(checkpoint["instructionsZh"], "body_small"))
    for index, question in enumerate(checkpoint["questions"], start=1):
        options = [f"{chr(65 + i)}. {option}" for i, option in enumerate(question["options"])]
        answer_letter = chr(65 + question["correctOption"])
        question_box = Table([
            [paragraph(f"{index:02d}", "label"), [paragraph(question["promptZh"], "h3"), paragraph(question["promptEn"], "body_small")]],
            ["", bullet_rows(options, INK)],
            [paragraph("答案", "label"), [paragraph(f"{answer_letter}. {question['explanationZh']}", "body_small"), paragraph(question["explanationEn"], "body_small")]],
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
            [paragraph(item["stepZh"], "h3"), paragraph(item["stepEn"], "body_small")],
            paragraph(item["actionZh"], "body_small"),
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
    story.extend([paragraph(notes["rightsNotice"]), paragraph(notes["scope"]["remainingZh"], "body_small")])
    source_cells = []
    for source in notes["officialAnchors"]:
        source_cells.append([
            source_link(source["title"], source["sourceUrl"]),
            paragraph(source["usedForZh"], "body_small"),
            paragraph("点击标题打开官方原文", "body_small"),
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
            [paragraph("NEXT TRAINING STEP", "cover_kicker"), paragraph("下一步训练", "white_h3")],
            [paragraph("完成主动回忆检查 · 进入在线分主题练习 · 使用未见卷建立基线", "white_h3"), paragraph("学习的目标不是看完，而是能在新的题目中重新做出来。", "white_small")],
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
