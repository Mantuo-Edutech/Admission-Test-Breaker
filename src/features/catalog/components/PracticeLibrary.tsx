import {
  ArrowUpRight,
  BookOpenText,
  ClipboardCheck,
  PenLine,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type PracticeEntryKind = "paper" | "diagnostic" | "writing";

export interface PracticeEntry {
  readonly id: string;
  readonly to: string;
  readonly kicker: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly meta: string;
  readonly kind?: PracticeEntryKind;
  readonly ariaLabel?: string;
}

function EntryIcon({ kind = "paper" }: { readonly kind?: PracticeEntryKind }) {
  if (kind === "diagnostic") return <ClipboardCheck aria-hidden="true" />;
  if (kind === "writing") return <PenLine aria-hidden="true" />;
  return <BookOpenText aria-hidden="true" />;
}

export function PracticeLibraryHero({
  exam,
  title,
  titleEn,
  summary,
  facts,
  action,
}: {
  readonly exam: string;
  readonly title: string;
  readonly titleEn: string;
  readonly summary: string;
  readonly facts: readonly string[];
  readonly action?: ReactNode;
}) {
  return (
    <section className="practice-library-hero page-shell">
      <div>
        <p className="eyebrow">{exam} · ONLINE PRACTICE</p>
        <h1>{title}<span>{titleEn}</span></h1>
      </div>
      <div className="practice-library-hero__guide">
        <p>{summary}</p>
        <ul aria-label={`${exam} 练习关键信息`}>
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
  titleEn,
  summary,
  entries,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly titleEn: string;
  readonly summary: string;
  readonly entries: readonly PracticeEntry[];
}) {
  return (
    <section className="practice-entry-section page-shell" aria-labelledby={`${entries[0]?.id ?? "practice"}-section-title`}>
      <header>
        <div>
          <p>{eyebrow}</p>
          <h2 id={`${entries[0]?.id ?? "practice"}-section-title`}>{title}<span>{titleEn}</span></h2>
        </div>
        <strong>{summary}</strong>
      </header>
      <ol className="practice-entry-grid" aria-label={`${title} ${titleEn}`}>
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <Link
              to={entry.to}
              aria-label={entry.ariaLabel ?? `${entry.title}${entry.subtitle === undefined ? "" : ` ${entry.subtitle}`}，${entry.meta}，开始练习`}
            >
              <header>
                <EntryIcon kind={entry.kind} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </header>
              <div>
                <small>{entry.kicker}</small>
                <h3>{entry.title}</h3>
                {entry.subtitle === undefined ? null : <p>{entry.subtitle}</p>}
              </div>
              <footer>
                <span>{entry.meta}</span>
                <em>开始<ArrowUpRight aria-hidden="true" /></em>
              </footer>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
