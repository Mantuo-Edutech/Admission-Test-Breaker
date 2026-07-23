import type { InlineRun, PracticeOption, PracticePaper, PracticeQuestion, QuestionBlock } from "./types.js";
import { validatePracticePaper } from "./validate.js";

const sourceQuestionPath = "Tmua/2016-2023paper/tmua-paper-2-2021.pdf";
const sourceAnswerPath = "Tmua/2016-2023 answer key/tmua-2021.pdf";
const answers = "DECCBDBCCECBACBEFCFE";
const T = String.raw;

const knowledge = [
  "integration", "coordinate-geometry", "mathematical-logic", "mathematical-proof",
  "errors-in-proof", "mathematical-logic", "coordinate-geometry", "mathematical-logic",
  "mathematical-logic", "sequences-and-series", "mathematical-proof", "integration",
  "graphs-of-functions", "exponentials-and-logarithms", "coordinate-geometry-circles", "graphs-of-functions",
  "exponentials-and-logarithms", "trigonometry", "trigonometry", "sequences-and-series",
] as const;

const text = (value: string): InlineRun => ({ kind: "text", value });
const math = (tex: string): InlineRun => ({ kind: "math", tex });
const p = (...runs: InlineRun[]): QuestionBlock => ({ kind: "paragraph", runs });
const d = (tex: string): QuestionBlock => ({ kind: "display-math", tex });
const mathOptions = (...values: string[]): PracticeOption[] => values.map((tex, index) => ({ label: String.fromCharCode(65 + index), content: [d(tex)] }));
const textOptions = (...values: string[]): PracticeOption[] => values.map((value, index) => ({ label: String.fromCharCode(65 + index), content: [p(text(value))] }));
const combinations = textOptions("none of them", "I only", "II only", "III only", "I and II only", "I and III only", "II and III only", "I, II and III");

function q(number: number, prompt: QuestionBlock[], options: PracticeOption[], skills: string[]): PracticeQuestion {
  return {
    id: `tmua-2021-p2-q${String(number).padStart(2, "0")}`,
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

export const TMUA_2021_P2: PracticePaper = {
  id: "tmua-2021-p2",
  exam: "TMUA",
  edition: "2021",
  paper: 2,
  durationMinutes: 75,
  deliveryMode: "structured",
  questions: [
    q(1, [p(text("Find the value of")), d(T`\int_1^4\left(3\sqrt{x}+\frac4{x^2}\right)\,\mathrm dx`)], mathOptions("-0.75", "7.125", "11", "17", "18", "21.875", "34.5"), ["algebraic-transformation", "time-sensitive-calculation"]),
    q(2, [p(text("Points "), math("A(0,2)"), text(" and "), math("C(4,0)"), text(" are opposite vertices of square "), math("ABCD"), text(". What is the equation of the straight line through "), math("B"), text(" and "), math("D"), text("?"))], mathOptions(T`y=-2x+5`, T`y=-\frac12x-3`, T`y=-\frac12x+2`, T`y=x`, T`y=2x-3`, T`y=2x+2`), ["representation-switching", "time-sensitive-calculation"]),
    q(3, [p(text("A student is chosen at random from a class. Each student is equally likely to be chosen. Which conditions are necessary for the probability that the student wears glasses to equal "), math(T`\frac4{15}`), text("?")), p(text("I — Exactly 11 students in the class do not wear glasses.")), p(text("II — The number of students in the class is divisible by 3.")), p(text("III — The class contains 30 students, and 8 of them wear glasses."))], combinations, ["necessary-sufficient-reasoning", "condition-checking"]),
    q(4, [p(text("Consider the claim about positive integers "), math("a,b,c"), text(":")), d(T`a\mid bc\ \Longrightarrow\ a\mid b\text{ or }a\mid c`), p(text("Which provide a counterexample?")), d(T`\mathrm I\ a=5,b=10,c=20\qquad \mathrm{II}\ a=8,b=4,c=4\qquad \mathrm{III}\ a=6,b=7,c=12`)], combinations, ["counterexample-construction", "condition-checking"]),
    q(5, [p(text("On which line is the first error in the following argument?"))], mathOptions(T`\sin^2x+\cos^2x=1\text{ for all }x.`, T`\therefore\ \cos x=\sqrt{1-\sin^2x}\text{ for all }x.`, T`\therefore\ 1+\cos x=1+\sqrt{1-\sin^2x}\text{ for all }x.`, T`\therefore\ (1+\cos x)^2=\left(1+\sqrt{1-\sin^2x}\right)^2\text{ for all }x.`, T`\text{Substituting }x=\pi\text{ gives }0=4.`), ["error-detection", "proof-sequencing"]),
    q(6, [p(text("For a polynomial "), math("f(x)"), text(", let")), d(T`P:\ f(x)=0\text{ for exactly three real values of }x`), d(T`Q:\ f'(x)=0\text{ for exactly two real values of }x`), p(text("Which statement is correct?"))], textOptions("P is necessary but not sufficient for Q.", "P is sufficient but not necessary for Q.", "P is necessary and sufficient for Q.", "P is not necessary and not sufficient for Q."), ["necessary-sufficient-reasoning", "counterexample-construction"]),
    q(7, [p(text("A circle has equation "), math(T`(x-9)^2+(y+2)^2=4`), text(". A square has vertices "), math(T`(1,0),(1,2),(-1,2),(-1,0)`), text(". A line bisects both areas. What is the "), math("x"), text("-coordinate where it meets the "), math("x"), text("-axis?"))], textOptions("2", "3", "4", "4.5", "5", "6", "The line is not uniquely determined, so there is more than one possible intersection.", "No line bisects both areas."), ["diagram-interpretation", "representation-switching"]),
    q(8, [p(text("For a polynomial "), math("p(x)"), text(" and real "), math("a<b"), text(", consider:")), d(T`(*)\quad \exists c\in(a,b)\text{ such that }p'(c)=0`), p(text("Which is true?"))], textOptions("p(a) = p(b) is necessary and sufficient for (*).", "p(a) = p(b) is necessary but not sufficient for (*).", "p(a) = p(b) is sufficient but not necessary for (*).", "p(a) = p(b) is not necessary and not sufficient for (*)."), ["necessary-sufficient-reasoning", "counterexample-construction"]),
    q(9, [p(text("For a polynomial "), math("f(x)"), text(", which statements are sufficient for "), math("f(x)=0"), text(" to have a real solution?")), d(T`\mathrm I\quad f(x)=px^3+qx^2+rx+s,\ p\ne0`), d(T`\mathrm{II}\quad \exists t\in\mathbb R:\ f'(t)=0`), d(T`\mathrm{III}\quad \exists u,v\in\mathbb R:\ f(u)f(v)<0`)], textOptions("I: Yes; II: Yes; III: Yes", "I: Yes; II: Yes; III: No", "I: Yes; II: No; III: Yes", "I: Yes; II: No; III: No", "I: No; II: Yes; III: Yes", "I: No; II: Yes; III: No", "I: No; II: No; III: Yes", "I: No; II: No; III: No"), ["necessary-sufficient-reasoning", "condition-checking"]),
    q(10, [p(text("The first seven terms of a sequence of positive integers are")), d(T`u_1=15,\ u_2=21,\ u_3=30,\ u_4=37,\ u_5=44,\ u_6=51,\ u_7=59`), p(text("What is the smallest "), math("n"), text(" that counters the claim")), d(T`n\text{ prime}\ \Longrightarrow\ 3\mid u_n\text{ or }5\mid u_n?`)], mathOptions("1", "2", "3", "4", "5", "6", "7"), ["counterexample-construction", "condition-checking"]),
    q(11, [p(text("A student attempts to prove, for non-zero real "), math("a,b"), text(", that if "), math(T`a^2-4b^3\ge0`), text(", then real "), math("x,y"), text(" exist with "), math(T`a=xy(x+y)`), text(" and "), math(T`b=xy`), text(".")), d(T`(x-y)^2\ge0\quad(\mathrm I)`), d(T`x^2+y^2-2xy\ge0\quad(\mathrm{II})`), d(T`(x+y)^2-4xy\ge0\quad(\mathrm{III})`), d(T`x^2y^2(x+y)^2-4x^3y^3\ge0\quad(\mathrm{IV})`), d(T`a^2-4b^3\ge0\quad(\mathrm V)`), p(text("Which best describes the attempt?"))], textOptions("It is completely correct.", "It is incorrect, but would be correct in reverse order.", "It is incorrect, but proves the converse.", "It is incorrect because line II contains an error.", "It is incorrect because line III contains an error.", "It is incorrect because line IV contains an error."), ["error-detection", "proof-sequencing"]),
    q(12, [p(text("Which statements about polynomials "), math("f,g"), text(" are true?")), d(T`\mathrm I\quad f(x)\ge g(x)\ \forall x\ge0\ \Longrightarrow\ \int_0^x f(t)\,\mathrm dt\ge\int_0^x g(t)\,\mathrm dt\ \forall x\ge0`), d(T`\mathrm{II}\quad f(x)\ge g(x)\ \forall x\ge0\ \Longrightarrow\ f'(x)\ge g'(x)\ \forall x\ge0`), d(T`\mathrm{III}\quad f'(x)\ge g'(x)\ \forall x\ge0\ \Longrightarrow\ f(x)\ge g(x)\ \forall x\ge0`)], combinations, ["condition-checking", "counterexample-construction"]),
    q(13, [p(text("Region "), math("R"), text(" is defined by")), d(T`y-x<3,\qquad y-x^2<1`), p(text("Which statements hold for every point in "), math("R"), text("?")), d(T`\mathrm I\ -1<x<2\qquad \mathrm{II}\ (y-x)(y-x^2)<3\qquad \mathrm{III}\ y<5`)], combinations, ["condition-checking", "counterexample-construction"]),
    q(14, [p(text("For real "), math("p"), text(", consider")), d(T`p2^x+\log_2y=2`), d(T`2^x+\log_2y=1`), p(text("Find the complete range of "), math("p"), text(" for which there is a real solution "), math("(x,y)"), text("."))], mathOptions(T`p<1`, T`p\ne1`, T`p>1`, T`p<1\text{ or }p>2`, T`p\ne1\text{ and }p<2`, T`1<p<2`, T`p>2`, T`p\in\mathbb R`), ["algebraic-transformation", "condition-checking"]),
    q(15, [p(text("A circle has equation")), d(T`x^2+ax+y^2+by+c=0`), p(text("where "), math("a,b,c"), text(" are non-zero real constants. Which condition is necessary and sufficient for tangency to the "), math("y"), text("-axis?"))], mathOptions(T`a^2=4c`, T`b^2=4c`, T`\frac a2=\sqrt{\frac{a^2+b^2}{4}-c}`, T`\frac b2=\sqrt{\frac{a^2+b^2}{4}-c}`, T`-\frac a2=\sqrt{\frac{a^2+b^2}{4}-c}`, T`-\frac b2=\sqrt{\frac{a^2+b^2}{4}-c}`), ["necessary-sufficient-reasoning", "algebraic-transformation"]),
    q(16, [p(text("For real "), math("p,q"), text(", the equation")), d(T`x|x|=px+q`), p(text("has exactly "), math("k"), text(" distinct real solutions. Which is the complete list of possible "), math("k"), text("?"))], textOptions("0, 1, 2", "0, 1, 2, 3", "0, 1, 2, 3, 4", "0, 2, 4", "1, 2, 3", "1, 2, 3, 4"), ["representation-switching", "condition-checking"]),
    q(17, [p(text("For "), math("x>1"), text(", define")), d(T`f(x)=\log_2(\log_2\sqrt{x})`), d(T`g(x)=\log_2\sqrt{\log_2x}`), p(text("Which is true for every "), math("x>1"), text("?"))], mathOptions(T`0\le f\le g\text{ or }g\le f\le0`, T`0\le g\le f\text{ or }f\le g\le0`, T`\frac12\le f\le g\text{ or }g\le f\le\frac12`, T`\frac12\le g\le f\text{ or }f\le g\le\frac12`, T`1\le f\le g\text{ or }g\le f\le1`, T`1\le g\le f\text{ or }f\le g\le1`), ["algebraic-transformation", "condition-checking"]),
    q(18, [p(text("A student chooses distinct real "), math("x,y"), text(" with "), math("0<x<y<1"), text(" and tries to draw a triangle "), math("ABC"), text(" with")), d(T`AB=1,\qquad \sin A=x,\qquad \sin B=y`), p(text("Which statements are correct?")), p(text("I — For some choice of "), math("x,y"), text(", exactly one triangle can be drawn.")), p(text("II — For some choice, exactly two different triangles can be drawn.")), p(text("III — For some choice, exactly three different triangles can be drawn.")), p(text("Congruent triangles count as the same."))], combinations, ["condition-checking", "multi-step-planning"]),
    q(19, [p(text("The angle "), math("\theta"), text(" can be any integer number of degrees from "), math(T`1^\circ`), text(" to "), math(T`360^\circ`), text(". For how many values is")), d(T`\sin\theta\sqrt{1+\sin\theta}\sqrt{1-\sin\theta}+\cos\theta\sqrt{1+\cos\theta}\sqrt{1-\cos\theta}=0`), p(text("true?"))], mathOptions("0", "1", "2", "4", "93", "182", "271", "360"), ["algebraic-transformation", "condition-checking"]),
    q(20, [p(text("Define a sequence of functions by")), d(T`f_1(x)=|x|`), d(T`f_{n+1}(x)=|f_n(x)+x|\quad(n\ge1)`), p(text("Find")), d(T`\int_{-1}^{1}f_{99}(x)\,\mathrm dx`)], mathOptions("0", "0.5", "1", "49.5", "50", "99", "99.5", "100"), ["multi-step-planning", "representation-switching"]),
  ],
};

const issues = validatePracticePaper(TMUA_2021_P2);
if (issues.length > 0) throw new Error(`TMUA 2021 Paper 2 content is invalid: ${issues.map((issue) => issue.code).join(", ")}`);
