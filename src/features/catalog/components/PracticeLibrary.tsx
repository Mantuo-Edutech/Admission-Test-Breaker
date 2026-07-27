import {
  ArrowUpRight,
  BookOpenText,
  PenLine,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type PracticeEntryKind = "paper" | "writing";

export interface PracticeEntry {
  readonly id: string;
  readonly to: string;
  readonly kicker: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly subtitleZh?: string;
  readonly meta: string;
  readonly kind?: PracticeEntryKind;
  readonly ariaLabel?: string;
}

function EntryIcon({ kind = "paper" }: { readonly kind?: PracticeEntryKind }) {
  if (kind === "writing") return <PenLine aria-hidden="true" />;
  return <BookOpenText aria-hidden="true" />;
}

export function PracticeLibraryHero({
  exam,
  title,
  titleZh,
  summary,
  summaryZh,
  facts,
  action,
}: {
  readonly exam: string;
  readonly title: string;
  readonly titleZh: string;
  readonly summary: string;
  readonly summaryZh?: string;
  readonly facts: readonly string[];
  readonly action?: ReactNode;
}) {
  return (
    <section className="practice-library-hero page-shell">
      <div>
        <p className="eyebrow">{exam} · ONLINE PRACTICE</p>
        <h1 lang="en">{title}<span lang="zh-CN">{titleZh}</span></h1>
      </div>
      <div className="practice-library-hero__guide">
        <p lang="en">{summary}</p>
        {summaryZh === undefined ? null : <small lang="zh-CN">{summaryZh}</small>}
        <ul aria-label={`${exam} practice facts`}>
          {facts.map((fact) => <li key={fact}>{fact}</li>)}
        </ul>
        {action}
      </div>
    </section>
  );
}

export function PracticeEntrySection({
  eyebrow,
  title,
  titleZh,
  summary,
  entries,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly titleZh: string;
  readonly summary: string;
  readonly entries: readonly PracticeEntry[];
}) {
  return (
    <section className="practice-entry-section page-shell" aria-labelledby={`${entries[0]?.id ?? "practice"}-section-title`}>
      <header>
        <div>
          <p>{eyebrow}</p>
          <h2 id={`${entries[0]?.id ?? "practice"}-section-title`} lang="en">{title}<span lang="zh-CN">{titleZh}</span></h2>
        </div>
        <strong>{summary}</strong>
      </header>
      <ol className="practice-entry-grid" aria-label={title}>
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <Link
              to={entry.to}
              aria-label={entry.ariaLabel ?? `${entry.title}, ${entry.meta}. Start.`}
            >
              <header>
                <EntryIcon kind={entry.kind} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </header>
              <div>
                <small>{entry.kicker}</small>
                <h3>{entry.title}</h3>
                {entry.subtitle === undefined ? null : <p lang="en">{entry.subtitle}{entry.subtitleZh === undefined ? null : <small lang="zh-CN">{entry.subtitleZh}</small>}</p>}
              </div>
              <footer>
                <span>{entry.meta}</span>
                <em><span>Start</span><small>开始</small><ArrowUpRight aria-hidden="true" /></em>
              </footer>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
