import type { InlineRun, PracticeOption, PracticePaper, PracticeQuestion, QuestionBlock } from "./types.js";
import { validatePracticePaper } from "./validate.js";

const sourceQuestionPath = "Tmua/2016-2023paper/tmua-2022-paper-2.pdf";
const sourceAnswerPath = "Tmua/2016-2023 answer key/tmua-2022.pdf";
const answers = "BECBFCFCAGCFEDFDEEBE";
const T = String.raw;

const knowledge = [
  "differentiation", "binomial-expansion", "mathematical-proof", "coordinate-geometry-circles",
  "mathematical-logic", "mathematical-logic", "errors-in-proof", "sequences-and-series",
  "mathematical-logic", "mathematical-logic", "coordinate-geometry", "integration",
  "mathematical-logic", "algebra-and-functions", "exponentials-and-logarithms", "mathematical-logic",
  "errors-in-proof", "graphs-of-functions", "coordinate-geometry", "graphs-of-functions",
] as const;

const text = (value: string): InlineRun => ({ kind: "text", value });
const math = (tex: string): InlineRun => ({ kind: "math", tex });
const p = (...runs: InlineRun[]): QuestionBlock => ({ kind: "paragraph", runs });
const d = (tex: string): QuestionBlock => ({ kind: "display-math", tex });
const figure = (src: string, alt: string): QuestionBlock => ({ kind: "figure", src, alt });
const mathOptions = (...values: string[]): PracticeOption[] => values.map((tex, index) => ({ label: String.fromCharCode(65 + index), content: [d(tex)] }));
const textOptions = (...values: string[]): PracticeOption[] => values.map((value, index) => ({ label: String.fromCharCode(65 + index), content: [p(text(value))] }));
const combinations = textOptions("none of them", "I only", "II only", "III only", "I and II only", "I and III only", "II and III only", "I, II and III");

function q(number: number, prompt: QuestionBlock[], options: PracticeOption[], skills: string[]): PracticeQuestion {
  return {
    id: `tmua-2022-p2-q${String(number).padStart(2, "0")}`,
    number,
    sourcePage: number + 2,
    prompt,
    options,
    correctAnswer: answers[number - 1]!,
    knowledgeTags: [knowledge[number - 1]!],
    skillTags: skills,
    reviewStatus: "verified",
    sourceQuestionPath,
    sourceAnswerPath,
  };
}

export const TMUA_2022_P2: PracticePaper = {
  id: "tmua-2022-p2",
  exam: "TMUA",
  edition: "2022",
  paper: 2,
  durationMinutes: 75,
  deliveryMode: "structured",
  questions: [
    q(1, [p(text("Determine the number of stationary points on the curve")), d(T`y=3x^4+4x^3+6x^2-5`)], mathOptions("0", "1", "2", "3", "4"), ["algebraic-transformation", "condition-checking"]),
    q(2, [p(text("Find the coefficient of the "), math(T`x^5`), text(" term in the expansion of")), d(T`(1+x)^5\sum_{i=0}^{5}x^i`)], mathOptions("1", "5", "16", "25", "32"), ["algebraic-transformation", "multi-step-planning"]),
    q(3, [p(text("For a positive integer "), math("n"), text(", consider")), d(T`n\text{ prime}\ \Longrightarrow\ n^2+2\text{ is not prime}`), p(text("Which is a counterexample?")), d(T`\mathrm I\ n=2\qquad \mathrm{II}\ n=3\qquad \mathrm{III}\ n=4`)], combinations, ["counterexample-construction", "condition-checking"]),
    q(4, [p(text("The point "), math("P"), text(" has coordinates "), math(T`(p,q)`), text(", and a circle has equation")), d(T`x^2+2fx+y^2+2gy+h=0`), p(text("Let "), math("L"), text(" be the distance between its centre and "), math("P"), text(". Which information is sufficient on its own to calculate "), math("L"), text("?"))], textOptions("the values of f, g and h", "the values of f, g, p and q", "the values of f, h, p and q", "the values of g, h, p and q", "none of A–D is sufficient on its own"), ["necessary-sufficient-reasoning", "representation-switching"]),
    q(5, [p(text("A line "), math("L"), text(" passes through "), math(T`(1,2)`), text(". Let "), math("P"), text(" be the statement:")), p(text("If the "), math("y"), text("-intercept of "), math("L"), text(" is negative, then its "), math("x"), text("-intercept is positive.")), p(text("Which statements must be true?")), p(text("I — P.  II — The converse of P.  III — The contrapositive of P."))], combinations, ["necessary-sufficient-reasoning", "condition-checking"]),
    q(6, [p(text("A list consists of "), math("n"), text(" integers. Consider:")), p(text("P: "), math("n"), text(" is odd.")), p(text("Q: The median is one of the numbers in the list.")), p(text("Which is true?"))], textOptions("P is necessary and sufficient for Q.", "P is necessary but not sufficient for Q.", "P is sufficient but not necessary for Q.", "P is not necessary and not sufficient for Q."), ["necessary-sufficient-reasoning", "counterexample-construction"]),
    q(7, [p(text("Claim: the difference between two consecutive positive cubes is always prime.")), p(text("I — "), math(T`(x+1)^3=x^3+3x^2+3x+1`), text(".")), p(text("II — For positive integer "), math("x"), text(", the difference is "), math(T`3x^2+3x+1`), text(".")), p(text("III — This quadratic cannot be factorised into two linear factors with integer coefficients because its discriminant is negative.")), p(text("IV — Therefore for every positive integer "), math("x"), text(", the integer "), math(T`3x^2+3x+1`), text(" cannot be factorised.")), p(text("V — Hence the difference is always prime.")), p(text("Which option best describes the proof?"))], textOptions("The proof is completely correct, and the claim is true.", "The proof is completely correct, but there are counterexamples.", "The proof is wrong; the first error is line I.", "The proof is wrong; the first error is line II.", "The proof is wrong; the first error is line III.", "The proof is wrong; the first error is line IV.", "The proof is wrong; the first error is line V."), ["error-detection", "proof-sequencing"]),
    q(8, [p(text("A selection "), math("S"), text(" of "), math("n"), text(" terms is taken from "), math(T`1,4,7,10,\ldots,70`), text(".")), p(text("There are two distinct terms in "), math("S"), text(" whose sum is 74. What is the smallest "), math("n"), text(" for which this is necessarily true?"))], mathOptions("12", "13", "14", "21", "22", "23"), ["multi-step-planning", "condition-checking"]),
    q(9, [p(text("For all real "), math("x"), text(", consider")), d(T`x<k\ \Longrightarrow\ x^2<k`), p(text("Find the complete set of values of "), math("k"), text(" for which this is true."))], mathOptions(T`\text{no real }k`, T`k>0`, T`k<1`, T`k\le1`, T`0<k<1`, T`0<k\le1`, T`\text{all real }k`), ["counterexample-construction", "condition-checking"]),
    q(10, [p(text("Which statements are true?")), p(text("I — For all real "), math("x"), text(" and all positive integers "), math("n"), text(", "), math(T`x<n`), text(".")), p(text("II — For every real "), math("x"), text(", there exists a positive integer "), math("n"), text(" such that "), math(T`x<n`), text(".")), p(text("III — There exists a real "), math("x"), text(" such that for all positive integers "), math("n"), text(", "), math(T`x<n`), text("."))], combinations, ["condition-checking", "counterexample-construction"]),
    q(11, [figure("/questions/tmua-2022-p2/q11.svg", "Kite PQRS with horizontal diagonal PR and vertical diagonal SQ meeting at O. OP and OR are x, OQ is y, and OS is z."), p(text("The diagram shows a kite "), math("PQRS"), text(" whose diagonals meet at "), math("O"), text(".")), d(T`OP=OR=x,\qquad OQ=y,\qquad OS=z`), p(text("Which condition is necessary and sufficient for "), math(T`\angle SPQ`), text(" to be a right angle?"))], mathOptions(T`x=y=z`, T`2x=y+z`, T`x^2=yz`, T`y=z`, T`y^2=x^2+z^2`), ["diagram-interpretation", "necessary-sufficient-reasoning"]),
    q(12, [p(text("Place the integrals in increasing order:")), d(T`P=\int_0^1 2^{\sqrt{x}}\,\mathrm dx`), d(T`Q=\int_0^1 2^x\,\mathrm dx`), d(T`R=\int_0^1(\sqrt2)^x\,\mathrm dx`)], mathOptions(T`P<Q<R`, T`P<R<Q`, T`Q<P<R`, T`Q<R<P`, T`R<P<Q`, T`R<Q<P`), ["approximation-estimation", "condition-checking"]),
    q(13, [p(text("For real "), math("x"), text(", consider:")), p(text("There exists a real "), math("y"), text(" such that "), math(T`x-xy+y`), text(" is negative.")), p(text("For how many real values of "), math("x"), text(" is this true?"))], textOptions("no values of x", "exactly one value of x", "exactly two values of x", "all except exactly two values of x", "all except exactly one value of x", "all values of x"), ["algebraic-transformation", "condition-checking"]),
    q(14, [p(text("Consider")), d(T`|x+5|<|x+11|`), d(T`|x+11|<|x+1|`), p(text("Which is correct?"))], textOptions("No real number satisfies both.", "Exactly one real number satisfies both.", "The solution set is an interval of length 1.", "The solution set is an interval of length 2.", "The solution set is an interval of length 3.", "The solution set is an interval of length 4.", "The solution set is an interval of length 5."), ["algebraic-transformation", "condition-checking"]),
    q(15, [p(text("The real numbers "), math(T`x,y,z`), text(" are greater than 1 and satisfy")), d(T`\log_x y=z,\qquad\log_y z=x`), p(text("Which equation for "), math(T`\log_z x`), text(" must be true?"))], mathOptions(T`\log_zx=y`, T`\log_zx=\frac1y`, T`\log_zx=xy`, T`\log_zx=\frac1{xy}`, T`\log_zx=xz`, T`\log_zx=\frac1{xz}`, T`\log_zx=yz`, T`\log_zx=\frac1{yz}`), ["algebraic-transformation", "multi-step-planning"]),
    q(16, [p(text("Integer sequences "), math(T`a_1,\ldots,a_{100}`), text(", "), math(T`b_1,\ldots,b_{100}`), text(" and "), math(T`c_1,\ldots,c_{100}`), text(" satisfy "), math(T`a_n\le b_n+c_n`), text(" for each "), math("n"), text(". Which statements must be true?")), d(T`\mathrm I\quad \min a_n\le\min b_n+\min c_n`), d(T`\mathrm{II}\quad \min a_n\ge\min b_n+\min c_n`), d(T`\mathrm{III}\quad \max a_n\le\max b_n+\max c_n`)], combinations, ["condition-checking", "counterexample-construction"]),
    q(17, [p(text("A student is asked to prove that "), math(T`x^3+ax^2+b=0`), text(" has three distinct real roots if")), d(T`27b\left(b+\frac{4a^3}{27}\right)<0`), p(text("I — Differentiation gives stationary points "), math(T`(0,b)`), text(" and "), math(T`\left(-\frac{2a}{3},b+\frac{4a^3}{27}\right)`), text(".")), p(text("II — The inequality makes their "), math("y"), text("-coordinates have opposite signs.")), p(text("III — If the cubic has three distinct roots, one stationary point is above the axis and one below.")), p(text("IV — Hence the inequality implies three distinct roots.")), p(text("Which option best describes the solution?"))], textOptions("It is completely correct.", "The student instead proved the converse.", "Step II should have been stated after step III.", "The converse of the result in step II was required.", "The converse of the result in step III was required."), ["error-detection", "proof-sequencing"]),
    q(18, [p(text("Graphs P, Q, R and S show, in some order,")), d(T`y=(\cos x)^{\cos x},\quad y=(\sin x)^{\sin x},\quad y=(\cos x)^{\sin x},\quad y=(\sin x)^{\cos x}`), p(text("for "), math(T`0<x<\frac\pi2`), text(".")), figure("/questions/tmua-2022-p2/q18.svg", "Four labelled graphs P, Q, R and S over zero to pi over two. P decreases from 1 to 0; Q rises from 0 to 1; R and S start and end near 1 with differently positioned minima."), p(text("Which row correctly identifies the graphs?"))], textOptions("P, Q, R, S", "P, Q, S, R", "Q, P, R, S", "Q, P, S, R", "R, S, P, Q", "R, S, Q, P", "S, R, P, Q", "S, R, Q, P"), ["diagram-interpretation", "representation-switching"]),
    q(19, [p(text("A polygon has "), math(T`n\ge3`), text(" vertices on a circle. The centre is inside the polygon, and radii to the vertices divide it into "), math("n"), text(" triangles of equal area.")), p(text("For which "), math("n"), text(" are these properties sufficient to deduce that the polygon is regular?"))], mathOptions(T`\text{no }n`, T`n=3\text{ only}`, T`n=3\text{ and }n=4\text{ only}`, T`n=3\text{ and }n\ge5\text{ only}`, T`\text{all }n`), ["necessary-sufficient-reasoning", "condition-checking"]),
    q(20, [p(text("Define")), d(T`f_1(x)=\cos x`), d(T`f_2(x)=\sin(\cos x)`), d(T`f_3(x)=\cos(\sin(\cos x))`), d(T`f_4(x)=\sin(\cos(\sin(\cos x)))`), d(T`f_5(x)=\cos(\sin(\cos(\sin(\cos x))))`), p(text("Their maximum values are "), math(T`m_1,\ldots,m_5`), text(". Which statement is true?"))], mathOptions(T`m_1=m_2=m_3=m_4=m_5=1`, T`0<m_5<m_4<m_3<m_2<m_1=1`, T`m_1=m_3=m_5=1\text{ and }0<m_2=m_4<1`, T`m_1=m_3=m_5=1\text{ and }0<m_4<m_2<1`, T`m_1=m_3=1,\ 0<m_2=m_4<1,\ 0<m_5<1`, T`m_1=m_3=1,\ 0<m_4<m_2<1,\ 0<m_5<1`), ["range-analysis", "multi-step-planning"]),
  ],
};

const issues = validatePracticePaper(TMUA_2022_P2);
if (issues.length > 0) throw new Error(`TMUA 2022 Paper 2 content is invalid: ${issues.map((issue) => issue.code).join(", ")}`);
