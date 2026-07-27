import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { AppServices } from "../../../app/dependencies.js";
import { ExamPracticeProfileGate } from "../../preparation-profile/components/ExamPracticeProfileGate.js";
import type { DeliveredPracticePaper } from "../delivery/domain.js";
import { resolvePracticeDeliveryService } from "../delivery/resolve-service.js";
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
  const [paper, setPaper] = useState<DeliveredPracticePaper | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setPaper(undefined);
    setLoadFailed(false);
    if (paperId === undefined) {
      setPaper(null);
      return () => { active = false; };
    }
    void resolvePracticeDeliveryService(services.practiceDelivery)
      .then(async (delivery) => delivery?.loadPaper(paperId) ?? null)
      .then((loaded) => {
        if (active) setPaper(loaded);
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setPaper(null);
        }
      });
    return () => { active = false; };
  }, [paperId, services.practiceDelivery]);

  if (paper === undefined) {
    return <main className="practice-state-page" aria-live="polite"><p className="eyebrow">LOADING PAPER</p><h1>Preparing your online practice…<small lang="zh-CN">正在准备在线练习</small></h1></main>;
  }

  if (loadFailed) {
    return <main className="practice-state-page" role="alert"><p className="eyebrow">PAPER TEMPORARILY UNAVAILABLE</p><h1>We could not load this paper.<small lang="zh-CN">试卷暂时无法读取</small></h1><p>Your practice record is safe. Check your connection and refresh the page.</p></main>;
  }

  return (
    <ExamPracticeProfileGate services={services} paper={paper}>
      <PracticePage services={services} paper={paper} />
    </ExamPracticeProfileGate>
  );
}
