#!/usr/bin/env python3
"""Build deterministic A4 editions for the shared Review Notes documents."""

from __future__ import annotations

import hashlib
import html
import json
import shutil
from dataclasses import dataclass
from functools import partial
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = ROOT / "output/pdf"
PUBLIC_ROOT = ROOT / "public/notes"
MANIFEST = ROOT / "content/products/review-notes-pdf-assets.json"
GENERATOR_VERSION = "2.0.0"
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

if not FONT_PATH.is_file():
    raise FileNotFoundError(f"Missing embedded CJK font: {FONT_PATH.relative_to(ROOT)}")
if hashlib.sha256(FONT_PATH.read_bytes()).hexdigest() != FONT_SHA256:
    raise ValueError("Embedded CJK font digest does not match the reviewed asset")
pdfmetrics.registerFont(TTFont("MantouCJK", str(FONT_PATH)))


@dataclass(frozen=True)
class PdfAsset:
    product_id: str
    source: str
    output_name: str

    @property
    def source_path(self) -> Path:
        return ROOT / self.source

    @property
    def output_path(self) -> Path:
        return OUTPUT_ROOT / self.output_name

    @property
    def public_path(self) -> Path:
        exam_id = self.source.split("/")[2]
        return PUBLIC_ROOT / exam_id / self.output_name


ASSETS = (
    PdfAsset(
        "esat-mathematics-review-notes-v1",
        "content/notes/esat/mathematics-foundations-v1.json",
        "esat-mathematics-foundations-v1.pdf",
    ),
    PdfAsset(
        "esat-science-review-notes-v1",
        "content/notes/esat/sciences-foundations-v1.json",
        "esat-sciences-foundations-v1.pdf",
    ),
    PdfAsset(
        "tara-review-notes-v1",
        "content/notes/tara/reasoning-writing-foundations-v1.json",
        "tara-reasoning-writing-foundations-v1.pdf",
    ),
    PdfAsset(
        "lnat-review-notes-v1",
        "content/notes/lnat/reading-writing-foundations-v1.json",
        "lnat-reading-writing-foundations-v1.pdf",
    ),
    PdfAsset(
        "ucat-review-notes-v1",
        "content/notes/ucat/four-subtest-foundations-v1.json",
        "ucat-four-subtest-foundations-v1.pdf",
    ),
)

GLYPH_REPLACEMENTS = str.maketrans({
    "−": "-",
    "–": "-",
    "—": "-",
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
    compatible = str(value).translate(GLYPH_REPLACEMENTS)
    return html.escape(compatible).replace("\n", "<br/>")


BASE = getSampleStyleSheet()
STYLES = {
    "body": ParagraphStyle("ReviewBodyEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=9.3, leading=14.3, textColor=INK, spaceAfter=4),
    "support": ParagraphStyle("ReviewSupportZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=7.3, leading=11.3, textColor=SLATE, spaceAfter=6),
    "small": ParagraphStyle("ReviewSmallEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=7.6, leading=11.5, textColor=SLATE, splitLongWords=True),
    "support_small": ParagraphStyle("ReviewSupportSmallZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=6.8, leading=10.3, textColor=SLATE, splitLongWords=True),
    "tiny": ParagraphStyle("ReviewTinyEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=6.3, leading=9.5, textColor=SLATE, splitLongWords=True),
    "kicker": ParagraphStyle("ReviewKicker", parent=BASE["BodyText"], fontName="Helvetica-Bold", fontSize=7.1, leading=10, textColor=PURPLE, tracking=1.1, spaceAfter=7),
    "cover_kicker": ParagraphStyle("ReviewCoverKicker", parent=BASE["BodyText"], fontName="Helvetica-Bold", fontSize=7.4, leading=10, textColor=colors.white, tracking=1.2, spaceAfter=16),
    "cover_title": ParagraphStyle("ReviewCoverTitleEN", parent=BASE["Title"], fontName="Helvetica-Bold", fontSize=28, leading=33, textColor=colors.white, alignment=TA_LEFT, spaceAfter=6),
    "cover_zh": ParagraphStyle("ReviewCoverTitleZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=10, leading=15, textColor=colors.HexColor("#EAE4F2"), alignment=TA_LEFT, spaceAfter=20),
    "cover_subtitle": ParagraphStyle("ReviewCoverSubtitleEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=11, leading=16, textColor=colors.white, alignment=TA_LEFT, spaceAfter=5),
    "white_small": ParagraphStyle("ReviewWhiteSmallEN", parent=BASE["BodyText"], fontName="Helvetica", fontSize=7.8, leading=11.8, textColor=colors.white),
    "white_support": ParagraphStyle("ReviewWhiteSupportZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=6.8, leading=10.5, textColor=colors.HexColor("#EAE4F2")),
    "white_h2": ParagraphStyle("ReviewWhiteH2EN", parent=BASE["Heading2"], fontName="Helvetica-Bold", fontSize=15.5, leading=21, textColor=colors.white, spaceAfter=2),
    "h1": ParagraphStyle("ReviewH1EN", parent=BASE["Heading1"], fontName="Helvetica-Bold", fontSize=22, leading=27, textColor=INK, spaceAfter=3),
    "h1_zh": ParagraphStyle("ReviewH1ZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=8.3, leading=12.5, textColor=SLATE, spaceAfter=13),
    "h2": ParagraphStyle("ReviewH2EN", parent=BASE["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=INK, spaceAfter=3),
    "h2_zh": ParagraphStyle("ReviewH2ZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=7.4, leading=11.2, textColor=SLATE, spaceAfter=8),
    "h3": ParagraphStyle("ReviewH3EN", parent=BASE["Heading3"], fontName="Helvetica-Bold", fontSize=10.2, leading=13.5, textColor=INK, spaceAfter=3),
    "h3_zh": ParagraphStyle("ReviewH3ZH", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=7.1, leading=10.7, textColor=SLATE, spaceAfter=3),
    "label": ParagraphStyle("ReviewLabelEN", parent=BASE["BodyText"], fontName="Helvetica-Bold", fontSize=7.2, leading=10.5, textColor=PURPLE, spaceAfter=2),
    "formula": ParagraphStyle("ReviewFormula", parent=BASE["BodyText"], fontName="MantouCJK", fontSize=10.3, leading=16, textColor=PURPLE_DEEP, alignment=TA_CENTER, spaceBefore=3, spaceAfter=3),
}


def paragraph(value: object, style: str = "body") -> Paragraph:
    return Paragraph(safe(value), STYLES[style])


class SectionRule(Flowable):
    def __init__(self) -> None:
        super().__init__()
        self.width = CONTENT_WIDTH
        self.height = 1

    def draw(self) -> None:
        self.canv.setStrokeColor(PURPLE)
        self.canv.setLineWidth(0.7)
        self.canv.line(0, 0, self.width, 0)


def bullet_rows(items: list[str], color: colors.Color = SLATE) -> list[Paragraph]:
    style = ParagraphStyle(
        "ReviewBulletDynamic",
        parent=STYLES["small"],
        textColor=color,
        leftIndent=9,
        firstLineIndent=-7,
        bulletIndent=0,
        spaceAfter=3,
    )
    return [Paragraph(f"- {safe(item)}", style) for item in items]


def bilingual_paragraphs(value_en: object, value_zh: object, primary: str = "body") -> list[Paragraph]:
    support = "support" if primary == "body" else "support_small"
    return [paragraph(value_en, primary), paragraph(value_zh, support)]


def bilingual_bullet_rows(items_en: list[str], items_zh: list[str]) -> list[Paragraph]:
    if len(items_en) != len(items_zh):
        raise ValueError("English and Chinese bullet lists must align")
    rows: list[Paragraph] = []
    for item_en, item_zh in zip(items_en, items_zh, strict=True):
        rows.extend(bullet_rows([item_en], INK))
        rows.append(paragraph(item_zh, "support_small"))
    return rows


def add_heading(story: list[Flowable], zh: str, en: str, kicker: str) -> None:
    story.extend([
        paragraph(kicker.upper(), "kicker"),
        paragraph(en, "h1"),
        paragraph(zh, "h1_zh"),
    ])


def cover_background(canvas: Canvas, _doc: BaseDocTemplate, notes: dict) -> None:
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
    canvas.drawString(
        MARGIN_X + 44 * mm,
        31 * mm,
        f"Mantou original foundation edition - independently authored for {notes['examId'].upper()} preparation",
    )

    cover_items = [
        paragraph(
            f"MANTUO ORIGINAL FOUNDATION EDITION - {notes['examId'].upper()} - V{notes['version']}",
            "cover_kicker",
        ),
        paragraph(notes["titleEn"], "cover_title"),
        paragraph(notes["titleZh"], "cover_zh"),
        paragraph(notes["subtitleEn"], "cover_subtitle"),
        paragraph(notes["subtitleZh"], "white_support"),
    ]
    cursor_y = PAGE_HEIGHT - 56 * mm
    available_height = PAGE_HEIGHT - 105 * mm
    for item in cover_items:
        _, height = item.wrap(CONTENT_WIDTH, available_height)
        item.drawOn(canvas, MARGIN_X, cursor_y - height)
        cursor_y -= height
    canvas.restoreState()


def page_background(canvas: Canvas, doc: BaseDocTemplate, notes: dict) -> None:
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN_X, PAGE_HEIGHT - 11 * mm, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 11 * mm)
    canvas.setFont("Helvetica", 6.7)
    canvas.setFillColor(SLATE)
    canvas.drawString(
        MARGIN_X,
        9 * mm,
        f"MANTUO ORIGINAL - {notes['examId'].upper()} REVIEW NOTES - V{notes['version']}",
    )
    canvas.drawRightString(PAGE_WIDTH - MARGIN_X, 9 * mm, str(doc.page))
    canvas.restoreState()


def source_link(source: dict) -> list[Paragraph]:
    url = html.escape(source["sourceUrl"], quote=True)
    return [
        Paragraph(f'<link href="{url}" color="#282332">{safe(source["title"])}</link>', STYLES["h3"]),
        paragraph(source["usedForEn"], "small"),
        paragraph(source["usedForZh"], "support_small"),
        paragraph(source["sourceUrl"], "tiny"),
        paragraph(f"SHA-256: {source['sha256']}", "tiny"),
    ]


def build_story(notes: dict) -> list[Flowable]:
    story: list[Flowable] = [
        Spacer(1, 1),
        PageBreak(),
    ]

    add_heading(story, "如何使用这份笔记", "How to Use This Pack", "Reader guide")
    scope = notes["scope"]
    boundary = Table([
        [paragraph("IN THIS EDITION", "label"), bilingual_paragraphs(scope["includedEn"], scope["includedZh"], "small")],
        [paragraph("GO DEEPER", "label"), bilingual_paragraphs(scope["remainingEn"], scope["remainingZh"], "small")],
        [paragraph("PUBLICATION BOUNDARY", "label"), bilingual_paragraphs(notes["rightsNoticeEn"], notes["rightsNotice"], "small")],
    ], colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH])
    boundary.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.extend([boundary, Spacer(1, 14)])

    add_heading(story, "考试地图", "Exam Map", "Facts first")
    fact_rows = []
    for fact in notes["examFacts"]:
        fact_rows.append([
            [paragraph(fact["labelEn"].upper(), "label"), paragraph(fact["labelZh"], "support_small")],
            bilingual_paragraphs(fact["valueEn"], fact["valueZh"], "small"),
        ])
    facts = Table(fact_rows, colWidths=[0.31 * CONTENT_WIDTH, 0.69 * CONTENT_WIDTH])
    facts.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([facts, Spacer(1, 15)])

    add_heading(story, "课程衔接：具体缺什么", "Curriculum Bridge", "A-Level - IB - AP")
    story.extend(bilingual_paragraphs(
        "A curriculum can indicate likely exposure, not mastery. Confirm every claim against the student profile and timed evidence.",
        "课程范围只说明可能学过什么，不等于已经掌握；请结合本人档案和真实练习。",
        "small",
    ))
    for bridge in notes["curriculumBridges"]:
        status_color = GREEN if bridge["status"] == "strong-start" else AMBER
        card = Table([
            [paragraph(bridge["curriculum"], "h3"), [paragraph(bridge["status"].replace("-", " ").upper(), "label"), paragraph(bridge["statusZh"], "support_small")]],
            [paragraph("LIKELY TRANSFER", "label"), bilingual_bullet_rows(bridge["likelyCoveredEn"], bridge["likelyCoveredZh"])],
            [paragraph("CHECK ONE BY ONE", "label"), bilingual_bullet_rows(bridge["confirmEn"], bridge["confirmZh"])],
            [paragraph("FIRST ACTION", "label"), bilingual_paragraphs(bridge["firstActionEn"], bridge["firstActionZh"], "small")],
        ], colWidths=[0.29 * CONTENT_WIDTH, 0.71 * CONTENT_WIDTH])
        card.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.45, LINE),
            ("BOX", (0, 0), (-1, -1), 0.8, status_color),
            ("BACKGROUND", (0, 0), (-1, 0), LAVENDER),
            ("BACKGROUND", (0, 1), (-1, -1), PAPER_RAISED),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.extend([Spacer(1, 7), card])

    for module_index, module in enumerate(notes["modules"]):
        if module_index == 0:
            story.extend([CondPageBreak(118 * mm), SectionRule()])
        else:
            story.extend([PageBreak(), SectionRule()])
        add_heading(
            story,
            module["titleZh"],
            module["titleEn"],
            f"Module {module['number']} - {notes['examId'].upper()}",
        )
        story.extend(bilingual_paragraphs(module["summaryEn"], module["summaryZh"]))

        outcomes = Table([
            [paragraph("LEARNING OUTCOMES", "label"), bilingual_bullet_rows(module["learningOutcomesEn"], module["learningOutcomes"])],
        ], colWidths=[0.24 * CONTENT_WIDTH, 0.76 * CONTENT_WIDTH])
        outcomes.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LAVENDER),
            ("BOX", (0, 0), (-1, -1), 0.5, PURPLE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.extend([outcomes, Spacer(1, 12)])

        story.extend([paragraph("KNOWLEDGE MAP", "kicker"), paragraph("Check Every Knowledge Unit", "h2"), paragraph("逐项核对知识单元", "h2_zh")])
        unit_rows = []
        for unit in module["knowledgeUnits"]:
            unit_rows.append([
                paragraph(unit["code"], "label"),
                [paragraph(unit["labelEn"], "h3"), paragraph(unit["labelZh"], "h3_zh")],
            ])
        units = Table(unit_rows, colWidths=[0.18 * CONTENT_WIDTH, 0.82 * CONTENT_WIDTH], repeatRows=0)
        units.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.4, LINE),
            ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        story.extend([units, Spacer(1, 14), paragraph("QUESTION METHODS", "kicker")])
        story.extend([paragraph("What to Notice, How to Start, What to Check", "h2"), paragraph("看到什么，怎样开始，如何检查", "h2_zh")])

        for index, method in enumerate(module["methods"], start=1):
            method_card = Table([
                [paragraph(f"{index:02d}", "label"), [paragraph(method["nameEn"], "h3"), paragraph(method["nameZh"], "h3_zh")]],
                [paragraph("TRIGGER", "label"), bilingual_paragraphs(method["signalEn"], method["signalZh"], "small")],
                [paragraph("ACTION", "label"), bilingual_paragraphs(method["methodEn"], method["methodZh"], "small")],
                [paragraph("CHECK", "label"), bilingual_paragraphs(method["checkEn"], method["checkZh"], "small")],
            ], colWidths=[0.18 * CONTENT_WIDTH, 0.82 * CONTENT_WIDTH])
            method_card.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), LAVENDER),
                ("BACKGROUND", (0, 1), (-1, -1), PAPER_RAISED),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]))
            story.extend([Spacer(1, 6), method_card])

        for example in module["originalWorkedExamples"]:
            story.extend([CondPageBreak(105 * mm), Spacer(1, 10), paragraph("ORIGINAL WORKED EXAMPLE", "kicker")])
            example_header = Table([
                [[paragraph(example["titleEn"], "white_h2"), paragraph(example["titleZh"], "white_support")]],
            ], colWidths=[CONTENT_WIDTH])
            example_header.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), PURPLE_DEEP),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]))
            story.append(example_header)
            problem = Table([
                [paragraph("PROBLEM", "label"), bilingual_paragraphs(example["problemEn"], example["problemZh"])],
            ], colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH])
            problem.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), LAVENDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]))
            story.append(problem)
            step_rows = []
            for step in example["steps"]:
                body: list[Paragraph] = bilingual_paragraphs(step["bodyEn"], step["bodyZh"], "small")
                if step.get("math"):
                    body.append(paragraph(step["math"]["text"], "formula"))
                step_rows.append([[paragraph(step["labelEn"], "label"), paragraph(step["labelZh"], "support_small")], body])
            steps = Table(step_rows, colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH])
            steps.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(steps)
            conclusion = Table([
                [paragraph("CONCLUSION", "label"), bilingual_paragraphs(example["answerEn"], example["answerZh"], "small")],
                [paragraph("COMMON TRAP", "label"), bilingual_paragraphs(example["trapEn"], example["trapZh"], "small")],
            ], colWidths=[0.2 * CONTENT_WIDTH, 0.8 * CONTENT_WIDTH])
            conclusion.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EDF4EF")),
                ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#F7EEE4")),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(conclusion)

        story.extend([CondPageBreak(82 * mm), Spacer(1, 11), paragraph("ACTIVE RECALL", "kicker")])
        story.extend([paragraph("Close the Notes Before You Answer", "h2"), paragraph("合上笔记再回答", "h2_zh")])
        for index, recall in enumerate(module["activeRecall"], start=1):
            recall_box = Table([
                [paragraph(f"{index:02d}", "label"), [paragraph(recall["promptEn"], "h3"), paragraph(recall["promptZh"], "h3_zh")]],
                [paragraph("ANSWER", "label"), bilingual_paragraphs(recall["answerEn"], recall["answerZh"], "small")],
            ], colWidths=[0.14 * CONTENT_WIDTH, 0.86 * CONTENT_WIDTH])
            recall_box.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), LAVENDER),
                ("BACKGROUND", (0, 1), (-1, 1), PAPER_RAISED),
                ("BOX", (0, 0), (-1, -1), 0.55, PURPLE),
                ("LINEABOVE", (0, 1), (-1, 1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.extend([Spacer(1, 6), recall_box])

    story.extend([PageBreak()])
    add_heading(story, "把复习变成下一步行动", "Review Loop", "Evidence, not anxiety")
    workflow_rows = []
    for index, item in enumerate(notes["reviewWorkflow"], start=1):
        workflow_rows.append([
            paragraph(f"{index:02d}", "label"),
            [paragraph(item["stepEn"], "h3"), paragraph(item["stepZh"], "h3_zh")],
            bilingual_paragraphs(item["actionEn"], item["actionZh"], "small"),
        ])
    workflow = Table(workflow_rows, colWidths=[0.08 * CONTENT_WIDTH, 0.27 * CONTENT_WIDTH, 0.65 * CONTENT_WIDTH])
    workflow.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.extend([workflow, Spacer(1, 18)])

    if len(notes["officialAnchors"]) >= 3:
        story.append(PageBreak())
    add_heading(story, "版本边界与官方依据", "Version Boundary and Official Anchors", "Sources")
    story.extend(bilingual_paragraphs(notes["rightsNoticeEn"], notes["rightsNotice"]))
    story.extend(bilingual_paragraphs(notes["scope"]["remainingEn"], notes["scope"]["remainingZh"], "small"))
    for source in notes["officialAnchors"]:
        source_box = Table([[source_link(source)]], colWidths=[CONTENT_WIDTH])
        source_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PAPER_RAISED),
            ("BOX", (0, 0), (-1, -1), 0.45, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]))
        story.extend([Spacer(1, 6), source_box])

    return story


def validate_notes(notes: dict, asset: PdfAsset) -> None:
    required = (
        "schemaVersion",
        "id",
        "version",
        "publicationStatus",
        "examId",
        "titleZh",
        "titleEn",
        "subtitleZh",
        "subtitleEn",
        "scope",
        "officialAnchors",
        "examFacts",
        "curriculumBridges",
        "modules",
        "reviewWorkflow",
    )
    missing = [key for key in required if key not in notes]
    if missing:
        raise ValueError(f"{asset.source} is missing {', '.join(missing)}")
    if notes["publicationStatus"] != "teaching-preview":
        raise ValueError(f"{asset.source} is not a teaching preview")
    if not notes["modules"] or len(notes["officialAnchors"]) < 2:
        raise ValueError(f"{asset.source} is incomplete")


def build_pdf(asset: PdfAsset, notes: dict) -> None:
    asset.output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(asset.output_path),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title=notes["titleEn"],
        author="Mantou Education",
        subject=f"Original bilingual {notes['examId'].upper()} foundation review notes",
        creator="Admission Test Breaker",
        invariant=1,
    )
    cover_frame = Frame(
        MARGIN_X,
        78 * mm,
        CONTENT_WIDTH,
        PAGE_HEIGHT - 105 * mm,
        id="cover-frame",
        showBoundary=0,
    )
    body_frame = Frame(
        MARGIN_X,
        MARGIN_BOTTOM,
        CONTENT_WIDTH,
        PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM,
        id="body-frame",
        showBoundary=0,
    )
    doc.addPageTemplates([
        PageTemplate(
            id="cover",
            frames=[cover_frame],
            onPage=partial(cover_background, notes=notes),
            autoNextPageTemplate="body",
        ),
        PageTemplate(
            id="body",
            frames=[body_frame],
            onPage=partial(page_background, notes=notes),
        ),
    ])
    doc.build(build_story(notes), canvasmaker=Canvas)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    generated = []
    for asset in ASSETS:
        notes = json.loads(asset.source_path.read_text(encoding="utf-8"))
        validate_notes(notes, asset)
        build_pdf(asset, notes)
        asset.public_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(asset.output_path, asset.public_path)

        page_count = len(PdfReader(asset.output_path).pages)
        generated.append({
            "productId": asset.product_id,
            "examId": notes["examId"],
            "version": notes["version"],
            "source": asset.source,
            "sourceSha256": digest(asset.source_path),
            "output": str(asset.output_path.relative_to(ROOT)),
            "publicPath": "/" + str(asset.public_path.relative_to(ROOT / "public")),
            "pageCount": page_count,
            "byteSize": asset.output_path.stat().st_size,
            "sha256": digest(asset.output_path),
        })
        print(
            f"Built {asset.output_path.relative_to(ROOT)} "
            f"({page_count} pages, {asset.output_path.stat().st_size:,} bytes)"
        )

    manifest = {
        "schemaVersion": 1,
        "generatorVersion": GENERATOR_VERSION,
        "publicationStatus": "teaching-preview",
        "assets": generated,
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
