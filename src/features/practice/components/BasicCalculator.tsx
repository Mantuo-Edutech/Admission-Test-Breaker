import { Calculator, X } from "lucide-react";
import { useState } from "react";

type Operation = "+" | "−" | "×" | "÷";

function calculate(left: number, right: number, operation: Operation): number {
  if (operation === "+") return left + right;
  if (operation === "−") return left - right;
  if (operation === "×") return left * right;
  return right === 0 ? Number.NaN : left / right;
}

function displayNumber(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  return String(Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000).slice(0, 14);
}

export function BasicCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [replaceDisplay, setReplaceDisplay] = useState(true);

  function inputDigit(digit: string) {
    setDisplay((current) => replaceDisplay || current === "Error"
      ? digit
      : current.length >= 14
        ? current
        : current === "0" ? digit : `${current}${digit}`);
    setReplaceDisplay(false);
  }

  function inputDecimal() {
    setDisplay((current) => replaceDisplay || current === "Error" ? "0." : current.includes(".") ? current : `${current}.`);
    setReplaceDisplay(false);
  }

  function chooseOperation(nextOperation: Operation) {
    const current = Number(display);
    if (!Number.isFinite(current)) return;
    if (accumulator !== null && operation !== null && !replaceDisplay) {
      const result = calculate(accumulator, current, operation);
      setAccumulator(result);
      setDisplay(displayNumber(result));
    } else {
      setAccumulator(current);
    }
    setOperation(nextOperation);
    setReplaceDisplay(true);
  }

  function equals() {
    if (accumulator === null || operation === null) return;
    const result = calculate(accumulator, Number(display), operation);
    setDisplay(displayNumber(result));
    setAccumulator(null);
    setOperation(null);
    setReplaceDisplay(true);
  }

  function clear() {
    setDisplay("0");
    setAccumulator(null);
    setOperation(null);
    setReplaceDisplay(true);
  }

  return (
    <div className="practice-calculator">
      <button className="practice-tool-button" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Calculator aria-hidden="true" />基础计算器
      </button>
      {open && (
        <section className="calculator-panel" aria-label="基础计算器">
          <header><strong>Basic calculator</strong><button type="button" aria-label="关闭计算器" onClick={() => setOpen(false)}><X aria-hidden="true" /></button></header>
          <output aria-live="polite">{display}</output>
          <div className="calculator-keypad">
            <button type="button" onClick={clear}>AC</button>
            <button type="button" aria-label="正负号" onClick={() => setDisplay((value) => displayNumber(-Number(value)))}>+/−</button>
            <button type="button" aria-label="百分比" onClick={() => setDisplay((value) => displayNumber(Number(value) / 100))}>%</button>
            <button type="button" aria-label="除以" onClick={() => chooseOperation("÷")}>÷</button>
            {["7", "8", "9"].map((digit) => <button key={digit} type="button" onClick={() => inputDigit(digit)}>{digit}</button>)}
            <button type="button" aria-label="乘以" onClick={() => chooseOperation("×")}>×</button>
            {["4", "5", "6"].map((digit) => <button key={digit} type="button" onClick={() => inputDigit(digit)}>{digit}</button>)}
            <button type="button" aria-label="减去" onClick={() => chooseOperation("−")}>−</button>
            {["1", "2", "3"].map((digit) => <button key={digit} type="button" onClick={() => inputDigit(digit)}>{digit}</button>)}
            <button type="button" aria-label="加上" onClick={() => chooseOperation("+")}>+</button>
            <button className="calculator-key--zero" type="button" onClick={() => inputDigit("0")}>0</button>
            <button type="button" aria-label="小数点" onClick={inputDecimal}>.</button>
            <button className="calculator-key--equals" type="button" aria-label="等于" onClick={equals}>=</button>
          </div>
        </section>
      )}
    </div>
  );
}
