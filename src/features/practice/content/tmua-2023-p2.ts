import type {
  InlineRun,
  PracticeOption,
  PracticePaper,
  PracticeQuestion,
  QuestionBlock,
} from "./types.js";
import { validatePracticePaper } from "./validate.js";

const sourceQuestionPath = "Tmua/2016-2023paper/tmua-paper-2-2023.pdf";
const sourceAnswerPath = "Tmua/2016-2023 answer key/tmua-2023.pdf";
const answers = "HFCGAFEDDAGCCFBBFDHD";
const T = String.raw;

const knowledgeByQuestion = [
  "algebra-and-functions",
  "integration",
  "mathematical-proof",
  "errors-in-proof",
  "mathematical-logic",
  "exponentials-and-logarithms",
  "coordinate-geometry",
  "coordinate-geometry",
  "mathematical-logic",
  "errors-in-proof",
  "mathematical-logic",
  "trigonometry",
  "mathematical-logic",
  "coordinate-geometry",
  "sequences-and-series",
  "sequences-and-series",
  "integration",
  "algebra-and-functions",
  "differentiation",
  "integration",
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

function mathOptions(...values: string[]): PracticeOption[] {
  return values.map((tex, index) => ({
    label: String.fromCharCode(65 + index),
    content: [displayMath(tex)],
  }));
}

function textOptions(...values: string[]): PracticeOption[] {
  return values.map((value, index) => ({
    label: String.fromCharCode(65 + index),
    content: [paragraph(text(value))],
  }));
}

function question(
  number: number,
  prompt: QuestionBlock[],
  options: PracticeOption[],
  skillTags: string[],
): PracticeQuestion {
  return {
    id: `tmua-2023-p2-q${String(number).padStart(2, "0")}`,
    number,
    sourcePage: number + 2,
    prompt,
    options,
    correctAnswer: answers[number - 1]!,
    knowledgeTags: [knowledgeByQuestion[number - 1]!],
    skillTags,
    reviewStatus: "verified",
    sourceQuestionPath,
    sourceAnswerPath,
  };
}

const combinationOptions = textOptions(
  "none of them",
  "I only",
  "II only",
  "III only",
  "I and II only",
  "I and III only",
  "II and III only",
  "I, II and III",
);

export const TMUA_2023_P2: PracticePaper = {
  id: "tmua-2023-p2",
  exam: "TMUA",
  edition: "2023",
  paper: 2,
  durationMinutes: 75,
  deliveryMode: "structured",
  questions: [
    question(
      1,
      [
        paragraph(text("Given that")),
        displayMath(T`\frac{1}{\sqrt{x}-6}-\frac{1}{\sqrt{x}+6}=\frac{3}{11}`),
        paragraph(text("what is the value of "), inlineMath("x"), text("?")),
      ],
      mathOptions(T`2\sqrt{15}`, T`4\sqrt5`, T`5\sqrt2`, T`\sqrt{58}`, "50", "58", "60", "80"),
      ["algebraic-transformation", "condition-checking"],
    ),
    question(
      2,
      [
        paragraph(text("Evaluate")),
        displayMath(
          T`\int_9^{16}\left(\frac1{\sqrt{x}}+\sqrt{x}\right)^2\,\mathrm{d}x-\int_9^{16}\left(\frac1{\sqrt{x}}-\sqrt{x}\right)^2\,\mathrm{d}x`,
        ),
      ],
      mathOptions("0", "2", "4", "7", "14", "28", "75", "175"),
      ["algebraic-transformation", "multi-step-planning"],
    ),
    question(
      3,
      [
        paragraph(text("Consider the claim: for all positive real numbers "), inlineMath("x"), text(" and "), inlineMath("y"), text(",")),
        displayMath(T`\sqrt{x^y}=x^{\sqrt y}`),
        paragraph(text("Which of the following is/are a counterexample to the claim?")),
        displayMath(T`\mathrm{I}\quad x=1,\ y=16`),
        displayMath(T`\mathrm{II}\quad x=2,\ y=8`),
        displayMath(T`\mathrm{III}\quad x=3,\ y=4`),
      ],
      combinationOptions,
      ["counterexample-construction", "condition-checking"],
    ),
    question(
      4,
      [
        paragraph(text("A student attempts to answer: What is the largest number of consecutive odd integers that are all prime?")),
        paragraph(text("I — There are two consecutive odd integers that are prime (for example, 17 and 19).")),
        paragraph(text("II — Any three consecutive odd integers can be written as "), inlineMath(T`n-2,n,n+2`), text(" for some "), inlineMath("n"), text(".")),
        paragraph(text("III — If "), inlineMath("n"), text(" is one more than a multiple of 3, then "), inlineMath(T`n+2`), text(" is a multiple of 3.")),
        paragraph(text("IV — If "), inlineMath("n"), text(" is two more than a multiple of 3, then "), inlineMath(T`n-2`), text(" is a multiple of 3.")),
        paragraph(text("V — The only other possibility is that "), inlineMath("n"), text(" is a multiple of 3.")),
        paragraph(text("VI — In each case, one integer is a multiple of 3, so is not prime.")),
        paragraph(text("VII — Therefore the largest number is two.")),
        paragraph(text("Which option best describes the attempt?")),
      ],
      textOptions(
        "It is completely correct.",
        "It is incorrect, and the first error is on line I.",
        "It is incorrect, and the first error is on line II.",
        "It is incorrect, and the first error is on line III.",
        "It is incorrect, and the first error is on line IV.",
        "It is incorrect, and the first error is on line V.",
        "It is incorrect, and the first error is on line VI.",
        "It is incorrect, and the first error is on line VII.",
      ),
      ["error-detection", "proof-sequencing"],
    ),
    question(
      5,
      [
        paragraph(text("Consider the statements")),
        displayMath(T`R:\quad k\text{ is an integer multiple of }\pi`),
        displayMath(T`S:\quad \int_0^k\sin 2x\,\mathrm{d}x=0`),
        paragraph(text("Which statement is true?")),
      ],
      textOptions(
        "R is necessary and sufficient for S.",
        "R is necessary but not sufficient for S.",
        "R is sufficient but not necessary for S.",
        "R is not necessary and not sufficient for S.",
      ),
      ["necessary-sufficient-reasoning", "algebraic-transformation"],
    ),
    question(
      6,
      [
        paragraph(text("Let "), inlineMath(T`a>1`), text(" be real. Consider")),
        displayMath(T`(*)\quad a^x=x`),
        paragraph(text("Which equations must have the same number of real solutions as (*)?")),
        displayMath(T`\mathrm{I}\quad \log_a x=x`),
        displayMath(T`\mathrm{II}\quad a^{2x}=x^2`),
        displayMath(T`\mathrm{III}\quad a^{2x}=2x`),
      ],
      combinationOptions,
      ["representation-switching", "condition-checking"],
    ),
    question(
      7,
      [
        paragraph(text("The line "), inlineMath(T`ax+by=c`), text(" is drawn, where "), inlineMath(T`a,b,c`), text(" are non-zero real constants.")),
        paragraph(text("Which is a necessary but not sufficient condition for a positive gradient and positive "), inlineMath("y"), text("-intercept?")),
      ],
      mathOptions(
        T`\frac cb>0\ \text{ and }\ \frac ab<0`,
        T`\frac cb<0\ \text{ and }\ \frac ab>0`,
        T`a>b>c`,
        T`a<b<c`,
        T`a\text{ and }c\text{ have opposite signs}`,
        T`a\text{ and }c\text{ have the same sign}`,
      ),
      ["necessary-sufficient-reasoning", "condition-checking"],
    ),
    question(
      8,
      [
        paragraph(text("A student draws an acute or obtuse, but not right-angled, triangle and counts straight lines that divide it into two triangles, at least one of which is right-angled.")),
        paragraph(text("Which statements are true?")),
        paragraph(text("I — A triangle can have exactly 1 such line.")),
        paragraph(text("II — A triangle can have exactly 2 such lines.")),
        paragraph(text("III — A triangle can have exactly 3 such lines.")),
      ],
      combinationOptions,
      ["diagram-interpretation", "condition-checking"],
    ),
    question(
      9,
      [
        paragraph(text("Consider the statement about a pentagon "), inlineMath("P"), text(":")),
        paragraph(text("(*) If at least one interior angle in "), inlineMath("P"), text(" is "), inlineMath(T`108^\circ`), text(", then all its interior angles form an arithmetic sequence.")),
        paragraph(text("Which are true?")),
        paragraph(text("I — Statement (*).")),
        paragraph(text("II — The contrapositive of (*).")),
        paragraph(text("III — The converse of (*).")),
      ],
      combinationOptions,
      ["necessary-sufficient-reasoning", "counterexample-construction"],
    ),
    question(
      10,
      [
        paragraph(text("A student solves "), inlineMath(T`x^4-2x^2-3<0`), text(" by completing the square:")),
        displayMath(T`\mathrm{I}\quad x^4-2x^2+1<4`),
        displayMath(T`\mathrm{II}\quad (x^2-1)^2<4`),
        displayMath(T`\mathrm{III}\quad -2<x^2-1<2`),
        displayMath(T`\mathrm{IV}\quad x^2-1<2`),
        displayMath(T`\mathrm{V}\quad x^2<3`),
        displayMath(T`\mathrm{VI}\quad -\sqrt3<x<\sqrt3`),
        paragraph(text("Which statement is true?")),
      ],
      textOptions(
        "The argument is completely correct.",
        "The first error occurs in line I.",
        "The first error occurs in line II.",
        "The first error occurs in line III.",
        "The first error occurs in line IV.",
        "The first error occurs in line V.",
        "The first error occurs in line VI.",
      ),
      ["error-detection", "proof-sequencing"],
    ),
    question(
      11,
      [
        paragraph(text("Let "), inlineMath("k"), text(" be a positive integer. Consider:")),
        displayMath(T`(*)\quad 2^k+1\text{ prime}\ \Longrightarrow\ k\text{ is a power of }2`),
        paragraph(text("Which statements, taken individually, are equivalent to (*)?")),
        displayMath(T`\mathrm{I}\quad k\text{ power of }2\ \Longrightarrow\ 2^k+1\text{ prime}`),
        displayMath(T`\mathrm{II}\quad 2^k+1\text{ not prime only if }k\text{ is not a power of }2`),
        displayMath(T`\mathrm{III}\quad 2^k+1\text{ prime is sufficient for }k\text{ to be a power of }2`),
      ],
      textOptions(
        "I: Yes; II: Yes; III: Yes",
        "I: Yes; II: Yes; III: No",
        "I: Yes; II: No; III: Yes",
        "I: Yes; II: No; III: No",
        "I: No; II: Yes; III: Yes",
        "I: No; II: Yes; III: No",
        "I: No; II: No; III: Yes",
        "I: No; II: No; III: No",
      ),
      ["necessary-sufficient-reasoning", "condition-checking"],
    ),
    question(
      12,
      [
        paragraph(text("Let "), inlineMath("p"), text(" be real. The equation")),
        displayMath(T`\sin x\cos^2x=p^2\sin x`),
        paragraph(text("has "), inlineMath("n"), text(" distinct solutions for "), inlineMath(T`0\le x\le2\pi`), text(". Which statements are true?")),
        displayMath(T`\mathrm{I}\quad n=3\text{ is sufficient for }p>1`),
        displayMath(T`\mathrm{II}\quad n=7\text{ only if }-1<p<1`),
      ],
      textOptions("none of them", "I only", "II only", "I and II"),
      ["trigonometric-solution-counting", "necessary-sufficient-reasoning"],
    ),
    question(
      13,
      [
        paragraph(text("Let "), inlineMath("x"), text(" be real. Which statement is a sufficient condition for exactly three of the other four statements?")),
      ],
      mathOptions(T`x\ge0`, T`x=1`, T`x=0\text{ or }x=1`, T`x\ge0\text{ or }x\le1`, T`x\ge0\text{ and }x\le1`),
      ["necessary-sufficient-reasoning", "condition-checking"],
    ),
    question(
      14,
      [
        paragraph(text("Three lines are given by")),
        displayMath(T`ax+by+c=0`),
        displayMath(T`bx+cy+a=0`),
        displayMath(T`cx+ay+b=0`),
        paragraph(text("where "), inlineMath(T`a,b,c`), text(" are non-zero real numbers. Which statement is correct?")),
      ],
      textOptions(
        "If two lines are parallel, then all three are parallel.",
        "If two lines are parallel, then the third is perpendicular to the other two.",
        "If two lines are parallel, then the third is parallel to y = x.",
        "If two lines are parallel, then the third is perpendicular to y = x.",
        "If two lines are perpendicular, then all three meet at a point.",
        "If two lines are perpendicular, then the third is parallel to y = x.",
        "If two lines are perpendicular, then the third is perpendicular to y = x.",
      ),
      ["representation-switching", "algebraic-transformation"],
    ),
    question(
      15,
      [
        paragraph(text("The base-10 number 0.03841 has the value")),
        displayMath(T`0\times10^{-1}+3\times10^{-2}+8\times10^{-3}+4\times10^{-4}+1\times10^{-5}=0.03841`),
        paragraph(text("Similarly, the base-2 number 0.01101 has the value")),
        displayMath(T`0\times2^{-1}+1\times2^{-2}+1\times2^{-3}+0\times2^{-4}+1\times2^{-5}=\frac{13}{32}`),
        paragraph(text("What is the value of the recurring base-2 number")),
        displayMath(T`0.\overline{0011}_2=0.001100110011\ldots_2`),
      ],
      mathOptions(T`\frac13`, T`\frac15`, T`\frac1{15}`, T`\frac2{15}`, T`\frac4{15}`, T`\frac3{16}`, T`\frac5{16}`, T`\frac6{31}`),
      ["representation-switching", "geometric-series-convergence"],
    ),
    question(
      16,
      [
        paragraph(text("A sequence is defined by")),
        displayMath(T`u_1=a,\qquad u_2=b,\qquad u_{n+2}=u_n+u_{n+1}\quad(n\ge1)`),
        paragraph(text("where "), inlineMath("a"), text(" and "), inlineMath("b"), text(" are positive integers with highest common factor 7. Which statements must be true?")),
        displayMath(T`\mathrm{I}\quad u_{2023}\text{ is a multiple of }7`),
        displayMath(T`\mathrm{II}\quad u_1\nmid u_2\ \Longrightarrow\ u_1\nmid u_n\text{ for every }n>1`),
        displayMath(T`\mathrm{III}\quad \gcd(u_1,u_5)=7`),
      ],
      combinationOptions,
      ["condition-checking", "multi-step-planning"],
    ),
    question(
      17,
      [
        paragraph(text("The ceiling of "), inlineMath("x"), text(", written "), inlineMath(T`\lceil x\rceil`), text(", is the value of "), inlineMath("x"), text(" rounded up to the nearest integer.")),
        displayMath(T`\lceil\pi\rceil=4,\qquad\lceil2.1\rceil=3,\qquad\lceil8\rceil=8`),
        paragraph(text("What is the value of the following integral?")),
        displayMath(T`\int_0^{99}2^{\lceil x\rceil}\,\mathrm{d}x`),
      ],
      mathOptions(T`2^{99}`, T`2^{99}-1`, T`2^{99}-2`, T`2^{100}`, T`2^{100}-1`, T`2^{100}-2`),
      ["representation-switching", "multi-step-planning"],
    ),
    question(
      18,
      [
        paragraph(text("The equation "), inlineMath(T`x^4+bx^2+c=0`), text(" has four distinct real roots if and only if which condition holds?")),
      ],
      mathOptions(T`b^2>4c`, T`b^2<4c`, T`c>0\text{ and }b>2\sqrt c`, T`c>0\text{ and }b<-2\sqrt c`, T`c<0\text{ and }b<0`, T`c<0\text{ and }b>0`),
      ["representation-switching", "discriminant-inequalities"],
    ),
    question(
      19,
      [
        paragraph(text("Let "), inlineMath("f"), text(" be a non-constant polynomial and "), inlineMath(T`g(x)=xf'(x)`), text(".")),
        paragraph(inlineMath(T`f(x)=0`), text(" for exactly "), inlineMath("M"), text(" real values, and "), inlineMath(T`g(x)=0`), text(" for exactly "), inlineMath("N"), text(" real values.")),
        paragraph(text("Which are possible?")),
        displayMath(T`\mathrm{I}\quad M<N`),
        displayMath(T`\mathrm{II}\quad M=N`),
        displayMath(T`\mathrm{III}\quad M>N`),
      ],
      combinationOptions,
      ["condition-checking", "multi-step-planning"],
    ),
    question(
      20,
      [
        paragraph(text("Let "), inlineMath("f"), text(" be a polynomial with real coefficients. For "), inlineMath(T`p<q`), text(", define")),
        displayMath(T`I_{p,q}=\int_p^q\left((f(x))^2-(f(|x|))^2\right)\,\mathrm{d}x`),
        paragraph(text("Which statements must be true?")),
        displayMath(T`1\quad I_{p,q}=0\text{ only if }0<p`),
        displayMath(T`2\quad f'(x)<0\text{ for all }x\text{ only if }I_{p,q}<0\text{ for all }p<q<0`),
        displayMath(T`3\quad I_{p,q}>0\text{ only if }p<0`),
      ],
      textOptions("none of them", "1 only", "2 only", "3 only", "1 and 2 only", "1 and 3 only", "2 and 3 only", "1, 2 and 3"),
      ["necessary-sufficient-reasoning", "condition-checking"],
    ),
  ],
};

const issues = validatePracticePaper(TMUA_2023_P2);
if (issues.length > 0) {
  throw new Error(`TMUA 2023 Paper 2 content is invalid: ${issues.map((issue) => issue.code).join(", ")}`);
}
