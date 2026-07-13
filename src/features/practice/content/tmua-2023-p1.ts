import type {
  InlineRun,
  PracticeOption,
  PracticePaper,
  PracticeQuestion,
  QuestionBlock,
} from "./types.js";
import { validatePracticePaper } from "./validate.js";

const sourceQuestionPath = "Tmua/2016-2023paper/tmua-paper-1-2023.pdf";
const sourceAnswerPath = "Tmua/2016-2023 answer key/tmua-2023.pdf";
const answers = "FACCFEFBEBBFFAFEEEDF";
const T = String.raw;

const knowledgeByQuestion = [
  "integration",
  "quadratics",
  "integration",
  "sequences-series",
  "geometry-optimization",
  "binomial-expansion",
  "exponentials-logarithms",
  "trigonometry-geometry",
  "trigonometric-equations",
  "numerical-integration",
  "function-transformations",
  "trigonometric-equations",
  "coordinate-geometry-circles",
  "cubic-functions",
  "exponentials-range",
  "coordinate-geometry",
  "circle-sequences",
  "geometric-series-probability",
  "differential-equations",
  "function-range",
] as const;

function text(value: string): InlineRun {
  return { kind: "text", value };
}

function inlineMath(tex: string): InlineRun {
  return { kind: "math", tex };
}

function paragraph(...runs: InlineRun[]): QuestionBlock {
  return { kind: "paragraph", runs };
}

function displayMath(tex: string): QuestionBlock {
  return { kind: "display-math", tex };
}

function figure(src: string, alt: string, caption?: string): QuestionBlock {
  return { kind: "figure", src, alt, ...(caption === undefined ? {} : { caption }) };
}

function options(...texValues: string[]): PracticeOption[] {
  return texValues.map((tex, index) => ({
    label: String.fromCharCode(65 + index),
    content: [displayMath(tex)],
  }));
}

function question(
  number: number,
  prompt: QuestionBlock[],
  questionOptions: PracticeOption[],
  skillTags: string[],
): PracticeQuestion {
  return {
    id: `tmua-2023-p1-q${String(number).padStart(2, "0")}`,
    number,
    sourcePage: number + 2,
    prompt,
    options: questionOptions,
    correctAnswer: answers[number - 1]!,
    knowledgeTags: [knowledgeByQuestion[number - 1]!],
    skillTags,
    reviewStatus: "verified",
    sourceQuestionPath,
    sourceAnswerPath,
  };
}

export const TMUA_2023_P1: PracticePaper = {
  id: "tmua-2023-p1",
  exam: "TMUA",
  edition: "2023",
  paper: 1,
  durationMinutes: 75,
  questions: [
    question(
      1,
      [
        paragraph(text("Given that")),
        displayMath(T`\int_0^1 (ax+b)\,\mathrm{d}x=1`),
        paragraph(text("and")),
        displayMath(T`\int_0^1 x(ax+b)\,\mathrm{d}x=1`),
        paragraph(text("find the value of "), inlineMath("a+b"), text(".")),
      ],
      options(T`-1`, "0", "1", "2", "3", "4", "5"),
      ["simultaneous-equations"],
    ),
    question(
      2,
      [
        paragraph(
          text("The graphs of "),
          inlineMath(T`y=x^2+5x+6`),
          text(" and "),
          inlineMath(T`y=mx-3`),
          text(", where "),
          inlineMath("m"),
          text(" is a constant, are plotted on the same set of axes."),
        ),
        paragraph(
          text("Given that the graphs do not meet, what is the complete range of possible values of "),
          inlineMath("m"),
          text("?"),
        ),
      ],
      options(
        T`-1<m<11`,
        T`m<-1,\quad m>11`,
        T`-\sqrt{11}<m<\sqrt{11}`,
        T`m<-\sqrt{11},\quad m>\sqrt{11}`,
        T`-11<m<1`,
        T`m<-11,\quad m>1`,
      ),
      ["discriminant-inequalities"],
    ),
    question(
      3,
      [
        paragraph(text("For any integer "), inlineMath(T`n\geq 0`), text(",")),
        displayMath(T`\int_n^{n+1} f(x)\,\mathrm{d}x=n+1`),
        paragraph(text("Evaluate")),
        displayMath(
          T`\int_0^3 f(x)\,\mathrm{d}x+\int_1^3 f(x)\,\mathrm{d}x+\int_2^3 f(x)\,\mathrm{d}x+\int_4^3 f(x)\,\mathrm{d}x+\int_5^3 f(x)\,\mathrm{d}x`,
        ),
      ],
      options(T`-2`, "0", "1", "4", "18", "27"),
      ["definite-integral-additivity"],
    ),
    question(
      4,
      [
        paragraph(text("Evaluate")),
        displayMath(T`\sum_{n=0}^{\infty}\frac{\sin\left(n\pi+\frac{\pi}{3}\right)}{2^n}`),
      ],
      options("0", T`\frac{1}{3}`, T`\frac{\sqrt{3}}{3}`, T`\sqrt{3}`, "3"),
      ["infinite-series"],
    ),
    question(
      5,
      [
        paragraph(text("The following shape has two lines of reflectional symmetry.")),
        figure(
          "/questions/tmua-2023-p1/q05.svg",
          "Square MNOP contains a tilted rectangle RSTU. R lies on side MN, S on NO, T on OP, and U on PM; the shape has diagonal reflectional symmetry along two axes.",
          "Diagram not to scale.",
        ),
        paragraph(
          inlineMath("MNOP"),
          text(" is a square of perimeter "),
          inlineMath(T`40\text{ cm}`),
          text("."),
        ),
        paragraph(
          text("The vertices of rectangle "),
          inlineMath("RSTU"),
          text(" lie on the edge of square "),
          inlineMath("MNOP"),
          text("."),
        ),
        paragraph(
          inlineMath("MR"),
          text(" has length "),
          inlineMath("x"),
          text(" cm."),
        ),
        paragraph(
          text("What is the largest possible value of "),
          inlineMath("x"),
          text(" such that "),
          inlineMath("RSTU"),
          text(" has area "),
          inlineMath(T`20\text{ cm}^2`),
          text("?"),
        ),
      ],
      options(T`\sqrt{2}`, T`\sqrt{10}`, T`2\sqrt{15}`, T`10\sqrt{2}`, T`5+\sqrt{5}`, T`5+\sqrt{15}`),
      ["area-constraints"],
    ),
    question(
      6,
      [
        paragraph(
          text("In the simplified expansion of "),
          inlineMath(T`(2+3x)^{12}`),
          text(", how many of the terms have a coefficient that is divisible by 12?"),
        ),
      ],
      options("0", "2", "5", "10", "11", "12", "13"),
      ["coefficient-divisibility"],
    ),
    question(
      7,
      [
        paragraph(inlineMath("P(x)"), text(" and "), inlineMath("Q(x)"), text(" are defined as follows:")),
        displayMath(T`P(x)=2^x+4`),
        displayMath(T`Q(x)=2^{2x-2}-2^{x+2}+16`),
        paragraph(
          text("Find the largest value of "),
          inlineMath("x"),
          text(" such that "),
          inlineMath("P(x)"),
          text(" and "),
          inlineMath("Q(x)"),
          text(" are in the ratio "),
          inlineMath("4:1"),
          text(", respectively."),
        ),
      ],
      options("5", "12", "32", T`\log_2 3`, T`\log_2 5`, T`\log_2 12`, T`\log_2 20`),
      ["exponential-substitution"],
    ),
    question(
      8,
      [
        paragraph(
          text("A triangle "),
          inlineMath("XYZ"),
          text(" is called fun if it has the following properties:"),
        ),
        displayMath(T`\angle YXZ=30^\circ`),
        displayMath(T`XY=\sqrt{3}\,a`),
        displayMath(T`YZ=a`),
        paragraph(text("where "), inlineMath("a"), text(" is a constant.")),
        paragraph(
          text("For a given value of "),
          inlineMath("a"),
          text(", there are two distinct fun triangles "),
          inlineMath("S"),
          text(" and "),
          inlineMath("T"),
          text(", where the area of "),
          inlineMath("S"),
          text(" is greater than the area of "),
          inlineMath("T"),
          text("."),
        ),
        paragraph(text("Find the ratio")),
        displayMath(T`\text{area of }S:\text{area of }T`),
      ],
      options(T`1:1`, T`2:1`, T`2:\sqrt{3}`, T`\sqrt{3}:1`, T`3:1`),
      ["ambiguous-sine-rule"],
    ),
    question(
      9,
      [
        paragraph(text("How many solutions are there to")),
        displayMath(T`(1+3\cos 3\theta)^2=4`),
        paragraph(
          text("in the interval "),
          inlineMath(T`0^\circ\leq\theta\leq180^\circ`),
          text("?"),
        ),
      ],
      options("1", "2", "3", "4", "5", "6"),
      ["trigonometric-solution-counting"],
    ),
    question(
      10,
      [
        paragraph(text("The trapezium rule with 4 strips is used to estimate the integral:")),
        displayMath(T`\int_{-2}^{2}\sqrt{4-x^2}\,\mathrm{d}x`),
        paragraph(text("What is the positive difference between the estimate and the exact value of the integral?")),
      ],
      options(
        T`2(\pi-2-2\sqrt{3})`,
        T`2(\pi-1-\sqrt{3})`,
        T`2(2\pi-1-\sqrt{3})`,
        T`4(\pi-1-\sqrt{3})`,
        T`2\pi-3\sqrt{3}`,
        T`4\pi-6\sqrt{3}`,
      ),
      ["trapezium-rule-error"],
    ),
    question(
      11,
      [
        paragraph(text("It is given that "), inlineMath(T`f(x)=x^2-6x`), text(".")),
        paragraph(
          text("The curves "),
          inlineMath(T`y=f(kx)`),
          text(" and "),
          inlineMath(T`y=f(x-c)`),
          text(" have the same minimum point, where "),
          inlineMath(T`k>0`),
          text(" and "),
          inlineMath(T`c>0`),
          text("."),
        ),
        paragraph(
          text("Which of the following is a correct expression for "),
          inlineMath("k"),
          text(" in terms of "),
          inlineMath("c"),
          text("?"),
        ),
      ],
      options(
        T`k=\frac{3-c}{3}`,
        T`k=\frac{3}{c+3}`,
        T`k=\frac{c-6}{6}`,
        T`k=\frac{6}{6-c}`,
        T`k=\frac{c+9}{9}`,
        T`k=\frac{9}{c-9}`,
      ),
      ["function-transformations"],
    ),
    question(
      12,
      [
        paragraph(text("How many solutions are there to the equation")),
        displayMath(T`\frac{2^{\tan^2 x}}{4^{\sin^2 x}}=1`),
        paragraph(text("in the range "), inlineMath(T`0\leq x\leq2\pi`), text("?")),
      ],
      options("2", "3", "4", "5", "6", "7", "8"),
      ["trigonometric-solution-counting"],
    ),
    question(
      13,
      [
        paragraph(
          text("Point "),
          inlineMath("P"),
          text(" lies on the circle with equation "),
          inlineMath(T`(x-2)^2+(y-1)^2=16`),
          text("."),
        ),
        paragraph(
          text("Point "),
          inlineMath("Q"),
          text(" lies on the circle with equation "),
          inlineMath(T`(x-4)^2+(y+5)^2=16`),
          text("."),
        ),
        paragraph(text("What is the maximum possible length of "), inlineMath("PQ"), text("?")),
      ],
      options("10", "14", "16", T`2\sqrt{34}`, T`10\sqrt{2}`, T`8+2\sqrt{10}`, T`16+2\sqrt{6}`),
      ["maximum-distance-between-circles"],
    ),
    question(
      14,
      [
        paragraph(text("The function")),
        displayMath(T`f(x)=\frac{2}{3}x^3+2mx^2+n,\quad m>0`),
        paragraph(text("has three distinct real roots.")),
        paragraph(
          text("What is the complete range of possible values of "),
          inlineMath("n"),
          text(", in terms of "),
          inlineMath("m"),
          text("?"),
        ),
      ],
      options(
        T`-\frac{8}{3}m^3<n<0`,
        T`-\frac{4}{3}m^3<n<0`,
        T`0<n<\frac{3}{2}m^2`,
        T`0<n<\frac{40}{3}m^3`,
        T`n<-\frac{8}{3}m^3`,
        T`n<\frac{3}{2}m^2`,
        T`n>-\frac{4}{3}m^3`,
        T`n>\frac{40}{3}m^3`,
      ),
      ["stationary-points-and-roots"],
    ),
    question(
      15,
      [
        paragraph(
          text("The difference between the maximum and minimum values of the function "),
          inlineMath(T`f(x)=a^{\cos x}`),
          text(", where "),
          inlineMath(T`a>0`),
          text(" and "),
          inlineMath("x"),
          text(" is real, is 3."),
        ),
        paragraph(text("Find the sum of the possible values of "), inlineMath("a"), text(".")),
      ],
      options("0", T`\frac{3}{2}`, T`\frac{5}{2}`, "3", T`\sqrt{10}`, T`\sqrt{13}`),
      ["range-analysis"],
    ),
    question(
      16,
      [
        paragraph(
          text("A right-angled triangle has vertices at "),
          inlineMath(T`(2,3)`),
          text(", "),
          inlineMath(T`(9,-1)`),
          text(" and "),
          inlineMath(T`(5,k)`),
          text("."),
        ),
        paragraph(text("Find the sum of all the possible values of "), inlineMath("k"), text(".")),
      ],
      options(T`-8`, T`-6`, "0.25", "2", "2.25", "8.25", "10.25"),
      ["perpendicular-gradients"],
    ),
    question(
      17,
      [
        paragraph(text("A circle "), inlineMath(T`C_n`), text(" is defined by")),
        displayMath(T`x^2+y^2=2n(x+y)`),
        paragraph(text("where "), inlineMath("n"), text(" is a positive integer.")),
        paragraph(
          inlineMath(T`C_1`),
          text(" and "),
          inlineMath(T`C_2`),
          text(" are drawn and the area between them is shaded."),
        ),
        paragraph(
          text("Next, "),
          inlineMath(T`C_3`),
          text(" and "),
          inlineMath(T`C_4`),
          text(" are drawn and the area between them is shaded."),
        ),
        paragraph(text("This is shown in the diagram.")),
        figure(
          "/questions/tmua-2023-p1/q17.svg",
          "Coordinate axes with four nested circles tangent at the origin and centred along the line y equals x. The region between C1 and C2 is shaded, the region between C2 and C3 is unshaded, and the region between C3 and C4 is shaded.",
          "Diagram not to scale.",
        ),
        paragraph(text("This process continues until 100 circles have been drawn.")),
        paragraph(text("What is the total shaded area?")),
      ],
      options(T`100\pi`, T`500\pi`, T`2500\pi`, T`5050\pi`, T`10100\pi`, T`40400\pi`),
      ["alternating-annular-areas"],
    ),
    question(
      18,
      [
        paragraph(text("You are given that")),
        displayMath(
          T`S=4+\frac{8k}{7}+\frac{16k^2}{49}+\frac{32k^3}{343}+\cdots+4\left(\frac{2k}{7}\right)^n+\cdots`,
        ),
        paragraph(
          text("The value for "),
          inlineMath("k"),
          text(" is chosen as an integer in the range "),
          inlineMath(T`-5\leq k\leq5`),
          text("."),
        ),
        paragraph(text("All possible values for "), inlineMath("k"), text(" are equally likely to be chosen.")),
        paragraph(
          text("What is the probability that the value of "),
          inlineMath("S"),
          text(" is a finite number greater than 3?"),
        ),
      ],
      options(T`\frac{1}{11}`, T`\frac{1}{10}`, T`\frac{3}{11}`, T`\frac{3}{10}`, T`\frac{5}{11}`, T`\frac{1}{2}`, T`\frac{7}{11}`, T`\frac{7}{10}`),
      ["geometric-series-convergence"],
    ),
    question(
      19,
      [
        paragraph(text("The solution to the differential equation")),
        displayMath(T`\frac{\mathrm{d}y}{\mathrm{d}x}=|-6x|\quad\text{for all }x`),
        paragraph(
          text("is "),
          inlineMath(T`y=f(x)+c`),
          text(", where "),
          inlineMath("c"),
          text(" is a constant."),
        ),
        paragraph(text("Which one of the following is a correct expression for "), inlineMath("f(x)"), text("?")),
      ],
      options(T`-\frac{6x}{|x|}`, T`\frac{6x}{|x|}`, T`-3x|x|`, T`3x|x|`, T`-3x^2`, T`3x^2`, T`-x^3`, T`x^3`),
      ["integrating-absolute-values"],
    ),
    question(
      20,
      [
        paragraph(text("The diagram shows the graph of "), inlineMath(T`y=f(x)`), text(".")),
        paragraph(
          text("The function "),
          inlineMath("f"),
          text(" attains its maximum value of 2 at "),
          inlineMath(T`x=1`),
          text(", and its minimum value of "),
          inlineMath(T`-2`),
          text(" at "),
          inlineMath(T`x=-1`),
          text("."),
        ),
        figure(
          "/questions/tmua-2023-p1/q20.svg",
          "Graph of y equals f of x on coordinate axes. The curve has a labelled minimum at negative one, negative two, crosses the origin, and has a labelled maximum at one, two.",
        ),
        paragraph(
          text("Find the difference between the maximum and minimum values of "),
          inlineMath(T`(f(x))^2-f(x)`),
          text("."),
        ),
      ],
      options("2", T`\frac{9}{4}`, "4", T`\frac{17}{4}`, "6", T`\frac{25}{4}`, "8", T`\frac{33}{4}`),
      ["range-of-composite-expression"],
    ),
  ],
};

const issues = validatePracticePaper(TMUA_2023_P1);
if (issues.length) {
  throw new Error(`Invalid TMUA 2023 Paper 1: ${JSON.stringify(issues)}`);
}
