import type {
  InlineRun,
  PracticeOption,
  PracticePaper,
  PracticeQuestion,
  QuestionBlock,
} from "./types.js";
import { validatePracticePaper } from "./validate.js";

const sourceQuestionPath = "Tmua/2016-2023paper/tmua-2022-paper-1.pdf";
const sourceAnswerPath = "Tmua/2016-2023 answer key/tmua-2022.pdf";
const answers = "CDFCHFEBECADADHBDBFB";
const T = String.raw;

const knowledgeByQuestion = [
  "trigonometric-equations",
  "coordinate-geometry-circles",
  "integration",
  "trigonometry-geometry",
  "sequences-series",
  "exponentials-logarithms",
  "integration",
  "sequences-series",
  "trigonometric-equations",
  "function-transformations",
  "exponentials-logarithms",
  "quadratics",
  "algebra-and-functions",
  "trigonometry-geometry",
  "geometry-optimization",
  "trigonometric-equations",
  "trigonometry-geometry",
  "cubic-functions",
  "coordinate-geometry-circles",
  "graphs-of-functions",
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
    id: `tmua-2022-p1-q${String(number).padStart(2, "0")}`,
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

export const TMUA_2022_P1: PracticePaper = {
  id: "tmua-2022-p1",
  exam: "TMUA",
  edition: "2022",
  paper: 1,
  durationMinutes: 75,
  deliveryMode: "structured",
  questions: [
    question(
      1,
      [
        paragraph(text("How many real solutions are there to the equation")),
        displayMath(T`2\cos^4\theta-5\cos^2\theta+3=0`),
        paragraph(text("in the interval "), inlineMath(T`0\leq\theta\leq2\pi`), text("?")),
      ],
      options("1", "2", "3", "4", "5", "6", "7", "8"),
      ["trigonometric-solution-counting", "condition-checking"],
    ),
    question(
      2,
      [
        paragraph(text("Find the complete set of values of "), inlineMath("p"), text(" for which the equation")),
        displayMath(T`x^2-2px+y^2-6y-p^2+8p+9=0`),
        paragraph(text("describes a circle in the "), inlineMath("xy"), text("-plane.")),
      ],
      options(
        T`p<-\frac94`,
        T`0<p<4`,
        T`-1<p<9`,
        T`p<0\quad\text{or}\quad p>4`,
        T`p<-1\quad\text{or}\quad p>9`,
        T`\text{all real values of }p`,
      ),
      ["discriminant-inequalities", "condition-checking"],
    ),
    question(
      3,
      [
        paragraph(text("The following statements are true for a function "), inlineMath("f"), text(":")),
        paragraph(text("• "), inlineMath(T`f''(x)=a`), text(" for all values of "), inlineMath("x"), text(".")),
        paragraph(text("• "), inlineMath(T`f(0)=1`), text(" and "), inlineMath(T`f(1)=2`), text(".")),
        paragraph(text("• "), inlineMath(T`\int_0^1 f(x)\,\mathrm{d}x=1`), text(".")),
        paragraph(text("Find the value of "), inlineMath("a"), text(".")),
      ],
      options("-6", "-3", "-2", "2", "3", "6"),
      ["definite-integral-additivity", "algebraic-transformation"],
    ),
    question(
      4,
      [
        paragraph(text("These sectors of circles are similar.")),
        figure(
          "/questions/tmua-2022-p1/q04.svg",
          "Two similar circular sectors. The smaller sector has radius r and arc length 6; the larger sector has radius r plus 3.",
          "Diagram not to scale.",
        ),
        paragraph(text("The arc length of the smaller sector is 6.")),
        paragraph(text("The difference between the areas of the sectors is 21.")),
        paragraph(text("Find the positive difference between the perimeters of the sectors.")),
      ],
      options(T`4.5`, "7", "8", "9", T`10.5`, "14", "15"),
      ["area-constraints", "multi-step-planning"],
    ),
    question(
      5,
      [
        paragraph(text("A sequence is defined by")),
        displayMath(T`x_{n+1}=\frac{x_n+p}{x_n+q}`),
        paragraph(text("where "), inlineMath("p"), text(" and "), inlineMath("q"), text(" are real numbers.")),
        paragraph(text("Given that "), inlineMath(T`x_1=3`), text(", "), inlineMath(T`x_2=5`), text(" and "), inlineMath(T`x_3=7`), text(", find "), inlineMath(T`x_4`), text(".")),
      ],
      options("-5", "5", T`\frac{51}{7}`, T`\frac{15}{2}`, T`\frac{23}{3}`, "9", "11", "13"),
      ["simultaneous-equations", "algebraic-transformation"],
    ),
    question(
      6,
      [
        paragraph(text("Given that")),
        displayMath(T`\int_{\log_2 5}^{\log_2 20}x\,\mathrm{d}x=\log_2 M`),
        paragraph(text("what is the value of "), inlineMath("M"), text("?")),
      ],
      options("4", "15", "16", "20", "25", "100", "10000"),
      ["representation-switching", "algebraic-transformation"],
    ),
    question(
      7,
      [
        paragraph(text("Find the finite area enclosed between the line "), inlineMath(T`y=0`), text(" and the curve")),
        displayMath(T`y=x^2-4|x|-12`),
      ],
      options(T`\frac{128}{3}`, T`\frac{176}{3}`, T`\frac{256}{3}`, "108", "144", "288"),
      ["integrating-absolute-values", "area-constraints"],
    ),
    question(
      8,
      [
        paragraph(text("A geometric sequence has first term "), inlineMath("a"), text(" and common ratio "), inlineMath("r"), text(", where "), inlineMath("a"), text(" and "), inlineMath("r"), text(" are positive integers and "), inlineMath(T`r>1`), text(".")),
        paragraph(text("The sum of the first "), inlineMath("n"), text(" terms is denoted by "), inlineMath(T`S_n`), text(".")),
        paragraph(text("Given that")),
        displayMath(T`S_{30}-S_{20}=kS_{10}`),
        paragraph(text("where "), inlineMath("k"), text(" is a positive integer, what is the smallest possible value of "), inlineMath("k"), text("?")),
      ],
      options(T`2^{10}`, T`2^{20}`, T`2^{30}`, T`\frac{2^{10}}{2^{10}-1}`, T`2^{10}(2^{10}-1)`),
      ["geometric-series-convergence", "condition-checking"],
    ),
    question(
      9,
      [
        paragraph(text("The functions "), inlineMath("f"), text(" and "), inlineMath("g"), text(" satisfy")),
        displayMath(T`f(x)-g(x)=2\sin x`),
        displayMath(T`f(x)g(x)=\cos^2x`),
        paragraph(text("for all real values of "), inlineMath("x"), text(".")),
        paragraph(text("Considering all possible solutions for "), inlineMath(T`f(x)`), text(", what is the minimum value attained by "), inlineMath("f"), text("?")),
      ],
      options(T`1-\sqrt2`, T`-1-\sqrt2`, "0", "-1", "-2", "-3", "-4"),
      ["range-analysis", "algebraic-transformation"],
    ),
    question(
      10,
      [
        paragraph(text("Three equations are shown below.")),
        displayMath(T`\mathrm{I}\quad y=x^3-3x^2+9x-27`),
        displayMath(T`\mathrm{II}\quad y=x^3-9x^2+27x-3`),
        displayMath(T`\mathrm{III}\quad y=27x^3-9x^2+x-3`),
        paragraph(text("Which of these graphs could result from translating the graph of "), inlineMath(T`y=x^3`), text("?")),
      ],
      options(
        T`\text{None of them}`,
        T`\mathrm{I}\text{ only}`,
        T`\mathrm{II}\text{ only}`,
        T`\mathrm{III}\text{ only}`,
        T`\mathrm{I}\text{ and }\mathrm{II}\text{ only}`,
        T`\mathrm{I}\text{ and }\mathrm{III}\text{ only}`,
        T`\mathrm{II}\text{ and }\mathrm{III}\text{ only}`,
        T`\mathrm{I},\mathrm{II}\text{ and }\mathrm{III}`,
      ),
      ["representation-switching", "algebraic-transformation"],
    ),
    question(
      11,
      [paragraph(text("Evaluate")), displayMath(T`\sum_{n=1}^{100}\log_{10}\left(3^{1-n}\right)`) ],
      options(
        T`-4950\log_{10}3`,
        T`4950\log_{10}3`,
        T`-5050\log_{10}3`,
        T`5050\log_{10}3`,
        T`1-4950\log_{10}3`,
        T`1+4950\log_{10}3`,
        T`1-5050\log_{10}3`,
        T`1+5050\log_{10}3`,
      ),
      ["algebraic-transformation", "multi-step-planning"],
    ),
    question(
      12,
      [
        paragraph(text("A family of quadratic curves is given by")),
        displayMath(T`y_k=2\left(x-\frac{k}{2}\right)^2+\frac{k^2}{2}+4k+3`),
        paragraph(text("where "), inlineMath("k"), text(" is any real number and "), inlineMath(T`y_k`), text(" is a function of "), inlineMath("x"), text(".")),
        paragraph(text("All these curves are sketched, and the point with the lowest "), inlineMath("y"), text("-coordinate among all the curves "), inlineMath(T`y_k`), text(" is "), inlineMath(T`(a,b)`), text(".")),
        paragraph(text("Find the value of "), inlineMath(T`a+b`), text(".")),
      ],
      options("-1", "-3", "-5", "-7", "-9"),
      ["range-analysis", "multi-step-planning"],
    ),
    question(
      13,
      [
        paragraph(text("Given that")),
        displayMath(T`\left(a^3+\frac{2}{b^3}\right)\left(\frac{2}{a^3}-b^3\right)=\sqrt2`),
        paragraph(text("where "), inlineMath("a"), text(" and "), inlineMath("b"), text(" are real numbers, what is the least value of "), inlineMath(T`ab`), text("?")),
      ],
      options(T`-\sqrt2`, T`\sqrt2`, T`-2\sqrt2`, T`2\sqrt2`, T`-\frac{\sqrt2}{2}`, T`\frac{\sqrt2}{2}`, T`-2^{\frac16}`, T`2^{\frac16}`),
      ["algebraic-transformation", "condition-checking"],
    ),
    question(
      14,
      [
        paragraph(text("A circle has centre "), inlineMath("O"), text(" and radius 6.")),
        paragraph(inlineMath(T`P,Q`), text(" and "), inlineMath("R"), text(" are points on the circumference with angle "), inlineMath(T`POQ\geq\frac{\pi}{2}`), text(".")),
        paragraph(text("The area of triangle "), inlineMath("POQ"), text(" is "), inlineMath(T`9\sqrt3`), text(".")),
        paragraph(text("What is the greatest possible area of triangle "), inlineMath("PRQ"), text("?")),
      ],
      options(T`18+9\sqrt3`, T`18\sqrt3`, T`27+9\sqrt3`, T`27\sqrt3`, T`36+9\sqrt3`, T`36\sqrt3`),
      ["area-constraints", "multi-step-planning"],
    ),
    question(
      15,
      [
        paragraph(text("A rectangle is drawn in the region enclosed by the curves "), inlineMath("p"), text(" and "), inlineMath("q"), text(", where")),
        displayMath(T`p(x)=8-2x^2`),
        displayMath(T`q(x)=x^2-2`),
        paragraph(text("such that the sides of the rectangle are parallel to the "), inlineMath("x"), text("- and "), inlineMath("y"), text("-axes.")),
        paragraph(text("What is the maximum possible area of the rectangle?")),
      ],
      options(T`\frac{26}{9}`, T`\frac{52}{9}`, T`\frac{4\sqrt6}{3}`, T`\frac{8\sqrt6}{3}`, T`4\sqrt2`, T`8\sqrt2`, T`\frac{20\sqrt{10}}{9}`, T`\frac{40\sqrt{10}}{9}`),
      ["area-constraints", "multi-step-planning"],
    ),
    question(
      16,
      [
        paragraph(text("The solutions to "), inlineMath(T`7x^4-6x^2+1=0`), text(" are "), inlineMath(T`\pm\cos\theta`), text(" and "), inlineMath(T`\pm\cos\beta`), text(".")),
        paragraph(text("Which one of the following equations has solutions "), inlineMath(T`\pm\sin\theta`), text(" and "), inlineMath(T`\pm\sin\beta`), text("?")),
      ],
      options(T`7x^4-8x^2-5=0`, T`7x^4-8x^2+2=0`, T`7x^4-6x^2-2=0`, T`7x^4-6x^2+1=0`, T`7x^4+6x^2-1=0`, T`7x^4+6x^2+5=0`),
      ["representation-switching", "algebraic-transformation"],
    ),
    question(
      17,
      [
        figure(
          "/questions/tmua-2022-p1/q17.svg",
          "Triangle with a 30 degree angle at the right-hand vertex. The side opposite that angle has length x minus 1 and the adjacent sloping side has length negative x squared plus 6x minus 5.",
          "Diagram not to scale.",
        ),
        paragraph(text("Find the complete set of values of "), inlineMath("x"), text(" for which there are two non-congruent triangles with the side lengths and angle as shown in the diagram.")),
      ],
      options(T`1<x<3`, T`1<x<4`, T`1<x<5`, T`3<x<4`, T`3<x<5`, T`4<x<5`),
      ["ambiguous-sine-rule", "condition-checking"],
    ),
    question(
      18,
      [
        paragraph(text("It is given that")),
        displayMath(T`f(x)=x^2(x-1)^2(x-2)`),
        displayMath(T`g(x)=-p(x-q)^2(x-r)^2`),
        paragraph(text("where "), inlineMath(T`p,q`), text(" and "), inlineMath("r"), text(" are positive and "), inlineMath(T`q<r`), text(".")),
        paragraph(text("Find the set of values of "), inlineMath("q"), text(" and "), inlineMath("r"), text(" that guarantees the greatest number of distinct real solutions of the equation "), inlineMath(T`f(x)=g(x)`), text(" for all "), inlineMath("p"), text(".")),
      ],
      options(
        T`q<1\quad\text{and}\quad r<1`,
        T`q<1\quad\text{and}\quad 1<r<2`,
        T`q<1\quad\text{and}\quad r>2`,
        T`1<q<2\quad\text{and}\quad 1<r<2`,
        T`1<q<2\quad\text{and}\quad r>2`,
        T`q>2\quad\text{and}\quad r>2`,
      ),
      ["stationary-points-and-roots", "condition-checking"],
    ),
    question(
      19,
      [
        paragraph(text("Circle "), inlineMath(T`C_1`), text(" is defined as "), inlineMath(T`x^2+y^2=25`), text(".")),
        paragraph(text("A second circle "), inlineMath(T`C_2`), text(" has radius 4 and centre "), inlineMath(T`(a,b)`), text(" where")),
        displayMath(T`-2\leq a\leq2\quad\text{and}\quad-3\leq b\leq3`),
        paragraph(text("If the centre of "), inlineMath(T`C_2`), text(" is equally likely to be located anywhere within the given range, what is the probability that "), inlineMath(T`C_2`), text(" intersects "), inlineMath(T`C_1`), text("?")),
      ],
      options(T`\frac{1}{25}`, T`\frac{9}{25}`, T`\frac{16}{25}`, T`\frac{6-\pi}{6}`, T`\frac{16-\pi}{24}`, T`\frac{24-\pi}{24}`),
      ["maximum-distance-between-circles", "multi-step-planning"],
    ),
    question(
      20,
      [
        paragraph(inlineMath("n"), text(" is the number of points of intersection of the graphs")),
        displayMath(T`y=|x^2-a^2|\quad\text{and}\quad y=a^2|x-1|`),
        paragraph(text("where "), inlineMath("a"), text(" is a real number.")),
        paragraph(text("What is the smallest value of "), inlineMath("n"), text(" that is not possible?")),
      ],
      options(T`n=1`, T`n=2`, T`n=3`, T`n=4`, T`n=5`),
      ["range-analysis", "condition-checking"],
    ),
  ],
};

const issues = validatePracticePaper(TMUA_2022_P1);
if (issues.length) {
  throw new Error(`Invalid TMUA 2022 Paper 1: ${JSON.stringify(issues)}`);
}
