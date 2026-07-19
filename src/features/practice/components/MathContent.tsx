import katex from "katex";
import "katex/dist/katex.min.css";
import type {
  InlineRun,
  QuestionBlock,
} from "../content/types.js";

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: "warn",
      trust: false,
      output: "htmlAndMathml",
    });
  } catch {
    return "";
  }
}

function InlineContent({ run }: { run: InlineRun }) {
  if (run.kind === "text") {
    return <>{run.value}</>;
  }

  const html = renderMath(run.tex, false);
  return html.length > 0 ? (
    <span
      className="math-inline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <code className="math-fallback">{run.tex}</code>
  );
}

function BlockContent({ block }: { block: QuestionBlock }) {
  if (block.kind === "paragraph") {
    return (
      <p>
        {block.runs.map((run, index) => (
          <InlineContent key={index} run={run} />
        ))}
      </p>
    );
  }

  if (block.kind === "display-math") {
    const html = renderMath(block.tex, true);
    return html.length > 0 ? (
      <div
        className="math-display"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ) : (
      <pre className="math-fallback">{block.tex}</pre>
    );
  }

  if (block.kind === "table") {
    return (
      <div className="question-data-table-wrap">
        <table className="question-data-table">
          <caption>{block.caption}</caption>
          <thead>
            <tr>{block.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => cellIndex === 0
                  ? <th key={cellIndex} scope="row">{cell}</th>
                  : <td key={cellIndex}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.kind === "source-pdf") {
    const source = `${block.src}#page=${block.page}&view=FitH`;
    return (
      <section className="source-pdf-question" aria-label={block.title}>
        <iframe src={source} title={block.title} loading="lazy" />
        <p>
          当前定位到原卷第 {block.page} 页。
          <a href={source} target="_blank" rel="noreferrer">在新窗口打开完整试卷</a>
        </p>
      </section>
    );
  }

  return (
    <figure className="question-figure">
      <img src={block.src} alt={block.alt} />
      {block.caption !== undefined && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

export function MathContent({ blocks }: { blocks: readonly QuestionBlock[] }) {
  return (
    <div className="math-content">
      {blocks.map((block, index) => (
        <BlockContent key={index} block={block} />
      ))}
    </div>
  );
}
