import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { ExamPracticeProfileGate } from "../../preparation-profile/components/ExamPracticeProfileGate.js";
import { loadPracticePaper } from "../content/practice-paper-registry.js";
import type { PracticePaper } from "../content/types.js";
import { PracticePage } from "./PracticePage.js";

interface PracticeRoutePageProps {
  services: AppServices;
}

/**
 * Keeps the exam-specific paper registry and profile gates behind the
 * /practice/:paperId route boundary. The public landing page does not need to
 * download hundreds of native questions before a learner opens a paper.
 */
export function PracticeRoutePage({ services }: PracticeRoutePageProps) {
  const { paperId } = useParams();
  const [paper, setPaper] = useState<PracticePaper | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setPaper(undefined);
    if (paperId === undefined) {
      setPaper(null);
      return () => { active = false; };
    }
    void loadPracticePaper(paperId).then((loaded) => {
      if (active) setPaper(loaded);
    });
    return () => { active = false; };
  }, [paperId]);

  if (paper === undefined) {
    return <main className="practice-state-page" aria-live="polite"><p className="eyebrow">正在读取题目</p><h1>正在准备在线练习…</h1></main>;
  }

  return (
    <ExamPracticeProfileGate services={services} paper={paper}>
      <PracticePage services={services} paper={paper} />
    </ExamPracticeProfileGate>
  );
}
