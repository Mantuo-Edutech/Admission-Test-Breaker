import { T, d, defineHistoricPaper, math, mo, p, text, to } from "./historic-paper-helpers.js";

const sourceQuestionPath = "Tmua/2016-2023paper/tmua-paper-1-specimen.pdf";
const sourceAnswerPath = "Tmua/2016-2023 answer key/tmua-specimen.pdf";

export const TMUA_SPECIMEN_P1 = defineHistoricPaper({
  id: "tmua-specimen-p1", edition: "Early Specimen", paper: 1,
  answers: "DDBEDDCFADEDCDAEDBDG", sourceQuestionPath, sourceAnswerPath,
  explanationResourceId: "tmua-specimen-p1-worked-explanations-v1",
  sourcePages: [3,3,4,4,5,5,6,7,7,8,8,9,9,10,10,11,11,12,12,13],
  questions: [
    { prompt: [p(text("The sum of the two values of "), math("x"), text(" satisfying")), d(T`x-3y+1=0,\qquad 3x^2-7xy=5`), p(text("is"))], options: mo("-8.5","-7.5","-1.5","3.5","4.5","5") },
    { prompt: [p(text("How many solutions in "), math(T`0\le\theta\le4\pi`), text(" does "), math(T`\sin^2\theta+3\cos\theta=3`), text(" have?"))], options: mo("0","1","2","3","4","5","6") },
    { prompt: [p(text("The perpendicular bisector of the segment joining "), math("(2,-6)"), text(" and "), math("(5,4)"), text(" cuts the "), math("x"), text("-axis at which "), math("x"), text("-coordinate?"))], options: mo(T`\frac1{20}`,T`\frac16`,T`\frac13`,T`\frac{19}5`,T`\frac{41}6`) },
    { prompt: [p(text("The complete set of values satisfying "), math(T`(x^2-1)(x-2)>0`), text(" is"))], options: mo(T`x<-1,\ 1<x<2`,T`x<-1,\ x>2`,T`-1<x<2`,T`x<1,\ x>2`,T`-1<x<1,\ x>2`) },
    { prompt: [p(text("Given "), math(T`y=-\log_{10}(1-x)`), text(" for "), math("x<1"), text(", find "), math("x"), text(" in terms of "), math("y"), text("."))], options: mo(T`-\frac1{\log_{10}(1-y)}`,T`1+\log_{10}y`,T`1-\log_{10}y`,T`1-10^{-y}`,T`10^{-y}-1`,T`10^{1-y}`) },
    { prompt: [p(text("It is given that "), math("x+2"), text(" is a factor of "), math(T`x^3+4cx^2+x(c+1)^2-6`), text(". Find the sum of the possible values of "), math("c"), text("."))], options: mo("-10","-6","0","6","10") },
    { prompt: [p(text("A bag contains "), math("n"), text(" balls of each of three colours. Two balls are chosen without replacement. The probability that they have different colours is"))], options: mo(T`\frac{n-1}{3n-1}`,T`\frac{2n-2}{3n-1}`,T`\frac{2n}{3n-1}`,T`\frac{(n-1)^3}{27(3n-1)^3}`,T`\frac{3(n-1)}{3n-1}`,T`\frac{n^3}{27(3n-1)^3}`) },
    { prompt: [p(text("Given "), math(T`a^x b^{2x}c^{3x}=2`), text(" for positive "), math("a,b,c"), text(", then "), math("x="))], options: mo(T`\log_{10}\!\left(\frac2{a+2b+3c}\right)`,T`\frac{\log_{10}2}{\log_{10}(a+2b+3c)}`,T`\frac2{\log_{10}(a+2b+3c)}`,T`\frac2{a+2b+3c}`,T`\log_{10}\!\left(\frac2{ab^2c^3}\right)`,T`\frac{\log_{10}2}{\log_{10}(ab^2c^3)}`,T`\frac2{\log_{10}(ab^2c^3)}`,T`\frac2{ab^2c^3}`) },
    { prompt: [p(text("The roots of "), math(T`2x^2-11x+c=0`), text(" differ by 2. Find "), math("c"), text("."))], options: mo(T`\frac{105}8`,T`\frac{113}8`,T`\frac{117}8`,T`\frac{119}8`) },
    { prompt: [p(text("The curve "), math("y=\cos x"), text(" is reflected in "), math("y=1"), text(" then translated "), math(T`\frac\pi4`), text(" units in the positive "), math("x"), text("-direction. Its new equation is"))], options: mo(T`y=2+\cos(x+\frac\pi4)`,T`y=2+\cos(x-\frac\pi4)`,T`y=2-\cos(x+\frac\pi4)`,T`y=2-\cos(x-\frac\pi4)`) },
    { prompt: [p(text("Find the sum of the roots of "), math(T`2^{2x}-8\cdot2^x+15=0`), text("."))], options: mo("3","8",T`2\log_{10}2`,T`\log_{10}(\frac{15}4)`,T`\frac{\log_{10}15}{\log_{10}2}`) },
    { prompt: [p(text("A triangular prism has equilateral cross-section of side "), math("2x"), text(" cm and length "), math("d"), text(" cm. Its volume and total surface area have the same numerical value. Express "), math("d"), text(" in terms of "), math("x"), text("."))], options: mo(T`\frac{x}{2x-3}`,T`\frac{3x}{3x-2\sqrt3}`,T`\frac{2x}{x-4\sqrt3}`,T`\frac{2x}{x-2\sqrt3}`,T`\frac{2x}{x-\sqrt3}`) },
    { prompt: [p(text("How many real roots does "), math(T`x^4-4x^3+4x^2-10=0`), text(" have?"))], options: mo("0","1","2","3","4") },
    { prompt: [p(text("For positive real "), math("a,b,x,y"), text(" with constants "), math("a,b"), text(", which relation makes a graph of "), math(T`\log y`), text(" against "), math(T`\log x`), text(" a straight line?"))], options: mo(T`y^b=a^x`,T`y=ab^x`,T`y^2=a+x^b`,T`y=ax^b`,T`y^x=a^b`) },
    { prompt: [p(text("Find the smallest possible value, as "), math("a"), text(" varies, of")), d(T`\int_0^1(x-a)^2\,dx`)], options: mo(T`\frac1{12}`,T`\frac13`,T`\frac12`,T`\frac7{12}`,`2`) },
    { prompt: [p(text("For non-zero integers "), math("c,d"), text(", when is")), d(T`\frac{10^{c-2d}\,20^{2c+d}}{8^c\,125^{c+d}}`), p(text("an integer?"))], options: to("c<0","d<0","c<0 and d<0","c<0 and d>0","c>0 and d<0","c>0 and d>0","d>0","c>0") },
    { prompt: [p(text("For which non-zero real values of "), math("a"), text(" does "), math(T`ax^2+(a-2)x=2`), text(" have distinct real roots?"))], options: mo(T`\text{all }a`,T`a=-2`,T`a>-2`,T`a\ne-2`,T`\text{no values}`) },
    { prompt: [p(text("For "), math(T`0\le x\le\pi`), text(", find the total length of intervals where "), math(T`-1<\tan x\le1`), text(" and "), math(T`\sin2x\ge\frac12`), text("."))], options: mo(T`\frac\pi{12}`,T`\frac\pi6`,T`\frac\pi4`,T`\frac\pi3`,T`\frac{5\pi}{12}`,T`\frac\pi2`,T`\frac{5\pi}6`) },
    { prompt: [p(text("A geometric series has first term 4 and ratio "), math(T`0<r<1`), text(". Its first, second and fourth terms are successive terms of an arithmetic sequence. Find its sum to infinity."))], options: mo(T`\frac12(\sqrt5-1)`,T`2(3-\sqrt5)`,T`2(1+\sqrt5)`,T`2(3+\sqrt5)`) },
    { prompt: [p(text("Find the coefficient of "), math("x^2"), text(" in")), d(T`(4-x^2)\left[(1+2x+3x^2)^6-(1+4x^3)^5\right]`)], options: mo("28","72","78","192","240","310","312") },
  ],
});
